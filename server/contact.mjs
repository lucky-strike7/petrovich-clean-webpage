const env=(name,fallback='')=>process.env[name]||process.env['NUXT_'+name]||fallback;
const escapeHtml=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function deliverContact(phone,{locale='ru'}={}){
  const site=locale==='en'?'petrovichbrothers.com':'petrovichbrothers.ru';
  const text=`Новая заявка с сайта ${site}\nТелефон: ${phone}\nВремя: ${new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}`;
  const token=env('TELEGRAM_BOT_TOKEN'),chat=env('TELEGRAM_CHAT_ID'),smtpUser=env('SMTP_USER'),smtpPass=env('SMTP_PASS');
  const results=await Promise.allSettled([
    (async()=>{if(!token||!chat)return false;const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text}),signal:AbortSignal.timeout(6000)});const data=await response.json();return response.ok&&data.ok===true;})(),
    (async()=>{
      if(!smtpUser||!smtpPass)return false;
      const {default:nodemailer}=await import('nodemailer');
      const transport=nodemailer.createTransport({host:env('SMTP_HOST','smtp.beget.com'),port:Number(env('SMTP_PORT','465')),secure:env('SMTP_SECURE','true')!=='false',auth:{user:smtpUser,pass:smtpPass},connectionTimeout:6000,socketTimeout:7000,greetingTimeout:6000});
      try{const result=await transport.sendMail({from:env('SMTP_FROM',smtpUser),to:env('CONTACT_RECIPIENTS','ars@petrovichbrothers.ru,art@petrovichbrothers.ru'),subject:`Новая заявка с сайта ${site}`,text,html:`<p>${escapeHtml(text).replaceAll('\n','<br>')}</p>`});return result.accepted.length>0;}finally{transport.close();}
    })()
  ]);
  // Provider errors may contain tokens/phone numbers: never log these objects.
  const delivered=results.map(r=>r.status==='fulfilled'&&r.value===true);
  // Channel outcomes only: never log phone numbers, addresses, tokens or errors.
  if(locale==='en')console.info(`Contact delivery: telegram=${delivered[0]} smtp=${delivered[1]}`);
  return delivered.some(Boolean);
}

export function createContactHandler({locale='ru',deliver=phone=>deliverContact(phone,{locale}),limit=2,windowMs=60000,trustProxy=env('CONTACT_TRUST_PROXY','false')==='true',allowedOrigins=env('CONTACT_ALLOWED_ORIGINS').split(',').filter(Boolean)}={}){
  const visits=new Map();let active=0;
  return async(req,res)=>{
    const reply=(code,success,message)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({success,...(message?{message}:{})}));};
    if(req.method!=='POST'){res.setHeader('Allow','POST');reply(405,false,'Method not allowed');return;}
    if(req.headers.origin){let same=false;try{const origin=new URL(req.headers.origin);same=origin.host===req.headers.host||allowedOrigins.includes(origin.origin);}catch{}if(!same){reply(403,false,'Origin not allowed');return;}}
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')){reply(415,false,'JSON required');return;}
    const ip=trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim():req.socket.remoteAddress,now=Date.now();
    for(const[key,v]of visits)if(v.until<=now)visits.delete(key);
    const visit=visits.get(ip)||{count:0,until:now+windowMs};
    if((!visits.has(ip)&&visits.size>=2048)||++visit.count>limit){res.setHeader('Retry-After','60');reply(429,false,'Try later');return;}
    visits.set(ip,visit);if(active>=4){reply(503,false,'Try later');return;}
    let raw;
    try{raw=await new Promise((resolve,reject)=>{
      const chunks=[];let bytes=0,done=false;
      const finish=error=>{if(done)return;done=true;clearTimeout(timer);req.off('data',data).off('end',end).off('error',errorHandler).off('aborted',aborted);if(error){req.resume();reject(error);}else resolve(Buffer.concat(chunks));};
      const data=chunk=>{bytes+=chunk.length;if(bytes>4096)finish({code:413});else chunks.push(chunk);};
      const end=()=>finish(),errorHandler=()=>finish({code:400}),aborted=()=>finish({code:400}),timer=setTimeout(()=>finish({code:408}),5000);
      req.on('data',data).once('end',end).once('error',errorHandler).once('aborted',aborted);
    });}catch(error){reply(error.code||400,false,'Invalid request');return;}
    let body;try{body=JSON.parse(raw.toString('utf8'));}catch{reply(400,false,'Invalid JSON');return;}
    if(!body||Array.isArray(body)||typeof body.phone!=='string'||body.phone.length>64||body.consent!==true){reply(400,false,'Phone and consent required');return;}
    const digits=body.phone.replace(/\D/g,'');const valid=locale==='en'?/^\+[\d\s().-]+$/.test(body.phone)&&/^[1-9]\d{6,14}$/.test(digits):/^7\d{10}$/.test(digits);if(!valid){reply(400,false,'Valid phone required');return;}
    if(active>=4){reply(503,false,'Try later');return;}
    active++;
    try{const success=await deliver('+'+digits);reply(success?200:503,success,success?undefined:'Delivery unavailable');}catch{reply(503,false,'Delivery unavailable');}finally{active--;}
  };
}
