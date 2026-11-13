import { env } from '@/config/env';
import type { MusicEditRequest, MusicEditResponse } from '@/types/music';
import type { ServiceCallOptions } from './types';
import { mockEditingService } from './mock/mockEditingService';
import { httpEditingService } from './http/httpServices';

const impl = env.serviceMode === 'http' ? httpEditingService : mockEditingService;

export function editMusic(request: MusicEditRequest, opts?: ServiceCallOptions): Promise<MusicEditResponse> {
  return impl.editMusic(request, opts);
}
