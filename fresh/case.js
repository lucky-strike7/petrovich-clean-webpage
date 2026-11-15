// Страница кейса: возврат к проектам, плавающие кнопки на телефоне, круглое видео.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /*
    «← Все проекты»: если пришли с главной этого же сайта, возвращаемся по истории —
    браузер сам вернет прокрутку к той карточке, с которой ушли. Иначе (открыли кейс
    по ссылке) переходим на главную к карточке экспоната.
  */
  document.querySelectorAll('[data-back]').forEach((back) => back.addEventListener('click', (e) => {
    let ref;
    try { ref = new URL(document.referrer); } catch { return; }
    const home = new URL(back.getAttribute('href'), location.href);
    if (ref.origin === location.origin && ref.pathname === home.pathname && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  }));


  /* Плавающие кнопки «←» и «Обзор» (телефон): появляется под первым экраном, прячется у контактов */
  const fab = document.querySelector('.case-fabs');
  const hero = document.querySelector('.case-hero');
  const contact = document.querySelector('.contact');
  if (fab) {
    const upd = () => {
      const vh = innerHeight;
      fab.classList.toggle('is-shown',
        hero.getBoundingClientRect().bottom < vh * 0.5 && contact.getBoundingClientRect().top > vh * 0.85);
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /*
    Круглое видео: играет, пока видно, вне экрана стоит. Кнопок нет.
    При «уменьшить движение» само не запускается — виден постер.
  */
  document.querySelectorAll('.case-circle video').forEach((v) => {
    if (reduce) return;
    new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.2 }).observe(v);
  });
})();
