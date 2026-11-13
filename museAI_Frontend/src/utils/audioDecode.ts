import type { WaveformPeaks } from '@/types/audio';

let sharedCtx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** Decode a Blob into an AudioBuffer using the browser's decoder. */
export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const buf = await blob.arrayBuffer();
  try {
    return await ctx().decodeAudioData(buf.slice(0));
  } catch {
    throw new Error('This file couldn’t be opened. It may be damaged or use an unsupported audio codec.');
  }
}

/** Fallback duration probe via an <audio> element (no full decode). */
export function probeDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(a.duration);
    a.onerror = () => reject(new Error('Could not read audio metadata.'));
    a.src = url;
  });
}

export function computePeaks(buffer: AudioBuffer, buckets = 1200): WaveformPeaks {
  const len = buffer.length;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const step = Math.max(1, Math.floor(len / buckets));
  let globalMax = 0;
  for (let b = 0; b < buckets; b++) {
    let lo = 0;
    let hi = 0;
    const start = b * step;
    const end = Math.min(len, start + step);
    // Stride for speed on long files.
    const stride = Math.max(1, Math.floor((end - start) / 256));
    for (let i = start; i < end; i += stride) {
      let v = 0;
      for (const ch of channels) v += ch[i];
      v /= channels.length;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[b] = lo;
    max[b] = hi;
    globalMax = Math.max(globalMax, -lo, hi);
  }
  const norm = globalMax > 0 ? 1 / globalMax : 1;
  for (let b = 0; b < buckets; b++) {
    min[b] *= norm;
    max[b] *= norm;
  }
  return { min, max, length: buckets };
}
