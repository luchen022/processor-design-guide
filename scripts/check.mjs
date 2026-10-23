import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { build, root } from './build.mjs';
await build();
const dir = path.join(root, 'dist');
async function walk(folder) { const entries = await readdir(folder, { withFileTypes: true }); return (await Promise.all(entries.map(item => item.isDirectory() ? walk(path.join(folder, item.name)) : path.join(folder, item.name)))).flat(); }
const files = await walk(dir);
const html = files.filter(file => file.endsWith('.html'));
const pages = new Map(await Promise.all(html.map(async file => [file, await readFile(file, 'utf8')])));
let links = 0;
for (const [file, source] of pages) {
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (ids.length !== new Set(ids).size) throw new Error('Duplicate IDs in ' + file);
  if (/\{\{[A-Z_]+\}\}/.test(source)) throw new Error('Unresolved template in ' + file);
  for (const [, raw] of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|data:)/.test(raw)) continue;
    const [pathname, anchor] = raw.split('#');
    let target = pathname ? (pathname.startsWith('/') ? path.join(dir, pathname) : path.resolve(path.dirname(file), pathname)) : file;
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    await stat(target);
    if (anchor && (!pages.has(target) || !pages.get(target).includes(`id="${anchor}"`))) throw new Error('Missing anchor: ' + raw);
    links++;
  }
}
console.log(`Checked ${html.length} pages: ${links} local links/assets, unique IDs, resolved templates.`);
