// Renders the same timestamps in three different seek orders and compares the PNG bytes.
import { createHash } from 'node:crypto';
import { openStage } from './stage-browser.mjs';

const times = [0, 4, 8.6, 10, 15, 24, 32, 37.5, 39, 44.9, 46, 48.8, 51, 54];
const stage = await openStage({ port: 4179, format: process.env.FORMAT });
const hash = (b) => createHash('md5').update(b).digest('hex');
async function pass(order) {
  const out = {};
  for (const t of order) out[t] = hash(await stage.frameAt(t));
  return out;
}
const a = await pass(times);
const b = await pass([...times].reverse());
const shuffled = [...times].sort((x, y) => ((x * 7919) % 13) - ((y * 7919) % 13));
const c = await pass(shuffled);
let bad = 0;
for (const t of times) {
  const ok = a[t] === b[t] && a[t] === c[t];
  if (!ok) bad++;
  console.log(String(t).padStart(5), ok ? 'OK ' : 'DIFF', a[t], b[t], c[t]);
}
await stage.close();
console.log(bad ? `${bad} timestamps differ` : 'deterministic: all identical');
process.exit(bad ? 1 : 0);
