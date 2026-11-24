import { timingSafeEqual } from 'node:crypto';

// Private server-to-server delivery only. Credentials never reach the browser.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const reply=(status,success)=>res.status(status).json({success});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,false);}
  const expected=process.env.TELEGRAM_RELAY_SECRET||'';
  const supplied=String(req.headers['x-pb-relay-secret']||'');
  if(!expected||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return reply(401,false);
  if(Number(req.headers['content-length']||0)>4096)return reply(413,false);
  let body=req.body;
  try {if(typeof body==='string')body=JSON.parse(body);}catch{return reply(400,false);}
  if(!body||typeof body.phone!=='string'||!/^\+[1-9]\d{6,14}$/.test(body.phone))return reply(400,false);
  const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chat)return reply(503,false);
  try {
    const text=`Новая заявка с сайта petrovichbrothers.com\nТелефон: ${body.phone}\nВремя: ${new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}`;
    const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text}),signal:AbortSignal.timeout(7000)});
    const data=await response.json();
    return reply(response.ok&&data.ok===true?200:503,response.ok&&data.ok===true);
  }catch{return reply(503,false);}
}
