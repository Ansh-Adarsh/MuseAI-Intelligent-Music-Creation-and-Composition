import type { AceStepTrackName, EditMode } from '@/types/music';

/**
 * A small keyword heuristic that suggests an ACE-Step task type from a
 * natural-language instruction. This is MuseAI UI logic, not part of
 * ACE-Step. A real backend could replace it with an LLM router.
 */

const TRACK_KEYWORDS: [RegExp, AceStepTrackName][] = [
  [/\b(backing vocals?|harmon(y|ies)|choir)\b/i, 'backing_vocals'],
  [/\b(vocals?|voice|singer|singing)\b/i, 'vocals'],
  [/\b(drums?|kick|snare|hi-?hats?)\b/i, 'drums'],
  [/\b(tabla|dhol|percussion|conga|bongo|shaker|tambourine)\b/i, 'percussion'],
  [/\b(bass|808)\b/i, 'bass'],
  [/\b(guitar|sitar|oud|banjo|ukulele)\b/i, 'guitar'],
  [/\b(piano|keys|keyboard|organ|harmonium)\b/i, 'keyboard'],
  [/\b(strings?|violin|viola|cello|sarangi|orchestra)\b/i, 'strings'],
  [/\b(synth|pad|arp)\b/i, 'synth'],
  [/\b(brass|trumpet|trombone|horn|sax(ophone)?)\b/i, 'brass'],
  [/\b(flute|bansuri|clarinet|oboe|shehnai|woodwinds?)\b/i, 'woodwinds'],
  [/\b(fx|effects?|riser|sweep)\b/i, 'fx'],
];

export interface EditModeSuggestion {
  mode: Exclude<EditMode, 'auto'>;
  trackNames: AceStepTrackName[];
  /** User-facing explanation. */
  reason: string;
  /** Things ACE-Step cannot do exactly as phrased (developer-facing; not shown in the UI). */
  caveats: string[];
}

export function detectTracks(text: string): AceStepTrackName[] {
  const found: AceStepTrackName[] = [];
  for (const [re, name] of TRACK_KEYWORDS) if (re.test(text) && !found.includes(name)) found.push(name);
  return found;
}

export function suggestEditMode(instruction: string, hasPartialRange: boolean): EditModeSuggestion {
  const text = instruction.toLowerCase();
  const tracks = detectTracks(text);
  const caveats: string[] = [];

  if (/\b(remove|without|mute|strip|isolate|karaoke|acapella|a cappella)\b/.test(text)) {
    caveats.push('ACE-Step has no "remove" operation. Extract isolates a single stem (Base model); getting an instrumental means extracting and re-mixing the other stems, or using a dedicated separator such as Demucs on the backend.');
    return { mode: 'extract', trackNames: tracks.slice(0, 1), reason: 'Isolates the part you mentioned.', caveats };
  }
  if (/\b(replace|swap|instead of|change .* to)\b/.test(text)) {
    caveats.push('ACE-Step cannot swap one instrument inside a mix. Repaint regenerates the whole mix in the range using your description; the new instrument should be named in the description.');
    return { mode: 'repaint', trackNames: [], reason: 'Reworks the selected section with the new instrumentation.', caveats };
  }
  if (/\b(add|layer|introduce|include|bring in)\b/.test(text) && tracks.length > 0) {
    if (tracks.length > 1) {
      return { mode: 'complete', trackNames: tracks, reason: 'Adds the instruments you mentioned across the song.', caveats };
    }
    if (hasPartialRange) {
      caveats.push('Lego generates the track over the given range in context. If the Base model is not available, the backend can fall back to repaint.');
    }
    return { mode: 'lego', trackNames: tracks, reason: `Adds a ${tracks[0].replace('_', ' ')} part to the selected section.`, caveats };
  }
  if (/\b(whole song|entire song|restyle|remix|cover|genre|as a|in the style of|lo-?fi|rock version|jazz version)\b/.test(text) && !hasPartialRange) {
    return { mode: 'cover', trackNames: [], reason: 'Restyles the whole song.', caveats };
  }
  return { mode: 'repaint', trackNames: [], reason: 'Reworks the selected section to match your description.', caveats };
}
