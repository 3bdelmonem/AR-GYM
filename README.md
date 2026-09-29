# AR GYM

A bilingual, offline-first workout tracker built as an installable Progressive
Web App. It combines a seven-day training plan, set logging, workout history,
rest timers, and coach demonstration videos in one mobile-friendly app.

## Features

- English and Arabic interfaces with RTL support
- Guided seven-day workout cycle
- Weight, repetition, set, volume, and workout-duration tracking
- Previous-set references and automatic rest timers
- Locally stored workout history with JSON import/export
- Installable PWA that works offline
- Per-day or full-library video downloads for offline playback
- Kilogram and pound display options

All workout data stays in the browser's `localStorage`. There is no account,
backend, analytics service, or cloud sync.

## Getting started

Requirements:

- Node.js 20.19+ or 22.12+
- npm

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To test the production build locally:

```bash
npm run build
npm run preview
```

The coach videos are generated assets and are not stored in Git. Without
`public/videos`, the app itself still runs, but demonstration videos are
unavailable.

## Available commands

- `npm run dev` — start the Vite development server
- `npm run build` — create a production build in `dist`
- `npm run preview` — serve the production build on port 4173
- `npm run test:e2e` — run the Playwright production/offline test suite
- `npm run icons` — regenerate the PWA icons
- `npm run videos` — run the complete video preparation pipeline
- `npm run brand-check` — verify that excluded names do not appear in `dist`
- `npm run deploy` — build, validate, and deploy to Firebase Hosting

Run `npm run build` before `npm run test:e2e`.

## Video pipeline

Video processing requires `ffmpeg` and `ffprobe`. Put the original files in
`videos-raw/`, arranged in the day folders expected by the workout data, then
run:

```bash
npm run videos
```

The pipeline inventories the source files, maps them to exercises, scans for
decode damage, creates optimized MP4 files and poster images, and updates the
video metadata. Review `video-map.json` after processing, especially any
uncertain filename matches.

Generated media is written to `public/videos/` and is intentionally ignored by
Git.

## Offline behavior

The app shell, fonts, icons, and video posters are precached by the service
worker. Videos use a separate persistent cache and are downloaded on demand.
Cached videos support HTTP range responses so they can play offline on iOS.

Because service workers require a secure context, use the Vite development
server, production preview, or HTTPS instead of opening `index.html` directly.

## Deployment

Firebase Hosting configuration is included in `firebase.json`. After installing
and authenticating the Firebase CLI, deploy with:

```bash
npm run deploy
```

The deployment command builds the app, runs the brand check, and publishes
`dist`.

## Project structure

```text
src/app.js          Application state, rendering, and interactions
src/data.js         Workout plan and bilingual copy
src/styles.css      Responsive visual design
src/sw.js           Offline app and video caching
scripts/            Video, icon, and end-to-end tooling
public/             Static icons and generated video assets
video-map.json      Source-to-exercise video mapping report
vite.config.js      Vite and PWA configuration
```