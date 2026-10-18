#!/usr/bin/env node
/*
 * מרנדר את הסרטון עם שכבת המושן: Chromium (Playwright) מצייר כל פריים דרך MG.seek(t)
 * מעל פריים הווידאו של אותו רגע, וצילום המסך נשלח ישירות ל־ffmpeg.
 *
 *   node render.mjs                       כל הסרטון → $WORK/picture.mp4 (תמונה בלבד, בלי סאונד)
 *   node render.mjs --from 60 --to 75     קטע בלבד
 *   node render.mjs --stills 5,27.5,40    תמונות סטילס → $WORK/stills
 *   node render.mjs --workers 4           מספר תהליכים מקבילים (ברירת מחדל 4)
 *
 * לפני הרינדור הפריימים של edit/build.py ‏($WORK/base.mp4) נשלפים ל־$WORK/frames כ־JPEG.
 * משתני סביבה: WORK (ברירת מחדל /home/user/footage/work), CHROME_PATH, FFMPEG
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm, stat, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..'); // nofeshon/ — כדי שהעמוד יגיע גם ל־edit/timeline.json
const WORK = process.env.WORK || '/home/user/footage/work';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/);
    return [k, v.join(' ') || true];
  })
);

const run = (cmd, a) =>
  new Promise((res, rej) => spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] }).on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`)))));

/* ---------- פריימי הרקע ---------- */
const FRAMES = join(WORK, 'frames');
async function extractFrames() {
  const base = join(WORK, 'base.mp4');
  const stamp = join(FRAMES, '.stamp');
  const baseM = (await stat(base)).mtimeMs;
  const old = await readFile(stamp, 'utf8').catch(() => '');
  if (old === String(baseM)) return;
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  console.log('extracting background frames…');
  await run(FFMPEG, ['-v', 'error', '-i', base, '-q:v', '1', '-qmin', '1', join(FRAMES, '%05d.jpg')]);
  await writeFile(stamp, String(baseM));
  console.log(`  ${(await readdir(FRAMES)).length - 1} frames`);
}

/* ---------- שרת סטטי ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = p.startsWith('/frames/') ? join(FRAMES, p.slice(8)) : resolve(ROOT, '.' + p);
    if (!p.startsWith('/frames/') && !file.startsWith(ROOT)) throw new Error('forbidden');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

let browser;
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/motion/index.html?frames&render`);
  await page.evaluate(() => window.MG.ready);
  const meta = await page.evaluate(() => ({ duration: MG.duration, fps: MG.fps }));
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t, format = 'jpeg') => {
    await page.evaluate((t) => MG.seek(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: 95, optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { page, shot, meta };
}

const write = (stream, buf) => new Promise((r) => (stream.write(buf) ? r() : stream.once('drain', r)));

try {
  await extractFrames();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars', '--disable-gpu'],
  });

  if (args.stills) {
    const { shot } = await openPage();
    const dir = join(WORK, 'stills');
    await mkdir(dir, { recursive: true });
    for (const t of String(args.stills).split(',').map(Number)) {
      const f = join(dir, `still_${t.toFixed(2).padStart(6, '0')}.jpg`);
      await writeFile(f, await shot(t));
      console.log('still', f);
    }
  } else {
    const probe = await openPage();
    const fps = probe.meta.fps;
    const from = Number(args.from || 0);
    const to = Number(args.to || probe.meta.duration);
    const total = Math.round((to - from) * fps);
    const workers = Math.max(1, Number(args.workers || 4));
    const out = resolve(args.out || join(WORK, args.from || args.to ? 'picture_part.mp4' : 'picture.mp4'));
    const tmp = join(WORK, '.mg-segments');
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    console.log(`rendering ${total} frames @ ${fps}fps (${from}s–${to}s) with ${workers} workers`);
    const t0 = Date.now();
    let done = 0;
    const per = Math.ceil(total / workers);
    const segs = [];
    await Promise.all(
      Array.from({ length: workers }, async (_, w) => {
        const a = w * per, b = Math.min(total, a + per);
        if (a >= b) return;
        const { shot } = w === 0 ? probe : await openPage();
        const seg = join(tmp, `seg_${w}.mp4`);
        segs[w] = seg;
        const ff = spawn(FFMPEG, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 15), '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
        const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
        for (let i = a; i < b; i++) {
          await write(ff.stdin, await shot(from + (i + 0.0001) / fps));
          if (++done % 200 === 0) {
            const el = (Date.now() - t0) / 1000;
            console.log(`  ${done}/${total} frames, ${(done / el).toFixed(1)} fps, ~${Math.round(((total - done) * el) / done)}s left`);
          }
        }
        ff.stdin.end();
        await closed;
      })
    );
    const list = join(tmp, 'list.txt');
    await writeFile(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
    await run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
    await rm(tmp, { recursive: true, force: true });
    console.log(`done → ${out} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
} finally {
  await browser?.close();
  server.close();
}
