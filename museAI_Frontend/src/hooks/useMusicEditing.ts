import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  AceStepDitModel,
  AceStepTrackName,
  AsyncState,
  AudioAnalysisResponse,
  AudioVersion,
  EditMode,
  EditTimeRange,
  MetadataField,
  MetadataProvenance,
  MusicEditRequest,
  MusicMetadata,
  TimeRange,
} from '@/types/music';
import type { AudioFile } from '@/types/audio';
import { analyzeAudio } from '@/services/audioAnalysisService';
import { editMusic } from '@/services/musicEditingService';
import { audioFileFromTake } from '@/services/audioFiles';
import { rangesOverlap, validateRange } from '@/utils/timestampUtils';
import { uid } from '@/utils/format';
import { EDIT_MODES, LIMITS, SUPPORTED_TIME_SIGNATURES, isAceKeyScale } from '@/config/aceStepCapabilities';
import { suggestEditMode, type EditModeSuggestion } from '@/utils/editModeHeuristic';

// ---------------------------------------------------------------------------
// Metadata helpers (pure, exported for the table)
// ---------------------------------------------------------------------------

export const CONFIDENT = 0.8;

export function effectiveValue<F extends MetadataField>(r: TimeRange, f: F): MusicMetadata[F] {
  return r.overrides[f] !== undefined ? r.overrides[f] : r.detected[f];
}

export function provenanceOf(r: TimeRange, f: MetadataField): MetadataProvenance {
  if (r.overrides[f] !== undefined) return 'manual';
  if (r.detected[f] === undefined) return 'missing';
  const c = r.confidence[f];
  return (c ?? 0) >= CONFIDENT && (r.detectedPerRange || r.isFullTrack) ? 'detected' : 'estimated';
}

export function validateRow(r: TimeRange, duration: number): { errors: string[]; warnings: string[] } {
  const errors = [...validateRange(r.startTime, r.endTime, duration).errors];
  const warnings: string[] = [];
  const key = effectiveValue(r, 'key');
  const bpm = effectiveValue(r, 'tempoBpm');
  const ts = effectiveValue(r, 'timeSignature');
  if (key && !isAceKeyScale(key)) warnings.push(`"${key}" isn't a recognised key. Use a form like "A minor" or "F# major".`);
  if (bpm !== undefined && (bpm < LIMITS.bpmMin || bpm > LIMITS.bpmMax)) errors.push(`BPM must be ${LIMITS.bpmMin}–${LIMITS.bpmMax}.`);
  if (ts && !(SUPPORTED_TIME_SIGNATURES as readonly string[]).includes(ts)) warnings.push(`${ts} is saved with the song but won't be applied to edits. Supported: 2/4, 3/4, 4/4, 6/8.`);
  return { errors, warnings };
}

function detectedFor(start: number, end: number, analysis: AudioAnalysisResponse | null) {
  if (!analysis) return { detected: {}, confidence: {}, perRange: false };
  const seg = analysis.segments.find((s) => s.startTime <= start + 1e-3 && s.endTime >= end - 1e-3);
  if (seg) return { detected: { ...seg.metadata }, confidence: { ...seg.confidence }, perRange: true };
  return { detected: { ...analysis.global }, confidence: { ...analysis.globalConfidence }, perRange: false };
}

function makeRange(start: number, end: number, analysis: AudioAnalysisResponse | null, isFullTrack: boolean): TimeRange {
  const d = detectedFor(start, end, analysis);
  return {
    id: uid('range'),
    startTime: start,
    endTime: end,
    detected: d.detected,
    confidence: d.confidence,
    detectedPerRange: d.perRange,
    overrides: {},
    selected: true,
    isFullTrack,
  };
}

// ---------------------------------------------------------------------------
// Edit settings
// ---------------------------------------------------------------------------

export interface EditSettings {
  editMode: EditMode;
  styleCaption: string;
  trackNames: AceStepTrackName[];
  coverStrength: number;
  model: AceStepDitModel;
  preserveOutside: boolean;
}

const DEFAULT_SETTINGS: EditSettings = {
  editMode: 'auto',
  styleCaption: '',
  trackNames: [],
  coverStrength: 0.5,
  model: 'acestep-v15-turbo',
  preserveOutside: true,
};

const idle = <T,>(): AsyncState<T> => ({ phase: 'idle', progress: 0, message: null, error: null, data: null });

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMusicEditing() {
  const [versions, setVersions] = useState<AudioVersion[]>([]);
  const [sourceVersionId, setSourceVersionId] = useState<string | null>(null);
  const [latestResultId, setLatestResultId] = useState<string | null>(null);
  const [ranges, setRanges] = useState<TimeRange[]>([]);
  const [instruction, setInstruction] = useState('');
  const [settings, setSettings] = useState<EditSettings>(DEFAULT_SETTINGS);
  const [analysis, setAnalysis] = useState<AsyncState<AudioAnalysisResponse>>(idle());
  const [editState, setEditState] = useState<AsyncState<AudioVersion>>(idle());
  const [formError, setFormError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);
  const versionsRef = useRef<AudioVersion[]>([]);
  versionsRef.current = versions;

  const source = useMemo(() => versions.find((v) => v.id === sourceVersionId) ?? null, [versions, sourceVersionId]);
  const original = versions[0] ?? null;
  const latestResult = useMemo(() => versions.find((v) => v.id === latestResultId) ?? null, [versions, latestResultId]);
  const duration = source?.audio.durationSec ?? 0;

  const runAnalysis = useCallback(async (version: AudioVersion, session: number) => {
    setAnalysis({ phase: 'processing', progress: 0, message: 'Preparing analysis…', error: null, data: null });
    try {
      const res = await analyzeAudio(version.audio, {
        onStatus: (st) => {
          if (session !== sessionRef.current) return;
          setAnalysis((a) => ({ ...a, progress: st.progress ?? a.progress, message: st.message ?? st.state }));
        },
      });
      if (session !== sessionRef.current) return;
      // Record the backend reference on the version (immutable update).
      setVersions((vs) => vs.map((v) => (v.id === version.id ? { ...v, audio: { ...v.audio, backendFileId: res.audioFileId } } : v)));
      setAnalysis({ phase: 'success', progress: 1, message: null, error: null, data: res });
      const dur = version.audio.durationSec;
      setRanges((rs) => {
        if (rs.length === 0) return [makeRange(0, dur, res, true)];
        // Refresh detected values, keep user overrides and clamp to the new duration.
        return rs.map((r) => {
          const end = r.isFullTrack ? dur : Math.min(r.endTime, dur);
          const d = detectedFor(r.startTime, end, res);
          return { ...r, endTime: end, detected: d.detected, confidence: d.confidence, detectedPerRange: d.perRange };
        });
      });
    } catch (e) {
      if (session !== sessionRef.current) return;
      setAnalysis({ phase: 'error', progress: 0, message: null, error: (e as Error).message, data: null });
      // Still give the user a full-track row to work with.
      setRanges((rs) => (rs.length ? rs : [makeRange(0, version.audio.durationSec, null, true)]));
    }
  }, []);

  /** Start a fresh editing session from an uploaded or generated song. */
  const startSession = useCallback((audio: AudioFile) => {
    abortRef.current?.abort();
    const session = ++sessionRef.current;
    const v0: AudioVersion = { id: uid('ver'), index: 0, label: 'Original', audio };
    setVersions([v0]);
    setSourceVersionId(v0.id);
    setLatestResultId(null);
    // Show the full-length row immediately; analysis fills in its values.
    setRanges([makeRange(0, audio.durationSec, null, true)]);
    setEditState(idle());
    setFormError(null);
    void runAnalysis(v0, session);
  }, [runAnalysis]);

  const endSession = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current++;
    setVersions([]);
    setSourceVersionId(null);
    setLatestResultId(null);
    setRanges([]);
    setAnalysis(idle());
    setEditState(idle());
    setFormError(null);
  }, []);

  const retryAnalysis = useCallback(() => {
    if (source) void runAnalysis(source, sessionRef.current);
  }, [source, runAnalysis]);

  /** Use a version (e.g. an edit result) as the input for the next edit. */
  const selectSourceVersion = useCallback((versionId: string) => {
    const v = versions.find((x) => x.id === versionId);
    if (!v) return;
    setSourceVersionId(versionId);
    setEditState((s) => ({ ...s, phase: 'idle' }));
    void runAnalysis(v, sessionRef.current);
  }, [versions, runAnalysis]);

  // ---- ranges -------------------------------------------------------------

  const addRange = useCallback((start?: number, end?: number) => {
    setRanges((rs) => {
      const a = analysis.data;
      let s = start;
      let e = end;
      if (s === undefined || e === undefined) {
        const last = rs.filter((r) => !r.isFullTrack).at(-1);
        s = last ? Math.min(last.endTime, Math.max(0, duration - 1)) : 0;
        e = Math.min(duration, s + Math.min(10, duration));
        if (e <= s) { s = 0; e = Math.min(duration, 10); }
      }
      return [...rs, makeRange(s, e, a, false)];
    });
  }, [analysis.data, duration]);

  const updateRange = useCallback((id: string, patch: Partial<Pick<TimeRange, 'startTime' | 'endTime' | 'overrides' | 'selected'>>) => {
    setRanges((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.startTime !== undefined || patch.endTime !== undefined) {
        const d = detectedFor(next.startTime, next.endTime, analysis.data);
        next.detected = d.detected;
        next.confidence = d.confidence;
        next.detectedPerRange = d.perRange;
        next.isFullTrack = next.startTime === 0 && Math.abs(next.endTime - duration) < 1e-3 && r.isFullTrack;
      }
      return next;
    }));
  }, [analysis.data, duration]);

  const deleteRange = useCallback((id: string) => setRanges((rs) => rs.filter((r) => r.id !== id)), []);

  const resetRange = useCallback((id: string, field?: MetadataField) => {
    setRanges((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      if (!field) return { ...r, overrides: {} };
      const o = { ...r.overrides };
      delete o[field];
      return { ...r, overrides: o };
    }));
  }, []);

  const resetAllRanges = useCallback(() => {
    setRanges([makeRange(0, duration, analysis.data, true)]);
  }, [duration, analysis.data]);

  // ---- derived -----------------------------------------------------------

  const hasPartialRange = ranges.some((r) => r.selected && !(r.startTime === 0 && Math.abs(r.endTime - duration) < 1e-3));
  const suggestion: EditModeSuggestion | null = useMemo(
    () => (instruction.trim() ? suggestEditMode(instruction, hasPartialRange) : null),
    [instruction, hasPartialRange],
  );
  const resolvedMode: Exclude<EditMode, 'auto'> = settings.editMode === 'auto' ? suggestion?.mode ?? 'repaint' : settings.editMode;
  const modeInfo = EDIT_MODES.find((m) => m.id === resolvedMode)!;

  const overlapWarnings = useMemo(() => {
    const sel = ranges.filter((r) => r.selected);
    const out: string[] = [];
    for (let i = 0; i < sel.length; i++)
      for (let j = i + 1; j < sel.length; j++)
        if (rangesOverlap(sel[i], sel[j])) out.push(`Ranges ${ranges.indexOf(sel[i]) + 1} and ${ranges.indexOf(sel[j]) + 1} overlap, so the overlapping part will be changed twice.`);
    return out;
  }, [ranges]);

  // ---- apply -------------------------------------------------------------

  const buildRequest = useCallback((): { request: MusicEditRequest | null; error: string | null } => {
    if (!source) return { request: null, error: 'Upload a song first.' };
    if (!source.audio.backendFileId) {
      return { request: null, error: analysis.phase === 'processing' ? 'Please wait for the audio analysis to finish.' : 'Audio analysis didn’t finish. Please retry the analysis.' };
    }
    if (!instruction.trim()) return { request: null, error: 'Describe what you want to change.' };
    const selected = ranges.filter((r) => r.selected);
    if (modeInfo.usesRanges) {
      if (selected.length === 0) return { request: null, error: 'Select at least one time range in the timeline table.' };
      for (const r of selected) {
        const v = validateRow(r, duration);
        if (v.errors.length) return { request: null, error: `Range ${ranges.indexOf(r) + 1}: ${v.errors[0]}` };
      }
    }
    const tracks = settings.editMode === 'auto' ? suggestion?.trackNames ?? [] : settings.trackNames;
    if (settings.editMode === 'lego' || settings.editMode === 'extract') {
      if (tracks.length !== 1) return { request: null, error: 'Choose one instrument.' };
    }
    if (settings.editMode === 'complete' && tracks.length === 0) return { request: null, error: 'Choose at least one instrument to add.' };

    const timeRanges: EditTimeRange[] = (modeInfo.usesRanges ? selected : selected.slice(0, 1)).map((r) => {
      const ts = effectiveValue(r, 'timeSignature');
      return {
        startTime: r.startTime,
        endTime: r.endTime,
        key: effectiveValue(r, 'key'),
        tempoBpm: effectiveValue(r, 'tempoBpm'),
        timeSignature: ts,
      };
    });

    const request: MusicEditRequest = {
      audioFileId: source.audio.backendFileId,
      instruction: instruction.trim(),
      timeRanges,
      preserveOriginalOutsideRange: settings.preserveOutside,
      editMode: settings.editMode,
      styleCaption: settings.styleCaption.trim() || undefined,
      trackNames: tracks.length ? tracks : undefined,
      coverStrength: resolvedMode === 'cover' ? settings.coverStrength : undefined,
      // Model choice is not exposed in the UI: track-level operations need the base variant.
      model: modeInfo.baseOnly ? 'acestep-v15-base' : settings.model,
      parentVersionId: source.id,
    };
    return { request, error: null };
  }, [source, analysis.phase, instruction, ranges, modeInfo, duration, settings, suggestion, resolvedMode]);

  const applyChanges = useCallback(async () => {
    const { request, error } = buildRequest();
    setFormError(error);
    if (!request || !source) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const session = sessionRef.current;
    setEditState({ phase: 'submitting', progress: 0, message: 'Submitting edit…', error: null, data: null });
    try {
      const response = await editMusic(request, {
        signal: ac.signal,
        onStatus: (st) => setEditState((s) => ({ ...s, phase: 'processing', progress: st.progress ?? s.progress, message: st.message ?? st.state })),
      });
      const audio = await audioFileFromTake(response.editedAudio, 'edited', ac.signal);
      if (session !== sessionRef.current) return;
      const vs = versionsRef.current;
      const index = vs.length;
      const base = (vs[0]?.audio.name ?? 'audio').replace(/\.[^.]+$/, '');
      const ext = audio.name.split('.').pop() ?? 'wav';
      const created: AudioVersion = {
        id: uid('ver'),
        index,
        label: `Edit ${index}`,
        audio: { ...audio, name: `${base}-edit${index}.${ext}` },
        edit: { parentVersionId: source.id, request, response },
      };
      versionsRef.current = [...vs, created];
      setVersions((prev) => [...prev, created]);
      setLatestResultId(created.id);
      setEditState({ phase: 'success', progress: 1, message: null, error: null, data: created });
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setEditState(idle()); return; }
      setEditState({ phase: 'error', progress: 0, message: null, error: (e as Error).message, data: null });
    }
  }, [buildRequest, source]);

  const cancelEdit = useCallback(() => abortRef.current?.abort(), []);

  const previewRequest = useMemo(() => buildRequest(), [buildRequest]);

  return {
    // session
    versions, original, source, latestResult, duration,
    startSession, endSession, selectSourceVersion, setLatestResultId,
    // analysis
    analysis, retryAnalysis,
    // ranges
    ranges, addRange, updateRange, deleteRange, resetRange, resetAllRanges, overlapWarnings,
    // instruction & settings
    instruction, setInstruction, settings, setSettings, suggestion, resolvedMode,
    // apply
    editState, applyChanges, cancelEdit, formError, setFormError, previewRequest,
  };
}

export type MusicEditingApi = ReturnType<typeof useMusicEditing>;
