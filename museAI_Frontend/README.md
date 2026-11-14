# MuseAI frontend

This is a React, TypeScript and Tailwind frontend for creating and editing music. It connects to the MuseAI FastAPI backend, which provides the ACE-Step 1.5 generation, analysis and editing workflows.

> Whenever this README says ACE-Step supports something, the claim comes from ACE-Step's own documents: the model card at https://huggingface.co/ACE-Step/Ace-Step1.5 and, in https://github.com/ace-step/ACE-Step-1.5, the files `docs/en/INFERENCE.md`, `docs/en/API.md` and `acestep/constants.py`.

---

## 1. Install and run

You need Node 18 or newer (it was tested on Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks (tsc) and builds production files into dist/
npm run preview    # serves dist/ at http://localhost:4173
```

To configure it, copy `.env.example` to `.env.local`:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_SERVICE_MODE` | `http` | Selects the HTTP service implementation used by the frontend. |
| `VITE_API_BASE_URL` | `http://localhost:8000` | The MuseAI backend. |
| `VITE_POLL_INTERVAL_MS` | `1500` | How often to poll a task's status. |
| `VITE_MAX_UPLOAD_MB` | `50` | Size limit for uploads, checked in the browser. |

---

## 2. Project structure

```
src/
  config/
    env.ts                    env vars + backend endpoint paths
    aceStepCapabilities.ts    what ACE-Step 1.5 supports: limits, models, task types,
                              track names, keys, time signatures; also the
                              user-facing labels for edit options
  types/
    audio.ts                  AudioFile, WaveformPeaks, UploadState
    music.ts                  every backend contract (see §4)
  services/
    types.ts                  service interfaces (contract every implementation meets)
    musicGenerationService.ts generateMusic(request)   ┐ service facades used by
    musicEditingService.ts    editMusic(request)        │ the UI components.
    audioAnalysisService.ts   analyzeAudio(audioFile)   ┘
    audioFiles.ts             backend result → AudioFile (fetches the bytes)
    http/
      apiClient.ts              fetch wrapper, upload with progress, task polling
      httpServices.ts           generate / analyze / edit against /api/music/*
  hooks/
    useMusicGeneration.ts     Create form state, validation, request building
    useAudioUpload.ts         validates the file, reads it (real progress), decodes it locally
    useMusicEditing.ts        versions/history, analysis, time ranges, edit settings, apply
    useAudioPlayer.ts         <audio> transport (one player plays at a time)
    useWaveformPeaks.ts       decodes in the browser → waveform peaks
  components/
    layout/Header.tsx                   logo + the Create / Edit toggle
    create-music/                       LyricsInput, StyleInput, GenerationSettings,
                                        GenerationResult ("Edit This Song"), workspace
    edit-music/                         UploadZone, ChangeDescription, EditStrategy,
                                        EditResult, EditHistory, workspace
    metadata-table/MetadataTable.tsx    timeline / metadata table
    audio-player/                       AudioPlayer, ABComparePlayer
    waveform/Waveform.tsx               canvas waveform: seek, region overlay, drag-select
    ui/                                 Button, Panel, Badge, Alert, SettingField…
  pages/MusicWorkspace.tsx    owns all state; keeps both modes mounted
  utils/                      timestampUtils, audioValidation, audioDecode, wav, editModeHeuristic…
```

Design rules:

- **Components never import service implementations directly.** They only call the three facade functions.
- `MusicWorkspace` keeps both workspaces mounted and hides whichever one is inactive. Switching modes never resets any work.
- An edit never changes an existing `AudioFile`. Every edit creates a new `AudioVersion`, and version 0 is always the original.
- Detected metadata (`TimeRange.detected`) is stored separately from what the user changes (`TimeRange.overrides`). Every value is labelled *Detected*, *Estimated* or *Edited*.
- The **Audio Analysis & Timeline Settings** table appears directly under the upload area. A full-length row is created the moment audio loads, and analysis then fills in its values.
- The theme is light. Colour tokens are in `tailwind.config.js`: the `studio` scale runs from page background (950) to primary text (100), with `accent` (indigo-violet) and `signal.cyan` (soft blue).

---

## 3. Which controls ACE-Step actually supports

This mapping is for developers and is **not shown in the UI**. Model internals (DiT variant, LM thinking, inference steps, guidance scale) are not exposed as controls. Their defaults are in `DEFAULT_FORM` (`hooks/useMusicGeneration.ts`). The edit request picks `acestep-v15-base` automatically for the add-instrument, isolate-instrument and fill-out-arrangement options.

### Create Music

| Control | ACE-Step param | Status |
|---|---|---|
| Lyrics | `lyrics` (max 4096 chars; `[Verse]`/`[Chorus]` tags) | ✅ model |
| Music Style Description | `caption` / `prompt` (max 512 chars) | ✅ model |
| Instrumental | `instrumental` / `"[Instrumental]"` | ✅ model |
| Vocal language | `vocal_language` (50+ ISO codes, `unknown`) | ✅ model |
| Duration | `duration` / `audio_duration` 10–600 s | ✅ model |
| BPM | `bpm` 30–300 | ✅ model (LM fills it if left empty) |
| Key / scale | `keyscale` / `key_scale` | ✅ model |
| Time signature | `timesignature`: only `2`,`3`,`4`,`6` (2/4, 3/4, 4/4, 6/8) | ✅ model |
| DiT model | `model`: turbo / sft / base | ✅ model |
| LM planning | `thinking` | ✅ model |
| Inference steps | `inference_steps` (turbo ≤20, base ≤200) | ✅ model |
| Guidance scale | `guidance_scale` | ⚠️ Base/SFT only; turbo forces it to 1.0 |
| Seed / takes | `seed` + `use_random_seed=false`, `batch_size` ≤8 | ✅ model |
| Output format | `audio_format` | ✅ model |
| Title, tags | none | App only |

### Edit Existing Song

| Control | ACE-Step mapping | Status |
|---|---|---|
| Describe changes | No free-form edit parser. ACE-Step's `instruction` is a **fixed template per task** (for example `"Repaint the mask area based on the given conditions:"`). The user's text should become the `caption` for the regenerated audio. | ⚠️ partial: the backend has to route the request |
| Edit strategy | `task_type`: `repaint`, `cover` (all models); `lego`, `extract`, `complete` (**base model only**) | ✅ model |
| Time range | `repainting_start` / `repainting_end` (+ `chunk_mask_mode="explicit"`). **One range per call.** | ⚠️ partial |
| Per-range Key / BPM / Time signature | `keyscale` / `bpm` / `timesignature` apply **to the whole call**, not to a region | ⚠️ partial (see gaps) |
| Track picker | `TRACK_NAMES`: vocals, backing_vocals, drums, bass, guitar, keyboard, percussion, strings, synth, fx, brass, woodwinds | ✅ model (lego/extract/complete) |
| Cover strength | `audio_cover_strength` 0–1 | ✅ model |
| Preserve outside range | Built into repaint and lego. Cover and extract always change the whole file. | ⚠️ partial |
| BPM/key/time-sig detection | `understand_music()` (LM over audio codes): global values only, no confidence score, not exposed by the REST server | ⚠️ partial |
| "Auto" strategy | A keyword heuristic in `utils/editModeHeuristic.ts` | App only |

### Gaps the frontend cannot cover (ACE-Step limits)

1. **Key, BPM and time signature cannot differ by region.** ACE-Step uses one set of values for a whole call. The table keeps values per range, and the backend can pass each range's values to that range's own repaint call. A tempo or key that differs from the surrounding audio will probably not blend in.
2. **Repaint handles one range per call.** To edit several ranges, the backend has to run repaint calls one after another, feeding each output into the next call.
3. **It cannot swap one instrument for another** ("replace the flute with a piano"). Repaint regenerates *everything* in the range from the caption, and cover restyles the whole song.
4. **There is no "remove vocals" operation.** `extract` isolates *one* stem, and only on the Base model. To get an instrumental you need to extract and re-mix stems, or run a separator such as Demucs.
5. **Lego, Extract and Complete need `acestep-v15-base`.** The default turbo model supports only text2music, repaint and cover. The request switches the model to Base automatically when one of those options is picked.
6. **Time signatures other than 2/4, 3/4, 4/4 and 6/8** (for example 5/4 or 7/8) can be entered in the table. They are flagged, and they can only be kept as app metadata.
7. **The real analyzer is not part of ACE-Step.** `understand_music` can estimate global values. To get per-section analysis or confidence scores, the backend needs a separate analyzer such as librosa, essentia or madmom.

---

## 4. Frontend ↔ backend contract

All types are in `src/types/music.ts`. They are MuseAI contracts and are **not** ACE-Step's own schema. The backend endpoints are:

```
POST /api/music/generate        body: MusicGenerationRequest            → TaskAccepted
POST /api/music/analyze         multipart "file"  OR  {audioFileId}     → AudioAnalysisResponse | TaskAccepted
POST /api/music/edit            body: MusicEditRequest                  → TaskAccepted
GET  /api/music/status/{task_id}                                        → TaskStatus
GET  /api/music/result/{task_id}                                        → MusicGenerationResponse | MusicEditResponse
```

- The JSON uses **camelCase**. In Pydantic you can match this with `model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)`.
- Responses can be either the raw object or ACE-Step's envelope (`{data, code, error}`). The client accepts both.
- `TaskState` is one of `queued | running | succeeded | failed`. ACE-Step's `/query_result` reports status as `0 / 1 / 2`, so the backend has to translate.
- Every result (`GeneratedTake`) contains an `audioFileId`. That is how **Edit This Song** passes a generated song to the editor without uploading it again: `analyzeAudio` sends `{audioFileId}` instead of the file.

Shape of the edit request:

```ts
interface MusicEditRequest {
  audioFileId: string;
  instruction: string;                       // user's natural language
  timeRanges: { startTime: number; endTime: number; key?: string; tempoBpm?: number; timeSignature?: string }[];
  preserveOriginalOutsideRange: boolean;
  editMode: 'auto' | 'repaint' | 'cover' | 'lego' | 'extract' | 'complete';
  styleCaption?: string;                     // → ACE-Step caption
  trackNames?: AceStepTrackName[];           // lego / extract / complete
  coverStrength?: number;                    // → audio_cover_strength
  model?: 'acestep-v15-turbo' | 'acestep-v15-sft' | 'acestep-v15-base';
  parentVersionId?: string;                  // lineage (MuseAI only)
}
```

To inspect the exact JSON before it is sent, use `editing.previewRequest` from `useMusicEditing` (the panel that showed it has been removed from the UI).

---

## 5. Backend integration

1. The FastAPI backend wraps ACE-Step in one of two ways:
   - **In-process:** use `acestep.inference.generate_music(dit_handler, llm_handler, GenerationParams(...), GenerationConfig(...))`, or
   - **Proxy:** call ACE-Step's own server (`python -m acestep.api_server`, port 8001). Submit with `POST /release_task`, poll `POST /query_result`, and download from `GET /v1/audio?path=…`.
2. Map the requests. `config/aceStepCapabilities.ts` lists every field mapping. In short:

   ```python
   # generate
   p = req.params
   GenerationParams(
       task_type="text2music", caption=p.caption, lyrics=p.lyrics, instrumental=p.instrumental,
       vocal_language=p.vocalLanguage, duration=p.durationSec or -1, bpm=p.bpm,
       keyscale=p.keyScale or "", timesignature={"2/4":"2","3/4":"3","4/4":"4","6/8":"6"}.get(p.timeSignature, ""),
       thinking=p.thinking, inference_steps=p.inferenceSteps, guidance_scale=p.guidanceScale or 7.0,
       seed=p.seed if p.seed is not None else -1)
   # + GenerationConfig(batch_size=p.batchSize, use_random_seed=p.seed is None, audio_format=p.audioFormat)
   # req.appMetadata → your own DB, NOT the model

   # edit (repaint, one call per range, chained)
   src = resolve_path(req.audioFileId)
   for r in sorted(req.timeRanges, key=lambda r: r.startTime):
       out = generate_music(..., GenerationParams(
           task_type="repaint", src_audio=src, caption=req.styleCaption or req.instruction,
           repainting_start=r.startTime, repainting_end=r.endTime, chunk_mask_mode="explicit",
           bpm=r.tempoBpm, keyscale=r.key or "", timesignature=map_ts(r.timeSignature)))
       src = out.audios[0]["path"]

   # lego:    task_type="lego",    instruction=f"Generate the {track} track based on the audio context:"
   # extract: task_type="extract", instruction=f"Extract the {track} track from the audio:"
   # complete:task_type="complete",instruction=f"Complete the input track with {', '.join(tracks)}:"
   # cover:   task_type="cover",   audio_cover_strength=req.coverStrength
   ```
   With `editMode == "auto"`, the backend has to choose the task type itself. It can port `utils/editModeHeuristic.ts` or use an LLM router.
3. For analysis, register the upload, then estimate BPM, key and time signature. Use ACE-Step (`convert_src_audio_to_codes` followed by `understand_music`, which gives global values) and/or a DSP library. Return `segments` only if you really analyse sections.
4. Allow CORS for the frontend's origin.
5. Set `VITE_SERVICE_MODE=http` and `VITE_API_BASE_URL=…`, then restart `npm run dev`. No UI code changes are required.
