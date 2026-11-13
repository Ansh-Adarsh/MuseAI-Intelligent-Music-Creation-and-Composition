/**
 * Audio file types shared across the app.
 *
 * An AudioFile is the frontend's handle on a piece of audio. It always has a
 * local preview URL (object URL) and, once the backend knows about it, a
 * backend file reference (`backendFileId`). Edits never mutate an AudioFile;
 * they produce a new one (see `AudioVersion` in music.ts).
 */

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg' | 'opus' | 'aac';

export type AudioSource = 'upload' | 'generated' | 'edited';

export interface AudioFile {
  /** Frontend-local id (stable for the session). */
  id: string;
  /**
   * Reference the backend uses to find this audio (e.g. a stored upload id or
   * a generated-result path). In mock mode this is a key into the in-memory
   * mock file store.
   */
  backendFileId: string | null;
  name: string;
  format: AudioFormat | 'unknown';
  mimeType: string;
  sizeBytes: number;
  /** Seconds. Measured locally by decoding the audio in the browser. */
  durationSec: number;
  /** Object URL for local playback. Revoke only when the file is discarded. */
  objectUrl: string;
  /** The raw bytes, kept so we can download / re-decode without refetching. */
  blob: Blob;
  source: AudioSource;
  createdAt: number;
}

/** Downsampled peaks used to draw a waveform. Values in [0, 1]. */
export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
  /** Number of peak buckets. */
  length: number;
}

export interface AudioValidationResult {
  ok: boolean;
  format: AudioFormat | 'unknown';
  errors: string[];
}

export type UploadPhase = 'idle' | 'reading' | 'decoding' | 'registering' | 'ready' | 'error';

export interface UploadState {
  phase: UploadPhase;
  /** 0..1 */
  progress: number;
  error: string | null;
}
