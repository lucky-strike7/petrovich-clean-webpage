import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContactHandler } from './contact.mjs';
import { legacyRedirect } from './redirects.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const files = new Set(['index.html','404.html','robots.txt','sitemap.xml','site.webmanifest','favicon.svg','favicon.ico','favicon-32.png','apple-touch-icon.png','icon-192.png','icon-512.png']);
const directories = new Set(['fresh','fonts','Video','cases','works','prices','services','about','privacy','consent']);
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4','.webm':'video/webm','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon','.webmanifest':'application/manifest+json' };

export function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) { const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null;start=Math.max(0,size-suffix);end=size-1; }
  else { start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1; }
  return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start ? {start,end}:null;
}

export function createApp({ root=resolve(project,process.env.NODE_ENV==='production'?'dist':'.'),contact=createContactHandler() }={}) {
  const canonicalRoot=realpath(root);
  return createServer(async (req,res)=>{
    if(process.env.SITE_RELEASE)res.setHeader('X-Site-Release',process.env.SITE_RELEASE);
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    const send=(status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(text);};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/contact'){await contact(req,res);return;}
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(405,'Method not allowed');return;}
      let path;try{path=decodeURIComponent(url.pathname);}catch{send(400,'Bad path');return;}
      if(path.split('/').some(p=>p.startsWith('.')||p.includes('\\')||p.includes('\0'))){send(404,'Not found');return;}
      const canonicalOrigin=req.headers.host?.toLowerCase()==='www.petrovichbrothers.ru'?'https://petrovichbrothers.ru':'';
      const redirect=legacyRedirect(path,url.search);
      if(redirect){res.writeHead(301,{'Location':canonicalOrigin+redirect,'Cache-Control':'public, max-age=3600','Content-Length':0});res.end();return;}
      if(path.endsWith('/'))path+='index.html';
      let file=resolve(root,'.'+path),info,status=200;
      const rel=relative(root,file);
      if((files.has(rel)||directories.has(rel.split(sep)[0]))&&!rel.startsWith('..')){
        try{
          const actual=await realpath(file);if(relative(await canonicalRoot,actual).startsWith('..'))throw Error();info=await stat(actual);
          if(info.isDirectory()&&!url.pathname.endsWith('/')){
            const index=await stat(resolve(actual,'index.html'));
            if(index.isFile()){res.writeHead(308,{'Location':canonicalOrigin+url.pathname+'/'+url.search,'Cache-Control':'no-cache'});res.end();return;}
          }
          if(!info.isFile())info=null;
        }catch{info=null;}
      }
      if(!info){file=resolve(root,'404.html');info=await stat(file);status=404;}
      if(status===200 && (canonicalOrigin || url.pathname.endsWith('/index.html')) && !url.pathname.startsWith('//')){
        const cleanPath=url.pathname.replace(/\/index\.html$/, '/');
        res.writeHead(301,{'Location':canonicalOrigin+cleanPath+url.search,'Cache-Control':'public, max-age=3600'});
        res.end();return;
      }
      const type=types[extname(file)]||'application/octet-stream';
      const isText=/^(?:text\/|image\/svg|application\/(?:xml|manifest))/.test(type);
      const cache=type.startsWith('text/html')||status!==200?'no-cache':url.searchParams.has('v')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate';
      let encoding;
      if(isText&&status===200&&!req.headers.range){
        const accepts=String(req.headers['accept-encoding']||'').split(',').map(v=>v.trim().split(';')).filter(([,q])=>!q||!/^q=0(?:\.0*)?$/.test(q.trim())).map(([name])=>name);
        for(const [name,suffix]of [['br','.br'],['gzip','.gz']])if(accepts.includes(name)){try{const compressed=await stat(file+suffix);file+=suffix;info=compressed;encoding=name;break;}catch{}}
      }
      const etag=`"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}-${encoding||'raw'}"`;
      const headers={'Content-Type':type,'Cache-Control':cache,'ETag':etag,'Last-Modified':info.mtime.toUTCString(),'Content-Length':info.size};
      if(isText)headers.Vary='Accept-Encoding';if(encoding)headers['Content-Encoding']=encoding;else headers['Accept-Ranges']='bytes';
      if(status===200&&String(req.headers['if-none-match']||'').split(/,\s*/).some(v=>v===etag||v==='*')){delete headers['Content-Length'];res.writeHead(304,headers);res.end();return;}
      let range;
      if(status===200&&req.headers.range&&!encoding&&(!req.headers['if-range']||req.headers['if-range']===etag)){
        range=byteRange(req.headers.range,info.size);
        if(!range){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`,'Content-Length':0});res.end();return;}
        status=206;headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;headers['Content-Length']=range.end-range.start+1;
      }
      res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(file,range||{});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch{if(!res.headersSent)send(500,'Internal server error');else res.destroy();}
  });
}

export function start(){
  const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT)||5173,app=createApp();
  app.listen(port,host,()=>console.log(`http://${host}:${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{app.close();app.closeIdleConnections();setTimeout(()=>process.exit(0),10000).unref();});
}
