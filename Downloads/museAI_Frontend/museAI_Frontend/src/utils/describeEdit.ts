import type { AudioVersion } from '@/types/music';
import { EDIT_MODES } from '@/config/aceStepCapabilities';
import { formatTimestamp } from './timestampUtils';

/** Short, user-facing summary of what an edit did. */
export function describeEdit(v: AudioVersion): string {
  if (!v.edit) return '';
  const mode = EDIT_MODES.find((m) => m.id === v.edit!.response.resolvedMode);
  const label = mode?.label ?? 'Edited';
  if (!mode?.usesRanges) return `${label} · whole song`;
  const ranges = v.edit.request.timeRanges.map((r) => `${formatTimestamp(r.startTime)}–${formatTimestamp(r.endTime)}`);
  return `${label} · ${ranges.join(', ')}`;
}
