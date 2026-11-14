import { useMemo, useRef } from 'react';
import { Clock3, FileAudio2, Headphones, Loader2, MessageSquareText, Plus, Square, TableProperties, Wand2 } from 'lucide-react';
import type { AudioUploadApi } from '@/hooks/useAudioUpload';
import type { MusicEditingApi } from '@/hooks/useMusicEditing';
import { UploadZone } from './UploadZone';
import { ChangeDescription } from './ChangeDescription';
import { EditStrategy } from './EditStrategy';
import { EditResult } from './EditResult';
import { EditHistory } from './EditHistory';
import { MetadataTable } from '@/components/metadata-table/MetadataTable';
import { AudioPlayer } from '@/components/audio-player/AudioPlayer';
import { Alert, Badge, Button, Panel, ProgressBar } from '@/components/ui/primitives';
import { formatTimestamp, parseTimestamp } from '@/utils/timestampUtils';
import { validateAudioFile } from '@/utils/audioValidation';

const TS_RANGE_RE = /(\d{1,2}:\d{2}(?:\.\d{1,3})?)\s*(?:-|–|—|to|and|until)\s*(\d{1,2}:\d{2}(?:\.\d{1,3})?)/gi;

export function EditMusicWorkspace({ upload, editing }: { upload: AudioUploadApi; editing: MusicEditingApi }) {
  const instructionRef = useRef<HTMLDivElement>(null);
  const { source, original, latestResult, ranges, duration, editState } = editing;
  const busy = editState.phase === 'submitting' || editState.phase === 'processing';

  const onFile = async (f: File) => {
    if (validateAudioFile(f).ok && editing.versions.length > 1 && !window.confirm('Replace the current song? Your edit history for it will be cleared.')) return;
    const af = await upload.uploadFile(f);
    if (af) editing.startSession(af);
  };
  const onRemove = () => {
    if (editing.versions.length > 1 && !window.confirm('Remove the song and its edit history?')) return;
    upload.clear();
    editing.endSession();
  };

  // Offer timestamps found in the instruction as table ranges.
  const mentionedRanges = useMemo(() => {
    const out: { start: number; end: number }[] = [];
    for (const m of editing.instruction.matchAll(TS_RANGE_RE)) {
      const s = parseTimestamp(m[1]);
      const e = parseTimestamp(m[2]);
      if (s !== null && e !== null && e > s && e <= duration + 1e-3) {
        if (!ranges.some((r) => Math.abs(r.startTime - s) < 0.01 && Math.abs(r.endTime - e) < 0.01)) out.push({ start: s, end: e });
      }
    }
    return out;
  }, [editing.instruction, ranges, duration]);

  const regions = ranges.map((r, i) => ({ id: r.id, start: r.startTime, end: r.endTime, label: r.isFullTrack ? undefined : `R${i + 1}`, active: r.selected && !r.isFullTrack }));
  const parent = latestResult?.edit ? editing.versions.find((v) => v.id === latestResult.edit!.parentVersionId) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel title="Upload Your Music" icon={<FileAudio2 className="h-4 w-4" />}
            subtitle={source && source.index > 0 ? `Editing ${source.label}. Your original is kept unchanged.` : 'Upload a song, or send one from Create Music.'}>
            <UploadZone
              state={upload.state}
              audio={original?.audio ?? upload.audio}
              warnings={upload.warnings}
              onFile={onFile}
              onRemove={onRemove}
            />
          </Panel>

          {source && (
            <Panel title="Audio Analysis & Timeline Settings" icon={<TableProperties className="h-4 w-4" />}
              subtitle="Key, tempo and time signature are filled in automatically. Edit any value, or add time ranges to target specific parts.">
              <MetadataTable editing={editing} analysis={editing.analysis} />
            </Panel>
          )}
          {source && (
            <Panel title="Preview" icon={<Headphones className="h-4 w-4" />} subtitle="Listen before editing. Drag across the waveform to add a time range.">
              <AudioPlayer
                key={source.id}
                audio={source.audio}
                title={source.label}
                waveformHeight={110}
                regions={regions}
                onSelectRange={(s, e) => editing.addRange(s, e)}
              />
            </Panel>
          )}

        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div ref={instructionRef}>
            <Panel title="Changes" icon={<MessageSquareText className="h-4 w-4" />}>
              <div className="space-y-5">
                <ChangeDescription value={editing.instruction} onChange={(v) => { editing.setInstruction(v); editing.setFormError(null); }} />
                {mentionedRanges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-studio-300">
                    <Clock3 className="h-3.5 w-3.5 text-accent" />Found in your text:
                    {mentionedRanges.map((r) => (
                      <Button key={`${r.start}-${r.end}`} size="sm" variant="subtle" icon={<Plus className="h-3 w-3" />} onClick={() => editing.addRange(r.start, r.end)}>
                        {formatTimestamp(r.start)}–{formatTimestamp(r.end)}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="border-t border-ink/[0.05] pt-5"><EditStrategy editing={editing} /></div>
              </div>
            </Panel>
          </div>

          <section className="panel p-5 sm:p-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-semibold">Apply</h2>
                  <p className="text-xs text-studio-300">
                    {source ? <>Editing {source.label} · {ranges.filter((r) => r.selected).length} time range{ranges.filter((r) => r.selected).length === 1 ? '' : 's'} selected</> : 'Upload a song to get started'}
                  </p>
                </div>
                {editing.analysis.phase === 'processing' && <Badge tone="neutral">Analyzing…</Badge>}
              </div>
              {busy ? (
                <div className="space-y-3">
                  <ProgressBar value={editState.progress} />
                  <div className="flex items-center justify-between text-xs text-studio-300">
                    <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />{editState.message}</span>
                    <Button size="sm" variant="ghost" icon={<Square className="h-3 w-3" />} onClick={editing.cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" size="lg" className="w-full" icon={<Wand2 className="h-5 w-5" />} onClick={editing.applyChanges} disabled={!source}>
                  Apply Changes
                </Button>
              )}
              {editing.formError && <Alert tone="error">{editing.formError}</Alert>}
              {editState.phase === 'error' && editState.error && <Alert tone="error" title="Edit failed">{editState.error}</Alert>}
            </div>
          </section>
        </div>
      </div>

      {latestResult && parent && original && (
        <EditResult
          result={latestResult}
          parent={parent}
          original={original}
          onApplyAnother={() => {
            editing.setInstruction('');
            instructionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            instructionRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
          }}
          onSendBack={() => {
            editing.selectSourceVersion(latestResult.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <EditHistory editing={editing} />
    </div>
  );
}
