/**
 * MuseAI frontend <-> backend contracts.
 *
 * IMPORTANT: these are MuseAI application contracts, NOT the ACE-Step 1.5 API.
 * The FastAPI backend is expected to translate them into ACE-Step calls
 * (`acestep.inference.generate_music(...)` / `GenerationParams`, or the
 * bundled `acestep.api_server` endpoints `POST /release_task`,
 * `POST /query_result`, `GET /v1/audio`).
 *
 * Fields are grouped so it is always clear which ones map onto a documented
 * ACE-Step parameter (`model` / `*Params` objects) and which are MuseAI-only
 * metadata (`appMetadata`) that must not be blindly forwarded to the model.
 * See src/config/aceStepCapabilities.ts for the full mapping.
 */

import type { AudioFile, AudioFormat } from './audio';

// ---------------------------------------------------------------------------
// Shared musical metadata
// ---------------------------------------------------------------------------

/**
 * Musical metadata as ACE-Step understands it.
 * - key: "C major", "F# minor", "Bb major" (ACE-Step VALID_KEYSCALES: 7 notes x
 *   {natural, #, b} x {major, minor}).
 * - tempoBpm: integer 30..300.
 * - timeSignature: one of "2/4" | "3/4" | "4/4" | "6/8" (ACE-Step accepts 2,3,4,6).
 *   Other meters can be entered in the UI but are flagged as unsupported.
 */
export interface MusicMetadata {
  key?: string;
  tempoBpm?: number;
  timeSignature?: string;
}

export type MetadataField = keyof MusicMetadata;

/**
 * How a value got into the table.
 * - detected: analysis returned it with high confidence
 * - estimated: analysis returned it with low confidence, or inherited from the
 *   global estimate because no per-range result exists
 * - manual: the user overrode it
 * - missing: no value available
 */
export type MetadataProvenance = 'detected' | 'estimated' | 'manual' | 'missing';

// ---------------------------------------------------------------------------
// Time ranges (metadata table rows)
// ---------------------------------------------------------------------------

/**
 * One row of the timeline / metadata table.
 * Detected values and user overrides are stored separately so the original
 * analysis result is never lost.
 */
export interface TimeRange {
  id: string;
  /** Seconds. */
  startTime: number;
  /** Seconds. Must be > startTime and <= audio duration. */
  endTime: number;
  /** What analysis said for this range (never mutated by the user). */
  detected: MusicMetadata;
  /** 0..1 per field, if the analyzer reports confidence. */
  confidence: Partial<Record<MetadataField, number>>;
  /** True if `detected` came from a per-range analysis rather than the global estimate. */
  detectedPerRange: boolean;
  /** User overrides. A field present here wins over `detected`. */
  overrides: MusicMetadata;
  /** Whether this range is part of the next edit request. */
  selected: boolean;
  /** True for the auto-created row covering the whole song. */
  isFullTrack: boolean;
}

/** Plain range shape sent to the backend (effective values already resolved). */
export interface EditTimeRange {
  startTime: number;
  endTime: number;
  key?: string;
  tempoBpm?: number;
  timeSignature?: string;
}

// ---------------------------------------------------------------------------
// Task status (async jobs)
// ---------------------------------------------------------------------------

export type TaskState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface TaskStatus {
  taskId: string;
  state: TaskState;
  /** 0..1 if known. */
  progress?: number;
  message?: string;
  queuePosition?: number;
}

/** Returned by POST endpoints that start an async task. */
export interface TaskAccepted {
  taskId: string;
  state: TaskState;
  queuePosition?: number;
}

// ---------------------------------------------------------------------------
// Generation (Create Music mode)
// ---------------------------------------------------------------------------

/** ACE-Step 1.5 DiT model variants (from the HF model card). */
export type AceStepDitModel =
  | 'acestep-v15-turbo'
  | 'acestep-v15-sft'
  | 'acestep-v15-base';

export type AceStepOutputFormat = 'mp3' | 'wav' | 'flac' | 'opus' | 'aac';

/**
 * Parameters that map 1:1 onto documented ACE-Step 1.5 GenerationParams /
 * GenerationConfig fields. Optional fields left undefined mean "let ACE-Step
 * decide" (its 5Hz LM auto-fills bpm/key/time signature/duration).
 */
export interface AceStepGenerationParams {
  /** -> `caption` / `prompt`. Max 512 chars. */
  caption: string;
  /** -> `lyrics`. Max 4096 chars. Empty + instrumental -> "[Instrumental]". */
  lyrics: string;
  /** -> `instrumental`. */
  instrumental: boolean;
  /** -> `vocal_language` (ISO 639-1 or "unknown"). */
  vocalLanguage: string;
  /** -> `duration` / `audio_duration`, seconds 10..600. */
  durationSec?: number;
  /** -> `bpm`, 30..300. */
  bpm?: number;
  /** -> `keyscale` / `key_scale`. */
  keyScale?: string;
  /** -> `timesignature` ("2" | "3" | "4" | "6"); UI uses "4/4" etc. */
  timeSignature?: string;
  /** -> `model` (DiT variant). */
  model: AceStepDitModel;
  /** -> `thinking` (use the 5Hz LM planner). */
  thinking: boolean;
  /** -> `inference_steps`. Turbo 1..20 (8), base/sft 1..200 (32-64). */
  inferenceSteps: number;
  /** -> `guidance_scale`. Ignored by turbo (auto-corrected to 1.0). */
  guidanceScale?: number;
  /** -> `seed` (+ `use_random_seed=false`). Undefined = random. */
  seed?: number;
  /** -> `batch_size`, 1..8. */
  batchSize: number;
  /** -> `audio_format`. */
  audioFormat: AceStepOutputFormat;
}

/** MuseAI-only metadata. Stored by the app; never sent to the model. */
export interface GenerationAppMetadata {
  title?: string;
  tags?: string[];
  notes?: string;
}

export interface MusicGenerationRequest {
  params: AceStepGenerationParams;
  appMetadata: GenerationAppMetadata;
}

export interface GeneratedTake {
  /** Backend reference for this output, reusable as an edit source. */
  audioFileId: string;
  /** URL to fetch/stream the audio. */
  url: string;
  fileName: string;
  durationSec: number;
  seed?: number;
}

export interface MusicGenerationResponse {
  taskId: string;
  takes: GeneratedTake[];
  /**
   * Metadata ACE-Step actually used (user values + LM-filled values), as
   * reported in ACE-Step's result `metas`.
   */
  resolvedMetadata: MusicMetadata & { durationSec?: number; vocalLanguage?: string };
  /** e.g. "acestep-v15-turbo" — or "mock-synth" when mocked. */
  engine: string;
  isMock: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface AnalysisSegment {
  startTime: number;
  endTime: number;
  metadata: MusicMetadata;
  confidence: Partial<Record<MetadataField, number>>;
}

export interface AudioAnalysisResponse {
  audioFileId: string;
  durationSec: number;
  /** Whole-song estimate. */
  global: MusicMetadata;
  globalConfidence: Partial<Record<MetadataField, number>>;
  /**
   * Optional per-section estimates. ACE-Step's `understand_music` only returns
   * global values; segments require a separate analyzer (e.g. librosa/essentia).
   */
  segments: AnalysisSegment[];
  /** Optional extras ACE-Step's understand_music can return. */
  caption?: string;
  vocalLanguage?: string;
  /** e.g. "mock-analyzer", "acestep-understand_music", "librosa". */
  analyzer: string;
  isMock: boolean;
}

// ---------------------------------------------------------------------------
// Editing (Edit Existing Song mode)
// ---------------------------------------------------------------------------

/**
 * Edit strategy. These map onto ACE-Step `task_type` values, except 'auto'
 * which asks the backend to choose.
 * - repaint: regenerate the selected time range (all ACE-Step DiT variants)
 * - cover: re-render the whole song in a new style (all variants)
 * - lego: generate one added track in context (base model only)
 * - extract: isolate one track/stem (base model only)
 * - complete: add accompaniment tracks (base model only)
 */
export type EditMode = 'auto' | 'repaint' | 'cover' | 'lego' | 'extract' | 'complete';

/** ACE-Step TRACK_NAMES (used by lego / extract / complete). */
export type AceStepTrackName =
  | 'woodwinds' | 'brass' | 'fx' | 'synth' | 'strings' | 'percussion'
  | 'keyboard' | 'guitar' | 'bass' | 'drums' | 'backing_vocals' | 'vocals';

export interface MusicEditRequest {
  /** Backend reference of the audio to edit (an upload, generation or previous edit). */
  audioFileId: string;
  /** The user's free-form natural-language instruction. */
  instruction: string;
  timeRanges: EditTimeRange[];
  /** Keep audio outside the ranges bit-identical (repaint) or allow global changes. */
  preserveOriginalOutsideRange: boolean;

  /** Requested strategy; the backend may reject or remap it. */
  editMode: EditMode;
  /** Style description for the regenerated content (-> ACE-Step `caption`). */
  styleCaption?: string;
  /** For lego/extract (one track) and complete (several). */
  trackNames?: AceStepTrackName[];
  /** -> `audio_cover_strength` (cover only), 0..1. */
  coverStrength?: number;
  /** DiT variant. lego/extract/complete require acestep-v15-base. */
  model?: AceStepDitModel;

  /** Lineage, so the backend/history can link versions. MuseAI-only. */
  parentVersionId?: string;
}

export interface MusicEditResponse {
  taskId: string;
  editedAudio: GeneratedTake;
  /** What the backend actually did, e.g. ["repaint 01:20.000–01:40.000"]. */
  appliedOperations: string[];
  /** The edit mode actually used (after 'auto' resolution or remapping). */
  resolvedMode: Exclude<EditMode, 'auto'>;
  engine: string;
  isMock: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Editing history (frontend state)
// ---------------------------------------------------------------------------

export interface AudioVersion {
  id: string;
  /** 0 = original. */
  index: number;
  label: string;
  audio: AudioFile;
  /** Present for edited versions. */
  edit?: {
    parentVersionId: string;
    request: MusicEditRequest;
    response: MusicEditResponse;
  };
}

export type AsyncPhase = 'idle' | 'submitting' | 'processing' | 'success' | 'error';

export interface AsyncState<T> {
  phase: AsyncPhase;
  progress: number;
  message: string | null;
  error: string | null;
  data: T | null;
}

export type { AudioFile, AudioFormat };
