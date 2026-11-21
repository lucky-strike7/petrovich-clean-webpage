// Run with docker exec -i CONTAINER node --input-type=module - COMMIT < this file.
import assert from 'node:assert/strict';
const expected = process.argv[2];
assert.match(expected, /^[0-9a-f]{40}$/);
const base = process.env.RELEASE_BASE_URL || 'http://127.0.0.1:3000';
const resources = new Set();
const commercial = ['/', '/services/', '/about/', '/prices/', '/works/', '/works/museums/', '/works/exhibitions/', '/works/interactive/', '/works/video/', '/works/strana-sveta/', '/works/khakasia/stol/', '/works/khersones/'];
for (const path of [...commercial, '/privacy/', '/consent/', '/robots.txt', '/sitemap.xml']) {
  const r = await fetch(new URL(path, base), {signal: AbortSignal.timeout(5000)});
  assert.equal(r.status, 200, path);
  assert.equal(r.headers.get('x-site-release'), expected, 'Wrong deployed version');
  assert(!r.headers.get('x-robots-tag')?.includes('noindex'), 'Production is blocked from indexing');
  const text = await r.text();
  if (commercial.includes(path)) {
    assert(text.includes(`rel="canonical" href="https://petrovichbrothers.ru${path}"`), 'Wrong canonical: ' + path);
    assert(!/<meta name="robots" content="[^"]*noindex/i.test(text), 'Page is blocked from indexing: ' + path);
  }
  if (path === '/sitemap.xml') for (const route of commercial) assert(text.includes(`<loc>https://petrovichbrothers.ru${route}</loc>`), 'Missing sitemap URL: ' + route);
  if (path.endsWith('/')) {
    assert(text.includes('<main'), `Page content missing: ${path}`);
    for (const match of text.matchAll(/(?:src|href)="([^"]+\.(?:css|js)(?:\?[^"]*)?)"/g)) {
      const url = new URL(match[1], new URL(path, base));
      if (url.origin === new URL(base).origin) resources.add(url.href);
    }
  }
}
for (const url of resources) assert.equal((await fetch(url, {method:'HEAD'})).status, 200, url);
for (const path of ['/not-a-real-page/', '/.env', '/.git/config', '/server/contact.mjs']) {
  assert.equal((await fetch(new URL(path, base))).status, 404, path);
}
for (const [path, location] of [
  ['/video-content?utm_source=check&yclid=123', '/works/exhibitions/?utm_source=check&yclid=123'],
  ['/projects', '/works/'],
  ['/about-us', '/about/'],
  ['/projects/khakasiya', '/works/khakasia/'],
  ['/cases/khakasia/', '/works/khakasia/stol/'],
  ['/projects/hersones?x=a%2Bb', '/works/khersones/?x=a%2Bb'],
  ['/cases/hersones/', '/works/khersones/'],
  ['/cases/hbo/', '/works/hbo/'],
  ['/cases/cyberbug/', '/works/cyberbug/'],
  ['/projects/etalon', '/works/etalon/'],
]) {
  const r=await fetch(new URL(path,base),{redirect:'manual'});
  assert.equal(r.status,301,path);assert.equal(r.headers.get('location'),location,path);
}
const range=await fetch(new URL('/Video/01_Khakasia_Attractions.mp4',base),{headers:{Range:'bytes=0-1023'}});
assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,1024);
// Invalid input only: this must never send an email/Telegram message.
const rejected=await fetch(new URL('/api/contact',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:'invalid',consent:false})});
assert.equal(rejected.status,400);assert.equal((await rejected.json()).success,false);
console.log(`Release verified: ${expected}; pages, ${resources.size} assets, 301, 404, video Range and form rejection.`);
