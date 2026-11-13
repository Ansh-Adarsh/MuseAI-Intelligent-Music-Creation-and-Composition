import { Music4, Scissors } from 'lucide-react';
import { cx } from '@/components/ui/primitives';

export type WorkspaceMode = 'create' | 'edit';

export function Header({ mode, onMode, editHasAudio }: { mode: WorkspaceMode; onMode: (m: WorkspaceMode) => void; editHasAudio: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/[0.05] bg-studio-900/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-signal-cyan shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
              <rect x="3" y="9" width="2.6" height="6" rx="1.3" /><rect x="7.4" y="5" width="2.6" height="14" rx="1.3" />
              <rect x="11.8" y="2" width="2.6" height="20" rx="1.3" /><rect x="16.2" y="7" width="2.6" height="10" rx="1.3" />
              <rect x="20.4" y="10" width="2" height="4" rx="1" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-tight">Muse<span className="text-accent">AI</span></div>
            <div className="text-[11px] text-studio-400">Music Studio</div>
          </div>
        </div>

        <nav className="order-3 w-full sm:order-none sm:w-auto" aria-label="Workspace mode">
          <div className="grid grid-cols-2 rounded-2xl border border-ink/[0.08] bg-studio-850 p-1" role="tablist">
            <ModeTab active={mode === 'create'} onClick={() => onMode('create')} icon={<Music4 className="h-4 w-4" />} label="Create Music" />
            <ModeTab active={mode === 'edit'} onClick={() => onMode('edit')} icon={<Scissors className="h-4 w-4" />} label="Edit Existing Song" dot={editHasAudio && mode !== 'edit'} />
          </div>
        </nav>

        <div className="hidden w-[140px] sm:block" aria-hidden />
      </div>
    </header>
  );
}

function ModeTab({ active, onClick, icon, label, dot }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; dot?: boolean }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={cx('relative flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 sm:px-6 sm:text-sm',
        active ? 'bg-studio-900 text-studio-100 shadow-sm ring-1 ring-ink/[0.08]' : 'text-studio-300 hover:text-studio-100')}>
      <span className={active ? 'text-accent' : ''}>{icon}</span>
      {label}
      {dot && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal-cyan" aria-label="has audio loaded" />}
    </button>
  );
}
