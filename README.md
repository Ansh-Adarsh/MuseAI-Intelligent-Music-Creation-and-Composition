# 🎵 MuseAI — Intelligent Music Creation and Composition

> **Write lyrics. Describe a style. Generate music. Edit it.**
> MuseAI is a full-stack AI music studio powered by [ACE-Step 1.5](https://github.com/ace-step/ACE-Step), combining a polished React frontend with a Python training/inference backend.

---

## ✨ Features

| Capability | Description |
|---|---|
| **Text-to-Music** | Describe a genre, mood, instruments, and vocals — ACE-Step generates a full song |
| **Lyric-guided generation** | Paste lyrics with section tags (`[Verse]`, `[Chorus]`) for structured compositions |
| **Music editing** | Upload any audio, mark time ranges, and rework sections — without touching the rest |
| **Smart edit routing** | Auto-selects between *Repaint* (rework a section) and *Lego* (add an instrument layer) |
| **A/B comparison player** | Listen to before/after edits side-by-side with a waveform viewer |
| **Multi-take batch generation** | Generate up to 8 variations in one shot and pick your favourite |
| **LoRA fine-tuning** | Train custom style adapters on your own audio dataset via Side-Step (training_v2) |
| **Mock mode** | Runs entirely in-browser with no backend — great for UI development and demos |

---

## 🗂️ Project Structure

```
MuseAI-Intelligent-Music-Creation-and-Composition/
├── museAI_Frontend/          # React + TypeScript + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── create-music/   # Text-to-music generation UI
│   │   │   ├── edit-music/     # Upload, edit, compare music
│   │   │   ├── audio-player/   # Waveform & A/B player
│   │   │   ├── layout/         # Header, navigation
│   │   │   └── ui/             # Shared primitives & form fields
│   │   ├── hooks/              # useMusicGeneration, useMusicEditing, useAudioPlayer …
│   │   ├── services/
│   │   │   ├── http/           # FastAPI client (production)
│   │   │   └── mock/           # In-browser mock services (no backend needed)
│   │   ├── config/             # ACE-Step capabilities, env vars, model limits
│   │   ├── types/              # TypeScript types (music, audio)
│   │   └── utils/              # Audio decode, WAV, waveform, format helpers
│   └── .env.example            # Frontend environment template
│
└── Training_recipes/           # Python inference & training backend
    ├── acestep/                # ACE-Step 1.5 core (pipeline, LLM inference, GPU config)
    ├── api/                    # FastAPI endpoints (wraps ACE-Step for the frontend)
    ├── core/                   # Shared model/pipeline utilities
    ├── training/               # Original training code
    ├── training_v2/            # Side-Step LoRA fine-tuning (corrected timesteps + CFG dropout)
    ├── models/                 # Model definitions
    ├── dataset/                # Dataset loading & preprocessing
    ├── scripts/                # GPU check, VAE calibration, LoRA data prep
    ├── cli.py                  # Inference CLI (text-to-music, cover, repaint, lego, extract …)
    ├── train.py                # Training CLI (vanilla / fixed / estimate subcommands)
    └── prep_pipeline_debug.ipynb  # Jupyter notebook for pipeline debugging
```

---

## 🚀 Quick Start

### Frontend (Mock Mode — no backend required)

```bash
cd museAI_Frontend
npm install
cp .env.example .env.local   # VITE_SERVICE_MODE=mock by default
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Everything runs in-browser — no Python needed.

### Frontend (HTTP Mode — with backend)

1. Set up and start the backend (see below).
2. Edit `.env.local`:
   ```env
   VITE_SERVICE_MODE=http
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. `npm run dev`

### Backend (ACE-Step Inference API)

```bash
cd Training_recipes
pip install -r requirements.txt   # see acestep dependencies

# Start the FastAPI server (wraps ACE-Step 1.5)
python -m uvicorn api_server:app --host 0.0.0.0 --port 8000
```

> [!NOTE]
> The FastAPI backend wraps ACE-Step behind standardized endpoints:
> `POST /api/music/generate` · `POST /api/music/edit` · `POST /api/music/analyze` · `GET /api/music/status/{id}`

### CLI Inference (no frontend needed)

```bash
cd Training_recipes
python cli.py text2music \
  --caption "upbeat indie pop, acoustic guitar, female vocals" \
  --lyrics "[Verse]\nSunrise over the city..." \
  --duration 90 --bpm 120
```

---

## 🎛️ ACE-Step Model Variants

| Model | Label | Steps | CFG | Supported tasks |
|---|---|---|---|---|
| `acestep-v15-turbo` | Turbo | 8 | ✗ | Text2Music, Cover, Repaint |
| `acestep-v15-sft` | SFT | 50 | ✓ | Text2Music, Cover, Repaint |
| `acestep-v15-base` | Base | 50 | ✓ | All tasks incl. **Lego**, **Extract**, **Complete** |

---

## 🎼 Edit Modes

| Mode | ACE-Step Task | Description |
|---|---|---|
| **Smart** | auto-routed | Picks the best approach from your description |
| **Rework a section** | `repaint` | Regenerates selected time ranges, everything else unchanged |
| **Add an instrument** | `lego` *(Base only)* | Layers a new instrument part onto the existing mix |

---

## 🏋️ LoRA Fine-tuning (Side-Step)

```bash
cd Training_recipes

# Prepare your dataset
python scripts/lora_data_prepare/prepare.py --input ./my_audio/ --output ./preprocessed_tensors/

# Train a LoRA adapter (fixed = corrected continuous timesteps + CFG dropout)
python train.py fixed \
  --checkpoint-dir ./checkpoints \
  --model-variant turbo \
  --dataset-dir ./preprocessed_tensors/my_style \
  --output-dir ./lora_output/my_style
```

Subcommands: `vanilla` · `fixed` · `estimate` (gradient sensitivity, no training)

> [!TIP]
> For the standalone Side-Step version with additional features and more frequent updates, see [github.com/koda-dernet/Side-Step](https://github.com/koda-dernet/Side-Step).

---

## ⚙️ Frontend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_SERVICE_MODE` | `mock` | `mock` = in-browser only · `http` = call FastAPI backend |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL (HTTP mode only) |
| `VITE_POLL_INTERVAL_MS` | `1500` | Polling interval for async task status |
| `VITE_MAX_UPLOAD_MB` | `50` | Client-side audio upload size limit |

---

## 🛠️ Frontend Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check + production build
npm run preview    # Preview the production build locally
npm run typecheck  # TypeScript type-check only
```

---

## 🌐 Supported Vocal Languages

Auto-detect, English, Hindi, Bengali, Tamil, Telugu, Punjabi, Urdu, Nepali, Sanskrit, Mandarin, Cantonese, Japanese, Korean, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Persian, Turkish, Indonesian, Vietnamese, Thai — and more via ISO 639-1 codes.

---

## 🧰 Tech Stack

**Frontend**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 5](https://vitejs.dev/) — fast dev server & bundler
- [Tailwind CSS 3](https://tailwindcss.com/) — utility-first styling
- [Lucide React](https://lucide.dev/) — icon set

**Backend / ML**
- [ACE-Step 1.5](https://github.com/ace-step/ACE-Step) — open-source music generation model
- [FastAPI](https://fastapi.tiangolo.com/) — async REST API server
- [PyTorch](https://pytorch.org/) — model inference & training
- [Side-Step](https://github.com/koda-dernet/Side-Step) — LoRA fine-tuning for ACE-Step

---

## 📄 License

See individual component licenses:
- ACE-Step model weights and code — refer to the [ACE-Step repository](https://github.com/ace-step/ACE-Step)
- Side-Step training code — refer to the [Side-Step repository](https://github.com/koda-dernet/Side-Step)
- MuseAI frontend — see `museAI_Frontend/` for applicable terms
