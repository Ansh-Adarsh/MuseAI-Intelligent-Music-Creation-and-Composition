import { Music4, Scissors } from 'lucide-react';
import { cx } from '@/components/ui/primitives';

export type WorkspaceMode = 'create' | 'edit';

export function Header({ mode, onMode, editHasAudio }: { mode: WorkspaceMode; onMode: (m: WorkspaceMode) => void; editHasAudio: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-purple-100/60 backdrop-blur-xl" style={{ background: 'linear-gradient(90deg, rgba(240,244,255,0.95) 0%, rgba(250,245,255,0.95) 50%, rgba(240,249,255,0.95) 100%)' }}>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">

        {/* ── Logo ── */}
        <div className="flex items-center gap-3">
          {/* Icon mark */}
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-md" style={{ background: 'linear-gradient(135deg, #5b4de0 0%, #7c4ddb 50%, #3b7ddd 100%)' }}>
            {/* Music note + waveform combined mark */}
            <svg viewBox="0 0 32 32" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
              {/* Waveform bars */}
              <rect x="2"  y="14" width="3" height="4"  rx="1.5" opacity="0.6"/>
              <rect x="7"  y="10" width="3" height="12" rx="1.5" opacity="0.75"/>
              {/* Quarter note stem + head */}
              <rect x="13" y="6"  width="2.5" height="15" rx="1.25"/>
              <ellipse cx="13.25" cy="21.5" rx="4" ry="2.8" transform="rotate(-15 13.25 21.5)"/>
              {/* Flag on stem */}
              <path d="M15.5 6 Q22 10 18 15" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              {/* Right waveform bars */}
              <rect x="22" y="11" width="3" height="10" rx="1.5" opacity="0.75"/>
              <rect x="27" y="14" width="3" height="4"  rx="1.5" opacity="0.6"/>
            </svg>
          </div>

          {/* Brand text */}
          <div className="leading-none">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[20px] font-extrabold tracking-tight text-studio-100">Muse</span>
              <span className="text-[20px] font-extrabold tracking-tight" style={{ background: 'linear-gradient(135deg, #5b4de0, #3b7ddd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </div>
            <div className="mt-0.5 text-[10px] font-medium tracking-widest uppercase" style={{ color: '#7c8599', letterSpacing: '0.13em' }}>
              Intelligent · Music · Creation
            </div>
          </div>
        </div>

        {/* ── Mode tabs ── */}
        <nav className="order-3 w-full sm:order-none sm:w-auto" aria-label="Workspace mode">
          <div className="grid grid-cols-2 rounded-2xl border border-purple-200/60 bg-white/60 p-1 shadow-sm backdrop-blur-sm" role="tablist">
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
        active ? 'text-white shadow-sm ring-1 ring-accent/20' : 'text-studio-300 hover:text-studio-100')}
      style={active ? { background: 'linear-gradient(135deg, #5b4de0 0%, #3b7ddd 100%)' } : {}}>
      <span className={active ? 'text-white/90' : ''}>{icon}</span>
      {label}
      {dot && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal-cyan" aria-label="has audio loaded" />}
    </button>
  );
}
