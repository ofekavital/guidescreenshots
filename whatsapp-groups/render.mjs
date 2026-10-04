#!/usr/bin/env node
/*
 * רינדור הסצנה ל־MP4: Chromium (Playwright) מצייר כל פריים דרך WA.seek(t),
 * צילום מסך נשלח ישירות ל־ffmpeg. אפשר לפצל לכמה תהליכים במקביל.
 *
 *   node render.mjs                         רינדור מלא → output/whatsapp-groups.mp4
 *   node render.mjs --fps 60 --workers 4    60fps בארבעה תהליכים
 *   node render.mjs --from 10 --to 20       קטע בלבד
 *   node render.mjs --stills 3,20,50        תמונות סטילס (PNG) לבדיקה → output/stills
 *   node render.mjs --ss 1                  בלי דגימת־יתר (מהיר יותר; ברירת המחדל 2 — מרנדר
 *                                           פי 2 ומקטין ל־1080p, כדי שטקסט בתנועה לא ירצד)
 *
 * משתני סביבה: CHROME_PATH (נתיב לכרום/כרומיום), FFMPEG (נתיב ל־ffmpeg)
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .split('--')
    .filter(Boolean)
    .map((s) => {
      const [k, ...v] = s.trim().split(/\s+/);
      return [k, v.join(' ') || true];
    })
);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SS = Number(args.ss || (args.stills ? 1 : 2)); // supersampling

/* ---------- שרת סטטי קטן ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
    if (!file.startsWith(ROOT)) throw new Error('forbidden');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/index.html?render`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'],
});

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SS });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
  await page.goto(URL_);
  await page.evaluate(() => window.WA.ready);
  const meta = await page.evaluate(() => ({ duration: WA.duration, fps: WA.fps, width: WA.width, height: WA.height }));
  await page.setViewportSize({ width: meta.width, height: meta.height });
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t) => {
    await page.evaluate((t) => WA.seek(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { page, shot, meta };
}

function ffmpegProc(out, fps, size, extra = []) {
  const p = spawn(
    FFMPEG,
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      ...(SS > 1 ? ['-vf', `scale=${size.width}:${size.height}:flags=lanczos`] : []),
      '-c:v', 'libx264', '-preset', args.preset || 'slow', '-crf', String(args.crf || 16),
      '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(fps),
      ...extra, out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  return { p, done };
}

const write = (stream, buf) => new Promise((r) => (stream.write(buf) ? r() : stream.once('drain', r)));

try {
  /* ---------- סטילס ---------- */
  if (args.stills) {
    const { shot } = await openPage();
    const dir = join(ROOT, 'output', 'stills');
    await mkdir(dir, { recursive: true });
    for (const t of String(args.stills).split(',').map(Number)) {
      const f = join(dir, `still_${t.toFixed(2).padStart(6, '0')}.png`);
      await writeFile(f, await shot(t));
      console.log('still', f);
    }
  } else {
    /* ---------- וידאו ---------- */
    const probe = await openPage();
    const fps = Number(args.fps || probe.meta.fps);
    const from = Number(args.from || 0);
    const to = Number(args.to || probe.meta.duration);
    const total = Math.round((to - from) * fps);
    const workers = Math.max(1, Number(args.workers || 3));
    const out = resolve(ROOT, args.out || 'output/whatsapp-groups.mp4');
    await mkdir(dirname(out), { recursive: true });
    const tmp = join(ROOT, 'output', '.segments');
    await mkdir(tmp, { recursive: true });
    console.log(`rendering ${total} frames @ ${fps}fps (${from}s–${to}s) with ${workers} workers, supersampling ×${SS}`);
    const t0 = Date.now();
    let doneFrames = 0;
    const per = Math.ceil(total / workers);
    const segs = [];
    await Promise.all(
      Array.from({ length: workers }, async (_, w) => {
        const a = w * per;
        const b = Math.min(total, a + per);
        if (a >= b) return;
        const { shot } = w === 0 ? probe : await openPage();
        const seg = join(tmp, `seg_${w}.mp4`);
        segs[w] = seg;
        const ff = ffmpegProc(seg, fps, probe.meta);
        for (let i = a; i < b; i++) {
          await write(ff.p.stdin, await shot(from + i / fps));
          doneFrames++;
          if (doneFrames % 100 === 0) {
            const el = (Date.now() - t0) / 1000;
            process.stdout.write(`  ${doneFrames}/${total} frames, ${(doneFrames / el).toFixed(1)} fps, ~${Math.round(((total - doneFrames) * el) / doneFrames)}s left\n`);
          }
        }
        ff.p.stdin.end();
        await ff.done;
      })
    );
    const list = join(tmp, 'list.txt');
    await writeFile(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
    await new Promise((res, rej) =>
      spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', (c) =>
        c === 0 ? res() : rej(new Error('concat failed'))
      )
    );
    await rm(tmp, { recursive: true, force: true });
    console.log(`done → ${out} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
} finally {
  await browser.close();
  server.close();
}
