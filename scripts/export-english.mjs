import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyRedirects } from '../server/redirects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'dist');
const output = resolve(root, 'dist-com');
const english = resolve(source, 'en');
await stat(resolve(english, 'index.html'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, filter: path => {
  const rel = relative(source, path);
  return rel !== 'en' && !rel.startsWith('en/') && !/\.(?:gz|br)$/.test(path);
} });
await cp(english, output, { recursive: true, filter: path => !/\.(?:gz|br)$/.test(path) });
let pages = 0;
async function verify(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await verify(path);
    else if (path.endsWith('.html')) {
      assert.match(await readFile(path, 'utf8'), /<html\b[^>]*lang="en"/, `Russian document in COM export: ${path}`);
      pages++;
    }
  }
}
await verify(output);
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
for (const [source, destination] of legacyRedirects()) {
  assert(config.redirects.some(rule => rule.source === source && rule.destination === destination), `Missing Vercel redirect: ${source}`);
}
console.log(`Exported ${pages} English documents with shared media to dist-com/. No server credentials or application sources included.`);
