import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { WaveformPeaks } from '@/types/audio';
import { formatTimestamp } from '@/utils/timestampUtils';
import { cx } from '@/components/ui/primitives';

export interface WaveformRegion {
  id: string;
  start: number;
  end: number;
  label?: string;
  active?: boolean;
}

interface Props {
  peaks: WaveformPeaks | null;
  duration: number;
  currentTime: number;
  onSeek?: (t: number) => void;
  regions?: WaveformRegion[];
  /** Enables drag-to-select. Called with the selected range in seconds. */
  onSelectRange?: (start: number, end: number) => void;
  height?: number;
  color?: string;
  progressColor?: string;
  loading?: boolean;
  error?: string | null;
}

export function Waveform({
  peaks, duration, currentTime, onSeek, regions = [], onSelectRange,
  height = 96, color = '#cfd5e3', progressColor = '#5b4de0', loading, error,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !peaks || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, width, height);
    const bar = 2;
    const gap = 1;
    const bars = Math.floor(width / (bar + gap));
    const mid = height / 2;
    const playedX = duration > 0 ? (currentTime / duration) * width : 0;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * peaks.length);
      const amp = Math.max(Math.abs(peaks.min[idx]), Math.abs(peaks.max[idx]));
      const h = Math.max(1.5, amp * (height * 0.9));
      const x = i * (bar + gap);
      g.fillStyle = x < playedX ? progressColor : color;
      g.fillRect(x, mid - h / 2, bar, h);
    }
  }, [peaks, width, height, currentTime, duration, color, progressColor]);

  const timeAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  };

  const onDown = (e: RPointerEvent) => {
    if (!duration) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const t = timeAt(e.clientX);
    setDrag({ a: t, b: t });
  };
  const onMove = (e: RPointerEvent) => {
    if (!duration) return;
    const t = timeAt(e.clientX);
    setHover(t);
    if (drag) setDrag({ ...drag, b: t });
  };
  const onUp = () => {
    if (!drag) return;
    const s = Math.min(drag.a, drag.b);
    const en = Math.max(drag.a, drag.b);
    if (onSelectRange && en - s > Math.max(0.25, duration * 0.005)) onSelectRange(s, en);
    else onSeek?.(drag.b);
    setDrag(null);
  };

  const pct = (t: number) => `${duration ? (t / duration) * 100 : 0}%`;

  return (
    <div className="select-none">
      <div
        ref={wrapRef}
        className={cx('relative w-full overflow-hidden rounded-lg', onSeek && 'cursor-pointer')}
        style={{ height }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setHover(null)}
        role="slider"
        aria-label="Waveform seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek?.(Math.min(duration, currentTime + 5));
          if (e.key === 'ArrowLeft') onSeek?.(Math.max(0, currentTime - 5));
        }}
      >
        {regions.map((r) => (
          <div
            key={r.id}
            className={cx('pointer-events-none absolute inset-y-0 border-x', r.active ? 'border-signal-cyan/70 bg-signal-cyan/[0.12]' : 'border-ink/20 bg-ink/[0.04]')}
            style={{ left: pct(r.start), width: `calc(${pct(r.end)} - ${pct(r.start)})` }}
          >
            {r.label && <span className="absolute left-1 top-1 rounded bg-studio-900/90 px-1 text-[10px] font-medium text-signal-cyan">{r.label}</span>}
          </div>
        ))}
        {peaks ? (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-studio-400">
            {error ? error : loading !== false ? <span className="animate-pulse">Rendering waveform…</span> : null}
          </div>
        )}
        {drag && (
          <div className="pointer-events-none absolute inset-y-0 bg-accent/20 ring-1 ring-inset ring-accent/60"
            style={{ left: pct(Math.min(drag.a, drag.b)), width: `calc(${pct(Math.max(drag.a, drag.b))} - ${pct(Math.min(drag.a, drag.b))})` }} />
        )}
        <div className="pointer-events-none absolute inset-y-0 w-px bg-accent-strong " style={{ left: pct(currentTime) }} />
        {hover !== null && !drag && (
          <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-studio-100 px-1.5 py-0.5 text-[10px] text-white mono" style={{ left: pct(hover) }}>
            {formatTimestamp(hover)}
          </div>
        )}
      </div>
    </div>
  );
}
