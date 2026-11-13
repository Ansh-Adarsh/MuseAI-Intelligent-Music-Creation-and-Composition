/**
 * Procedural audio for the MOCK services only. This is a few oscillators
 * following a chord progression; it exists so the players, waveform and
 * download flow have real audio to work with. It is not ACE-Step output.
 */

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6,
  G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
};

export function parseKey(key: string | undefined): { root: number; minor: boolean } {
  const m = key?.trim().match(/^([A-Ga-g])(#|b|♯|♭)?\s*(major|minor|maj|min|m)?$/i);
  if (!m) return { root: 9, minor: true };
  const acc = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2] ?? '';
  const name = m[1].toUpperCase() + (acc === '#' ? '#' : acc === 'b' ? 'B' : '');
  const root = NOTE_INDEX[name] ?? NOTE_INDEX[m[1].toUpperCase()] ?? 9;
  const mode = (m[3] ?? 'major').toLowerCase();
  return { root, minor: mode.startsWith('min') || mode === 'm' };
}

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SynthOptions {
  sampleRate: number;
  durationSec: number;
  bpm: number;
  key?: string;
  beatsPerBar: number;
  seed: number;
  parts: { pad?: boolean; bass?: boolean; arp?: boolean; drums?: boolean; lead?: boolean };
  /** 0..1 brightness, from caption keywords. */
  brightness?: number;
  /** Fade in/out at file edges (seconds). */
  fadeSec?: number;
}

/** Render mono audio. */
export function renderSynth(o: SynthOptions): Float32Array {
  const sr = o.sampleRate;
  const n = Math.max(1, Math.floor(o.durationSec * sr));
  const out = new Float32Array(n);
  const { root, minor } = parseKey(o.key);
  const rand = mulberry32(o.seed);
  // Progressions in scale degrees (semitones from root) for each bar.
  const progMajor = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
  const progMinor = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]];
  const prog = minor ? progMinor : progMajor;
  const beatSec = 60 / o.bpm;
  const barSec = beatSec * o.beatsPerBar;
  const baseMidi = 48 + root;
  const bright = o.brightness ?? 0.5;
  const melody = Array.from({ length: 16 }, () => [0, 2, 4, 7, 9, 12][Math.floor(rand() * 6)] );

  let noiseState = o.seed || 1;
  const noise = () => {
    noiseState ^= noiseState << 13; noiseState ^= noiseState >>> 17; noiseState ^= noiseState << 5;
    return ((noiseState >>> 0) / 4294967296) * 2 - 1;
  };
  let hatLp = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const bar = Math.floor(t / barSec);
    const chord = prog[bar % prog.length];
    const tInBar = t - bar * barSec;
    const beat = Math.floor(tInBar / beatSec);
    const tInBeat = tInBar - beat * beatSec;
    let s = 0;

    if (o.parts.pad) {
      const env = Math.min(1, tInBar / 0.4) * (0.85 + 0.15 * Math.cos((2 * Math.PI * tInBar) / barSec));
      for (const deg of chord) {
        const f = midiToHz(baseMidi + 12 + deg);
        s += 0.05 * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * bright * Math.sin(4 * Math.PI * f * t));
      }
    }
    if (o.parts.bass) {
      const f = midiToHz(baseMidi - 12 + chord[0]);
      const env = Math.exp(-tInBeat * 3);
      s += 0.16 * env * Math.sin(2 * Math.PI * f * t + 0.6 * Math.sin(2 * Math.PI * f * t));
    }
    if (o.parts.arp) {
      const step = Math.floor(tInBar / (beatSec / 2));
      const tInStep = tInBar - step * (beatSec / 2);
      const f = midiToHz(baseMidi + 24 + chord[step % 3]);
      const env = Math.exp(-tInStep * 9);
      s += 0.07 * env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t));
    }
    if (o.parts.lead) {
      const step = Math.floor(t / beatSec);
      const tInStep = t - step * beatSec;
      const f = midiToHz(baseMidi + 24 + melody[step % melody.length]);
      const env = Math.min(1, tInStep / 0.02) * Math.exp(-tInStep * 2.5);
      const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t);
      s += 0.06 * env * Math.sin(2 * Math.PI * f * vib * t);
    }
    if (o.parts.drums) {
      const kickBeats = o.beatsPerBar === 3 ? [0] : o.beatsPerBar === 6 ? [0, 3] : [0, 2];
      if (kickBeats.includes(beat) && tInBeat < 0.3) {
        const f = 50 + 90 * Math.exp(-tInBeat * 30);
        s += 0.35 * Math.exp(-tInBeat * 12) * Math.sin(2 * Math.PI * f * tInBeat);
      }
      const snareBeat = o.beatsPerBar === 4 ? [1, 3] : o.beatsPerBar === 2 ? [1] : o.beatsPerBar === 6 ? [] : [];
      if (snareBeat.includes(beat) && tInBeat < 0.2) {
        s += 0.12 * Math.exp(-tInBeat * 22) * noise();
      }
      const half = beatSec / 2;
      const tInHalf = tInBeat % half;
      if (tInHalf < 0.05) {
        const nz = noise();
        hatLp = 0.6 * hatLp + 0.4 * nz;
        s += 0.035 * Math.exp(-tInHalf * 70) * (nz - hatLp);
      }
    }
    out[i] = s;
  }

  const fade = Math.floor((o.fadeSec ?? 0) * sr);
  for (let i = 0; i < fade && i < n; i++) {
    const g = i / fade;
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  // Soft clip
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.2);
  return out;
}

export function brightnessFromText(text: string): number {
  const t = text.toLowerCase();
  let b = 0.5;
  if (/(bright|upbeat|edm|pop|energetic|electric)/.test(t)) b += 0.3;
  if (/(soft|warm|lo-?fi|ambient|mellow|acoustic|ballad)/.test(t)) b -= 0.3;
  return Math.max(0, Math.min(1, b));
}

export function beatsPerBarFromSignature(ts: string | undefined): number {
  switch (ts) {
    case '2/4': return 2;
    case '3/4': return 3;
    case '6/8': return 6;
    default: return 4;
  }
}
