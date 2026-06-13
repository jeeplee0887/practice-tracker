# Practice Tracker

A browser-based Progressive Web App (PWA) that **automatically tracks how long a child actually practices** a musical instrument. It listens through the device microphone, detects when an instrument is being played, and runs a timer only while playing is happening — pausing during silence and breaks.

**Live app:** https://jeeplee0887.github.io/practice-tracker/

> 🔒 **Privacy first:** all audio is analyzed **on-device** in the browser. No audio, and no practice data, ever leaves the device — there is no backend and no account.

## Features

- **Automatic practice timing** — starts when it hears playing, pauses on silence. No stopwatch to remember.
- **On-device sound detection** — uses [YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet) (a TensorFlow.js audio-classification model) to tell music from background noise.
- **Multiple children & instruments** — track several kids, each with the instruments they play.
- **Per-instrument daily goals** — set a separate daily target for each instrument and watch progress fill on the home screen.
- **History** — review past sessions and daily/weekly totals.
- **Installable PWA** — add it to a phone home screen; works offline after the first load.
- **Local-first data** — everything is stored in the browser's `localStorage`, with persistent-storage requested to resist eviction.
- **Backup & restore** — export all data to a JSON file and import it on another device (data does not sync automatically).

## How detection works

Two stages keep it cheap and responsive:

1. **Volume gate** — a quick RMS check skips the model when it's quiet, saving battery.
2. **Classification** — when there's sound, ~1 second of 16 kHz mono audio is run through YAMNet. If the music-related score clears the sensitivity threshold for a few consecutive windows, the timer starts; after a configurable stretch of silence, it pauses.

Sensitivity and pause-tolerance are adjustable in **Settings**, which also has a debug mode that shows the live model labels and scores.

> **Note:** detection keys off general "music" sounds, so the selected instrument is used as a label for the session rather than as a strict detection filter. It also can't distinguish live playing from a nearby recording — it responds to whatever the microphone hears.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **React Router** (`react-router-dom`)
- **TensorFlow.js** + **YAMNet** for audio classification
- **vite-plugin-pwa** (Workbox) for the service worker / offline support
- Web APIs: Web Audio (`AudioContext`, `AnalyserNode`, `ScriptProcessorNode`), Screen Wake Lock, `navigator.storage.persist()`

## Self-hosted model

The YAMNet model and its class map are **vendored into this repo** under [`public/models/yamnet/`](public/models/yamnet/) (model definition, weight shards, and `yamnet_class_map.csv`) rather than fetched from `tfhub.dev` at runtime. This removes a runtime dependency on a third-party host (which could move or rate-limit), makes the app fully self-contained, and lets the service worker precache the model for offline use.

The model is Google's YAMNet, released under the Apache 2.0 license.

## Development

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173/practice-tracker/)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the app and publishes `dist/` to **GitHub Pages**.

The app is served from the project sub-path `/practice-tracker/`. This is set in two places that must stay in sync: `base` in [`vite.config.ts`](vite.config.ts) and the router `basename` in [`src/main.tsx`](src/main.tsx). (If moving to a custom domain served from the root, change both to `/`.)

The displayed app version (shown in Settings) is derived from git at build time — `v1.<commit-count> (<short-sha>)` — so it increments automatically on every push.

## Installing on a phone (PWA)

- **iPhone (Safari):** open the live URL → Share → **Add to Home Screen**.
- **Android (Chrome):** open the live URL → menu → **Install app** / **Add to Home screen**.

Grant microphone access when prompted. Practice data lives on that device only; use **Settings → Export backup** to move it elsewhere.

## License

Application code: add a license of your choice (e.g. MIT) if you intend others to reuse it.
YAMNet model and TensorFlow.js are licensed under Apache 2.0 by their respective authors.
