import type {
  AudioAnalysisResponse,
  MusicEditRequest,
  MusicEditResponse,
  MusicGenerationRequest,
  MusicGenerationResponse,
  TaskStatus,
} from '@/types/music';
import type { AudioFile } from '@/types/audio';

export interface ServiceCallOptions {
  /** Called on every status update while an async task runs. */
  onStatus?: (status: TaskStatus) => void;
  signal?: AbortSignal;
}

/** Contracts every implementation (mock or HTTP) must satisfy. */
export interface MusicGenerationService {
  generateMusic(request: MusicGenerationRequest, opts?: ServiceCallOptions): Promise<MusicGenerationResponse>;
}

export interface MusicEditingService {
  editMusic(request: MusicEditRequest, opts?: ServiceCallOptions): Promise<MusicEditResponse>;
}

export interface AudioAnalysisService {
  /**
   * Registers the audio with the backend if needed (upload) and returns
   * analysis. If `audio.backendFileId` is already set (e.g. a generated
   * song), the file is not uploaded again.
   */
  analyzeAudio(audio: AudioFile, opts?: ServiceCallOptions): Promise<AudioAnalysisResponse>;
}

/** Turns a backend result reference into a playable Blob. */
export interface AudioFetcher {
  fetchAudio(url: string, signal?: AbortSignal): Promise<Blob>;
}

export class ServiceError extends Error {
  constructor(message: string, public readonly status?: number, public readonly detail?: unknown) {
    super(message);
    this.name = 'ServiceError';
  }
}
