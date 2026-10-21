// Frame-accurate renderer: drives index.html with window.__seek(t) in headless
// Chromium and pipes JPEG frames into ffmpeg.
//
//   node tools/render.js snap 3.2 10 45.5      -> build/snap/<t>.png
//   node tools/render.js sfx                   -> build/sfx.json
//   node tools/render.js video [workers]       -> build/video.mp4 (silent)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const FPS = 30;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(URL);
  await page.evaluate(() => window.__ready);
  return page;
}

async function renderRange(browser, f0, f1, out) {
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) {
    await page.evaluate((t) => window.__seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) console.log(path.basename(out), f, '/', f1);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await page.close();
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  if (mode === 'snap') {
    const page = await openPage(browser);
    fs.mkdirSync(path.join(ROOT, 'build/snap'), { recursive: true });
    for (const a of args) {
      await page.evaluate((t) => window.__seek(t), Number(a));
      await page.screenshot({ path: path.join(ROOT, 'build/snap', `${Number(a).toFixed(2)}.png`) });
    }
  } else if (mode === 'sfx') {
    const page = await openPage(browser);
    const data = await page.evaluate(() => ({ sfx: window.__sfx, duration: window.__duration }));
    fs.writeFileSync(path.join(ROOT, 'build/sfx.json'), JSON.stringify(data, null, 1));
    console.log('sfx events', data.sfx.length);
  } else if (mode === 'video') {
    const workers = Number(args[0] || 4);
    const page = await openPage(browser);
    const dur = await page.evaluate(() => window.__duration);
    await page.close();
    const total = Math.ceil(dur * FPS);
    const per = Math.ceil(total / workers);
    const parts = [];
    const jobs = [];
    for (let w = 0; w < workers; w++) {
      const f0 = w * per, f1 = Math.min(total, (w + 1) * per);
      const out = path.join(ROOT, `build/part${w}.mp4`);
      parts.push(out);
      jobs.push(renderRange(browser, f0, f1, out));
    }
    await Promise.all(jobs);
    fs.writeFileSync(path.join(ROOT, 'build/parts.txt'), parts.map((p) => `file '${p}'`).join('\n'));
    await new Promise((r) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(ROOT, 'build/parts.txt'),
      '-c', 'copy', path.join(ROOT, 'build/video.mp4')], { stdio: 'inherit' }).on('close', r));
    console.log('video done', total, 'frames');
  }
  await browser.close();
})();
