import { useRef } from 'react';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { LIMITS } from '@/config/aceStepCapabilities';

const SECTION_TAGS = ['[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Outro]', '[Instrumental]'];

export function LyricsInput({ value, onChange, error, instrumental }: { value: string; onChange: (v: string) => void; error?: string; instrumental: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const insertTag = (tag: string) => {
    const ta = wrapRef.current?.querySelector('textarea');
    if (!ta) return onChange(value + (value && !value.endsWith('\n') ? '\n' : '') + tag + '\n');
    const s = ta.selectionStart;
    const before = value.slice(0, s);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const next = `${before}${prefix}${tag}\n${value.slice(ta.selectionEnd)}`;
    onChange(next);
    requestAnimationFrame(() => {
      const pos = before.length + prefix.length + tag.length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const lines = value ? value.split('\n').length : 0;

  return (
    <div ref={wrapRef}>
      <TextAreaField
        label="Lyrics"
        value={value}
        onChange={onChange}
        maxChars={LIMITS.lyricsMaxChars}
        error={error}
        placeholder="Write or paste your song lyrics here..."
        rows={14}
        lang="mul"
        dir="auto"
        disabled={instrumental}
        textareaClassName="min-h-[280px] font-[450]"
        hint={instrumental
          ? 'Instrumental is on, so lyrics won’t be sung.'
          : value.trim() ? `${lines} line${lines === 1 ? '' : 's'}. Hindi, English and other languages are supported.` : 'Use the tags below to mark verses and choruses. Leave empty for an instrumental.'}
        footer={
          <div className="flex flex-wrap gap-1.5">
            {SECTION_TAGS.map((t) => (
              <button key={t} type="button" disabled={instrumental} onClick={() => insertTag(t)}
                className="rounded-md border border-ink/[0.06] bg-ink/[0.03] px-2 py-1 font-mono text-[11px] text-studio-300 transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40">
                {t}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
