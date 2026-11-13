import { useState } from 'react';
import { Pause, Play, Repeat } from 'lucide-react';
import type { AudioFile } from '@/types/audio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useWaveformPeaks } from '@/hooks/useWaveformPeaks';
import { formatClock } from '@/utils/timestampUtils';
import { Waveform, type WaveformRegion } from '@/components/waveform/Waveform';
import { cx } from '@/components/ui/primitives';

/**
 * A/B player: one transport, two sources. Switching keeps the playhead
 * position so you hear the same moment in both versions.
 */
export function ABComparePlayer({ a, b, labelA = 'Original', labelB = 'Edited', regions }: {
  a: AudioFile; b: AudioFile; labelA?: string; labelB?: string; regions?: WaveformRegion[];
}) {
  const pa = useAudioPlayer(a.objectUrl, a.durationSec);
  const pb = useAudioPlayer(b.objectUrl, b.durationSec);
  const [side, setSide] = useState<'A' | 'B'>('B');
  const active = side === 'A' ? pa : pb;
  const { peaks } = useWaveformPeaks(side === 'A' ? a : b);
  const duration = active.duration || (side === 'A' ? a : b).durationSec;

  const switchTo = (next: 'A' | 'B') => {
    if (next === side) return;
    const from = side === 'A' ? pa : pb;
    const to = next === 'A' ? pa : pb;
    const wasPlaying = from.playing;
    const t = from.currentTime;
    from.pause();
    to.seek(t);
    setSide(next);
    if (wasPlaying) to.play();
  };

  return (
    <div className="panel-inset p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="label flex items-center gap-2"><Repeat className="h-3.5 w-3.5" />A/B compare</div>
        <div className="inline-flex rounded-lg border border-ink/[0.08] bg-studio-850 p-0.5" role="group" aria-label="Choose version">
          {(['A', 'B'] as const).map((s) => (
            <button
              key={s}
              onClick={() => switchTo(s)}
              aria-pressed={side === s}
              className={cx('rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                side === s ? (s === 'A' ? 'bg-studio-600 text-studio-100' : 'bg-signal-cyan text-white') : 'text-studio-300 hover:text-studio-100')}
            >
              {s} · {s === 'A' ? labelA : labelB}
            </button>
          ))}
        </div>
      </div>
      <Waveform
        peaks={peaks}
        duration={duration}
        currentTime={active.currentTime}
        onSeek={active.seek}
        regions={regions}
        height={72}
        progressColor={side === 'A' ? '#7c8599' : '#3b7ddd'}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={active.toggle}
          aria-label={active.playing ? 'Pause' : 'Play'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-105"
        >
          {active.playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
        </button>
        <span className="mono w-12 text-right text-xs">{formatClock(active.currentTime)}</span>
        <input type="range" className="range-input flex-1" min={0} max={duration || 0} step={0.01}
          value={Math.min(active.currentTime, duration || 0)} onChange={(e) => active.seek(Number(e.target.value))} aria-label="Seek" />
        <span className="mono w-12 text-xs text-studio-400">{formatClock(duration)}</span>
      </div>
      <p className="mt-2 text-[11px] text-studio-400">Press A or B while playing to switch at the same position.</p>
    </div>
  );
}
