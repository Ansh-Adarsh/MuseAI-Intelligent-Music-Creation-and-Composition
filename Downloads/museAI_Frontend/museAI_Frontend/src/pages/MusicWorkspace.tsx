import { useCallback, useState } from 'react';
import { Header, type WorkspaceMode } from '@/components/layout/Header';
import { CreateMusicWorkspace } from '@/components/create-music/CreateMusicWorkspace';
import { EditMusicWorkspace } from '@/components/edit-music/EditMusicWorkspace';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useMusicEditing } from '@/hooks/useMusicEditing';
import type { AudioFile } from '@/types/audio';
import { cx } from '@/components/ui/primitives';

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
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{mode === 'create' ? 'Create music' : 'Edit an existing song'}</h1>
            <p className="mt-1 max-w-2xl text-sm text-studio-300">
              {mode === 'create'
                ? 'Write lyrics, describe a style, and generate. Send any result straight to the editor.'
                : 'Upload or bring in a generated song, mark time ranges, describe the change, and compare versions.'}
            </p>
          </div>
        </div>
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
