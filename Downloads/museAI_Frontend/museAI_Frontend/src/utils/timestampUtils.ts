/** Timestamp helpers. Canonical display format: mm:ss.mmm (or h:mm:ss.mmm). */

export function formatTimestamp(seconds: number, withMillis = true): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m).padStart(2, '0');
  const base = `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
  return withMillis ? `${base}.${String(ms).padStart(3, '0')}` : base;
}

/** Short player format, e.g. 1:05. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Parse "mm:ss.mmm", "m:ss", "h:mm:ss.mmm", "ss.mmm" or plain seconds.
 * Returns null if the string is not a valid timestamp.
 */
export function parseTimestamp(input: string): number | null {
  const str = input.trim();
  if (!str) return null;
  if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
  const m = str.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const [, h, mm, ss, ms] = m;
  const minutes = Number(mm);
  const secs = Number(ss);
  if (secs >= 60 || (h !== undefined && minutes >= 60)) return null;
  const millis = ms ? Number(ms.padEnd(3, '0')) : 0;
  return (h ? Number(h) * 3600 : 0) + minutes * 60 + secs + millis / 1000;
}

export interface RangeValidation {
  ok: boolean;
  errors: string[];
}

export function validateRange(start: number, end: number, duration: number): RangeValidation {
  const errors: string[] = [];
  const eps = 0.0005;
  if (start < 0) errors.push('Start time cannot be negative.');
  if (end <= start) errors.push('End time must be after start time.');
  if (duration > 0 && end > duration + eps) errors.push(`End time exceeds the audio duration (${formatTimestamp(duration)}).`);
  if (duration > 0 && start >= duration) errors.push('Start time is beyond the end of the audio.');
  return { ok: errors.length === 0, errors };
}

export function rangesOverlap(a: { startTime: number; endTime: number }, b: { startTime: number; endTime: number }): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}
