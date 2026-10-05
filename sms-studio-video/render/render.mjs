// Full render: Playwright seeks the stage frame by frame (seek(frame/30)), saves a PNG per
// frame, then ffmpeg encodes H.264 / yuv420p / CRF 18 at 30fps.
//
//   node render/render.mjs                 -> out/sms-studio-16x9.mp4
//   FRAMES=0-90 node render/render.mjs     -> render only a frame range (no encode)
//   KEEP_FRAMES=1 node render/render.mjs   -> keep out/frames after encoding
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { openStage } from './stage-browser.mjs';

const OUT = 'out/sms-studio-16x9.mp4';
const FRAMES_DIR = 'out/frames';

const stage = await openStage({ port: Number(process.env.PORT) || 4173 });
const { duration, fps } = stage.info;
const total = Math.round(duration * fps);
let [first, last] = [0, total - 1];
if (process.env.FRAMES) [first, last] = process.env.FRAMES.split('-').map(Number);
const partial = first !== 0 || last !== total - 1;

if (!partial) await rm(FRAMES_DIR, { recursive: true, force: true });
await mkdir(FRAMES_DIR, { recursive: true });

const t0 = Date.now();
for (let f = first; f <= last; f++) {
  await stage.frameAt(f / fps, `${FRAMES_DIR}/${String(f).padStart(5, '0')}.png`);
  if (f % 30 === 0 || f === last) {
    const done = f - first + 1, rate = done / ((Date.now() - t0) / 1000);
    process.stdout.write(`\rframe ${f}/${last}  ${rate.toFixed(1)} fps  eta ${Math.round((last - f) / rate)}s   `);
  }
}
process.stdout.write('\n');
const errors = stage.errors.filter((e) => !/ERR_FAILED/.test(e)); // blocked outside font requests are expected
if (errors.length) console.log('console:', errors.join('\n'));
await stage.close();

if (partial) { console.log(`rendered frames ${first}-${last} into ${FRAMES_DIR}`); process.exit(0); }

const ff = spawnSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(fps), '-i', `${FRAMES_DIR}/%05d.png`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-r', String(fps), '-movflags', '+faststart', '-an',
  OUT
], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status ?? 1);

const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
  '-show_entries', 'stream=width,height,r_frame_rate,pix_fmt,nb_read_frames:format=duration', '-of', 'default=nw=1', OUT], { encoding: 'utf8' });
console.log(probe.stdout.trim());
if (!process.env.KEEP_FRAMES) await rm(FRAMES_DIR, { recursive: true, force: true });
console.log(`done: ${OUT}`);
