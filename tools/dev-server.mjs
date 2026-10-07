// Local development server with NO caching. Plain `python -m http.server` sends no cache headers, so Chromium heuristically caches js/app.js and a test can
// silently run stale code. This serves the repo folder with `Cache-Control: no-store`.
//   node tools/dev-server.mjs            (port 8123)      node tools/dev-server.mjs 8946
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), port = Number(process.argv[2] || process.env.PORT || 8123);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p); if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Cache-Control': 'no-store' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store, max-age=0' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log('Stick-It dev server (no cache): http://localhost:' + port + '/'));
