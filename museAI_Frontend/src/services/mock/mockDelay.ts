import type { ServiceCallOptions } from '../types';
import { sleep } from '@/utils/format';

/** Simulates an async backend task with queued -> running -> succeeded updates. */
export async function simulateTask(taskId: string, totalMs: number, opts: ServiceCallOptions | undefined, label: string) {
  opts?.onStatus?.({ taskId, state: 'queued', progress: 0, message: 'Starting…', queuePosition: 1 });
  await sleep(Math.min(400, totalMs * 0.1), opts?.signal);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await sleep(totalMs / steps, opts?.signal);
    opts?.onStatus?.({ taskId, state: 'running', progress: i / steps, message: `${label}… ${Math.round((i / steps) * 100)}%` });
  }
}
