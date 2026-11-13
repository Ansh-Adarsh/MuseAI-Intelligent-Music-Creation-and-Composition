/**
 * MOCK generation service. Produces procedural placeholder audio in the
 * browser. Nothing here calls ACE-Step.
 */
import type { MusicGenerationService, ServiceCallOptions } from '../types';
import type { GeneratedTake, MusicGenerationRequest, MusicGenerationResponse } from '@/types/music';
import { beatsPerBarFromSignature, brightnessFromText, renderSynth } from './synth';
import { encodeWav } from '@/utils/wav';
import { hashString, slugify, uid } from '@/utils/format';
import { mockFileStore } from './mockFileStore';
import { simulateTask } from './mockDelay';
import { KEY_OPTIONS } from '@/config/aceStepCapabilities';

const SAMPLE_RATE = 22050;

export const mockGenerationService: MusicGenerationService = {
  async generateMusic(request: MusicGenerationRequest, opts?: ServiceCallOptions): Promise<MusicGenerationResponse> {
    const p = request.params;
    const taskId = uid('mockgen');
    await simulateTask(taskId, 2200, opts, 'Composing');

    const h = hashString(p.caption + p.lyrics);
    const warnings: string[] = [];
    // Mimic ACE-Step's LM auto-filling missing metadata.
    const bpm = p.bpm ?? 70 + (h % 70);
    const key = p.keyScale ?? KEY_OPTIONS[h % KEY_OPTIONS.length];
    const ts = p.timeSignature ?? '4/4';
    const lyricLines = p.lyrics.split('\n').filter((l) => l.trim()).length;
    const duration = p.durationSec ?? Math.min(180, Math.max(20, lyricLines * 4 || 30));
    if (!p.durationSec) warnings.push(`Duration auto-chosen by mock: ${duration}s (ACE-Step would infer it from the lyrics).`);
    if (p.audioFormat !== 'wav') warnings.push(`Mock always returns WAV; ACE-Step would return ${p.audioFormat.toUpperCase()}.`);

    const caption = p.caption.toLowerCase();
    const takes: GeneratedTake[] = [];
    const baseName = slugify(request.appMetadata.title || p.caption.split(/[,.]/)[0] || 'museai');
    for (let b = 0; b < p.batchSize; b++) {
      const seed = p.seed !== undefined ? p.seed + b : (h + b * 7919) >>> 0;
      const data = renderSynth({
        sampleRate: SAMPLE_RATE,
        durationSec: duration,
        bpm,
        key,
        beatsPerBar: beatsPerBarFromSignature(ts),
        seed,
        brightness: brightnessFromText(caption),
        fadeSec: 1.5,
        parts: {
          pad: true,
          bass: true,
          arp: !/(ambient|ballad)/.test(caption) || b % 2 === 1,
          drums: !/(ambient|no drums|a cappella)/.test(caption),
          lead: !p.instrumental && p.lyrics.trim().length > 0,
        },
      });
      const blob = encodeWav([data], SAMPLE_RATE);
      const { id, url } = mockFileStore.put(blob, { key, tempoBpm: bpm, timeSignature: ts }, 'gen');
      takes.push({ audioFileId: id, url, fileName: `${baseName}${p.batchSize > 1 ? `-v${b + 1}` : ''}.wav`, durationSec: duration, seed });
    }

    return {
      taskId,
      takes,
      resolvedMetadata: { key, tempoBpm: bpm, timeSignature: ts, durationSec: duration, vocalLanguage: p.vocalLanguage },
      engine: 'mock-synth',
      isMock: true,
      warnings,
    };
  },
};
