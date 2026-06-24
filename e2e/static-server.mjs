// Minimal static file server for the Next.js static export (frontend/out).
// Used by the community E2E to serve the real built pages locally so Playwright
// can drive them in a real browser (API is mocked via route interception).
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = join(process.cwd(), '..', 'frontend', 'out');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  let fp = join(ROOT, p);
  if (existsSync(fp) && statSync(fp).isDirectory()) fp = join(fp, 'index.html');
  else if (!existsSync(fp) && existsSync(fp + '.html')) fp = fp + '.html';
  else if (!existsSync(fp) && existsSync(join(fp, 'index.html'))) fp = join(fp, 'index.html');
  return fp;
}

http.createServer(async (req, res) => {
  try {
    const fp = resolve(req.url);
    if (!existsSync(fp)) { res.writeHead(404); res.end('not found'); return; }
    const data = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`static export served on http://localhost:${PORT} from ${ROOT}`));
