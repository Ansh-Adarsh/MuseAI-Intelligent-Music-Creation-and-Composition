/**
 * Thin HTTP client for the MuseAI FastAPI backend.
 * Accepts either a raw JSON body or an ACE-Step-style envelope
 * `{ data, code, error }` so the backend can choose either convention.
 */
import { env, endpoints } from '@/config/env';
import { ServiceError, type ServiceCallOptions } from '../types';
import type { TaskAccepted, TaskStatus } from '@/types/music';
import { sleep } from '@/utils/format';

export function absoluteUrl(pathOrUrl: string): string {
  if (/^(https?:|blob:|data:)/.test(pathOrUrl)) return pathOrUrl;
  return `${env.apiBaseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body && ('code' in body || 'error' in body)) {
    const env = body as { data: T; error?: string | null; code?: number };
    if (env.error) throw new ServiceError(env.error, env.code);
    return env.data;
  }
  return body as T;
}

export async function apiRequest<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(absoluteUrl(path), {
      ...init,
      headers: init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ServiceError('We couldn’t reach the server. Please check your connection and try again.');
  }
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const detail = (body as { detail?: unknown; error?: string })?.detail ?? (body as { error?: string })?.error ?? res.statusText;
    throw new ServiceError(typeof detail === 'string' ? detail : `Request failed (${res.status})`, res.status, body);
  }
  return unwrap<T>(body);
}

/** Multipart upload with progress (fetch has no upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', absoluteUrl(path));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let body: unknown = null;
      try { body = JSON.parse(xhr.responseText); } catch { body = xhr.responseText; }
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(unwrap<T>(body)); } catch (e) { reject(e); }
      } else {
        reject(new ServiceError((body as { detail?: string })?.detail ?? `Upload failed (${xhr.status})`, xhr.status, body));
      }
    };
    xhr.onerror = () => reject(new ServiceError('We couldn’t reach the server. Please check your connection and try again.'));
    signal?.addEventListener('abort', () => { xhr.abort(); reject(new DOMException('Aborted', 'AbortError')); });
    xhr.send(form);
  });
}

/** Poll GET /api/music/status/{task_id} until done, then GET /api/music/result/{task_id}. */
export async function awaitTaskResult<T>(accepted: TaskAccepted, opts?: ServiceCallOptions): Promise<T> {
  const { taskId } = accepted;
  opts?.onStatus?.({ taskId, state: accepted.state, queuePosition: accepted.queuePosition });
  for (;;) {
    const status = await apiRequest<TaskStatus>(endpoints.status(taskId), { method: 'GET', signal: opts?.signal });
    opts?.onStatus?.(status);
    if (status.state === 'succeeded') break;
    if (status.state === 'failed') throw new ServiceError(status.message ?? 'Something went wrong while processing. Please try again.');
    await sleep(env.pollIntervalMs, opts?.signal);
  }
  return apiRequest<T>(endpoints.result(taskId), { method: 'GET', signal: opts?.signal });
}
