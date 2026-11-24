import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const english = resolve(root, 'en');
async function list(dir) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) out.push(...await list(path));
    else if (path.endsWith('.html')) out.push(path);
  }
  return out;
}
let references = 0;
const pages = await list(english);
assert(pages.length > 1, 'English pages must be built first');
const sitemap = await readFile(resolve(english, 'sitemap.xml'), 'utf8');
for (const [, url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://petrovichbrothers.com');
  await stat(resolve(english, '.' + parsed.pathname, 'index.html'));
}
for (const page of pages) {
  const path = relative(english, page);
  const html = await readFile(page, 'utf8');
  assert.match(html, /<html\b[^>]*lang="en"/);
  const original = await readFile(resolve(root, path), 'utf8');
  assert.equal([...html.matchAll(/<form\b/g)].length, [...original.matchAll(/<form\b/g)].length, `Form parity: ${path}`);
  const links = source => [...source.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map(match => match[1]);
  const expectedLinks = links(original).map(value => value
    .replace('mailto:art@petrovichbrothers.ru', 'mailto:ars@petrovichbrothers.com')
    .replace('https://t.me/artem_petrovich_1', 'https://t.me/ArsenyPetrovich')
    .replace('tel:+79151978652', 'https://wa.me/79268521102')
    .replace('https://petrovichbrothers.ru', 'https://petrovichbrothers.com'));
  const actualLinks = links(html.replace(/<a class="language-switch"[^>]*>.*?<\/a>/g, ''));
  assert.deepEqual(actualLinks, expectedLinks, `Navigation parity: ${path}`);
  assert(!html.includes('art@petrovichbrothers.ru'), `Incorrect contact: ${path}`);
  assert(!/\bRUB\b/.test(html), `Unconverted service price: ${path}`);
  if (path !== '404.html') {
    const canonical = html.match(/rel="canonical" href="([^"]+)"/);
    assert(canonical && canonical[1].startsWith('https://petrovichbrothers.com/'), `Canonical: ${path}`);
    assert.match(html, /hreflang="ru"/);
    assert.match(html, /hreflang="en"/);
  }
  for (const [, data] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(data);
  const visible = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, '');
  assert(!/[А-Яа-яЁё]/.test(visible), `Untranslated visible text: ${path}`);
  for (const [, value] of html.matchAll(/\b(?:href|src|poster|data-poster|data-src|data-video|data-preview|data-peek|data-peek-video|data-poster-m|data-video-mobile)="([^"]*)"/g)) {
    if (!value || value.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(value)) continue;
    const url = new URL(value, 'https://petrovichbrothers.com/' + path);
    const location = decodeURIComponent(url.pathname);
    const target = location.endsWith('/') ? resolve(english, '.' + location, 'index.html') :
      location.endsWith('.html') ? resolve(english, '.' + location) : resolve(root, '.' + location);
    assert(!relative(root, target).startsWith('..'));
    await stat(target).catch(async () => {
      if (location.endsWith('/') && (await stat(resolve(root, '.' + location)).catch(() => null))?.isDirectory()) return;
      assert.fail(`Broken English reference: ${path}: ${value}`);
    });
    references++;
  }
}
const home = await readFile(resolve(english, 'index.html'), 'utf8');
for (const contact of ['mailto:ars@petrovichbrothers.com', 'https://wa.me/79268521102', 'https://t.me/ArsenyPetrovich']) assert(home.includes(contact), contact);
for (const amount of ['7,000', '9,000', '11,000']) assert(home.includes(`class="price__num">${amount}</span>`), `Homepage USD amount: ${amount}`);
const budgets = await readFile(resolve(english, 'prices/index.html'), 'utf8');
for (const amount of ['$7,000', '$9,000', '$11,000']) assert(budgets.includes(amount), `Budgets page USD amount: ${amount}`);
console.log(`Verified ${pages.length} English pages, ${references} references, metadata, contacts and untranslated text.`);
