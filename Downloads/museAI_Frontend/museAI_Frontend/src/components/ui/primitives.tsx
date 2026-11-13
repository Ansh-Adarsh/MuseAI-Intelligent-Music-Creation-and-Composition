import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white font-semibold shadow-sm hover:bg-accent-strong disabled:bg-studio-600 disabled:text-studio-300 disabled:shadow-none',
  secondary: 'bg-studio-900 text-studio-100 border border-ink/[0.12] hover:bg-studio-850',
  subtle: 'bg-studio-850 text-studio-200 border border-ink/[0.08] hover:bg-studio-700 hover:text-studio-100',
  ghost: 'text-studio-300 hover:text-studio-100 hover:bg-ink/[0.05]',
  danger: 'text-signal-rose hover:bg-signal-rose/10',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      className={cx('inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60', VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg text-studio-300 transition-colors hover:bg-studio-700 hover:text-studio-100 disabled:opacity-40', className)}
      {...rest}
    />
  );
}

export function Panel({ title, icon, actions, children, className, subtitle }: {
  title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; subtitle?: ReactNode;
}) {
  return (
    <section className={cx('panel p-5 sm:p-6', className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>}
            <div>
              {title && <h2 className="text-[15px] font-semibold text-studio-100">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-studio-300">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = 'neutral' | 'accent' | 'cyan' | 'violet' | 'rose' | 'green' | 'amber';
const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/[0.04] text-studio-300 border-ink/[0.08]',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/25',
  accent: 'bg-accent/10 text-accent border-accent/25',
  cyan: 'bg-signal-cyan/10 text-signal-cyan border-signal-cyan/25',
  violet: 'bg-signal-violet/10 text-signal-violet border-signal-violet/25',
  rose: 'bg-signal-rose/10 text-signal-rose border-signal-rose/25',
  green: 'bg-signal-green/10 text-signal-green border-signal-green/25',
};

export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({ tone = 'info', title, children, className }: {
  tone?: 'info' | 'warning' | 'error' | 'success'; title?: ReactNode; children?: ReactNode; className?: string;
}) {
  const map = {
    info: { cls: 'border-signal-cyan/25 bg-signal-cyan/[0.06] text-studio-200', Icon: Info, ic: 'text-signal-cyan' },
    warning: { cls: 'border-amber-500/30 bg-amber-50 text-studio-200', Icon: AlertTriangle, ic: 'text-amber-600' },
    error: { cls: 'border-signal-rose/30 bg-signal-rose/[0.06] text-studio-100', Icon: XCircle, ic: 'text-signal-rose' },
    success: { cls: 'border-signal-green/25 bg-signal-green/[0.06] text-studio-200', Icon: CheckCircle2, ic: 'text-signal-green' },
  }[tone];
  const { Icon } = map;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-xl border px-3.5 py-3 text-sm', map.cls, className)}>
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', map.ic)} />
      <div className="min-w-0 space-y-1">
        {title && <div className="font-medium text-studio-100">{title}</div>}
        {children && <div className="text-[13px] leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className, indeterminate }: { value: number; className?: string; indeterminate?: boolean }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-studio-700', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div
        className={cx('h-full rounded-full bg-gradient-to-r from-accent to-signal-cyan transition-[width] duration-300', indeterminate && 'animate-pulse')}
        style={{ width: `${Math.max(indeterminate ? 30 : 2, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string; disabled?: boolean }) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-accent/50 bg-accent/80' : 'border-ink/10 bg-studio-600')}
    >
      <span className={cx('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
    </button>
  );
}

export function EqIcon({ active = true, className }: { active?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex h-4 items-end gap-[2px]', className)} aria-hidden>
      {[0, 0.2, 0.4, 0.1].map((d, i) => (
        <span key={i} className={cx('w-[3px] rounded-sm bg-current', active && 'eq-bar')} style={{ height: '100%', animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}
