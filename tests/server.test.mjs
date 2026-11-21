import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';
import { mkdtemp,writeFile,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createApp,byteRange } from '../server/site.mjs';
import { createContactHandler } from '../server/contact.mjs';

async function withServer(t,contact){
  const root=await mkdtemp(join(tmpdir(),'pb-site-'));
  await writeFile(join(root,'index.html'),'<h1>New site</h1>');await writeFile(join(root,'index.html.gz'),gzipSync('<h1>New site</h1>'));await writeFile(join(root,'404.html'),'<h1>Missing</h1>');await writeFile(join(root,'favicon.svg'),'0123456789');await writeFile(join(root,'.env'),'SECRET');
  await mkdir(join(root,'works/khersones'),{recursive:true});
  await writeFile(join(root,'works/khersones/index.html'),'<h1>Новый Херсонес</h1>');
  for (const slug of ['about','works','works/exhibitions']) {
    await mkdir(join(root,slug),{recursive:true});
    await writeFile(join(root,slug,'index.html'),'<h1>Page</h1>');
  }
  const app=createApp({root,contact:contact||createContactHandler({limit:100,deliver:async()=>false})});
  app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));await rm(root,{recursive:true,force:true});});
  return 'http://127.0.0.1:'+app.address().port;
}
const payload={phone:'+7 915 000-00-00',consent:true};
const post=(url,body=payload,headers={})=>fetch(url+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('byte ranges include suffix, clamping and invalid/multipart ranges',()=>{
 assert.deepEqual(byteRange('bytes=2-4',10),{start:2,end:4});assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9});assert.deepEqual(byteRange('bytes=8-99',10),{start:8,end:9});
 for(const value of ['bytes=10-','bytes=8-2','bytes=-0','bytes=','bytes=0-1,3-4','bytes=99999999999999999999-'])assert.equal(byteRange(value,10),null);
});
test('static server supports Range, HEAD, ETag, compression and private-file exclusion',async t=>{
 const base=await withServer(t);
 let r=await fetch(base+'/favicon.svg?v=abc',{headers:{Range:'bytes=2-4'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 2-4/10');assert.equal(await r.text(),'234');
 r=await fetch(base+'/favicon.svg',{headers:{Range:'bytes=-2'}});assert.equal(await r.text(),'89');
 r=await fetch(base+'/favicon.svg',{headers:{Range:'bytes=100-'}});assert.equal(r.status,416);
 r=await fetch(base+'/favicon.svg',{method:'HEAD'});assert.equal(r.headers.get('content-length'),'10');assert.equal(await r.text(),'');
 const etag=r.headers.get('etag');r=await fetch(base+'/favicon.svg',{headers:{'If-None-Match':etag}});assert.equal(r.status,304);
 r=await fetch(base+'/',{headers:{'Accept-Encoding':'gzip'}});assert.equal(r.headers.get('content-encoding'),'gzip');assert.equal(await r.text(),'<h1>New site</h1>');
 for(const path of ['/.env','/.git/config','/server.mjs','/package.json','/missing','/fresh/%2e%2e/.env']){r=await fetch(base+path);assert.equal(r.status,404);assert.ok(!(await r.text()).includes('SECRET'));}
 r=await fetch(base+'/',{method:'POST'});assert.equal(r.status,405);
});
test('form requires consent and valid phone before delivery',async t=>{
 const calls=[];const base=await withServer(t,createContactHandler({limit:100,deliver:async phone=>{calls.push(phone);return true;}}));
 for(const body of [{phone:payload.phone},{phone:'123',consent:true},[],null]){const r=await post(base,body);assert.equal(r.status,400);}
 assert.equal(calls.length,0);let r=await post(base);assert.equal(r.status,200);assert.deepEqual(await r.json(),{success:true});assert.deepEqual(calls,['+79150000000']);
 r=await post(base,payload,{Origin:'https://unrelated.example'});assert.equal(r.status,403);
 r=await fetch(base+'/api/contact');assert.equal(r.status,405);
 r=await post(base,payload,{'Content-Type':'text/plain'});assert.equal(r.status,415);
 r=await post(base,{phone:'x'.repeat(5000),consent:true});assert.equal(r.status,413);
});
test('delivery failure returns 503, never successful conversion',async t=>{
 for(const deliver of [async()=>false,async()=>{throw Error('provider secret');}]){
  const base=await withServer(t,createContactHandler({deliver})),r=await post(base);assert.equal(r.status,503);assert.equal((await r.json()).success,false);
 }
});
test('rate limiting cannot be bypassed by untrusted forwarded IPs',async t=>{
 const base=await withServer(t,createContactHandler({deliver:async()=>true,limit:2,trustProxy:false}));
 assert.equal((await post(base,payload,{'X-Forwarded-For':'1.1.1.1'})).status,200);
 assert.equal((await post(base,payload,{'X-Forwarded-For':'2.2.2.2'})).status,200);
 const r=await post(base,payload,{'X-Forwarded-For':'3.3.3.3'});assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');
});
test('delivery concurrency stays bounded while requests are pending',async t=>{
 let started=0,ready;const waiting=new Promise(resolve=>{ready=resolve;});
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const base=await withServer(t,createContactHandler({limit:100,deliver:async()=>{if(++started===4)ready();await gate;return true;}}));
 const pending=Array.from({length:4},()=>post(base));
 try{
  await waiting;
  assert.equal((await post(base)).status,503);assert.equal(started,4);
 }finally{release();await Promise.all(pending);}
});

test('legacy URLs redirect permanently with attribution intact and no extra redirect hop',async t=>{
 const base=await withServer(t);
 const mappings=[
  ['/video-content','/works/exhibitions/'],['/videocontent','/works/exhibitions/'],['/about-us','/about/'],['/testimonials','/'],
  ['/contacts','/#contact'],['/contact','/#contact'],['/projects/khakasiya','/works/khakasia/'],['/cases/khakasia','/works/khakasia/stol/'],
  ['/projects/hersones','/works/khersones/'],['/cases/hersones','/works/khersones/'],['/projects/hbo','/works/hbo/'],['/cases/hbo','/works/hbo/'],['/projects','/works/'],['/projects/etalon','/works/etalon/'],['/projects/gorodobrazovaniyya','/works/gorodobrazovaniya/'],['/projects/amperka','/works/cyberbug/'],['/cases/cyberbug','/works/cyberbug/'],['/cases/rosatom/','/works/rosatom/'],
  ['/cyberbug','/works/cyberbug/'],['/blog-list','/'],['/blogs','/'],['/p','/'],
 ];
 const query='?utm_source=yandex&utm_campaign=a%2Bb&yclid=123&tag=one&tag=two';
 for(const [old,target] of mappings)for(const slash of ['', '/'])for(const method of ['GET','HEAD']){
  const r=await fetch(base+old+slash+query,{method,redirect:'manual'});
  assert.equal(r.status,301,old);const [path,hash]=target.split('#');
  assert.equal(r.headers.get('location'),path+query+(hash?'#'+hash:''),old);assert.equal(await r.text(),'');
 }
 // Unrelated URLs and lookalike prefixes keep the real 404; POST is never rewritten.
 for(const path of ['/video-content-old','/projects-old','/projects/unknown-old','/blogs/article','/blogspot/post','/unknown','/projects/.env'])assert.equal((await fetch(base+path,{redirect:'manual'})).status,404,path);
 for(const path of ['/','/works/khersones/']) {
   const r=await fetch(base+path+'index.html'+query,{redirect:'manual'});
   assert.equal(r.status,301);assert.equal(r.headers.get('location'),path+query);
 }
 for(const [old,target] of [['/about/','/about/'],['/index.html','/'],['/video-content','/works/exhibitions/']]) {
   const [r]=await once(get(base+old+query,{headers:{Host:'www.petrovichbrothers.ru'}}),'response');
   r.resume();
   assert.equal(r.statusCode,301);assert.equal(r.headers.location,'https://petrovichbrothers.ru'+target+query);
 }
 assert.equal((await fetch(base+'/video-content',{method:'POST',redirect:'manual'})).status,405);
 for(const path of ['/video-content','/about-us','/contact','/projects','/projects/hersones']){
  const response=await fetch(base+path);assert.equal(response.status,200);assert.ok(response.url.startsWith(base+'/'));
 }
});
