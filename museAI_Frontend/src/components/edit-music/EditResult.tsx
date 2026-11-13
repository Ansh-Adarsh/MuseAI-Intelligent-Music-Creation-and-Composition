import { Download, PenLine, Repeat2, Sparkles } from 'lucide-react';
import type { AudioVersion } from '@/types/music';
import { AudioPlayer } from '@/components/audio-player/AudioPlayer';
import { ABComparePlayer } from '@/components/audio-player/ABComparePlayer';
import { Alert, Badge, Button, Panel } from '@/components/ui/primitives';
import { triggerDownload } from '@/utils/format';
import { describeEdit } from '@/utils/describeEdit';

interface Props {
  result: AudioVersion;
  parent: AudioVersion;
  original: AudioVersion;
  onApplyAnother: () => void;
  onSendBack: () => void;
}

export function EditResult({ result, parent, original, onApplyAnother, onSendBack }: Props) {
  const resp = result.edit!.response;
  const regions = result.edit!.request.timeRanges.map((r, i) => ({ id: String(i), start: r.startTime, end: r.endTime, label: `R${i + 1}`, active: true }));
  const showRegions = ['repaint', 'lego'].includes(resp.resolvedMode);

  return (
    <Panel
      title={<span className="flex items-center gap-2">Edited result <Badge tone="cyan">{result.label}</Badge></span>}
      icon={<Sparkles className="h-4 w-4" />}
      subtitle={describeEdit(result)}
      actions={
        <>
          <Button size="sm" variant="subtle" icon={<Download className="h-3.5 w-3.5" />} onClick={() => triggerDownload(result.audio.objectUrl, result.audio.name)}>Download edited</Button>
          <Button size="sm" variant="subtle" icon={<PenLine className="h-3.5 w-3.5" />} onClick={onApplyAnother}>Apply another edit</Button>
          <Button size="sm" variant="primary" icon={<Repeat2 className="h-3.5 w-3.5" />} onClick={onSendBack}>Edit this result further</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!resp.isMock && resp.warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
        <ABComparePlayer a={parent.audio} b={result.audio} labelA={parent.label} labelB={result.label} regions={showRegions ? regions : undefined} />
        <div className="grid gap-4 lg:grid-cols-2">
          <AudioPlayer audio={original.audio} title="Original (untouched)" waveformHeight={56} tone="violet" showMeta={false} />
          <AudioPlayer audio={result.audio} title={`Edited · ${result.label}`} waveformHeight={56} tone="cyan" showMeta={false} regions={showRegions ? regions : undefined} />
        </div>
      </div>
    </Panel>
  );
}
