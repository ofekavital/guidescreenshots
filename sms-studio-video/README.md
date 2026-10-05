# SMS Studio — motion graphics video

A ~55 second, 30fps motion piece for "עורך מסרונים" in two formats — **16:9** (1920×1080) and
**9:16** for phones (1080×1920) — built on the **real app** (`source/sms-studio.html`, never edited)
loaded in a same-origin iframe and driven from outside. See `CLAUDE.md` for the brief and storyboard.

The 9:16 cut tells the same story re-composed for portrait: a caption band on top, the app in its own
mobile layout (390px viewport) inside an "app card", a top/bottom split for the `\n` scene, and the
three devices stacked in the frame. It runs 55.9s (the copy/paste beat gets 0.4s more).

## Run

```bash
npm install
npm run serve            # http://127.0.0.1:4173/preview.html  (add ?format=9x16 for the vertical cut)
node render/shots.mjs 4 10 15 24 32 39 46 51               # stills -> out/shots/
FORMAT=9x16 node render/shots.mjs 4 10 15 24 32 39 46 51   # stills -> out/shots-9x16/
node render/check-determinism.mjs                          # same frame from different seek orders must be identical
npm run render                                             # -> out/sms-studio-16x9.mp4 (H.264, yuv420p, CRF 18)
FORMAT=9x16 npm run render                                 # -> out/sms-studio-9x16.mp4
```

## Layout

| File | Role |
|---|---|
| `src/stage.html`, `src/timeline.js` | 16:9 stage and its single paused GSAP timeline (`window.seek(t)`) |
| `src/stage-9x16.html`, `src/timeline-9x16.js` | 9:16 stage and timeline |
| `src/kit.js` | Shared engine: forward-only seek, captions, typing rhythm, camera/device and app-state sync |
| `src/bridge.js` | Loads the app in the iframe; injects local Heebo + no-transition CSS; freezes app timers; sets text, view, toast, drawer… through the app's own functions |
| `src/legacy-scene.js` | The generic gray "old sending system" (vendor-less), landscape or portrait, and its doubling display rule |
| `src/seed.js` | Demo data seeded into `localStorage` (`smsStudioCleanV1`) before the app loads |
| `preview.html` | Approval player |
| `render/*.mjs` | Playwright + ffmpeg tooling |

## How determinism is kept

- Everything moves through the GSAP timeline; the app's CSS transitions/animations are disabled and its
  `setTimeout`/`setInterval` are frozen (no autosave, no live clock — the phone shows 09:41).
- The timeline only plays **forward**: a backward seek restores the stage's inline styles from a snapshot and
  rebuilds the timeline, so a frame never depends on where the playhead came from.
- No GPU layer promotion (`force3D:false`, no `will-change`) and Chromium runs with `--disable-partial-raster`,
  so pixels never depend on the previous frame. Scroll offsets inside the app are re-asserted every frame.
- Fonts are local (`@fontsource/heebo`, `@fontsource/arimo` for the old system); outside requests are blocked
  during rendering.
- The `\n` tags come from the app's own `encodeSms()`/`renderOutput()`, never re-implemented.
