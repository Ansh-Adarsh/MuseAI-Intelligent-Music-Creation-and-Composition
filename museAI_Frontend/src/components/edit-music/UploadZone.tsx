import { useRef, useState, type DragEvent } from 'react';
import { FileAudio, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import type { AudioFile, UploadState } from '@/types/audio';
import { ACCEPT_ATTR } from '@/utils/audioValidation';
import { formatBytes } from '@/utils/format';
import { formatTimestamp } from '@/utils/timestampUtils';
import { env } from '@/config/env';
import { Alert, Badge, Button, cx, ProgressBar } from '@/components/ui/primitives';

interface Props {
  state: UploadState;
  audio: AudioFile | null;
  warnings: string[];
  onFile: (f: File) => void;
  onRemove: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  reading: 'Reading file',
  decoding: 'Preparing audio',
};

export function UploadZone({ state, audio, warnings, onFile, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const busy = state.phase === 'reading' || state.phase === 'decoding';
  const picker = (
    <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
  );

  if (audio) {
        return (
      <div className="space-y-3">
        {picker}
        <div className="panel-inset flex flex-wrap items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileAudio className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium" title={audio.name}>{audio.name}</span>
              {audio.source === 'generated' && <Badge tone="accent">Created in MuseAI</Badge>}
            </div>
            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-studio-300">
              <div><dt className="inline text-studio-400">Format </dt><dd className="inline uppercase">{audio.format}</dd></div>
              <div><dt className="inline text-studio-400">Size </dt><dd className="inline">{formatBytes(audio.sizeBytes)}</dd></div>
              <div><dt className="inline text-studio-400">Duration </dt><dd className="mono inline">{formatTimestamp(audio.durationSec)}</dd></div>
            </dl>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="subtle" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => inputRef.current?.click()}>Replace</Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onRemove}>Remove</Button>
          </div>
        </div>
        {busy && (
          <div className="space-y-1.5">
            <ProgressBar value={state.progress} indeterminate={state.phase === 'decoding'} />
            <div className="text-xs text-studio-300">Loading replacement: {PHASE_LABEL[state.phase]}</div>
          </div>
        )}
        {state.phase === 'error' && state.error && <Alert tone="error" title="Could not load that file (current song kept)">{state.error}</Alert>}
        {warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {picker}
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label="Upload audio file"
        className={cx(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          over ? 'border-accent/70 bg-accent/[0.06]' : 'border-ink/[0.1] bg-studio-850/50 hover:border-ink/[0.2] hover:bg-ink/[0.02]',
        )}
      >
        <div className={cx('flex h-14 w-14 items-center justify-center rounded-2xl transition-colors', over ? 'bg-accent text-white' : 'bg-accent/10 text-accent group-hover:bg-accent/15')}>
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <div className="text-base font-semibold">Drop your song here</div>
          <p className="mt-1 text-sm text-studio-300">Drag and drop, or <span className="text-accent underline-offset-2 group-hover:underline">browse files</span></p>
          <p className="mt-2 text-xs text-studio-400">MP3, WAV, FLAC, M4A, OGG · up to {env.maxUploadMb} MB</p>
        </div>
        {busy && (
          <div className="mt-2 w-full max-w-sm space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <ProgressBar value={state.progress} indeterminate={state.phase === 'decoding'} />
            <div className="text-xs text-studio-300">{PHASE_LABEL[state.phase]} {state.phase === 'reading' && `${Math.round(state.progress * 100)}%`}</div>
          </div>
        )}
      </div>
      {state.phase === 'error' && state.error && <Alert tone="error" title="Could not load this file">{state.error}</Alert>}
    </div>
  );
}
