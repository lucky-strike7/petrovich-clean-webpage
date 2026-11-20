import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { resolve, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const entries=['index.html','404.html','robots.txt','sitemap.xml','site.webmanifest','favicon.svg','favicon.ico','favicon-32.png','apple-touch-icon.png','icon-192.png','icon-512.png','fresh','fonts','Video','cases','works','privacy','consent'];
for(const name of entries)await cp(resolve(root,name),resolve(out,name),{recursive:true});
// Карта сайта: главная и все страницы «Работ» (теги, проекты, экспонаты, кейсы), кроме закрытых от поиска.
// Старые /cases/ теперь только папки с картинками — страницы кейсов переехали в /works/.
const workPages=[];
async function collect(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const sub=resolve(dir,entry.name),html=await readFile(resolve(sub,'index.html'),'utf8').catch(()=>null);
    if(html!==null&&!/<meta name="robots" content="noindex/.test(html)){
      const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
      if(!canonical)throw Error(`Missing canonical: ${relative(out,sub)}`);
      workPages.push(canonical[1]);
    }
    await collect(sub);
  }
}
const worksIndex=await readFile(resolve(out,'works','index.html'),'utf8');
workPages.push(worksIndex.match(/<link rel="canonical" href="([^"]+)"/)[1]);
await collect(resolve(out,'works'));
const sitemapUrls=['https://petrovichbrothers.ru/',...[...new Set(workPages)].sort()];
await writeFile(resolve(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+sitemapUrls.map(url=>`  <url><loc>${url}</loc></url>`).join('\n')+'\n</urlset>\n');
async function list(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(item.isSymbolicLink())throw Error('Symlink not allowed');if(item.isDirectory())result.push(...await list(p));else result.push(p);}return result;}
const files=await list(out),hashes=new Map(),digest=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12);
for(const file of files){
  if(extname(file)==='.js'){const {code}=await transform(await readFile(file,'utf8'),{loader:'js',minify:true,target:'es2022',legalComments:'inline'});await writeFile(file,code);}
  hashes.set(file,digest(await readFile(file)));
}
function version(value,from){
  if(!value||value.startsWith('#')||/^(?:[a-z]+:|\/\/)/i.test(value))return value;
  const url=new URL(value,'https://build.local/'+relative(out,from)),file=resolve(out,'.'+decodeURIComponent(url.pathname));
  if(!hashes.has(file)||extname(file)==='.html')return value;
  url.searchParams.set('v',hashes.get(file));return value.split(/[?#]/)[0]+'?'+url.searchParams.toString()+url.hash;
}
for(const file of files.filter(f=>extname(f)==='.css')){
  let text=await readFile(file,'utf8');text=text.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(_,q,value)=>`url(${q}${version(value,file)}${q})`);
  const {code}=await transform(text,{loader:'css',minify:true,target:'es2022'});
  await writeFile(file,code);hashes.set(file,digest(code));
}
for(const file of files.filter(f=>extname(f)==='.html')){
  let text=await readFile(file,'utf8');
  text=text.replace(/(<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)|<!--[\s\S]*?-->/gi,(_,raw)=>raw||'');
  text=text.replace(/\b(src|href|poster|data-poster|data-src|data-poster-m|data-video|data-peek|data-peek-video)="([^"]*)"/g,(_,name,value)=>`${name}="${version(value,file)}"`);
  text=text.replace(/\b(srcset|imagesrcset)="([^"]*)"/g,(_,name,value)=>`${name}="${value.split(',').map(part=>{const[url,...size]=part.trim().split(/\s+/);return[version(url,file),...size].join(' ');}).join(', ')}"`);
  text=text.replace(/data-frames="(\d+)" data-src="([^"]+)" data-v="[^"]*"/g,(_,n,src)=>{
    const dir=resolve(dirname(file),src),sequence=[...hashes].filter(([p])=>p.startsWith(dir+'/')).map(([,h])=>h).sort().join('');
    return `data-frames="${n}" data-src="${src}" data-v="${digest(sequence)}"`;
  });
  await writeFile(file,text);
}
for(const file of files.filter(f=>/\.(?:html|css|js|svg|xml|txt|webmanifest)$/.test(f))){const bytes=await readFile(file);await writeFile(file+'.gz',gzipSync(bytes,{level:9}));await writeFile(file+'.br',brotliCompressSync(bytes));}
console.log(`Built ${files.length} files into dist/; assets versioned, text compressed.`);
