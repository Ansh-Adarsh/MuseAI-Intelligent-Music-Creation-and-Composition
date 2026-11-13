/**
 * In-memory stand-in for backend file storage (MOCK ONLY).
 * Maps an audioFileId to a Blob and an object URL.
 */
import { uid } from '@/utils/format';
import type { MusicMetadata } from '@/types/music';

interface StoredFile {
  blob: Blob;
  url: string;
  /** Metadata the mock "knows" because it synthesised the audio itself. */
  knownMetadata?: MusicMetadata;
}

const store = new Map<string, StoredFile>();

export const mockFileStore = {
  put(blob: Blob, knownMetadata?: MusicMetadata, prefix = 'mockfile'): { id: string; url: string } {
    const id = uid(prefix);
    const url = URL.createObjectURL(blob);
    store.set(id, { blob, url, knownMetadata });
    return { id, url };
  },
  get(id: string): StoredFile | undefined {
    return store.get(id);
  },
  getByUrl(url: string): StoredFile | undefined {
    for (const f of store.values()) if (f.url === url) return f;
    return undefined;
  },
};
