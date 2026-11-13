import { Feather, Loader2, Music, Square, Wand2 } from 'lucide-react';
import type { MusicGenerationApi } from '@/hooks/useMusicGeneration';
import type { AudioFile } from '@/types/audio';
import { LyricsInput } from './LyricsInput';
import { StyleInput } from './StyleInput';
import { GenerationSettings } from './GenerationSettings';
import { GenerationResult } from './GenerationResult';
import { Alert, Button, EqIcon, Panel, ProgressBar } from '@/components/ui/primitives';

export function CreateMusicWorkspace({ gen, onEditSong }: { gen: MusicGenerationApi; onEditSong: (a: AudioFile) => void }) {
  const { form, update, errors, state, generate, cancel, history } = gen;
  const busy = state.phase === 'submitting' || state.phase === 'processing';
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Panel title="Song" icon={<Feather className="h-4 w-4" />} subtitle="Write your lyrics and describe how the song should sound.">
          <div className="space-y-6">
            <LyricsInput value={form.lyrics} onChange={(v) => update('lyrics', v)} error={errors.lyrics} instrumental={form.instrumental} />
            <StyleInput value={form.caption} onChange={(v) => update('caption', v)} error={errors.caption} />
          </div>
        </Panel>
        <GenerationSettings form={form} errors={errors} update={update} />
      </div>

      <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Generate</h2>
                <p className="text-xs text-studio-300">
                  {form.instrumental || !form.lyrics.trim() ? 'Instrumental' : 'With vocals'} · {form.batchSize} version{form.batchSize > 1 ? 's' : ''}
                </p>
              </div>
              {busy && <EqIcon className="text-accent" />}
            </div>
            {busy ? (
              <div className="space-y-3">
                <ProgressBar value={state.progress} />
                <div className="flex items-center justify-between text-xs text-studio-300">
                  <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />{state.message ?? 'Composing…'}</span>
                  <Button size="sm" variant="ghost" icon={<Square className="h-3 w-3" />} onClick={cancel}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="lg" icon={<Wand2 className="h-5 w-5" />} onClick={generate} className="w-full">
                Generate Music
              </Button>
            )}
            {errorCount > 0 && !busy && <Alert tone="error">Fix {errorCount} field{errorCount > 1 ? 's' : ''} before generating.</Alert>}
            {state.phase === 'error' && state.error && <Alert tone="error" title="Generation failed">{state.error}</Alert>}
          </div>
        </section>

        {state.data ? (
          <GenerationResult result={state.data} onEdit={onEditSong} />
        ) : (
          <section className="panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.04] text-studio-400"><Music className="h-6 w-6" /></div>
            <div className="text-sm font-medium text-studio-200">No music generated yet</div>
            <p className="max-w-xs text-xs text-studio-400">Write lyrics (optional), describe the style, then press Generate Music. Your result appears here, ready to send to the editor.</p>
          </section>
        )}

        {history.length > 1 && (
          <Panel title="Earlier generations" subtitle="This session only">
            <ul className="space-y-1.5">
              {history.slice(1).map((h) => (
                <li key={h.response.taskId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-ink/[0.03]">
                  <span className="truncate text-studio-300" title={h.request.params.caption}>{h.takes[0]?.name} — {h.request.params.caption}</span>
                  <Button size="sm" variant="subtle" onClick={() => h.takes[0] && onEditSong(h.takes[0])}>Edit</Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
