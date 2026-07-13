# SongEngineer — Write · Sing · Craft

All-in-one songwriting and singing studio.

## Modes

| Mode | What it is |
|------|------------|
| **Home** | Landing with paths into Write and Sing |
| **Write Studio** | Lyrics IDE (Sing-style sidebar), harmony palette, progressions, rhymes, imagery, craft-first metaphors & similes, figures of speech, prompts, library, voice memos |
| **Sing Studio** | Local vocal coach — live pitch/formants/support, exercises, tuner, metronome, range finder, breath timer, progress, technique guide |

Vocal analysis runs entirely in the browser (Web Audio API). No cloud AI for coaching.

## Develop

```bash
cd song-engineer-ui
npm install
npm run dev
```

Open the URL Vite prints (e.g. http://127.0.0.1:5173/).

## Build

```bash
npm run build
npm run preview
```

Production assets land in `dist/`. Deploy that folder (or your existing host pipeline for songengineer.com).

## Backend (Write tools)

Write Studio still calls the Song Engineer API for chords, words, and phrases:

- `https://song-engineer-ui-2.onrender.com/api/...`

Backend code lives in the parent `sculpt_react/` folder (`main.py`, `theory_engine.py`, etc.).

## Project layout

```
src/
  App.jsx              # Shell + home + mode switcher
  index.css            # Shared design system
  write/
    WriteStudio.jsx    # Songwriting workbench
    WriteStudio.css
  sing/
    SingStudio.jsx     # Vocal coach UI
    SingStudio.css
    lib/
      audio-engine.js  # YIN pitch, formants, metronome, recorder
      coach.js         # Rule-based tips + technique guide
      exercises.js     # Exercise library
```

## Privacy

- Vocal analysis and recordings stay on-device unless you download them
- Song library and vocal progress use `localStorage`
```
