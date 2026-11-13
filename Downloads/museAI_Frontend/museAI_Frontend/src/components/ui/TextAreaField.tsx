import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Eraser } from 'lucide-react';
import { cx, IconButton } from './primitives';

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxChars?: number;
  error?: string;
  badge?: ReactNode;
  hint?: ReactNode;
  footer?: ReactNode;
  textareaClassName?: string;
}

export function TextAreaField({ label, value, onChange, maxChars, error, badge, hint, footer, textareaClassName, ...rest }: Props) {
  const id = useId();
  const over = maxChars !== undefined && value.length > maxChars;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="label">{label}</label>
          {badge}
        </div>
        <IconButton label={`Clear ${label}`} onClick={() => onChange('')} disabled={!value}>
          <Eraser className="h-4 w-4" />
        </IconButton>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-invalid={!!error || over}
        aria-describedby={`${id}-meta`}
        className={cx('input resize-y leading-relaxed', (error || over) && 'input-error', textareaClassName)}
        {...rest}
      />
      <div id={`${id}-meta`} className="flex flex-wrap items-start justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          {error ? <span className="text-signal-rose">{error}</span> : hint ? <span className="text-studio-400">{hint}</span> : null}
        </div>
        <span className={cx('mono shrink-0', over ? 'text-signal-rose' : 'text-studio-400')}>
          {value.length.toLocaleString()}{maxChars !== undefined && ` / ${maxChars.toLocaleString()}`}
        </span>
      </div>
      {footer}
    </div>
  );
}
