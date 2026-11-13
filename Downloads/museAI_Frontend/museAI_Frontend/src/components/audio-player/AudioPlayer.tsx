import type { ReactNode } from 'react';
import { Download, Pause, Play, RotateCcw } from 'lucide-react';
import type { AudioFile } from '@/types/audio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useWaveformPeaks } from '@/hooks/useWaveformPeaks';
import { formatClock, formatTimestamp } from '@/utils/timestampUtils';
import { formatBytes, triggerDownload } from '@/utils/format';
import { Waveform, type WaveformRegion } from '@/components/waveform/Waveform';
import { Badge, cx, IconButton } from '@/components/ui/primitives';

interface Props {
  audio: AudioFile;
  title?: ReactNode;
  showWaveform?: boolean;
  waveformHeight?: number;
  regions?: WaveformRegion[];
  onSelectRange?: (start: number, end: number) => void;
  actions?: ReactNode;
  tone?: 'accent' | 'cyan' | 'violet';
  className?: string;
  showMeta?: boolean;
}

const TONE_COLORS = { accent: '#5b4de0', cyan: '#3b7ddd', violet: '#7c4ddb' };

export function AudioPlayer({
  audio, title, showWaveform = true, waveformHeight = 80, regions, onSelectRange, actions, tone = 'accent', className, showMeta = true,
}: Props) {
  const player = useAudioPlayer(audio.objectUrl, audio.durationSec);
  const { peaks, error: peaksError } = useWaveformPeaks(showWaveform ? audio : null);
  const duration = player.duration || audio.durationSec;

  return (
    <div className={cx('panel-inset p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {title && <div className="label mb-1">{title}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-studio-100" title={audio.name}>{audio.name}</span>
            {showMeta && (
              <>
                <Badge>{audio.format}</Badge>
                <span className="text-xs text-studio-400">{formatBytes(audio.sizeBytes)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <IconButton label="Download" onClick={() => triggerDownload(audio.objectUrl, audio.name)}>
            <Download className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {showWaveform && (
        <div className="mb-3">
          <Waveform
            peaks={peaks}
            error={peaksError}
            duration={duration}
            currentTime={player.currentTime}
            onSeek={player.seek}
            regions={regions}
            onSelectRange={onSelectRange}
            height={waveformHeight}
            progressColor={TONE_COLORS[tone]}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={player.toggle}
          aria-label={player.playing ? 'Pause' : 'Play'}
          className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
            tone === 'accent' ? 'bg-accent text-white' : tone === 'cyan' ? 'bg-signal-cyan text-white' : 'bg-signal-violet text-white')}
        >
          {player.playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
        </button>
        <IconButton label="Back to start" onClick={() => player.seek(0)}><RotateCcw className="h-4 w-4" /></IconButton>
        <span className="mono w-12 text-right text-xs text-studio-200">{formatClock(player.currentTime)}</span>
        <input
          type="range"
          className="range-input flex-1"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(player.currentTime, duration || 0)}
          onChange={(e) => player.seek(Number(e.target.value))}
          aria-label="Seek"
        />
        <span className="mono w-12 text-xs text-studio-400">{formatClock(duration)}</span>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-studio-400">
        <span className="mono">{formatTimestamp(player.currentTime)}</span>
        {player.error && <span className="text-signal-rose">{player.error}</span>}
        {onSelectRange && <span>Drag across the waveform to add a time range</span>}
      </div>
    </div>
  );
}
