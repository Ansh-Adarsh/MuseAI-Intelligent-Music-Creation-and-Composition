import type { ReactNode } from 'react';

export function SettingField({ label, htmlFor, error, hint, children }: {
  label: string; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-studio-200">{label}</label>
      {children}
      {error ? <p className="text-[11px] text-signal-rose">{error}</p> : hint ? <p className="text-[11px] leading-snug text-studio-400">{hint}</p> : null}
    </div>
  );
}
