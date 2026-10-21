# ריל – פסיכופתולוגיה א׳, שיעור 1

A vertical (1080×1920, 30fps) motion-graphics reel, about 3 minutes long, that teaches the content of the first lesson's slides (Hebrew narration with karaoke-style captions).

The final video: `output/reel-lesson1.mp4`

## Building

```bash
npm install                      # gsap, lucide-static
node -e "const {SCENES}=require('./script.js');require('fs').writeFileSync('build/scenes.json',JSON.stringify(SCENES))"
python3 tools/voice.py 179.5     # narration: tightens pauses, sets the pace -> build/voice.wav + build/timing.json
node tools/build-assets.js       # build/timing.js + build/icons.js
NODE_PATH=$(npm root -g) node tools/render.js sfx          # sound-effect cues -> build/sfx.json
python3 tools/music.py 179.5 audio/sfx                     # synthesized music bed + effects
python3 tools/mix.py                                       # mix + loudness normalization (-14 LUFS)
NODE_PATH=$(npm root -g) node tools/render.js video 4      # frames -> build/video.mp4
ffmpeg -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest output/reel-lesson1.mp4
```

## Files

| File | Contents |
|---|---|
| `script.js` | The script: scenes → beats (each beat = one spoken sentence = one caption line = one animation step) |
| `app.js`, `style.css`, `index.html` | The animation: a GSAP timeline driven by per-word timestamps |
| `tools/voice.py` | Assembles the narration from the TTS takes and builds the timing map |
| `tools/render.js` | Renders frames in headless Chromium (also `snap` for snapshots) |
| `tools/music.py`, `tools/mix.py` | Music bed, sound effects and the final mix |
| `audio/raw`, `audio/words` | The chosen TTS takes (ElevenLabs, voice: Nimrod) and their word timestamps |

To edit text on screen, change `app.js`. To change the narration you need to generate a new take and new timestamps.
