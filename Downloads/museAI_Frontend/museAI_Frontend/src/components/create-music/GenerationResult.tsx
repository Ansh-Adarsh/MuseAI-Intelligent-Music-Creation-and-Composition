import { useEffect, useState } from 'react';
import { AudioLines, Music2, Wand2 } from 'lucide-react';
import type { GenerationResult as Result } from '@/hooks/useMusicGeneration';
import type { AudioFile } from '@/types/audio';
import { AudioPlayer } from '@/components/audio-player/AudioPlayer';
import { Alert, Badge, Button, cx, Panel } from '@/components/ui/primitives';
import { formatTimestamp } from '@/utils/timestampUtils';

export function GenerationResult({ result, onEdit }: { result: Result; onEdit: (audio: AudioFile) => void }) {
  const [takeIdx, setTakeIdx] = useState(0);
  useEffect(() => setTakeIdx(0), [result]);
  const take = result.takes[takeIdx] ?? result.takes[0];
  const meta = result.response.resolvedMetadata;

  return (
    <Panel
      title="Generated music"
      icon={<Music2 className="h-4 w-4" />}
      subtitle="Your song is ready to play, download or edit."
      actions={<Button variant="primary" icon={<Wand2 className="h-4 w-4" />} onClick={() => onEdit(take)}>Edit This Song</Button>}
    >
      <div className="space-y-4">
        {result.takes.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Versions">
            {result.takes.map((t, i) => (
              <button key={t.id} role="tab" aria-selected={i === takeIdx} onClick={() => setTakeIdx(i)}
                className={cx('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  i === takeIdx ? 'border-accent/50 bg-accent/10 text-accent' : 'border-ink/[0.06] text-studio-300 hover:text-studio-100')}>
                Version {i + 1}
              </button>
            ))}
          </div>
        )}
        {take && <AudioPlayer key={take.id} audio={take} title="Output" waveformHeight={88} />}
        <div className="flex flex-wrap items-center gap-2 text-xs text-studio-300">
          <AudioLines className="h-3.5 w-3.5 text-studio-400" />
          <span>Song details:</span>
          {meta.key && <Badge tone="accent">{meta.key}</Badge>}
          {meta.tempoBpm && <Badge tone="accent">{meta.tempoBpm} BPM</Badge>}
          {meta.timeSignature && <Badge tone="accent">{meta.timeSignature}</Badge>}
          {meta.durationSec && <Badge>{formatTimestamp(meta.durationSec, false)}</Badge>}
          {result.response.takes[takeIdx]?.seed !== undefined && <Badge>seed {result.response.takes[takeIdx].seed}</Badge>}
        </div>
        {!result.response.isMock && result.response.warnings.length > 0 && (
          <Alert tone="info">
            <ul className="list-disc space-y-0.5 pl-4">{result.response.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </Alert>
        )}
      </div>
    </Panel>
  );
}
