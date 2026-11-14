import { useCallback, useState } from 'react';
import { Header, type WorkspaceMode } from '@/components/layout/Header';
import { CreateMusicWorkspace } from '@/components/create-music/CreateMusicWorkspace';
import { EditMusicWorkspace } from '@/components/edit-music/EditMusicWorkspace';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useMusicEditing } from '@/hooks/useMusicEditing';
import type { AudioFile } from '@/types/audio';
import { cx } from '@/components/ui/primitives';

/** Floating decorative music symbols scattered in the background */
function MusicDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>

      {/* Staff lines — teal/cyan tinted, clearly visible */}
      {[18, 26, 34, 42, 50].map((pct) => (
        <div key={pct} className="absolute left-0 right-0" style={{ top: `${pct}%`, height: 1.5, background: 'linear-gradient(90deg, transparent 0%, rgba(59,125,221,0.28) 15%, rgba(124,77,219,0.22) 50%, rgba(59,125,221,0.28) 85%, transparent 100%)' }} />
      ))}

      {/* Quarter note — left, indigo */}
      <svg viewBox="0 0 40 60" className="absolute" style={{ left: '3%', top: '8%', width: 36, opacity: 0.45 }} fill="#5b4de0">
        <rect x="16" y="2" width="4" height="36" rx="2"/>
        <ellipse cx="12" cy="40" rx="11" ry="8" transform="rotate(-15 12 40)"/>
        <path d="M20 2 Q34 10 28 22" stroke="#5b4de0" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </svg>

      {/* Treble clef — coral/rose, far left */}
      <svg viewBox="0 0 60 120" className="absolute" style={{ left: '8%', top: '4%', width: 30, opacity: 0.35 }} fill="#d6455d">
        <path d="M30 110 C10 100 5 80 15 65 C25 50 45 55 45 70 C45 85 25 90 20 78 C15 65 25 50 30 30 C35 10 25 2 20 8 C15 14 18 25 25 30 C32 35 40 32 40 22 C40 12 32 5 25 10"/>
      </svg>

      {/* Beamed eighth note pair — violet, right */}
      <svg viewBox="0 0 60 60" className="absolute" style={{ right: '4%', top: '10%', width: 44, opacity: 0.42 }} fill="#7c4ddb">
        <rect x="10" y="4" width="3.5" height="30" rx="1.75"/>
        <ellipse cx="8.5" cy="35" rx="8" ry="5.5" transform="rotate(-15 8.5 35)"/>
        <rect x="30" y="8" width="3.5" height="26" rx="1.75"/>
        <ellipse cx="28.5" cy="35" rx="8" ry="5.5" transform="rotate(-15 28.5 35)"/>
        <path d="M13.5 4 L33.5 8" stroke="#7c4ddb" strokeWidth="5" strokeLinecap="round"/>
      </svg>

      {/* Waveform — cyan/blue, top right area */}
      <svg viewBox="0 0 80 30" className="absolute" style={{ right: '9%', top: '55%', width: 90, opacity: 0.5 }} fill="none" stroke="#3b7ddd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="0,15 8,8 16,22 24,4 32,26 40,10 48,20 56,6 64,24 72,12 80,15"/>
      </svg>

      {/* Quarter note — bottom left, teal */}
      <svg viewBox="0 0 40 60" className="absolute" style={{ left: '14%', bottom: '12%', width: 26, opacity: 0.38 }} fill="#1f9d58">
        <rect x="16" y="2" width="4" height="36" rx="2"/>
        <ellipse cx="12" cy="40" rx="11" ry="8" transform="rotate(-15 12 40)"/>
      </svg>

      {/* Sharp ♯ — rose/pink, centre-right */}
      <svg viewBox="0 0 24 40" className="absolute" style={{ right: '20%', bottom: '18%', width: 20, opacity: 0.45 }} fill="none" stroke="#d6455d" strokeWidth="2.8" strokeLinecap="round">
        <line x1="7"  y1="4"  x2="7"  y2="36"/>
        <line x1="17" y1="4"  x2="17" y2="36"/>
        <line x1="3"  y1="13" x2="21" y2="10"/>
        <line x1="3"  y1="24" x2="21" y2="21"/>
      </svg>

      {/* Flat ♭ — indigo, centre area */}
      <svg viewBox="0 0 20 36" className="absolute" style={{ left: '48%', top: '10%', width: 18, opacity: 0.38 }} fill="#5b4de0">
        <rect x="5" y="0" width="3" height="32" rx="1.5"/>
        <path d="M8 20 Q20 20 20 27 Q20 34 8 32 Z"/>
      </svg>

      {/* Large waveform bar set — left-centre, amber */}
      <svg viewBox="0 0 50 40" className="absolute" style={{ left: '28%', bottom: '10%', width: 55, opacity: 0.32 }} fill="#f59e0b">
        <rect x="0"  y="20" width="6" height="20" rx="3"/>
        <rect x="11" y="10" width="6" height="30" rx="3"/>
        <rect x="22" y="2"  width="6" height="38" rx="3"/>
        <rect x="33" y="14" width="6" height="26" rx="3"/>
        <rect x="44" y="22" width="6" height="18" rx="3"/>
      </svg>

      {/* Rhythm dots — colourful, scattered */}
      {[
        { left: '22%', top: '28%', color: '#5b4de0', size: 10 },
        { left: '82%', top: '42%', color: '#3b7ddd', size: 8  },
        { left: '62%', top: '12%', color: '#7c4ddb', size: 12 },
        { left: '36%', top: '72%', color: '#d6455d', size: 9  },
        { left: '70%', top: '65%', color: '#1f9d58', size: 7  },
      ].map((d, i) => (
        <div key={i} className="absolute rounded-full" style={{ left: d.left, top: d.top, width: d.size, height: d.size, background: d.color, opacity: 0.4 }} />
      ))}

    </div>
  );
}

/**
 * Both workspaces stay mounted; the toggle only hides one. State lives in
 * hooks owned here, so switching modes never resets the user's work.
 */
export default function MusicWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>('create');
  const generation = useMusicGeneration();
  const upload = useAudioUpload();
  const editing = useMusicEditing();

  /** "Edit This Song": hand the generated AudioFile (with its backend ref) to the editor. */
  const sendToEditor = useCallback((audio: AudioFile) => {
    if (editing.versions.length > 1 && !window.confirm('Load this song into the editor? The current edit history will be cleared.')) return;
    upload.loadAudioFile(audio);
    editing.startSession(audio);
    setMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editing, upload]);

  return (
    <div className="min-h-full">
      <Header mode={mode} onMode={setMode} editHasAudio={!!editing.source} />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 45%, #eff6ff 100%)' }}>
        <MusicDecorations />
        <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-1">
            {/* Brand name */}
            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ background: 'linear-gradient(135deg, #5b4de0 0%, #7c4ddb 55%, #3b7ddd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                MuseAI
              </h1>
              {/* Animated equaliser bars beside the title */}
              <span className="inline-flex h-5 items-end gap-[3px] pb-0.5" aria-hidden>
                {[0, 0.15, 0.3, 0.1, 0.25].map((d, i) => (
                  <span key={i} className="eq-bar w-[3px] rounded-sm" style={{ height: '100%', animationDelay: `${d}s`, background: 'linear-gradient(to top, #5b4de0, #3b7ddd)' }} />
                ))}
              </span>
            </div>

            {/* Tagline */}
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-studio-300">
              Intelligent · Music · Creation · and · Composition
            </p>

            {/* Sub-description */}
            <p className="mt-2 max-w-xl text-sm text-studio-400">
              {mode === 'create'
                ? 'Write lyrics, describe a style, and generate. Send any result straight to the editor.'
                : 'Upload or bring in a generated song, mark time ranges, describe the change, and compare versions.'}
            </p>
          </div>
        </div>

        {/* Bottom fade line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(91,77,224,0.15), transparent)' }} />
      </div>

      {/* ── Workspace content ── */}
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <div className={cx(mode !== 'create' && 'hidden')} aria-hidden={mode !== 'create'}>
          <CreateMusicWorkspace gen={generation} onEditSong={sendToEditor} />
        </div>
        <div className={cx(mode !== 'edit' && 'hidden')} aria-hidden={mode !== 'edit'}>
          <EditMusicWorkspace upload={upload} editing={editing} />
        </div>
      </main>
    </div>
  );
}
