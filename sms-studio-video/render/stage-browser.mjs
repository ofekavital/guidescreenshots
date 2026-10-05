// Opens src/stage.html in headless Chromium at exactly 1920x1080 and waits until the stage is ready.
import { chromium } from 'playwright';
import { startServer } from '../server.mjs';

export async function openStage({ port = 4173 } = {}) {
  const server = await startServer(port);
  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem'
  });
  // Fonts are local (@fontsource); block any outside request so the output never depends on the network.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/src/stage.html`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('Stage failed: ' + err);
  const info = await page.evaluate(() => ({ duration: window.DURATION, fps: window.FPS }));

  async function frameAt(t, path) {
    await page.evaluate(async (t) => {
      window.seek(t);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    return page.screenshot({ path, type: 'png', animations: 'disabled', caret: 'hide' });
  }

  async function close() { await browser.close(); server.close(); }
  return { page, info, frameAt, close, errors };
}
