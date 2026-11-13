/**
 * What ACE-Step 1.5 actually supports, according to its docs
 * (huggingface.co/ACE-Step/Ace-Step1.5, github.com/ace-step/ACE-Step-1.5
 * docs/en/INFERENCE.md, docs/en/API.md, acestep/constants.py).
 *
 * The UI uses this to label every control as either an ACE-Step parameter or
 * MuseAI-only metadata, and to enforce documented limits.
 */

import type { AceStepDitModel, AceStepTrackName, EditMode } from '@/types/music';

export type SupportLevel =
  /** Documented ACE-Step parameter, forwarded to the model. */
  | 'model'
  /** Supported, but only under conditions (e.g. base model only, global-only). */
  | 'partial'
  /** MuseAI application metadata. Not sent to the model. */
  | 'app';

export interface ControlSupport {
  level: SupportLevel;
  /** ACE-Step parameter name, if any. */
  aceParam?: string;
  note: string;
}

export const LIMITS = {
  captionMaxChars: 512,
  lyricsMaxChars: 4096,
  bpmMin: 30,
  bpmMax: 300,
  durationMin: 10,
  durationMax: 600,
  batchMax: 8,
  turboStepsMax: 20,
  baseStepsMax: 200,
} as const;

/** ACE-Step accepts time signatures 2, 3, 4, 6 meaning 2/4, 3/4, 4/4, 6/8. */
export const SUPPORTED_TIME_SIGNATURES = ['2/4', '3/4', '4/4', '6/8'] as const;

export function toAceTimeSignature(ts: string | undefined): string | undefined {
  if (!ts) return undefined;
  const map: Record<string, string> = { '2/4': '2', '3/4': '3', '4/4': '4', '6/8': '6' };
  return map[ts.trim()];
}

const NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
export const KEY_OPTIONS: string[] = NOTES.flatMap((n) => [`${n} major`, `${n} minor`]);

/** Loose check against ACE-Step's VALID_KEYSCALES ("<A-G>[#|b|♯|♭] major|minor"). */
export function isAceKeyScale(value: string | undefined): boolean {
  if (!value) return false;
  return /^[A-Ga-g](#|b|♯|♭)?\s+(major|minor)$/i.test(value.trim());
}

export const VOCAL_LANGUAGES: { code: string; label: string }[] = [
  { code: 'unknown', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ne', label: 'Nepali' },
  { code: 'sa', label: 'Sanskrit' },
  { code: 'zh', label: 'Chinese (Mandarin)' },
  { code: 'yue', label: 'Cantonese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fa', label: 'Persian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'id', label: 'Indonesian' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
];

export const DIT_MODELS: { id: AceStepDitModel; label: string; steps: number; cfg: boolean; note: string }[] = [
  { id: 'acestep-v15-turbo', label: 'Turbo', steps: 8, cfg: false, note: '8 steps, highest quality, no CFG. Text2Music, Cover, Repaint.' },
  { id: 'acestep-v15-sft', label: 'SFT', steps: 50, cfg: true, note: '50 steps with CFG. Text2Music, Cover, Repaint.' },
  { id: 'acestep-v15-base', label: 'Base', steps: 50, cfg: true, note: 'Most diverse. Only variant with Lego, Extract, Complete.' },
];

export const TRACK_NAMES: AceStepTrackName[] = [
  'vocals', 'backing_vocals', 'drums', 'bass', 'guitar', 'keyboard',
  'percussion', 'strings', 'synth', 'fx', 'brass', 'woodwinds',
];

// Labels/descriptions below are user-facing product copy. Technical notes:
// - auto: MuseAI heuristic routing (utils/editModeHeuristic.ts), not an ACE-Step feature
// - repaint/cover: all DiT variants; one repaint range per ACE-Step call
// - lego/extract/complete: acestep-v15-base only (the request sets model automatically)
export const EDIT_MODES: {
  id: EditMode;
  label: string;
  aceTaskType?: string;
  baseOnly: boolean;
  usesRanges: boolean;
  description: string;
}[] = [
  { id: 'auto', label: 'Smart', baseOnly: false, usesRanges: true,
    description: 'Picks the best approach from your description.' },
  { id: 'repaint', label: 'Rework a section', aceTaskType: 'repaint', baseOnly: false, usesRanges: true,
    description: 'Recreates the selected time ranges to match your description. Everything else stays the same.' },
  { id: 'cover', label: 'Restyle whole song', aceTaskType: 'cover', baseOnly: false, usesRanges: false,
    description: 'Gives the entire song a new style while keeping its structure.' },
  { id: 'lego', label: 'Add an instrument', aceTaskType: 'lego', baseOnly: true, usesRanges: true,
    description: 'Adds a new instrument part on top of the existing mix.' },
  { id: 'extract', label: 'Isolate an instrument', aceTaskType: 'extract', baseOnly: true, usesRanges: false,
    description: 'Pulls a single part, such as the vocals, out of the mix.' },
  { id: 'complete', label: 'Fill out arrangement', aceTaskType: 'complete', baseOnly: true, usesRanges: false,
    description: 'Adds accompanying instruments to a sparse track.' },
];

/** Create Music control labels. */
export const CREATE_CONTROLS: Record<string, ControlSupport> = {
  lyrics: { level: 'model', aceParam: 'lyrics', note: 'Max 4096 characters. Section tags like [Verse] and [Chorus] are recognised.' },
  caption: { level: 'model', aceParam: 'caption', note: 'Max 512 characters. Genre, mood, instruments, vocals, arrangement.' },
  instrumental: { level: 'model', aceParam: 'instrumental', note: 'Forces an instrumental track regardless of lyrics.' },
  vocalLanguage: { level: 'model', aceParam: 'vocal_language', note: 'ISO 639-1 code; "unknown" lets the LM detect it.' },
  duration: { level: 'model', aceParam: 'duration', note: '10–600 s. Leave empty to let ACE-Step choose from the lyrics.' },
  bpm: { level: 'model', aceParam: 'bpm', note: '30–300. Empty lets the 5Hz LM choose.' },
  keyScale: { level: 'model', aceParam: 'keyscale', note: 'e.g. "A minor". Empty lets the 5Hz LM choose.' },
  timeSignature: { level: 'model', aceParam: 'timesignature', note: 'Only 2/4, 3/4, 4/4, 6/8 are accepted.' },
  model: { level: 'model', aceParam: 'model', note: 'DiT variant loaded on the server.' },
  thinking: { level: 'model', aceParam: 'thinking', note: 'Use the 5Hz LM to plan audio codes (better structure, slower).' },
  inferenceSteps: { level: 'model', aceParam: 'inference_steps', note: 'Turbo: 1–20 (8 recommended). Base/SFT: up to 200 (32–64 recommended).' },
  guidanceScale: { level: 'partial', aceParam: 'guidance_scale', note: 'Only used by Base/SFT. Turbo overrides it to 1.0.' },
  seed: { level: 'model', aceParam: 'seed', note: 'Fixed seed for reproducible output. Empty = random.' },
  batchSize: { level: 'model', aceParam: 'batch_size', note: 'Number of takes, 1–8.' },
  audioFormat: { level: 'model', aceParam: 'audio_format', note: 'Output container. The mock always returns WAV.' },
  title: { level: 'app', note: 'MuseAI library metadata. Not sent to the model.' },
  tags: { level: 'app', note: 'MuseAI library metadata. Not sent to the model.' },
};

/** Edit Existing Song control labels. */
export const EDIT_CONTROLS: Record<string, ControlSupport> = {
  instruction: { level: 'partial', aceParam: 'caption', note: 'ACE-Step has no free-form edit-instruction parser. Its `instruction` field is a fixed task template; your text is used as the caption for the regenerated content, and the backend must choose the task type.' },
  timeRange: { level: 'partial', aceParam: 'repainting_start / repainting_end', note: 'Supported for repaint (and lego) as one range per call. Multiple ranges require sequential backend calls.' },
  key: { level: 'partial', aceParam: 'keyscale', note: 'Global conditioning per call. ACE-Step has no per-region key; a per-range value only applies to that range’s repaint call.' },
  tempoBpm: { level: 'partial', aceParam: 'bpm', note: 'Global conditioning per call. A tempo that differs from the surrounding audio will likely not blend.' },
  timeSignature: { level: 'partial', aceParam: 'timesignature', note: 'Global per call; only 2/4, 3/4, 4/4, 6/8.' },
  preserveOutside: { level: 'partial', note: 'Inherent to repaint/lego. Cover and extract always change the whole file.' },
  coverStrength: { level: 'model', aceParam: 'audio_cover_strength', note: '0–1. Lower (≈0.2) = looser style transfer.' },
  analysis: { level: 'partial', aceParam: 'understand_music()', note: 'ACE-Step can estimate global BPM/key/time signature from audio codes via its LM, but it is not exposed in the REST API, gives no confidence and no per-section values.' },
};

export function editModeRequiresBase(mode: EditMode): boolean {
  return EDIT_MODES.find((m) => m.id === mode)?.baseOnly ?? false;
}
