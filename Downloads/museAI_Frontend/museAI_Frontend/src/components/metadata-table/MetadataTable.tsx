import { useState } from 'react';
import { Check, CheckCircle2, Pencil, Plus, RotateCcw, Trash2, X, AlertTriangle, ListRestart, Loader2, RefreshCw } from 'lucide-react';
import type { AsyncState, AudioAnalysisResponse, MetadataField, MetadataProvenance, TimeRange } from '@/types/music';
import type { MusicEditingApi } from '@/hooks/useMusicEditing';
import { effectiveValue, provenanceOf, validateRow } from '@/hooks/useMusicEditing';
import { formatTimestamp, parseTimestamp, validateRange } from '@/utils/timestampUtils';
import { KEY_OPTIONS, SUPPORTED_TIME_SIGNATURES } from '@/config/aceStepCapabilities';
import { Alert, Badge, Button, cx, IconButton, ProgressBar } from '@/components/ui/primitives';

const PROV: Record<MetadataProvenance, { label: string; tone: 'green' | 'amber' | 'violet' | 'neutral'; tip: string }> = {
  detected: { label: 'Detected', tone: 'green', tip: 'Found automatically by audio analysis.' },
  estimated: { label: 'Estimated', tone: 'amber', tip: 'Approximate value, or taken from the whole-song estimate.' },
  manual: { label: 'Edited', tone: 'violet', tip: 'You changed this value.' },
  missing: { label: 'Pending', tone: 'neutral', tip: 'Waiting for audio analysis.' },
};

function fieldDisplay(f: MetadataField, v: string | number | undefined): string {
  if (v === undefined || v === '') return '—';
  return f === 'tempoBpm' ? `${v} BPM` : String(v);
}

interface Props {
  editing: MusicEditingApi;
  analysis: AsyncState<AudioAnalysisResponse>;
}

export function MetadataTable({ editing, analysis }: Props) {
  const { ranges, duration, addRange, updateRange, deleteRange, resetRange, resetAllRanges, overlapWarnings, retryAnalysis } = editing;
  const [editingId, setEditingId] = useState<string | null>(null);
  const anyOverrides = ranges.some((r) => Object.keys(r.overrides).length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AnalysisStatus analysis={analysis} onRetry={retryAnalysis} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="subtle" icon={<ListRestart className="h-3.5 w-3.5" />} onClick={resetAllRanges} disabled={!duration}
            title="Replace all rows with one full-length row using detected values">
            Reset table
          </Button>
          <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addRange()} disabled={!duration}>
            Add time range
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/[0.06]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-studio-850 text-left">
              <Th className="w-16"><span title="Checked ranges are changed when you apply an edit">Use</span></Th>
              <Th>Start Time</Th>
              <Th>End Time</Th>
              <Th>Key / Pitch Scale</Th>
              <Th>Tempo (BPM)</Th>
              <Th>Time Signature</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {ranges.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-studio-400">
                No time ranges. Add one to begin.
              </td></tr>
            )}
            {ranges.map((r, i) =>
              editingId === r.id ? (
                <EditRow key={r.id} index={i} range={r} duration={duration}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => { updateRange(r.id, patch); setEditingId(null); }} />
              ) : (
                <ViewRow key={r.id} index={i} range={r} duration={duration}
                  onToggle={(sel) => updateRange(r.id, { selected: sel })}
                  onEdit={() => setEditingId(r.id)}
                  onDelete={() => { deleteRange(r.id); if (editingId === r.id) setEditingId(null); }}
                  onReset={(f) => resetRange(r.id, f)} />
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-studio-400">
        {(Object.keys(PROV) as MetadataProvenance[]).filter((p) => p !== 'missing').map((p) => (
          <span key={p} className="flex items-center gap-1.5"><Badge tone={PROV[p].tone}>{PROV[p].label}</Badge>{PROV[p].tip}</span>
        ))}
        {anyOverrides && <span className="text-studio-300">Original detected values are kept. Use reset to restore them.</span>}
      </div>

      {overlapWarnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cx('whitespace-nowrap border-b border-ink/[0.06] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-studio-300', className)}>{children}</th>;
}

function AnalysisStatus({ analysis, onRetry }: { analysis: AsyncState<AudioAnalysisResponse>; onRetry: () => void }) {
  if (analysis.phase === 'processing') {
    return (
      <div className="flex min-w-[240px] flex-1 items-center gap-3 text-xs text-studio-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        <span className="whitespace-nowrap">{analysis.message ?? 'Analyzing audio…'}</span>
        <ProgressBar value={analysis.progress} className="max-w-[160px]" />
      </div>
    );
  }
  if (analysis.phase === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-signal-rose">
        <AlertTriangle className="h-3.5 w-3.5" />Audio analysis didn’t complete. {analysis.error}
        <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3 w-3" />} onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (analysis.data) {
    return (
      <div className="flex items-center gap-2 text-xs text-signal-green">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-medium">Audio analysis completed</span>
      </div>
    );
  }
  return <span className="text-xs text-studio-400">Upload audio to analyze.</span>;
}

function ValueCell({ range, field, onReset }: { range: TimeRange; field: MetadataField; onReset: () => void }) {
  const v = effectiveValue(range, field);
  const p = provenanceOf(range, field);
  const conf = range.confidence[field];
  const detected = range.detected[field];
  const meta = PROV[p];
  const tip = p === 'manual'
    ? `You changed this. Detected value: ${fieldDisplay(field, detected)}`
    : `${meta.tip}${conf !== undefined ? ` Confidence ${(conf * 100).toFixed(0)}%.` : ''}${!range.detectedPerRange && !range.isFullTrack && p !== 'missing' ? ' (from whole-song estimate)' : ''}`;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={cx('mono whitespace-nowrap', p === 'manual' ? 'text-signal-violet' : 'text-studio-100')}>{fieldDisplay(field, v)}</span>
      <span className="flex items-center gap-1.5">
      <Badge tone={meta.tone} title={tip}>{meta.label}</Badge>
      {p === 'manual' && (
        <button onClick={onReset} title={`Reset to detected (${fieldDisplay(field, detected)})`} className="text-studio-400 hover:text-studio-100">
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
      </span>
    </div>
  );
}

function ViewRow({ range, index, duration, onToggle, onEdit, onDelete, onReset }: {
  range: TimeRange; index: number; duration: number;
  onToggle: (v: boolean) => void; onEdit: () => void; onDelete: () => void; onReset: (f?: MetadataField) => void;
}) {
  const { errors, warnings } = validateRow(range, duration);
  const hasOverrides = Object.keys(range.overrides).length > 0;
  return (
    <>
      <tr className={cx('border-b border-ink/[0.04] transition-colors hover:bg-ink/[0.02]', !range.selected && 'opacity-55')}>
        <td className="px-3 py-3">
          <label className="flex items-center gap-2 text-xs text-studio-400">
            <input type="checkbox" checked={range.selected} onChange={(e) => onToggle(e.target.checked)}
              aria-label={`Include range ${index + 1} in edit`} className="h-4 w-4 cursor-pointer accent-[#5b4de0]" />
            <span>{index + 1}{range.isFullTrack && <span className="block text-[10px] uppercase tracking-wide">full</span>}</span>
          </label>
        </td>
        <td className="mono px-3 py-3">{formatTimestamp(range.startTime)}</td>
        <td className="mono px-3 py-3">{formatTimestamp(range.endTime)}</td>
        <td className="px-3 py-3"><ValueCell range={range} field="key" onReset={() => onReset('key')} /></td>
        <td className="px-3 py-3"><ValueCell range={range} field="tempoBpm" onReset={() => onReset('tempoBpm')} /></td>
        <td className="px-3 py-3"><ValueCell range={range} field="timeSignature" onReset={() => onReset('timeSignature')} /></td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-0.5">
            <IconButton label="Edit row" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconButton>
            <IconButton label="Reset to detected values" onClick={() => onReset()} disabled={!hasOverrides}><RotateCcw className="h-3.5 w-3.5" /></IconButton>
            <IconButton label="Delete row" onClick={onDelete} className="hover:text-signal-rose"><Trash2 className="h-3.5 w-3.5" /></IconButton>
          </div>
        </td>
      </tr>
      {(errors.length > 0 || warnings.length > 0) && (
        <tr className="border-b border-ink/[0.04]">
          <td />
          <td colSpan={6} className="px-3 pb-3 text-[11px]">
            {errors.map((e) => <div key={e} className="text-signal-rose">✕ {e}</div>)}
            {warnings.map((w) => <div key={w} className="text-accent">! {w}</div>)}
          </td>
        </tr>
      )}
    </>
  );
}

function EditRow({ range, index, duration, onSave, onCancel }: {
  range: TimeRange; index: number; duration: number;
  onSave: (patch: Partial<Pick<TimeRange, 'startTime' | 'endTime' | 'overrides'>>) => void; onCancel: () => void;
}) {
  const [start, setStart] = useState(formatTimestamp(range.startTime));
  const [end, setEnd] = useState(formatTimestamp(range.endTime));
  const [key, setKey] = useState(effectiveValue(range, 'key') ?? '');
  const [bpm, setBpm] = useState(effectiveValue(range, 'tempoBpm')?.toString() ?? '');
  const [ts, setTs] = useState(effectiveValue(range, 'timeSignature') ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const errs: string[] = [];
    const s = parseTimestamp(start);
    const e = parseTimestamp(end);
    if (s === null) errs.push('Start time must look like 00:00.000.');
    if (e === null) errs.push('End time must look like 00:00.000.');
    if (s !== null && e !== null) errs.push(...validateRange(s, e, duration).errors);
    let bpmNum: number | undefined;
    if (bpm.trim()) {
      bpmNum = Number(bpm.replace(/bpm/i, '').trim());
      if (!Number.isFinite(bpmNum) || bpmNum <= 0) errs.push('Tempo must be a positive number.');
      else bpmNum = Math.round(bpmNum * 10) / 10;
    }
    setErrors(errs);
    if (errs.length) return;

    const overrides: TimeRange['overrides'] = {};
    const k = key.trim();
    if (k && k !== range.detected.key) overrides.key = k;
    if (bpmNum !== undefined && bpmNum !== range.detected.tempoBpm) overrides.tempoBpm = bpmNum;
    const t = ts.trim();
    if (t && t !== range.detected.timeSignature) overrides.timeSignature = t;
    onSave({ startTime: s!, endTime: e!, overrides });
  };

  const cell = 'px-2 py-2.5';
  return (
    <>
      <tr className="border-b border-ink/[0.04] bg-accent/[0.03]" onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}>
        <td className={cn(cell, 'pl-3 text-xs text-studio-400')}>{index + 1}</td>
        <td className={cell}><input aria-label="Start time" className="input mono h-9 w-[120px]" value={start} onChange={(e) => setStart(e.target.value)} placeholder="00:00.000" autoFocus /></td>
        <td className={cell}><input aria-label="End time" className="input mono h-9 w-[120px]" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="00:00.000" /></td>
        <td className={cell}>
          <input aria-label="Key" list={`keys-${range.id}`} className="input h-9 w-[140px]" value={key} onChange={(e) => setKey(e.target.value)} placeholder={range.detected.key ?? 'A minor'} />
          <datalist id={`keys-${range.id}`}>{KEY_OPTIONS.map((k) => <option key={k} value={k} />)}</datalist>
        </td>
        <td className={cell}><input aria-label="Tempo" className="input mono h-9 w-[100px]" inputMode="decimal" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder={range.detected.tempoBpm?.toString() ?? '120'} /></td>
        <td className={cell}>
          <input aria-label="Time signature" list={`ts-${range.id}`} className="input mono h-9 w-[90px]" value={ts} onChange={(e) => setTs(e.target.value)} placeholder={range.detected.timeSignature ?? '4/4'} />
          <datalist id={`ts-${range.id}`}>{[...SUPPORTED_TIME_SIGNATURES, '5/4', '7/8', '12/8'].map((t) => <option key={t} value={t} />)}</datalist>
        </td>
        <td className={cell}>
          <div className="flex justify-end gap-0.5">
            <IconButton label="Save row" onClick={save} className="text-signal-green hover:text-signal-green"><Check className="h-4 w-4" /></IconButton>
            <IconButton label="Cancel" onClick={onCancel}><X className="h-4 w-4" /></IconButton>
          </div>
        </td>
      </tr>
      <tr className="border-b border-ink/[0.04] bg-accent/[0.03]">
        <td />
        <td colSpan={6} className="px-3 pb-3 text-[11px] text-studio-400">
          {errors.length > 0
            ? errors.map((e) => <div key={e} className="text-signal-rose">✕ {e}</div>)
            : <>Audio length {formatTimestamp(duration)}. Clear a value to go back to the detected one. Press Enter to save or Esc to cancel.</>}
        </td>
      </tr>
    </>
  );
}

const cn = cx;
