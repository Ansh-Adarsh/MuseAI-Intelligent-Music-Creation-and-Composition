/** Runtime configuration, read from Vite env vars (see .env.example). */

const mode = (import.meta.env.VITE_SERVICE_MODE ?? 'mock').toLowerCase();

export const env = {
  /** 'mock' runs everything in the browser; 'http' calls the FastAPI backend. */
  serviceMode: (mode === 'http' ? 'http' : 'mock') as 'mock' | 'http',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
  pollIntervalMs: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 1500),
  maxUploadMb: Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 50),
} as const;

/** Proposed MuseAI backend endpoints (NOT ACE-Step endpoints). */
export const endpoints = {
  generate: '/api/music/generate',
  analyze: '/api/music/analyze',
  edit: '/api/music/edit',
  status: (taskId: string) => `/api/music/status/${encodeURIComponent(taskId)}`,
  result: (taskId: string) => `/api/music/result/${encodeURIComponent(taskId)}`,
} as const;
