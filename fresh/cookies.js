// One production counter. Consent controls initialization; previews never send events.
(() => {
  const base = new URL('../', document.currentScript.src);
  const COUNTER = 46078563, KEY = 'pb-cookies';
  const production = ['petrovichbrothers.ru','www.petrovichbrothers.ru'].includes(location.hostname);
  const allowedGoals = new Set(['callback_success','contact_telegram','contact_phone','contact_email','video_open']);
  let choice;
  try { choice=localStorage.getItem(KEY); } catch {}
  let initialized=false;
  function initialize() {
    if (!production || choice !== 'ok' || initialized) return;
    initialized=true;
    const ym=window.ym=window.ym||function(){(ym.a=ym.a||[]).push(arguments);};
    ym.l=ym.l||Date.now();
    const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';document.head.append(script);
    ym(COUNTER,'init',{defer:false,webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});
  }
  function goal(name) {
    if (initialized && choice==='ok' && allowedGoals.has(name)) window.ym(COUNTER,'reachGoal',name);
  }
  // Only event names; never entered phone numbers or contact-link values.
  document.addEventListener('pb:goal',event=>goal(event.detail?.name));
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    const href=link.getAttribute('href');
    if(href.startsWith('tel:'))goal('contact_phone');
    else if(href.startsWith('mailto:'))goal('contact_email');
    else { try { if(new URL(link.href).hostname==='t.me')goal('contact_telegram'); } catch {} }
  });
  initialize();
  if (choice==='ok'||choice==='declined') return;
  const bar=document.createElement('div');bar.className='cookies';bar.setAttribute('role','region');bar.setAttribute('aria-label','Файлы cookie');
  const text=document.createElement('p');text.className='cookies__text';text.append('С вашего согласия используем Яндекс Метрику, чтобы понимать, как работает сайт. ');
  const more=document.createElement('a');more.href=new URL('privacy/',base).href;more.textContent='Подробнее';text.append(more);bar.append(text);
  for(const [label,value]of [['Хорошо','ok'],['Без аналитики','declined']]){
    const button=document.createElement('button');button.type='button';button.className='cookies__ok';button.textContent=label;
    button.addEventListener('click',()=>{choice=value;try{localStorage.setItem(KEY,value);}catch{}initialize();bar.remove();});bar.append(button);
  }
  const show=()=>{document.body.append(bar);requestAnimationFrame(()=>requestAnimationFrame(()=>bar.classList.add('is-shown')));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
