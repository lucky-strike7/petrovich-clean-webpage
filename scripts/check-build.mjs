import assert from 'node:assert/strict';
import {readdir,readFile,stat,open} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
const root=resolve(new URL('../dist/',import.meta.url).pathname);
async function list(dir){const out=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(item.isDirectory())out.push(...await list(p));else out.push(p);}return out;}
const files=await list(root);let references=0,videos=0;
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
 for(const m of html.matchAll(/\b(?:src|href|poster|data-poster|data-src|data-poster-m|data-video|data-peek|data-peek-video)="([^"]*)"/g))await check(m[1],file);
 for(const m of html.matchAll(/\b(?:srcset|imagesrcset)="([^"]*)"/g))for(const part of m[1].split(','))await check(part.trim().split(/\s+/)[0],file);
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 if(!file.endsWith('/404.html')){
  for(const property of ['og:title','og:type','og:image','og:url','og:image:alt'])assert(html.includes(`property="${property}"`),`Missing ${property}: ${file}`);
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
