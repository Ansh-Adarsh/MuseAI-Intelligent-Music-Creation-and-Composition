/**
 * MOCK analysis service. Returns sample BPM / key / time signature values.
 * The values are NOT measured from the audio (except duration, which the
 * browser measures). For audio the mock generated itself, it echoes the
 * parameters it used.
 */
import type { AudioAnalysisService, ServiceCallOptions } from '../types';
import type { AnalysisSegment, AudioAnalysisResponse, MusicMetadata } from '@/types/music';
import type { AudioFile } from '@/types/audio';
import { hashString, uid } from '@/utils/format';
import { mockFileStore } from './mockFileStore';
import { simulateTask } from './mockDelay';

const SAMPLE_KEYS = ['A minor', 'C major', 'F# minor', 'D major', 'E minor', 'G major', 'Bb major', 'C# minor'];
const SAMPLE_TS = ['4/4', '4/4', '4/4', '3/4', '6/8'];

export const mockAnalysisService: AudioAnalysisService = {
  async analyzeAudio(audio: AudioFile, opts?: ServiceCallOptions): Promise<AudioAnalysisResponse> {
    // "Upload": register the blob in the mock store unless already known.
    let fileId = audio.backendFileId;
    if (!fileId || !mockFileStore.get(fileId)) {
      fileId = mockFileStore.put(audio.blob, undefined, 'upload').id;
    }
    await simulateTask(uid('mockana'), 1200, opts, 'Analyzing audio');

    const known = mockFileStore.get(fileId)?.knownMetadata;
    const h = hashString(`${audio.name}:${audio.sizeBytes}`);
    const global: MusicMetadata = known ?? {
      key: SAMPLE_KEYS[h % SAMPLE_KEYS.length],
      tempoBpm: 72 + (h % 80),
      timeSignature: SAMPLE_TS[(h >>> 4) % SAMPLE_TS.length],
    };
    const globalConfidence = known
      ? { key: 0.99, tempoBpm: 0.99, timeSignature: 0.99 }
      : { key: 0.55 + ((h >>> 8) % 40) / 100, tempoBpm: 0.6 + ((h >>> 12) % 35) / 100, timeSignature: 0.5 + ((h >>> 16) % 30) / 100 };

    // Fake section estimates (every ~30s) so per-range rows have something to show.
    const segments: AnalysisSegment[] = [];
    const segLen = 30;
    for (let s = 0; s < audio.durationSec; s += segLen) {
      segments.push({
        startTime: s,
        endTime: Math.min(audio.durationSec, s + segLen),
        metadata: { ...global },
        confidence: { key: (globalConfidence.key ?? 0.5) - 0.1, tempoBpm: (globalConfidence.tempoBpm ?? 0.5) - 0.05, timeSignature: (globalConfidence.timeSignature ?? 0.5) - 0.1 },
      });
    }

    return {
      audioFileId: fileId,
      durationSec: audio.durationSec,
      global,
      globalConfidence,
      segments,
      analyzer: known ? 'mock-analyzer (echoing mock generation params)' : 'mock-analyzer (sample values, not measured)',
      isMock: true,
    };
  },
};
