import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { build, root } from './build.mjs';
await build();
const publicRoot = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let filename = path.resolve(publicRoot, '.' + pathname);
    if (filename !== publicRoot && !filename.startsWith(publicRoot + path.sep)) { res.writeHead(403); return res.end(); }
    let code = 200;
    try {
      const entry = await stat(filename);
      if (entry.isDirectory()) {
        if (!pathname.endsWith('/')) { res.writeHead(308, { Location: pathname + '/' + url.search }); return res.end(); }
        filename = path.join(filename, 'index.html');
      }
      await stat(filename);
    } catch { filename = path.join(publicRoot, '404.html'); code = 404; }
    const bytes = await readFile(filename);
    res.writeHead(code, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
