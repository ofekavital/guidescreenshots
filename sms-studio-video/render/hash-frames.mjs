// Prints an md5 per sampled frame (used to prove refactors don't change the picture).
//   FORMAT=16x9 STEP=0.5 node render/hash-frames.mjs > hashes.txt
import { createHash } from 'node:crypto';
import { openStage } from './stage-browser.mjs';
const step = Number(process.env.STEP) || 0.5;
const stage = await openStage({ port: Number(process.env.PORT) || 4192, format: process.env.FORMAT });
for (let t = 0; t <= stage.info.duration + 1e-9; t += step) {
  const buf = await stage.frameAt(Math.round(t * 1000) / 1000);
  console.log(t.toFixed(2), createHash('md5').update(buf).digest('hex'));
}
await stage.close();
