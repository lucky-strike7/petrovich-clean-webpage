// One production counter, initialized automatically; previews never send events.
(() => {
  const COUNTER = 46078563;
  const production = ['petrovichbrothers.ru','www.petrovichbrothers.ru'].includes(location.hostname);
  const allowedGoals = new Set(['callback_success','contact_telegram','contact_phone','contact_email','video_open']);
  let initialized=false;
  function initialize() {
    if (!production || initialized) return;
    initialized=true;
    const ym=window.ym=window.ym||function(){(ym.a=ym.a||[]).push(arguments);};
    ym.l=ym.l||Date.now();
    const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';document.head.append(script);
    ym(COUNTER,'init',{defer:false,webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});
  }
  function goal(name) {
    if (initialized && allowedGoals.has(name)) window.ym(COUNTER,'reachGoal',name);
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
  function initializeOwnAnalytics() {
    if (!production || navigator.doNotTrack === '1' || location.pathname.startsWith('/pb-search') || window.__pbMini || window.__pbMiniLoading) return;
    window.__pbMiniLoading = true;
    const script=document.createElement('script');
    script.async=true;
    script.src='/pb-search/t/script.js';
    script.addEventListener('error',()=>{window.__pbMiniLoading=false;});
    document.head.append(script);
  }
  initialize();
  initializeOwnAnalytics();
})();
