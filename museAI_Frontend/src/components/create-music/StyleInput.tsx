import { Sparkles } from 'lucide-react';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { LIMITS } from '@/config/aceStepCapabilities';

export const STYLE_EXAMPLES = [
  'Romantic Bollywood ballad with soft acoustic guitar, expressive male vocals, emotional piano, Indian flute, and gentle percussion.',
  'Upbeat Punjabi bhangra pop, dhol-driven groove, energetic female vocals, synth bass, festive brass stabs.',
  'Lo-fi hip hop, dusty vinyl drums, mellow Rhodes chords, warm bass, relaxed late-night mood, instrumental.',
  'Cinematic orchestral score, swelling strings, French horns, taiko drums, epic and triumphant.',
  'Indie folk, fingerpicked acoustic guitar, breathy female vocals, soft harmonies, intimate room sound.',
  'Sufi qawwali fusion, harmonium, tabla, handclaps, powerful layered male vocals, devotional build-up.',
];

export function StyleInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <TextAreaField
      label="Music Style Description"
      value={value}
      onChange={onChange}
      maxChars={LIMITS.captionMaxChars}
      error={error}
      placeholder="Describe the musical style, genre, mood, instruments, vocals, and arrangement..."
      rows={5}
      textareaClassName="min-h-[120px]"
      hint="Name the genre, mood, instruments, vocal type and production style."
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-studio-400"><Sparkles className="h-3 w-3 text-accent" />Examples (click to use)</div>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => onChange(ex)} title={ex}
                className="max-w-full truncate rounded-full border border-ink/[0.06] bg-ink/[0.03] px-2.5 py-1 text-left text-[11px] text-studio-300 transition-colors hover:border-accent/40 hover:text-studio-100 sm:max-w-[280px]">
                {ex}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
