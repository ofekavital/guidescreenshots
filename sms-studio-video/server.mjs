// Minimal static server so stage.html and source/sms-studio.html share one origin.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.map': 'application/json'
};

export function startServer(port = Number(process.env.PORT) || 4173) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path === '/') path = '/preview.html';
      const file = normalize(join(ROOT, path));
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      const s = await stat(file);
      if (s.isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer();
  console.log(`http://127.0.0.1:${s.address().port}/preview.html`);
}
