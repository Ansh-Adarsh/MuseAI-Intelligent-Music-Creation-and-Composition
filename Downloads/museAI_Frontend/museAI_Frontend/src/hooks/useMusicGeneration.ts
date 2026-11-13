import { useCallback, useRef, useState } from 'react';
import type {
  AceStepGenerationParams,
  AsyncState,
  GenerationAppMetadata,
  MusicGenerationRequest,
  MusicGenerationResponse,
} from '@/types/music';
import type { AudioFile } from '@/types/audio';
import { generateMusic } from '@/services/musicGenerationService';
import { audioFileFromTake } from '@/services/audioFiles';
import { DIT_MODELS, LIMITS, SUPPORTED_TIME_SIGNATURES, isAceKeyScale } from '@/config/aceStepCapabilities';

/** UI form state. Optional numeric fields are strings so they can be blank. */
export interface GenerationForm {
  lyrics: string;
  caption: string;
  instrumental: boolean;
  vocalLanguage: string;
  durationSec: string;
  bpm: string;
  keyScale: string;
  timeSignature: string;
  model: AceStepGenerationParams['model'];
  thinking: boolean;
  inferenceSteps: number;
  guidanceScale: number;
  seed: string;
  batchSize: number;
  audioFormat: AceStepGenerationParams['audioFormat'];
  title: string;
  tags: string;
}

export const DEFAULT_FORM: GenerationForm = {
  lyrics: '',
  caption: '',
  instrumental: false,
  vocalLanguage: 'unknown',
  durationSec: '30',
  bpm: '',
  keyScale: '',
  timeSignature: '',
  model: 'acestep-v15-turbo',
  thinking: true,
  inferenceSteps: 8,
  guidanceScale: 7,
  seed: '',
  batchSize: 1,
  audioFormat: 'mp3',
  title: '',
  tags: '',
};

export type FormErrors = Partial<Record<keyof GenerationForm, string>>;

export function validateGenerationForm(f: GenerationForm): FormErrors {
  const e: FormErrors = {};
  if (!f.caption.trim()) e.caption = 'Describe the music style you want.';
  else if (f.caption.length > LIMITS.captionMaxChars) e.caption = `Keep the style description under ${LIMITS.captionMaxChars} characters.`;
  if (f.lyrics.length > LIMITS.lyricsMaxChars) e.lyrics = `Lyrics can be up to ${LIMITS.lyricsMaxChars} characters.`;
  if (f.durationSec.trim()) {
    const d = Number(f.durationSec);
    if (!Number.isFinite(d) || d < LIMITS.durationMin || d > LIMITS.durationMax) e.durationSec = `Duration must be ${LIMITS.durationMin}–${LIMITS.durationMax} s.`;
  }
  if (f.bpm.trim()) {
    const b = Number(f.bpm);
    if (!Number.isInteger(b) || b < LIMITS.bpmMin || b > LIMITS.bpmMax) e.bpm = `BPM must be a whole number ${LIMITS.bpmMin}–${LIMITS.bpmMax}.`;
  }
  if (f.keyScale.trim() && !isAceKeyScale(f.keyScale)) e.keyScale = 'Use the form "A minor" or "F# major".';
  if (f.timeSignature && !(SUPPORTED_TIME_SIGNATURES as readonly string[]).includes(f.timeSignature)) e.timeSignature = 'Choose 2/4, 3/4, 4/4 or 6/8.';
  const maxSteps = f.model === 'acestep-v15-turbo' ? LIMITS.turboStepsMax : LIMITS.baseStepsMax;
  if (f.inferenceSteps < 1 || f.inferenceSteps > maxSteps) e.inferenceSteps = `Quality steps must be between 1 and ${maxSteps}.`;
  if (f.seed.trim() && !/^\d+$/.test(f.seed.trim())) e.seed = 'Seed must be a non-negative integer.';
  return e;
}

export function buildGenerationRequest(f: GenerationForm): MusicGenerationRequest {
  const usesCfg = DIT_MODELS.find((m) => m.id === f.model)?.cfg ?? false;
  const params: AceStepGenerationParams = {
    caption: f.caption.trim(),
    lyrics: f.instrumental || !f.lyrics.trim() ? '[Instrumental]' : f.lyrics,
    instrumental: f.instrumental || !f.lyrics.trim(),
    vocalLanguage: f.vocalLanguage,
    durationSec: f.durationSec.trim() ? Number(f.durationSec) : undefined,
    bpm: f.bpm.trim() ? Number(f.bpm) : undefined,
    keyScale: f.keyScale.trim() || undefined,
    timeSignature: f.timeSignature || undefined,
    model: f.model,
    thinking: f.thinking,
    inferenceSteps: f.inferenceSteps,
    guidanceScale: usesCfg ? f.guidanceScale : undefined,
    seed: f.seed.trim() ? Number(f.seed) : undefined,
    batchSize: f.batchSize,
    audioFormat: f.audioFormat,
  };
  const appMetadata: GenerationAppMetadata = {
    title: f.title.trim() || undefined,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
  };
  return { params, appMetadata };
}

export interface GenerationResult {
  response: MusicGenerationResponse;
  takes: AudioFile[];
  request: MusicGenerationRequest;
}

const idle: AsyncState<GenerationResult> = { phase: 'idle', progress: 0, message: null, error: null, data: null };

export function useMusicGeneration() {
  const [form, setForm] = useState<GenerationForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<AsyncState<GenerationResult>>(idle);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const update = useCallback(<K extends keyof GenerationForm>(key: K, value: GenerationForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const generate = useCallback(async () => {
    const errs = validateGenerationForm(form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const request = buildGenerationRequest(form);
    setState((s) => ({ ...s, phase: 'submitting', progress: 0, message: 'Submitting…', error: null }));
    try {
      const response = await generateMusic(request, {
        signal: ac.signal,
        onStatus: (st) => setState((s) => ({ ...s, phase: 'processing', progress: st.progress ?? s.progress, message: st.message ?? st.state })),
      });
      const takes = await Promise.all(response.takes.map((t) => audioFileFromTake(t, 'generated', ac.signal)));
      const result = { response, takes, request };
      setHistory((h) => [result, ...h]);
      setState({ phase: 'success', progress: 1, message: null, error: null, data: result });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setState((s) => ({ ...s, phase: s.data ? 'success' : 'idle', message: null }));
        return;
      }
      setState((s) => ({ ...s, phase: 'error', message: null, error: (e as Error).message }));
    }
  }, [form]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { form, update, setForm, errors, state, history, generate, cancel };
}

export type MusicGenerationApi = ReturnType<typeof useMusicGeneration>;
