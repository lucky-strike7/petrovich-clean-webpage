import assert from 'node:assert/strict';
import {checkShareMetadata} from './check-share-metadata.mjs';
import {readdir,readFile,stat,open} from 'node:fs/promises';
import {resolve,relative,extname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function list(dir){const out=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(dir===root&&item.name==='en')continue;if(item.isDirectory())out.push(...await list(p));else out.push(p);}return out;}
const files=await list(root);let references=0,videos=0;
const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(sitemapUrls).size,sitemapUrls.length,'Duplicate sitemap URL');
for(const url of sitemapUrls){const path=new URL(url);assert.equal(path.origin,'https://petrovichbrothers.ru');await stat(resolve(root,'.'+path.pathname,'index.html'));}
for(const name of ['.env','.git','server','node_modules','package.json','v1','index-old.html'])assert(!files.some(p=>relative(root,p).split('/')[0]===name),`Private or obsolete file: ${name}`);
async function check(value,from){
 if(!value||value.startsWith('#')||/^(?:[a-z]+:|\/\/)/i.test(value))return;
 const url=new URL(value,'https://build.local/'+relative(root,from));
 const target=resolve(root,'.'+decodeURIComponent(url.pathname));
 assert(!relative(root,target).startsWith('..'),'Reference escapes dist');
 await stat(target).catch(()=>assert.fail(`Broken reference in ${relative(root,from)}: ${value}`));references++;
}
for(const file of files.filter(p=>extname(p)==='.html')){
 const html=await readFile(file,'utf8');assert(!/<<<<<<<|>>>>>>>/.test(html),'Merge markers');
 assert(!html.includes('<!--'),'HTML comments must not be published: '+file);
 for(const m of html.matchAll(/\b(?:src|href|poster|data-poster|data-src|data-poster-m|data-video|data-video-mobile|data-preview|data-peek|data-peek-video)="([^"]*)"/g))await check(m[1],file);
 for(const m of html.matchAll(/\b(?:srcset|imagesrcset)="([^"]*)"/g))for(const part of m[1].split(','))await check(part.trim().split(/\s+/)[0],file);
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 if(basename(file)!=='404.html'){
  if(relative(root,file).replace(/\\/g,'/').startsWith('works/')&&!/<meta name="robots" content="noindex/.test(html)){const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);assert(canonical && sitemapUrls.includes(canonical[1]),'Page missing from sitemap: '+file);}
  checkShareMetadata(html,relative(root,file),message=>console.warn(`::warning::${message}`));
  const image=html.match(/property="og:image" content="([^"]+)"/)[1],url=new URL(image);
  assert.equal(url.origin,'https://petrovichbrothers.ru');await stat(resolve(root,'.'+url.pathname));
 }
}
for(const file of files.filter(p=>p.endsWith('.mp4'))){
 const handle=await open(file,'r');try{
  const size=(await handle.stat()).size;let pos=0,moov=-1,mdat=-1;
  while(pos+8<=size){const b=Buffer.alloc(16);await handle.read(b,0,16,pos);let length=b.readUInt32BE();const type=b.toString('ascii',4,8);if(length===1)length=Number(b.readBigUInt64BE(8));if(length===0)length=size-pos;if(type==='moov')moov=pos;if(type==='mdat'&&mdat<0)mdat=pos;assert(length>=8,'Invalid MP4 atom');pos+=length;}
  assert(moov>=0&&mdat>=0&&moov<mdat,`MP4 must support progressive start: ${relative(root,file)}`);videos++;
 }finally{await handle.close();}
}
console.log(`Verified ${references} local references, share metadata, JSON-LD and fast start for ${videos} MP4s.`);
