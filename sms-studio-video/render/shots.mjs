// Still frames for review: node render/shots.mjs 4 10 15 24 32 39 46 51
import { mkdir } from 'node:fs/promises';
import { openStage } from './stage-browser.mjs';

const times = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const outDir = process.env.SHOTS_DIR || 'out/shots';
await mkdir(outDir, { recursive: true });
const stage = await openStage({ port: Number(process.env.PORT) || 4175 });
for (const t of times) {
  const name = `${outDir}/t${t.toFixed(2).padStart(5, '0')}.png`;
  await stage.frameAt(t, name);
  console.log(name);
}
if (stage.errors.length) console.log('console:', stage.errors.join('\n'));
await stage.close();
