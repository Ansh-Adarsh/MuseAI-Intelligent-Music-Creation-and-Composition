import { useCallback, useRef, useState } from 'react';
import type { AudioFile, UploadState } from '@/types/audio';
import { durationWarnings, validateAudioFile } from '@/utils/audioValidation';
import { decodeBlob, probeDuration } from '@/utils/audioDecode';
import { uid } from '@/utils/format';

/**
 * Local file intake: validate -> read (real progress) -> decode (real duration).
 * Nothing is sent to a server here; registering with the backend happens in
 * the analysis step (see useMusicEditing).
 */
export function useAudioUpload() {
  const [state, setState] = useState<UploadState>({ phase: 'idle', progress: 0, error: null });
  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const jobRef = useRef(0);

  const readFile = (file: File, job: number) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && job === jobRef.current) setState({ phase: 'reading', progress: e.loaded / e.total, error: null });
      };
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsArrayBuffer(file);
    });

  const uploadFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    const job = ++jobRef.current;
    const v = validateAudioFile(file);
    if (!v.ok) {
      setState({ phase: 'error', progress: 0, error: v.errors.join(' ') });
      return null;
    }
    try {
      setState({ phase: 'reading', progress: 0, error: null });
      const bytes = await readFile(file, job);
      if (job !== jobRef.current) return null;
      setState({ phase: 'decoding', progress: 1, error: null });
      const blob = new Blob([bytes], { type: file.type || `audio/${v.format}` });
      const objectUrl = URL.createObjectURL(blob);
      let durationSec: number;
      try {
        durationSec = (await decodeBlob(blob)).duration;
      } catch (e) {
        // Fall back to the media element (some codecs play but don't decode via WebAudio).
        try { durationSec = await probeDuration(objectUrl); } catch { URL.revokeObjectURL(objectUrl); throw e; }
      }
      if (job !== jobRef.current) return null;
      const af: AudioFile = {
        id: uid('audio'),
        backendFileId: null,
        name: file.name,
        format: v.format,
        mimeType: blob.type,
        sizeBytes: file.size,
        durationSec,
        objectUrl,
        blob,
        source: 'upload',
        createdAt: Date.now(),
      };
      setWarnings(durationWarnings(durationSec));
      setAudio(af);
      setState({ phase: 'ready', progress: 1, error: null });
      return af;
    } catch (e) {
      if (job === jobRef.current) setState({ phase: 'error', progress: 0, error: (e as Error).message });
      return null;
    }
  }, []);

  /** Load an AudioFile produced elsewhere in the app (e.g. "Edit This Song"). */
  const loadAudioFile = useCallback((af: AudioFile) => {
    jobRef.current++;
    setWarnings(durationWarnings(af.durationSec));
    setAudio(af);
    setState({ phase: 'ready', progress: 1, error: null });
  }, []);

  const clear = useCallback(() => {
    jobRef.current++;
    setAudio(null);
    setWarnings([]);
    setState({ phase: 'idle', progress: 0, error: null });
  }, []);

  return { state, audio, warnings, uploadFile, loadAudioFile, clear };
}

export type AudioUploadApi = ReturnType<typeof useAudioUpload>;
