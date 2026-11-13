import { CornerDownRight, History, Play } from 'lucide-react';
import type { MusicEditingApi } from '@/hooks/useMusicEditing';
import { Badge, Button, cx, Panel } from '@/components/ui/primitives';
import { formatTimestamp } from '@/utils/timestampUtils';
import { describeEdit } from '@/utils/describeEdit';

export function EditHistory({ editing }: { editing: MusicEditingApi }) {
  const { versions, source, latestResult, selectSourceVersion, setLatestResultId } = editing;
  if (versions.length === 0) return null;
  return (
    <Panel title="Version history" icon={<History className="h-4 w-4" />} subtitle="Every edit is a new version. The original is never overwritten.">
      <ol className="space-y-1.5">
        {versions.map((v) => {
          const parent = v.edit ? versions.find((x) => x.id === v.edit!.parentVersionId) : null;
          const isSource = source?.id === v.id;
          const isShown = latestResult?.id === v.id;
          return (
            <li key={v.id} className={cx('rounded-xl border px-3 py-2.5 transition-colors', isSource ? 'border-accent/40 bg-accent/[0.05]' : 'border-ink/[0.05] bg-ink/[0.015]')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {v.index > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-studio-400" />}
                  <span className="text-sm font-medium">{v.label}</span>
                  {v.index === 0 && <Badge>original</Badge>}
                  {isSource && <Badge tone="accent">edit source</Badge>}
                  <span className="truncate text-xs text-studio-400">{v.audio.name}</span>
                </div>
                <div className="flex gap-1.5">
                  {v.edit && !isShown && <Button size="sm" variant="ghost" icon={<Play className="h-3 w-3" />} onClick={() => setLatestResultId(v.id)}>Compare</Button>}
                  {!isSource && <Button size="sm" variant="subtle" onClick={() => selectSourceVersion(v.id)}>Edit this version</Button>}
                </div>
              </div>
              {v.edit && (
                <div className="mt-1.5 space-y-0.5 pl-5 text-[11px] text-studio-400">
                  <div className="text-studio-300">“{v.edit.request.instruction}”</div>
                  <div>from {parent?.label ?? '?'} · {describeEdit(v)}</div>
                </div>
              )}
              {v.index === 0 && <div className="mt-1 pl-0.5 text-[11px] text-studio-400">{formatTimestamp(v.audio.durationSec)} · {v.audio.source === 'generated' ? 'created in MuseAI' : 'uploaded'}</div>}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
