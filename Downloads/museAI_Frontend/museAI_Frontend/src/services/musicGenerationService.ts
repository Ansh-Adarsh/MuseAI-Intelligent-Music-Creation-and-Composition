import { env } from '@/config/env';
import type { MusicGenerationRequest, MusicGenerationResponse } from '@/types/music';
import type { ServiceCallOptions } from './types';
import { mockGenerationService } from './mock/mockGenerationService';
import { httpGenerationService } from './http/httpServices';

const impl = env.serviceMode === 'http' ? httpGenerationService : mockGenerationService;

export function generateMusic(request: MusicGenerationRequest, opts?: ServiceCallOptions): Promise<MusicGenerationResponse> {
  return impl.generateMusic(request, opts);
}
