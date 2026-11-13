import { Lightbulb } from 'lucide-react';
import { TextAreaField } from '@/components/ui/TextAreaField';

export const EDIT_EXAMPLES = [
  'Add sitar and electric guitar between 01:20 and 01:40.',
  'Replace the flute with a piano.',
  'Add tabla and Indian percussion.',
  'Make the selected part more emotional.',
  'Remove vocals and retain the instrumental.',
  'Change the instrumentation while preserving the original tempo and key.',
];

export function ChangeDescription({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <TextAreaField
      label="Describe What You Want to Change"
      value={value}
      onChange={onChange}
      error={error}
      placeholder="Describe the changes you want to make to your music..."
      rows={5}
      dir="auto"
      textareaClassName="min-h-[120px]"
      hint="Times you mention, like 01:20–01:40, can be added to the timeline table with one click."
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-studio-400"><Lightbulb className="h-3 w-3 text-accent" />Examples</div>
          <div className="flex flex-wrap gap-1.5">
            {EDIT_EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => onChange(ex)}
                className="rounded-full border border-ink/[0.06] bg-ink/[0.03] px-2.5 py-1 text-[11px] text-studio-300 transition-colors hover:border-accent/40 hover:text-studio-100">
                {ex}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
