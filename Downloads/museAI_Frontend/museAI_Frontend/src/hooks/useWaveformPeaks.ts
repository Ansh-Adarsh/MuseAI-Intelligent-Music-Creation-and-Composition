import { useEffect, useState } from 'react';
import type { AudioFile, WaveformPeaks } from '@/types/audio';
import { computePeaks, decodeBlob } from '@/utils/audioDecode';

const cache = new Map<string, WaveformPeaks>();

/** Decodes the audio locally (browser) and computes waveform peaks. */
export function useWaveformPeaks(audio: AudioFile | null | undefined, buckets = 1200) {
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(audio ? cache.get(audio.id) ?? null : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audio) { setPeaks(null); return; }
    const hit = cache.get(audio.id);
    if (hit) { setPeaks(hit); return; }
    let cancelled = false;
    setPeaks(null);
    setError(null);
    decodeBlob(audio.blob)
      .then((buf) => {
        const p = computePeaks(buf, buckets);
        cache.set(audio.id, p);
        if (!cancelled) setPeaks(p);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [audio, buckets]);

  return { peaks, error };
}
