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
    Кнопка «Смотреть обзор» слева прячется, пока на экране обложка обзора,
    и появляется, когда обложка ушла: два входа в одно видео рядом не нужны.
  */
  const cover = document.querySelector('.case-review');
  const asideReview = document.querySelector('.case-aside__review');
  if (cover && asideReview) {
    const updReview = () => {
      const r = cover.getBoundingClientRect();
      asideReview.classList.toggle('is-away', r.bottom > 0 && r.top < innerHeight);
    };
    addEventListener('scroll', updReview, { passive: true });
    addEventListener('resize', updReview);
    updReview();
  }

  /*
    Стол раскрывается по прокрутке: кадры рисуются на холсте по положению блока.
    Видео тут не годится — перемотка колесом у <video> дергается. Кадры начинают грузиться
    за пару экранов до блока; если нужный кадр еще не пришел, показываем ближайший загруженный.
    Раскрытие занимает первые 82% хода, затем линии и подписи, в конце — пауза на готовой картинке.
  */
  document.querySelectorAll('.case-scrub').forEach((scrub) => {
    const canvas = scrub.querySelector('canvas');
    const stage = scrub.querySelector('.case-scrub__stage');
    const ctx = canvas.getContext('2d');
    const n = +scrub.dataset.frames;
    const size = canvas.getBoundingClientRect().width * (devicePixelRatio || 1) > 800 ? 1280 : 720;
    const url = (i) => `${scrub.dataset.src}${size}/${String(i).padStart(2, '0')}.webp`;
    const imgs = new Array(n);
    let started = false, cur = -1;
    canvas.width = canvas.height = size;

    const draw = (i) => {
      let k = i;
      while (k >= 0 && !(imgs[k] && imgs[k].complete && imgs[k].naturalWidth)) k--;
      if (k < 0) return;
      if (k !== cur) { ctx.drawImage(imgs[k], 0, 0, size, size); cur = k; }
    };
    const load = (i) => new Promise((res) => {
      const im = new Image(); im.decoding = 'async'; im.src = url(i); imgs[i] = im;
      im.onload = im.onerror = () => { res(); if (!reduce) upd(); };
    });

    if (reduce) { // уменьшить движение: последний кадр с подписями, без прилипания
      scrub.classList.add('is-static');
      load(n - 1).then(() => draw(n - 1));
      return;
    }

    const clamp = (v) => Math.min(1, Math.max(0, v));
    function upd() {
      const r = scrub.getBoundingClientRect();
      if (!started && r.top < innerHeight * 3) {
        started = true;
        // сначала первый кадр, потом остальные по порядку, по 6 одновременно
        load(0).then(async () => {
          let next = 1;
          const worker = async () => { while (next < n) await load(next++); };
          await Promise.all(Array.from({ length: 6 }, worker));
        });
      }
      const p = clamp(-r.top / (r.height - innerHeight));
      draw(Math.round(clamp(p / 0.82) * (n - 1)));
      stage.style.setProperty('--p', clamp((p - 0.72) / 0.2).toFixed(3));
    }
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  });

  /*
    Круглое видео: играет, пока видно, вне экрана стоит. Кнопок нет.
    При «уменьшить движение» само не запускается — виден постер.
  */
  document.querySelectorAll('.case-circle video').forEach((v) => {
    if (reduce) return;
    new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.2 }).observe(v);
  });
})();
