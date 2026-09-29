# AR GYM — build & deploy report

**Live:** https://ar-gym-pddpte.web.app · **Firebase project:** `ar-gym-pddpte` (display name "AR GYM", Spark plan)

On iPhone: open the link in Safari → Share → Add to Home Screen → open AR GYM from the home screen → Guide → Offline videos → download.

## Needs your eyes

1. **The intro video source is damaged, and only its first 13:33 was usable.**
   `videos-raw/شرح كامل شداد سبليت.mp4` is 20:29 long, but from 13:34 (814 s) to the end both the video and the audio are unreadable (`Invalid NAL unit size`, thousands of AAC errors). Frames before that are fine. Everything after 13:34 is garbage, so it looks like a truncated or corrupted download.
   The app ships the clean first 13:33 (`split-breakdown.mp4`, 54.6 MB). The intro card shows the real length ("14 min"). The coach's own sentence "a video, more than 20 minutes" is kept word for word.
   **Fix:** put a complete copy in `videos-raw/` (same name or any name at the root) and run `npm run videos && npm run deploy`.
2. **Rope triceps pushdown on day 2 and day 4 now share one video.** The prototype linked two *different* demos for it (day 2 vs day 4). Your folders contain the byte-identical file for both days, so both days play the same demo. If day 4 should have its own, replace `Day 04/Rope triceps pushdown.mp4` and re-run.
3. **Two exercises that had no demo now have one:** DB no cheat curl (day 2) → `Day 02/DB no cheat curl.mp4`, and Close grip seated row (day 4) → `Day 04/Close grip seated row.mp4`. Both are short (~23 s); the no-cheat curl is portrait.

No video↔exercise match was a guess. All 38 matched their file by exact name, ignoring case.

## Videos

| | files | size |
|---|---|---|
| Raw (`videos-raw/`, untouched) | 39 | 1,622.6 MB |
| — exercise files | 38 | 1,462.4 MB |
| — intro | 1 | 160.2 MB |
| **Final (`public/videos/`)** | **33** | **362.2 MB** |
| — exercise demos (32 unique) | 32 | 307.5 MB |
| — split breakdown (trimmed, see above) | 1 | 54.6 MB |

- **Kept 33, dropped 6 duplicates.** All six are byte-identical (same sha256): Abdominal crunches (d1=d3), T bar machine (d1=d4), Wide grip latpulldown (d1=d4), Rope triceps pushdown (d2=d4), Adductors machine (d3=d5), Smith standing calf raises (d3=d5). Nothing in `videos-raw/` was modified, moved or deleted.
- **Encoding:** H.264 High + AAC mono 64k, faststart, metadata stripped, shorter side ≤ 720 px, never upscaled. The 1080p sources became 1280×720, and the two portrait clips became 720×1280.
  - At crf 28 the demos were heading for ~440 MB, so, per your fallback rule, all demos use **crf 30** (307.5 MB total). The intro is also at crf 30.
  - Posters: 480 px JPEGs, 711 KB total, precached with the app shell.
- Full mapping, with sizes and source paths: `video-map.json`. Probe data: `build/inventory.json`; damage scan: `build/damage.json`.

## App

- **Stack:** Vite 8 (vanilla JS), `vite-plugin-pwa` (`injectManifest`), Workbox 7.
- **Source files:** `index.html`, `src/styles.css`, `src/data.js` (DAYS, CYCLE, C, T), `src/app.js`, `src/sw.js`, plus the generated `src/videos.json` (size/dimensions per video).
- **Kept from the prototype:** its look, texts, plan, cycle logic, rest timer, history and EN/AR + RTL.
- **Rebrand:**
  - Header `AR/GYM` (slash in the accent colour, "2.0" dropped).
  - About text reworded ("the updated version of the AR GYM program" / "النسخة المعدلة من برنامج AR GYM").
  - Source note, CSS/JS comments, localStorage key (`argym_v1`), manifest and video metadata all rebranded.
  - All YouTube code and strings removed.
- **Logo:** there was no `brand/` folder, so I designed an original wordmark from Barlow Condensed 800 italic in the app palette:
  - `public/logo.svg`: horizontal AR/GYM.
  - App icons: stacked AR/ over GYM with the prototype's chamfered hairline; the maskable version has safe padding and no frame.
  - Favicon: an AR/ mark.
  - Regenerate with `npm run icons`.
- **Persistence:** localStorage only; the status line reads "Saved on this device" / "متحفظ على الجهاز ده". The prototype kept only 60 sessions locally, because the rest lived in the synced db. Now that this device is the only copy, it keeps up to 1,000.
- **History:** Export backup (JSON download, `argym-backup-YYYY-MM-DD.json`) and Import backup. Import merges by workout id and sanitises every field.
- **Video:**
  - Native `<video controls playsinline preload="none">` with posters; portrait clips get a 9:16 frame.
  - Tapping Watch also starts playback, using that same tap.
  - An undownloaded demo opened offline shows "not downloaded yet" instead of a dead player.
- **Offline videos panel (Guide):**
  - "Download all videos", with n/N and MB progress.
  - A "Download this day" button per day, with an n/N count.
  - A separate button for the split breakdown.
  - A ✓ on each cached exercise's Watch button and player caption.
  - `navigator.storage.estimate()` usage; `navigator.storage.persist()` is requested on load and after each download.
- **iOS:**
  - Manifest: standalone, `#14100E`, 192/512/maskable icons.
  - `apple-touch-icon`, `apple-mobile-web-app-*` meta, `viewport-fit=cover`.
  - The sticky header pads under the translucent status bar.
  - A dismissible "Share → Add to Home Screen" hint (EN/AR) appears on iOS when the app isn't running standalone.
- **Updates:** a waiting service worker shows "Update available — tap to refresh" (EN/AR). It never reloads by itself; the workout is saved before a refresh. The app also checks for updates each time it comes back to the foreground.
- **Fonts:** self-hosted through @fontsource, latin + arabic subsets only. The app makes zero requests to other hosts (verified).

### Service worker (`src/sw.js`)
- **Precache:** app shell only — 59 entries, 1.2 MB (html, js, css, woff2, icons, posters). No mp4.
- **Cached videos:** `/videos/*.mp4` in cache `videos-v1` (stable name).
  - A cached file with a `Range` request gets a `206` with `Content-Range`, `Content-Length`, `Accept-Ranges` and `Content-Type: video/mp4` (suffix ranges handled, `416` when out of range).
  - Without a `Range` header, the cached full response is returned.
- **Uncached videos:** passed through to the network. `event.waitUntil` fetches the whole file (no Range) and stores it only on a 200. Downloads in flight are deduped.
  - The page's own download buttons send a marker header, so the SW doesn't download the same file a second time.
- **Worker format:** built as a classic (iife) worker for the widest iOS support.

## Verification

- `npm run build`: 0 errors, 0 warnings.
- Brand grep `grep -rniE "shadad|shady|شداد|شادي|youtube" dist/`: no matches. No file name in `dist/` contains those words. I confirmed the check fails when I plant a match in the content or in a file name.
- **Playwright e2e** (`npm run test:e2e`, against `vite preview`): **19/19 passed**. It runs in the installed Google Chrome, because Playwright's bundled Chromium can't decode H.264. The checks:
  - The SW takes control; after a reload, day 1 downloads through the UI (8 files).
  - An uncached Range request goes out over the network (206) and is then cached in the background.
  - With `context.setOffline(true)`, a reload renders the app, and the Today/Guide/History tabs all work.
  - A logged set (42.5 kg ✓) survives an offline reload.
  - Offline Range requests return 206 with exact headers and body length (including a suffix range).
  - A cached demo actually **plays offline** (1280×720, currentTime > 0.5 s), and the ✓ shows on all 8 day-1 buttons.
  - Backup export → wipe → import restores the history.
  - Arabic switches to RTL.
  - No external hosts and no page errors.
- **Live** (`curl -I`):
  - `/`, `/index.html`, `/sw.js`, `/manifest.webmanifest`: 200 with `no-cache`.
  - `/assets/*`: `public, max-age=31536000, immutable`.
  - `/videos/*.mp4`: 200 `video/mp4`, immutable; a `Range` request returns 206.
  - Deep links rewrite to the app.
  - I added `/` to the no-cache rules: Firebase matches headers on the request path, so the bare root was getting `max-age=3600`.
- **Live smoke test in Chrome:** the SW controls the page, a video is background-cached, an offline reload works, the offline Range request gets a 206, and there are 0 external requests.

**`dist/` size:** 363.8 MB in total: 0.9 MB of app, 363 MB of videos and posters.

## Things to know

- **Free-plan bandwidth:** Firebase Spark allows **360 MB/day** of Hosting transfer. One phone doing "Download all" (≈308 MB) plus the intro (≈55 MB) goes over that in a single day. You could download over two days (e.g. per-day buttons), or switch the project to Blaze (≈$0.15/GB after the free allowance).
  - Playing a demo online *before* it's downloaded costs roughly double, because the stream and the background copy both download it.
- **iOS storage:** Safari and the installed home-screen app have *separate* storage. Install first, then log workouts and download videos inside the installed app. Home-screen apps are also exempt from Safari's 7-day storage eviction. Export a backup now and then.
- **The site is public:** anyone with the URL can open it, including the videos.
- Only filenames, text and metadata were rebranded. What the coach says or shows *inside* the videos is unchanged.
- `public/videos/` and `videos-raw` are git-ignored; they're rebuilt from the raw folder. Nothing has been committed.

## Re-running

```bash
npm run videos       # inventory → map → damage scan → encode (resumable) → finalize video-map.json
npm run icons        # logo + icons (uses brand/logo.svg|png if you add one)
npm run build && npm run test:e2e
npm run deploy       # build + brand check + firebase deploy (project from .firebaserc)
```
