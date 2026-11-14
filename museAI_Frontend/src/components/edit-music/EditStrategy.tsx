import { Info, Sparkles } from 'lucide-react';
import type { MusicEditingApi } from '@/hooks/useMusicEditing';
import type { AceStepTrackName, EditMode } from '@/types/music';
import { EDIT_MODES, TRACK_NAMES } from '@/config/aceStepCapabilities';
import { SettingField } from '@/components/ui/SettingField';
import { Alert, cx, Switch } from '@/components/ui/primitives';

const TRACK_LABELS: Record<AceStepTrackName, string> = {
  vocals: 'Lead vocals', backing_vocals: 'Backing vocals', drums: 'Drums', bass: 'Bass', guitar: 'Guitar',
  keyboard: 'Keys / piano', percussion: 'Percussion', strings: 'Strings', synth: 'Synth', fx: 'FX',
  brass: 'Brass', woodwinds: 'Woodwinds',
};

export function EditStrategy({ editing }: { editing: MusicEditingApi }) {
  const { settings, setSettings, suggestion, resolvedMode } = editing;
  const set = <K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const resolved = EDIT_MODES.find((m) => m.id === resolvedMode)!;
  const needsTrack = settings.editMode === 'lego' || settings.editMode === 'extract' || settings.editMode === 'complete';
  const multiTrack = settings.editMode === 'complete';

  const chooseMode = (id: EditMode) => {
    setSettings((s) => ({
      ...s,
      editMode: id,
      trackNames: id === 'lego' || id === 'extract' ? s.trackNames.slice(0, 1) : s.trackNames,
    }));
  };

  const toggleTrack = (t: AceStepTrackName) => {
    setSettings((s) => {
      if (!multiTrack) return { ...s, trackNames: s.trackNames[0] === t ? [] : [t] };
      return { ...s, trackNames: s.trackNames.includes(t) ? s.trackNames.filter((x) => x !== t) : [...s.trackNames, t] };
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="label mb-2">How should we apply it?</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {EDIT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => chooseMode(m.id)} aria-pressed={settings.editMode === m.id}
              className={cx('rounded-xl border px-3 py-2.5 text-left transition-colors',
                settings.editMode === m.id ? 'border-accent/30 text-white shadow-sm' : 'border-ink/[0.08] bg-white/60 hover:border-purple-200 hover:bg-purple-50/50')}
              style={settings.editMode === m.id ? { background: 'linear-gradient(135deg, #5b4de0 0%, #7c4ddb 50%, #3b7ddd 100%)' } : {}}>
              <span className={cx('flex items-center gap-1.5 text-sm font-medium', settings.editMode === m.id ? 'text-white' : 'text-studio-100')}>
                {m.id === 'auto' && <Sparkles className="h-3.5 w-3.5" />}{m.label}
              </span>
              <p className={cx('mt-1 text-[11px] leading-snug', settings.editMode === m.id ? 'text-white/70' : 'text-studio-400')}>{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {settings.editMode === 'auto' && suggestion && (
        <Alert tone="info" title={<>We’ll use <span className="text-signal-cyan">{resolved.label}</span>{suggestion.trackNames.length > 0 && <> · {suggestion.trackNames.map((t) => TRACK_LABELS[t]).join(', ')}</>}</>}>
          {suggestion.reason}
        </Alert>
      )}

      {needsTrack && (
        <div>
          <div className="label mb-2">{multiTrack ? 'Instruments to add' : settings.editMode === 'extract' ? 'Instrument to isolate' : 'Instrument to add'}</div>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_NAMES.map((t) => {
              const on = settings.trackNames.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTrack(t)} aria-pressed={on}
                  className={cx('rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    on ? 'border-transparent text-white' : 'border-ink/[0.08] bg-white/60 text-studio-300 hover:text-studio-100 hover:border-purple-200')}
                  style={on ? { background: 'linear-gradient(135deg, #5b4de0 0%, #3b7ddd 100%)' } : {}}>
                  {TRACK_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <SettingField label="Style for the new part" htmlFor="edit-caption" hint="Optional. Leave empty to use your description.">
          <input id="edit-caption" className="input" placeholder="e.g. emotional, sitar lead, warm strings" value={settings.styleCaption} onChange={(e) => set('styleCaption', e.target.value)} />
        </SettingField>
        {resolvedMode === 'cover' ? (
          <SettingField label={`Restyle intensity: ${Math.round((1 - settings.coverStrength) * 100)}%`} htmlFor="cover" hint="Higher values move further from the original.">
            <input id="cover" type="range" className="range-input mt-3" min={0} max={1} step={0.05}
              value={1 - settings.coverStrength} onChange={(e) => set('coverStrength', 1 - Number(e.target.value))} />
          </SettingField>
        ) : (
          <SettingField label="Keep the rest of the song unchanged">
            <div className="flex h-9 items-center gap-3">
              <Switch checked={settings.preserveOutside} onChange={(v) => set('preserveOutside', v)} label="Keep the rest unchanged" disabled={!resolved.usesRanges} />
              {!resolved.usesRanges && <span className="flex items-center gap-1 text-[11px] text-studio-400"><Info className="h-3 w-3" />This option changes the whole song.</span>}
            </div>
          </SettingField>
        )}
      </div>
    </div>
  );
}
