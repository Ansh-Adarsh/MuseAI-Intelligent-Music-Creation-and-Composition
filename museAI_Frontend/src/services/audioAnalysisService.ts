import { env } from '@/config/env';
import type { AudioAnalysisResponse } from '@/types/music';
import type { AudioFile } from '@/types/audio';
import type { ServiceCallOptions } from './types';
import { mockAnalysisService } from './mock/mockAnalysisService';
import { httpAnalysisService } from './http/httpServices';

const impl = env.serviceMode === 'http' ? httpAnalysisService : mockAnalysisService;

export function analyzeAudio(audio: AudioFile, opts?: ServiceCallOptions): Promise<AudioAnalysisResponse> {
  return impl.analyzeAudio(audio, opts);
}
