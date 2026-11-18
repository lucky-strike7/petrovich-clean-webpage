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
    Кружок «←» (десктоп) появляется вместе с правым «Написать нам» — когда шапка уехала вверх,
    и остается до самого низа страницы. Шапка видна — в ней есть «Проекты».
  */
  const backBadge = document.querySelector('.badge--back');
  const topBar = document.querySelector('.top');
  if (backBadge && topBar) {
    const updBack = () => backBadge.classList.toggle('is-shown', topBar.classList.contains('is-hidden'));
    new MutationObserver(updBack).observe(topBar, { attributes: true, attributeFilter: ['class'] });
    updBack();
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
    /*
      Телефон: стол на весь экран — прилипает под шапкой (--hdr — ее высота) и занимает экран до низа.
      Квадратные кадры обрезаются по бокам под пропорцию экрана (crop — доля ширины квадрата),
      линии к подписям деталей пересчитываются под эту обрезку.
    */
    const phone = matchMedia('(max-width: 600px)').matches;
    const pin = scrub.querySelector('.case-scrub__pin');
    if (phone) scrub.style.setProperty('--hdr', `${document.querySelector('.top').offsetHeight}px`);
    const crop = phone ? Math.min(1, stage.clientWidth / stage.clientHeight) : 1;
    const box = canvas.getBoundingClientRect();
    const size = Math.max(box.width, box.height) * (devicePixelRatio || 1) > 800 ? 1280 : 720;
    // data-v — версия кадров: меняем при новом рендере, чтобы браузер не показал старые из кэша
    const url = (i) => `${scrub.dataset.src}${size}/${String(i).padStart(2, '0')}.webp${scrub.dataset.v ? `?v=${scrub.dataset.v}` : ''}`;
    const imgs = new Array(n);
    let started = false, cur = -1;
    canvas.width = Math.round(size * crop); canvas.height = size;
    if (phone) {
      // Точки деталей — из квадратного кадра (как в десктопных линиях), x пересчитан под обрезку
      const X = (x) => (50 + (x - 50) / crop).toFixed(1);
      const [toCards, toReader] = scrub.querySelectorAll('.case-scrub__lines--m path');
      toCards.setAttribute('d', `M${X(53.8)} 44.4L78 27H96`);
      toReader.setAttribute('d', `M${X(46.7)} 44L25 55.5H4`);
    }

    const draw = (i) => {
      let k = i;
      while (k >= 0 && !(imgs[k] && imgs[k].complete && imgs[k].naturalWidth)) k--;
      if (k < 0) return;
      if (k !== cur) { ctx.drawImage(imgs[k], -size * (1 - crop) / 2, 0, size, size); cur = k; }
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
      let p;
      if (phone) {
        // Старт — когда стол показался на 80% (еще до прилипания), конец — когда обертка отлипает
        const ph = pin.offsetHeight, top = parseFloat(getComputedStyle(pin).top) || 0;
        const start = innerHeight - stage.offsetTop - stage.offsetHeight * 0.8;
        const end = top + ph - r.height;
        p = clamp((start - r.top) / (start - end));
      } else p = clamp(-r.top / (r.height - innerHeight));
      draw(Math.round(clamp(p / 0.82) * (n - 1)));
      stage.style.setProperty('--p', clamp((p - 0.72) / 0.2).toFixed(3));
    }
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  });

  /*
    Обзор на телефоне играет прямо на месте обложки, с обычными кнопками плеера, —
    без черного окна поверх страницы: на телефоне оно не крупнее самой обложки.
    Кнопку-обложку заменяем копией (так снимается обработчик окна из fresh.js).
  */
  if (matchMedia('(max-width: 600px)').matches) {
    document.querySelectorAll('.case-review__btn').forEach((btn) => {
      const copy = btn.cloneNode(true);
      btn.replaceWith(copy);
      copy.addEventListener('click', () => {
        const v = document.createElement('video');
        v.className = 'case-review__video';
        v.src = copy.dataset.video;
        v.poster = copy.querySelector('img').currentSrc || copy.querySelector('img').src;
        v.controls = true; v.playsInline = true;
        copy.replaceWith(v);
        v.play().catch(() => {});
      });
    });
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
