# SMS Studio — motion graphics video

A ~55 second, 1920×1080 / 30fps motion piece for "עורך מסרונים", built on the **real app**
(`source/sms-studio.html`, never edited) loaded in a same-origin iframe and driven from outside.
See `CLAUDE.md` for the brief and storyboard.

## Run

```bash
npm install
npm run serve            # http://127.0.0.1:4173/preview.html  — preview player (play / scrub / scene jumps)
node render/shots.mjs 4 10 15 24 32 39 46 51   # stills -> out/shots/
node render/check-determinism.mjs              # same frame from different seek orders must be identical
npm run render           # full render -> out/sms-studio-16x9.mp4 (H.264, yuv420p, CRF 18)
```

## Layout

| File | Role |
|---|---|
| `src/stage.html` | The 1920×1080 stage: layers, captions, device frames, split screen, end card |
| `src/timeline.js` | One paused GSAP timeline for all 8 scenes, `window.seek(t)` |
| `src/bridge.js` | Loads the app in the iframe; injects local Heebo + no-transition CSS; freezes app timers; sets text, view, toast, drawer… through the app's own functions |
| `src/legacy-scene.js` | The generic gray "old sending system" (vendor-less) and its doubling display rule |
| `src/seed.js` | Demo data seeded into `localStorage` (`smsStudioCleanV1`) before the app loads |
| `preview.html` | Approval player |
| `render/*.mjs` | Playwright + ffmpeg tooling |

## How determinism is kept

- Everything moves through the GSAP timeline; the app's CSS transitions/animations are disabled and its
  `setTimeout`/`setInterval` are frozen (no autosave, no live clock — the phone shows 09:41).
- The timeline only plays **forward**: a backward seek restores the stage's inline styles from a snapshot and
  rebuilds the timeline, so a frame never depends on where the playhead came from.
- No GPU layer promotion (`force3D:false`, no `will-change`), so every frame is rasterized at its true scale.
- Fonts are local (`@fontsource/heebo`, `@fontsource/arimo` for the old system); outside requests are blocked
  during rendering.
- The `\n` tags come from the app's own `encodeSms()`/`renderOutput()`, never re-implemented.
