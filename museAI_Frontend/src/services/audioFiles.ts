/** Helpers to turn local files and backend results into AudioFile objects. */
import type { AudioFile, AudioSource } from '@/types/audio';
import type { GeneratedTake } from '@/types/music';
import { detectFormat } from '@/utils/audioValidation';
import { uid } from '@/utils/format';
import { ServiceError } from './types';

export async function fetchAudioBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new ServiceError(`Could not download result audio (${res.status}).`, res.status);
  return res.blob();
}

export async function audioFileFromTake(take: GeneratedTake, source: AudioSource, signal?: AbortSignal): Promise<AudioFile> {
  const blob = await fetchAudioBlob(take.url, signal);
  // Always use a fresh object URL owned by this AudioFile.
  const objectUrl = URL.createObjectURL(blob);
  return {
    id: uid('audio'),
    backendFileId: take.audioFileId,
    name: take.fileName,
    format: detectFormat(take.fileName, blob.type),
    mimeType: blob.type || 'audio/wav',
    sizeBytes: blob.size,
    durationSec: take.durationSec,
    objectUrl,
    blob,
    source,
    createdAt: Date.now(),
  };
}
