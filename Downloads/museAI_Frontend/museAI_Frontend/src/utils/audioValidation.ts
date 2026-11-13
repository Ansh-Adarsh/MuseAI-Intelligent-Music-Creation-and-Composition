import type { AudioFormat, AudioValidationResult } from '@/types/audio';
import { env } from '@/config/env';
import { formatBytes } from './format';

export const ACCEPTED_EXTENSIONS: Record<string, AudioFormat> = {
  mp3: 'mp3',
  wav: 'wav',
  wave: 'wav',
  flac: 'flac',
  m4a: 'm4a',
  mp4: 'm4a',
  aac: 'aac',
  ogg: 'ogg',
  oga: 'ogg',
  opus: 'opus',
};

const ACCEPTED_MIME_PREFIXES = ['audio/'];

export const ACCEPT_ATTR = '.mp3,.wav,.flac,.m4a,.ogg,.opus,.aac,audio/*';

export function detectFormat(fileName: string, mimeType = ''): AudioFormat | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ACCEPTED_EXTENSIONS[ext]) return ACCEPTED_EXTENSIONS[ext];
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('flac')) return 'flac';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  return 'unknown';
}

export function validateAudioFile(file: File, maxMb = env.maxUploadMb): AudioValidationResult {
  const errors: string[] = [];
  const format = detectFormat(file.name, file.type);
  const mimeOk = !file.type || ACCEPTED_MIME_PREFIXES.some((p) => file.type.startsWith(p)) || file.type === 'video/mp4';
  if (format === 'unknown' || !mimeOk) {
    errors.push(`Unsupported file type${file.type ? ` (${file.type})` : ''}. Use MP3, WAV, FLAC, M4A or OGG.`);
  }
  if (file.size === 0) errors.push('The file is empty.');
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`File is ${formatBytes(file.size)}; the limit is ${maxMb} MB.`);
  }
  return { ok: errors.length === 0, format, errors };
}

/** ACE-Step accepts 10–600 s for generation; edits on very short/long files may fail server-side. */
export function durationWarnings(durationSec: number): string[] {
  const w: string[] = [];
  if (durationSec < 10) w.push('This audio is shorter than 10 seconds. Edits work best on songs between 10 seconds and 10 minutes.');
  if (durationSec > 600) w.push('This audio is longer than 10 minutes. Edits work best on songs up to 10 minutes long.');
  return w;
}
