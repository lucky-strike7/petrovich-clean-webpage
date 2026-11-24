import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/site.mjs';
import { get } from 'node:http';
import { createContactHandler } from '../server/contact.mjs';

test('English serves translated documents, shared media, clean URLs, errors and the contact endpoint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pb-english-'));
  let deliveries = 0;
  for (const path of ['en/about', 'fresh', 'about']) await mkdir(join(root, path), { recursive: true });
  for (const [path, value] of Object.entries({
    'index.html': 'Russian home', '404.html': 'Russian error',
    'en/index.html': '<html lang="en">English home</html>', 'en/404.html': 'English error',
    'en/about/index.html': 'About in English', 'about/index.html': 'Russian about',
    'en/sitemap.xml': 'https://petrovichbrothers.com/', 'fresh/shared.css': 'body{}'
  })) await writeFile(join(root, path), value);
  const server = createApp({ root, locale: 'en', contact(_req,res) { deliveries++;res.writeHead(200,{'Content-Type':'application/json'});res.end('{"success":true}'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.match(await (await fetch(origin)).text(), /English home/);
    assert.equal(await (await fetch(origin + '/about/')).text(), 'About in English');
    assert.equal(await (await fetch(origin + '/fresh/shared.css')).text(), 'body{}');
    assert.equal(await (await fetch(origin + '/sitemap.xml')).text(), 'https://petrovichbrothers.com/');
    const missing = await fetch(origin + '/missing');
    assert.equal(missing.status, 404); assert.equal(await missing.text(), 'English error');
    const privateFile = await fetch(origin + '/en/index.html');
    assert.equal(privateFile.status, 404);
    const clean = await fetch(origin + '/about/index.html?utm_source=test', { redirect: 'manual' });
    assert.equal(clean.status, 301); assert.equal(clean.headers.get('location'), '/about/?utm_source=test');
    const www = await new Promise((resolve, reject) => get(origin + '/', { headers: { Host: 'www.petrovichbrothers.com' } }, res => { res.resume(); resolve(res); }).on('error', reject));
    assert.equal(www.headers.location, 'https://petrovichbrothers.com/');
    assert.equal((await fetch(origin + '/api/contact/', { method: 'POST' })).status, 200);
    assert.equal(deliveries, 1);
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await rm(root, { recursive: true, force: true });
  }
});

test('English contact form validates international numbers, consent and the explicit proxy origin', async () => {
  const delivered=[];
  const handler=createContactHandler({locale:'en',limit:100,allowedOrigins:['https://petrovichbrothers.com'],deliver:async phone=>{delivered.push(phone);return true;}});
  const server = createApp({locale:'en',contact:handler});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/api/contact/`;
  const submit=(phone,consent=true,origin='https://petrovichbrothers.com')=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({phone,consent})});
  try {
    for(const phone of ['+86 138 0013 8000','+971 50 123 4567','+7 926 852-11-02'])assert.equal((await submit(phone)).status,200);
    assert.deepEqual(delivered,['+8613800138000','+971501234567','+79268521102']);
    for(const phone of ['123','+0000000000','+1234567890123456'])assert.equal((await submit(phone)).status,400);
    assert.equal((await submit('+8613800138000',false)).status,400);
    assert.equal((await submit('+8613800138000',true,'https://unrelated.example')).status,403);
    assert.equal(delivered.length,3);
  } finally {await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});
