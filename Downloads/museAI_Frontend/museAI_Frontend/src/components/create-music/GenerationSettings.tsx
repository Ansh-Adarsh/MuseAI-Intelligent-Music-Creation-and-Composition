import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { FormErrors, GenerationForm } from '@/hooks/useMusicGeneration';
import { KEY_OPTIONS, LIMITS, SUPPORTED_TIME_SIGNATURES, VOCAL_LANGUAGES } from '@/config/aceStepCapabilities';
import { SettingField } from '@/components/ui/SettingField';
import { Badge, cx, Switch } from '@/components/ui/primitives';

interface Props {
  form: GenerationForm;
  errors: FormErrors;
  update: <K extends keyof GenerationForm>(key: K, value: GenerationForm[K]) => void;
}

/**
 * Optional settings. Model internals (DiT variant, LM thinking, inference
 * steps, guidance) are deliberately not exposed; their defaults live in
 * DEFAULT_FORM (hooks/useMusicGeneration.ts).
 */
export function GenerationSettings({ form, errors, update }: Props) {
  const [open, setOpen] = useState(false);
  const hasErrors = (['durationSec', 'bpm', 'keyScale', 'timeSignature', 'seed'] as const).some((k) => errors[k]);
  const isOpen = open || hasErrors;

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/[0.02] sm:px-6"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><SlidersHorizontal className="h-4 w-4" /></span>
          <span>
            <span className="block text-[15px] font-semibold">Song settings</span>
            <span className="block text-xs text-studio-300">
              Optional · {form.durationSec ? `${form.durationSec}s` : 'auto length'} · {form.bpm ? `${form.bpm} BPM` : 'auto tempo'} · {form.keyScale || 'auto key'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {hasErrors && <Badge tone="rose">Check values</Badge>}
          <ChevronDown className={cx('h-4 w-4 text-studio-300 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen && (
        <div className="space-y-6 border-t border-ink/[0.06] px-5 pb-6 pt-5 sm:px-6">
          <Group title="Music" note="Leave a field on auto and MuseAI will choose a fitting value.">
            <SettingField label="Instrumental" hint="Create music without vocals.">
              <div className="flex h-9 items-center"><Switch checked={form.instrumental} onChange={(v) => update('instrumental', v)} label="Instrumental" /></div>
            </SettingField>
            <SettingField label="Vocal language" htmlFor="lang" hint="Language of the lyrics.">
              <select id="lang" className="input" value={form.vocalLanguage} onChange={(e) => update('vocalLanguage', e.target.value)} disabled={form.instrumental}>
                {VOCAL_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </SettingField>
            <SettingField label="Duration (seconds)" htmlFor="dur" error={errors.durationSec} hint={`${LIMITS.durationMin}–${LIMITS.durationMax} seconds. Leave empty to fit the lyrics.`}>
              <input id="dur" className={cx('input mono', errors.durationSec && 'input-error')} inputMode="numeric" placeholder="auto"
                value={form.durationSec} onChange={(e) => update('durationSec', e.target.value)} />
            </SettingField>
            <SettingField label="Tempo (BPM)" htmlFor="bpm" error={errors.bpm} hint={`${LIMITS.bpmMin}–${LIMITS.bpmMax} BPM.`}>
              <input id="bpm" className={cx('input mono', errors.bpm && 'input-error')} inputMode="numeric" placeholder="auto"
                value={form.bpm} onChange={(e) => update('bpm', e.target.value)} />
            </SettingField>
            <SettingField label="Key / scale" htmlFor="key" error={errors.keyScale} hint='For example "A minor" or "F# major".'>
              <input id="key" list="key-options" className={cx('input', errors.keyScale && 'input-error')} placeholder="auto"
                value={form.keyScale} onChange={(e) => update('keyScale', e.target.value)} />
              <datalist id="key-options">{KEY_OPTIONS.map((k) => <option key={k} value={k} />)}</datalist>
            </SettingField>
            <SettingField label="Time signature" htmlFor="ts" error={errors.timeSignature}>
              <select id="ts" className="input" value={form.timeSignature} onChange={(e) => update('timeSignature', e.target.value)}>
                <option value="">auto</option>
                {SUPPORTED_TIME_SIGNATURES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </SettingField>
          </Group>

          <Group title="Output">
            <SettingField label="Variations" htmlFor="batch" hint="How many versions to create at once.">
              <select id="batch" className="input" value={form.batchSize} onChange={(e) => update('batchSize', Number(e.target.value))}>
                {Array.from({ length: LIMITS.batchMax }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </SettingField>
            <SettingField label="File format" htmlFor="fmt">
              <select id="fmt" className="input" value={form.audioFormat} onChange={(e) => update('audioFormat', e.target.value as GenerationForm['audioFormat'])}>
                {(['mp3', 'wav', 'flac', 'opus', 'aac'] as const).map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </SettingField>
            <SettingField label="Seed" htmlFor="seed" error={errors.seed} hint="Reuse a seed to recreate a result. Empty = random.">
              <input id="seed" className={cx('input mono', errors.seed && 'input-error')} inputMode="numeric" placeholder="random"
                value={form.seed} onChange={(e) => update('seed', e.target.value)} />
            </SettingField>
          </Group>

          <Group title="Details">
            <SettingField label="Track title" htmlFor="title">
              <input id="title" className="input" placeholder="Untitled" value={form.title} onChange={(e) => update('title', e.target.value)} />
            </SettingField>
            <SettingField label="Tags" htmlFor="tags" hint="Comma separated.">
              <input id="tags" className="input" placeholder="demo, ballad" value={form.tags} onChange={(e) => update('tags', e.target.value)} />
            </SettingField>
          </Group>
        </div>
      )}
    </section>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="label">{title}</h3>
        {note && <span className="text-[11px] text-studio-400">{note}</span>}
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
