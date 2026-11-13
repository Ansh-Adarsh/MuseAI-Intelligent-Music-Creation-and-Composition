/**
 * MOCK editing service. Applies a crude, audible placeholder transformation
 * inside the requested ranges so the A/B compare and history can be tested.
 * It does not understand the instruction and does not call ACE-Step.
 */
import type { MusicEditingService, ServiceCallOptions } from '../types';
import { ServiceError } from '../types';
import type { EditTimeRange, MusicEditRequest, MusicEditResponse } from '@/types/music';
import { decodeBlob } from '@/utils/audioDecode';
import { encodeWav } from '@/utils/wav';
import { formatTimestamp } from '@/utils/timestampUtils';
import { hashString, uid } from '@/utils/format';
import { suggestEditMode } from '@/utils/editModeHeuristic';
import { beatsPerBarFromSignature, renderSynth } from './synth';
import { mockFileStore } from './mockFileStore';
import { simulateTask } from './mockDelay';

const XFADE = 0.08;

function gainCurve(t: number, start: number, end: number): number {
  // 0 outside, 1 inside, with short linear crossfades at the edges.
  if (t < start - XFADE || t > end + XFADE) return 0;
  if (t < start) return (t - (start - XFADE)) / XFADE;
  if (t > end) return 1 - (t - end) / XFADE;
  return 1;
}

export const mockEditingService: MusicEditingService = {
  async editMusic(request: MusicEditRequest, opts?: ServiceCallOptions): Promise<MusicEditResponse> {
    const src = mockFileStore.get(request.audioFileId);
    if (!src) throw new ServiceError('This audio is no longer available. Please upload it again.', 404);
    if (!request.instruction.trim()) throw new ServiceError('Describe what you want to change.', 400);

    const taskId = uid('mockedit');
    await simulateTask(taskId, 2600, opts, 'Applying changes');

    const buffer = await decodeBlob(src.blob);
    const sr = buffer.sampleRate;
    const duration = buffer.duration;
    const resolvedMode = request.editMode === 'auto'
      ? suggestEditMode(request.instruction, request.timeRanges.some((r) => r.endTime - r.startTime < duration - 0.01)).mode
      : request.editMode;

    const wholeSong = resolvedMode === 'cover' || resolvedMode === 'extract' || resolvedMode === 'complete';
    const ranges: EditTimeRange[] = wholeSong || request.timeRanges.length === 0
      ? [{ ...(request.timeRanges[0] ?? {}), startTime: 0, endTime: duration }]
      : request.timeRanges;

    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(new Float32Array(buffer.getChannelData(c)));

    const seed = hashString(request.instruction);
    for (const r of ranges) {
      const start = Math.max(0, r.startTime);
      const end = Math.min(duration, r.endTime);
      const layer = renderSynth({
        sampleRate: sr,
        durationSec: end - start + XFADE * 2,
        bpm: r.tempoBpm ?? 96,
        key: r.key,
        beatsPerBar: beatsPerBarFromSignature(r.timeSignature),
        seed,
        brightness: 0.7,
        parts: resolvedMode === 'complete'
          ? { drums: true, bass: true }
          : { arp: true, lead: true, pad: resolvedMode === 'cover' },
      });
      const offset = Math.floor((start - XFADE) * sr);
      for (const ch of channels) {
        let lp = 0;
        for (let i = Math.max(0, offset); i < Math.min(ch.length, offset + layer.length); i++) {
          const t = i / sr;
          const g = gainCurve(t, start, end);
          if (g <= 0) continue;
          const orig = ch[i];
          lp = lp + 0.15 * (orig - lp); // one-pole low-pass
          let wet: number;
          switch (resolvedMode) {
            case 'extract': wet = (orig - lp) * 1.6; break; // crude high-pass "stem"
            case 'cover': wet = lp * 0.8 + layer[i - offset] * 0.9; break;
            case 'lego':
            case 'complete': wet = orig + layer[i - offset] * 0.8; break;
            default: wet = orig * 0.35 + layer[i - offset]; // repaint
          }
          ch[i] = (1 - g) * orig + g * Math.tanh(wet);
        }
      }
    }

    const blob = encodeWav(channels, sr);
    const { id, url } = mockFileStore.put(blob, src.knownMetadata, 'edit');
    const appliedOperations = ranges.map((r) =>
      wholeSong
        ? `${resolvedMode} (whole song)`
        : `${resolvedMode} ${formatTimestamp(r.startTime)}–${formatTimestamp(r.endTime)}${r.tempoBpm ? ` @ ${r.tempoBpm} BPM` : ''}${r.key ? `, ${r.key}` : ''}`,
    );
    const warnings = ['MOCK RESULT: a placeholder audio effect was applied. ACE-Step did not process this audio and your instruction was not interpreted.'];
    if (!request.preserveOriginalOutsideRange && !wholeSong) warnings.push('Mock always preserves audio outside the ranges.');

    return {
      taskId,
      editedAudio: { audioFileId: id, url, fileName: 'edited.wav', durationSec: duration },
      appliedOperations,
      resolvedMode,
      engine: 'mock-dsp',
      isMock: true,
      warnings,
    };
  },
};
