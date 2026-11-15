// Черновик «свежее»: появление при прокрутке, автозапуск петель, шоурил, шапка, курсор, окно с обзором.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* Появление: строки заголовков, абзацы, картинки карточек */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.hero__title, .projects__title, .contact__title, .reveal, .card__media')
    .forEach((el) => io.observe(el));
  /*
    Подпись карточки проявляется целиком, как только ее верх показался в окне: название, описание,
    место с размерами и кнопки «Смотреть обзор» / «Как устроено» — вместе, а не по одному.
    Иначе кнопки внизу появлялись поздно, когда ролик уже удобно смотреть.
  */
  const rowIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      rowIO.unobserve(e.target);
    }
  }, { threshold: 0 });
  document.querySelectorAll('.card__row').forEach((row) => rowIO.observe(row));
  // Первый экран — сразу после загрузки шрифта, чтобы строки выехали уже нужным начертанием
  (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(() => {
    document.querySelectorAll('.hero__title, .hero .reveal').forEach((el) => el.classList.add('is-in'));
    // Шоурил проявляется следом, когда заголовок почти набрался
    setTimeout(() => document.querySelector('.reel__frame')?.classList.add('is-in'), reduce ? 0 : 450);
  }));

  /* «Что мы делаем»: слова загораются по одному, пока блок проходит через окно */
  const words = document.querySelector('[data-words]');
  let wordEls = [];
  if (words) {
    const parts = words.innerHTML.split(/(\s+)/);
    words.innerHTML = parts.map((p) => (/^\s+$/.test(p) || !p ? p : `<span class="w">${p}</span>`)).join('');
    wordEls = [...words.querySelectorAll('.w')];
  }
  const lightWords = () => {
    if (!wordEls.length) return;
    const r = words.getBoundingClientRect(), vh = innerHeight;
    // Начинаем, когда верх текста на 85% окна, заканчиваем, когда низ текста на 55%
    const p = reduce ? 1 : (vh * 0.85 - r.top) / (r.height + vh * 0.3);
    const n = Math.round(Math.min(1, Math.max(0, p)) * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle('is-on', i < n));
  };

  /* Петли играют, только пока видны */
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }
  }, { threshold: 0.2 });
  document.querySelectorAll('.reel video, .pill video').forEach((v) => vio.observe(v));

  /*
    Ролики в карточках проектов: стоят на первом кадре, пока карточку не докрутили.
    Запускаются с начала, когда середина карточки поднялась выше 60% высоты окна
    (на любом мониторе — когда карточку действительно докрутили), останавливаются,
    когда карточка целиком ушла с экрана; при возвращении снова играют с начала.
    data-pause="5" у ролика: проиграть один раз, постоять 5 секунд, повторить.
  */
  const cards = [...document.querySelectorAll('.card__media video')].map((v) => {
    const card = { v, box: v.closest('.card__media'), on: false, timer: 0 };
    const pause = parseFloat(v.dataset.pause) || 0;
    if (pause) {
      v.loop = false;
      v.addEventListener('ended', () => {
        card.timer = setTimeout(() => { if (card.on) { v.currentTime = 0; v.play().catch(() => {}); } }, pause * 1000);
      });
    }
    return card;
  });
  const playCards = () => {
    const vh = innerHeight;
    for (const c of cards) {
      const r = c.box.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (!c.on && mid < vh * 0.6 && r.bottom > 0) {
        c.on = true; c.v.currentTime = 0; c.v.play().catch(() => {});
      } else if (c.on && (r.bottom < 0 || r.top > vh)) {
        c.on = false; clearTimeout(c.timer); c.v.pause(); c.v.currentTime = 0;
      }
    }
  };

  /* Шоурил разворачивается на всю ширину, шапка прячется при прокрутке вниз */
  const reel = document.querySelector('.reel__frame');
  const top = document.querySelector('.top');
  const badge = document.querySelector('.badge');
  const contact = document.querySelector('.contact');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight, y = scrollY;
    if (reel) {
      const r = reel.getBoundingClientRect();
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
      reel.style.setProperty('--p', (p * p * (3 - 2 * p)).toFixed(4));
    }
    lightWords();
    playCards();

    top.classList.toggle('is-solid', y > 40);
    /*
      Шапка прячется при прокрутке вниз и возвращается при прокрутке вверх. Реагируем только на сдвиг
      больше 8 px: плавная прокрутка в конце движения может чуть «качнуть» страницу назад, и без порога
      шапка выскакивала при каждой остановке.
    */
    const dy = y - lastY;
    if (y <= 200) { top.classList.remove('is-hidden'); lastY = y; }
    else if (Math.abs(dy) > 8) { top.classList.toggle('is-hidden', dy > 0); lastY = y; }

    const c = contact.getBoundingClientRect();
    badge.classList.toggle('is-shown', y > vh * 0.6 && c.top > vh * 0.75);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /*
    Курсор «Смотреть»: идет прямо за указателем, без запаздывания и инерции.
    Плавным остается только появление (масштаб кружка в CSS).
  */
  const cursor = document.querySelector('.cursor');
  if (fine && !reduce) {
    const label = cursor.firstElementChild;
    let x = -200, y = -200;
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    });
    // Показываем круг, только когда под мышью картинка с data-cursor. Проверяем и при движении мыши,
    // и при прокрутке: картинка может уехать из-под неподвижной мыши без событий pointerleave
    const check = () => {
      const el = document.elementFromPoint(x, y)?.closest('[data-cursor]');
      if (el) label.textContent = el.dataset.cursor;
      cursor.classList.toggle('is-on', !!el && !document.querySelector('.modal[open]'));
    };
    addEventListener('pointermove', check);
    addEventListener('scroll', check, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  }

  /* Картинка у ссылки (data-peek): кружок у курсора, идет за мышью без задержки */
  /*
    Если у ссылки есть data-peek-video, поверх картинки в кружке играет короткий ролик по кругу.
    Ролики маленькие (вместе около 1,2 МБ), поэтому сразу после загрузки страницы, когда браузер
    освободится, скачиваем их целиком в память. При наведении ролик берется из памяти и стартует
    мгновенно, без докачки. Если навели раньше, чем он скачался, — грузится обычным способом.
  */
  const peek = document.querySelector('.peek');
  if (peek && fine) {
    const circle = peek.firstElementChild;
    const img = circle.firstElementChild;
    const links = [...document.querySelectorAll('[data-peek]')];
    links.forEach((a) => {
      new Image().src = a.dataset.peek; // загрузить заранее, чтобы кружок не появлялся пустым
      if (a.dataset.peekVideo) {
        const v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'none' });
        v.addEventListener('playing', () => v.classList.add('is-playing'));
        circle.appendChild(v);
        a.peekVideo = v;
      }
      a.addEventListener('pointerenter', () => {
        img.src = a.dataset.peek;
        peek.classList.add('is-on');
        const v = a.peekVideo;
        if (!v) return;
        if (!v.getAttribute('src')) v.src = a.dataset.peekVideo; // еще не скачался — грузим как обычно
        v.currentTime = 0;
        v.play().catch(() => {});
      });
      a.addEventListener('pointerleave', () => {
        peek.classList.remove('is-on');
        const v = a.peekVideo;
        if (v) { v.pause(); v.classList.remove('is-playing'); }
      });
    });
    const warm = () => links.forEach((a) => {
      if (!a.peekVideo) return;
      fetch(a.dataset.peekVideo)
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((blob) => {
          const v = a.peekVideo;
          if (v.getAttribute('src')) return; // уже успели навести и загрузить обычным способом
          v.src = URL.createObjectURL(blob);
          v.preload = 'auto';
          v.load(); // первый кадр готов заранее
        })
        .catch(() => {});
    });
    const idle = () => (window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 2000 }) : setTimeout(warm, 1000));
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
    addEventListener('pointermove', (e) => { peek.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; });
    addEventListener('scroll', () => peek.classList.remove('is-on'), { passive: true });
  }

  /* «Как устроено +»: раскрывает факты под описанием карточки */
  document.querySelectorAll('.card__more').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      panel.classList.toggle('is-open', open);
    });
  });

  /*
    Плавная прокрутка (Lenis): колесико мыши двигает страницу с мягким «доездом».
    На телефонах прокрутка остается родной. При «уменьшить движение» не включается.
    Lenis прокручивает саму страницу, поэтому липкие колонки, появления и ролики работают как раньше.
  */
  const lenis = !reduce && window.Lenis ? new window.Lenis({ lerp: 0.1 }) : null;
  if (lenis) {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // Ссылки-якоря на этой же странице («Проекты», «Контакты», «Обсудить проект») — тоже плавно
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a || e.defaultPrevented) return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -24, duration: 1.4 });
      history.replaceState(null, '', url.hash);
    });
  }

  /* Окно с полным видеообзором */
  const modal = document.querySelector('.modal');
  const mv = modal.querySelector('video');
  document.querySelectorAll('[data-video]').forEach((el) => {
    el.addEventListener('click', () => {
      mv.src = el.dataset.video;
      modal.setAttribute('aria-label', el.dataset.title || 'Видео');
      modal.showModal();
      lenis?.stop(); // страница под окном не прокручивается
      mv.play().catch(() => {});
      cursor.classList.remove('is-on');
    });
  });
  const close = () => { mv.pause(); mv.removeAttribute('src'); mv.load(); modal.close(); lenis?.start(); };
  modal.querySelector('.modal__close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
})();
