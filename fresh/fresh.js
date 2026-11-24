// Черновик «свежее»: появление при прокрутке, автозапуск петель, шоурил, шапка, курсор, окно с обзором.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const saveData = navigator.connection?.saveData === true;
  const touchPreview = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const overview = document.querySelector('.modal');
  const backgroundBlocked = () => document.hidden || overview?.open;
  const visible = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
  };
  // Detaching the URL cancels an unfinished range request as well as playback.
  const release = video => {
    video.pause();
    const sources = [video, ...video.querySelectorAll('source')].filter(el => el.hasAttribute('src'));
    if (!sources.length) return;
    for (const source of sources) {
      source.dataset.src = source.getAttribute('src');
      source.removeAttribute('src');
    }
    delete video.dataset.loaded;
    video.load();
  };
  const hydratePoster = (video) => {
    const poster = matchMedia('(max-width: 600px)').matches && video.dataset.posterM || video.dataset.poster;
    if (poster && video.getAttribute('poster') !== poster) video.poster = poster;
    const box=video.closest('.card__media');
    if (poster && box) box.style.background = `var(--line) url("${poster}") center / cover no-repeat`;
  };
  const hydrateVideo = (video) => {
    if (backgroundBlocked()) return;
    hydratePoster(video);
    // data-still-phone: на телефоне у карточки только картинка, ролик не грузим
    if (video.hasAttribute('data-still-phone') && matchMedia('(max-width: 600px)').matches) return;
    if (video.dataset.src) { video.src = video.dataset.src; delete video.dataset.src; }
    video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; delete source.dataset.src; });
    if (!video.dataset.loaded && (video.getAttribute('src') || video.querySelector('source[src]'))) {
      video.dataset.loaded = 'true'; video.preload = 'metadata'; video.load();
    }
  };
  // Sources, not just playback, are deferred until the media approaches the viewport.
  const nearMedia = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      hydratePoster(entry.target);
      if (!touchPreview && !reduce && !saveData) hydrateVideo(entry.target);
      nearMedia.unobserve(entry.target);
    }
  }, { rootMargin: '250px 0px' });
  document.querySelectorAll('video[data-lazy]').forEach(video => nearMedia.observe(video));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { document.querySelectorAll('video').forEach(video => video.pause()); cards.forEach(card => { clearTimeout(card.timer); card.on=false; }); }
    else if (!backgroundBlocked()) { playCards(); document.querySelectorAll('.reel video, .pill video').forEach(video => {
      if (!reduce && !saveData && visible(video)) { hydrateVideo(video); video.play().catch(()=>{}); }
    }); }
  });

  /* Появление: строки заголовков, абзацы */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.hero__title, .projects__title, .contact__title, .reveal')
    .forEach((el) => io.observe(el));
  /*
    Картинка карточки начинает раскрываться, как только ее край показался в окне, —
    медленно и по времени, а не по прокрутке: иначе она сначала стояла, а потом щелкала.
  */
  const mediaIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); mediaIO.unobserve(e.target); }
  }, { threshold: 0 });
  document.querySelectorAll('.card__media').forEach((el) => mediaIO.observe(el));
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
      if (e.isIntersecting && !reduce && !saveData && !backgroundBlocked()) { hydrateVideo(v); v.play().catch(() => {}); } else v.pause();
    }
  }, { threshold: 0.2 });
  document.querySelectorAll('.reel video, .pill video, .case-loop video').forEach((v) => vio.observe(v));

  /*
    Ролики в карточках проектов: стоят на первом кадре, пока карточку не докрутили.
    Запускаются с начала, когда середина карточки поднялась выше 60% высоты окна
    (на любом мониторе — когда карточку действительно докрутили), останавливаются,
    когда карточка целиком ушла с экрана; при возвращении снова играют с начала.
    data-pause="5" у ролика: проиграть один раз, постоять 5 секунд, повторить.
  */
  // На телефоне — легкий вертикальный постер (сам ролик выбирается через <source media>)
  const phone = matchMedia('(max-width: 600px)').matches;
  const firstCardVideo=document.querySelector('.card__media video');
  if(firstCardVideo && document.querySelector('.card__media')?.contains(firstCardVideo)) hydratePoster(firstCardVideo);
  const cards = [...document.querySelectorAll('.card__media video')].map((v, i) => {
    const card = { v, box: v.closest('.card__media'), on: false, timer: 0, first: i === 0 };
    /*
      Под роликом — его же первый кадр фоном: пока ролик стартует или перематывается,
      iPhone на миг показывает пустой кадр, и сквозь него мелькал светлый фон страницы.
    */
    // Posters for the remaining cards are loaded by nearMedia.
    // Загрузкой управляют близость к экрану и начало воспроизведения.
    v.preload = 'none';
    const pause = parseFloat(v.dataset.pause) || 0;
    if (pause) {
      v.loop = false;
      v.addEventListener('ended', () => {
        card.timer = setTimeout(() => { if (card.on) { v.currentTime = 0; v.play().catch(() => {}); } }, pause * 1000);
      });
    }
    return card;
  });
  /*
    Достижения на телефоне — лента вбок с роликами. Ролик грузится, когда плитка подъезжает
    к экрану (по вертикали или вбок), и играет, только пока плитка видна больше чем наполовину.
  */
  if (phone) {
    const tileIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.5 && !reduce && !saveData && !backgroundBlocked()) {
          hydratePoster(v);
          if (!v.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else v.pause();
      }
    }, { threshold: [0, 0.5] });
    document.querySelectorAll('.facts__vid[data-src]').forEach((v) => tileIO.observe(v));
  }

  const playCards = () => {
    const vh = innerHeight;
    for (const c of cards) {
      const r = c.box.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      // На телефоне первая карточка (она видна уже на первом экране) играет сразу, без прокрутки
      // Остальные на телефоне — как только карточка заметно въехала (верх выше 75% экрана), а не к середине
      // Первая карточка (на главной — как шоурил) играет сразу, как только видна, и на компьютере тоже
      const ready = (c.first ? r.top < vh : phone ? r.top < vh * 0.75 : mid < vh * 0.6) && r.bottom > 0;
      if (reduce || saveData || backgroundBlocked()) { c.v.pause(); c.on = false; clearTimeout(c.timer); continue; }
      if (!c.on && ready) {
        // Перематываем, только если ролик не в начале: лишняя перемотка дает пустой кадр
        hydrateVideo(c.v); c.on = true; if (c.v.currentTime > 0) c.v.currentTime = 0; c.v.play().catch(() => {});
      } else if (c.on && (r.bottom < 0 || r.top > vh)) {
        c.on = false; clearTimeout(c.timer);
        if (touchPreview) release(c.v);
        else { c.v.pause(); c.v.currentTime = 0; }
      }
    }
  };

  /* Шоурил разворачивается на всю ширину, шапка прячется при прокрутке вниз */
  const reel = document.querySelector('.reel__frame');
  const top = document.querySelector('.top');
  const badge = document.querySelector('.badge:not(.badge--back)');
  const contact = document.querySelector('.contact');
  const contactBtn = document.querySelector('.contact__btn');
  const desktopNav = matchMedia('(min-width: 901px)');
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

    top.classList.toggle('is-solid', y > 40 || (top.hasAttribute('data-compact-entry') && desktopNav.matches));
    /*
      Шапка прячется при прокрутке вниз и возвращается при прокрутке вверх. Реагируем только на сдвиг
      больше 8 px: плавная прокрутка в конце движения может чуть «качнуть» страницу назад, и без порога
      шапка выскакивала при каждой остановке.
    */
    const dy = y - lastY;
    // На телефоне шапка не прячется: узкая полоска с «Написать» всегда наверху
    // Шапка больше не прячется (и на десктопе): «Контакты» и «Проекты» всегда под рукой, таблетки внизу не нужны
    top.classList.remove('is-hidden'); lastY = y; void dy;

    const c = contact.getBoundingClientRect();
    /*
      Вход в контакты на экране всегда один: шапка видна — «Контакты» в шапке, шапка уехала — синий кружок в углу,
      у черного блока кружок не нужен — там своя форма.
    */
    badge.classList.toggle('is-shown', top.classList.contains('is-hidden') && c.top > vh * 0.75);
    // Телефон: большая «Написать в Telegram» целиком на экране — кнопку в шапке прячем (дублирует ее)
    top.classList.toggle('is-at-contact', !!(contactBtn && contactBtn.offsetParent && contactBtn.getBoundingClientRect().bottom < vh));
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
    Картинка и ролик загружаются только при наведении, без предварительного скачивания всех файлов.
  */
  const peek = document.querySelector('.peek');
  if (peek && fine) {
    const circle = peek.firstElementChild;
    const img = circle.firstElementChild;
    const links = [...document.querySelectorAll('[data-peek]')];
    links.forEach((a) => {
      // The poster/video is loaded on actual pointer intent, not on initial page load.
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
        if (!v || reduce || saveData || backgroundBlocked()) return;
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
    «Вязкая» прокрутка (Lenis) выключена: колесо мыши прокручивает страницу как обычно, без инерции
    (отзыв дизайнера: «приколы со скролом бесят»). Ссылки-якоря едут плавно средствами браузера
    (html { scroll-behavior: smooth }). Код Lenis оставлен: чтобы вернуть, заменить null на new window.Lenis({ lerp: 0.1 }).
  */
  const lenis = null;
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

  /*
    Еще работы: при наведении мышью на карточку прячем ▶ и играем короткий ролик поверх обложки.
    Ролик создается при первом наведении (не грузим 10 роликов заранее). На касаниях — только обложка и ▶.
  */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.work[data-preview]').forEach((card) => {
      let v;
      card.addEventListener('mouseenter', () => {
        if (backgroundBlocked() || reduce || saveData) return;
        if (!v) {
          v = document.createElement('video');
          v.src = card.dataset.preview; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
          v.setAttribute('aria-hidden', 'true');
          card.querySelector('.work__media').append(v);
        }
        if (!v.hasAttribute('src')) v.src = card.dataset.preview;
        card.classList.add('is-previewing');
        v.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => { card.classList.remove('is-previewing'); v?.pause(); });
    });
  }

  /* Окно с полным видеообзором */
  const modal = overview;
  const mv = modal.querySelector('video');
  const phoneReview = matchMedia('(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 600px)');
  let reviewTrigger;
  const resumeLoops = new Set();
  document.querySelectorAll('[data-video]').forEach((el) => {
    el.addEventListener('click', () => {
      reviewTrigger = el;
      modal.setAttribute('aria-label', el.dataset.title || 'Видео');
      modal.showModal();
      document.dispatchEvent(new Event('pb:review'));
      for (const video of document.querySelectorAll('video')) {
        if (video === mv) continue;
        if (!video.paused && !video.closest('.card__media, .work, .peek')) resumeLoops.add(video);
        if (video.loop || video.hasAttribute('data-lazy')) release(video);
        else video.pause();
      }
      for (const card of cards) { card.on = false; clearTimeout(card.timer); }
      mv.src = phoneReview.matches && el.dataset.videoMobile ? el.dataset.videoMobile : el.dataset.video;
      document.dispatchEvent(new CustomEvent('pb:goal', { detail: { name: 'video_open' } }));
      lenis?.stop(); // страница под окном не прокручивается
      mv.play().catch(() => {});
      cursor.classList.remove('is-on');
    });
  });
  const close = () => {
    mv.pause(); mv.removeAttribute('src'); mv.load(); modal.close(); lenis?.start();
    reviewTrigger?.focus({ preventScroll: true });
    document.dispatchEvent(new Event('pb:review'));
    playCards();
    for (const video of resumeLoops) if (!reduce && !saveData && !backgroundBlocked() && visible(video) && !video.controls) {
      hydrateVideo(video);
      video.play().catch(() => {});
    }
    resumeLoops.clear();
    document.querySelectorAll('video[autoplay][data-src], .case-circle video[data-src]').forEach(video => nativeLoops.observe(video));
  };
  const nativeLoops = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) if (isIntersecting && !backgroundBlocked() && !reduce && !saveData) {
      hydrateVideo(target);
      target.play().catch(() => {});
      nativeLoops.unobserve(target);
    }
  });
  modal.querySelector('.modal__close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

  /*
    Плашка контактов (десктоп, шире 900 px): «Контакты» в шапке и кружок «Написать нам» открывают ее
    вместо прокрутки вниз. Закрывается крестиком на плашке, повторным нажатием «Контактов», Esc и кликом по странице.
    Открыли из шапки — меню сдвигается влево (is-panel-top); кружком — шапка остается как была.
    Пока открыта, страница не прокручивается.
  */
  const panel = document.querySelector('.cpanel');
  const wide = matchMedia('(min-width: 901px)');
  const narrow = matchMedia('(max-width: 600px)'); // телефон — та же плашка шторкой снизу; планшет — прокрутка к контактам
  if (panel) {
    const root = document.documentElement;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.tabIndex = -1;
    let opener = null, focusTimer, sentTimer;
    const inertStates = new Map();
    const isOpen = () => root.classList.contains('is-panel');
    const setOpen = (open, fromTop = false, trigger = null) => {
      root.classList.toggle('is-panel', open);
      root.classList.toggle('is-panel-top', open && fromTop);
      panel.inert = !open;
      clearTimeout(focusTimer);
      if (open) {
        opener = trigger || document.activeElement;
        for (const node of document.body.children) if (node !== panel && !['SCRIPT','STYLE'].includes(node.tagName)) { inertStates.set(node,node.inert); node.inert=true; }
        // Focus the close button without opening the phone keyboard automatically.
        focusTimer=setTimeout(()=>panel.querySelector('.cpanel__close')?.focus({preventScroll:true}),0);
      } else {
        clearTimeout(sentTimer);
        for (const [node,inert] of inertStates) node.inert=inert;
        inertStates.clear(); opener?.focus({preventScroll:true});
      }
      if (open) lenis?.stop(); else lenis?.start();
    };
    // Касания и колесо мимо плашки не прокручивают страницу (без overflow: hidden — см. fresh.css)
    const block = (e) => { if (isOpen() && !panel.contains(e.target)) e.preventDefault(); };
    document.addEventListener('touchmove', block, { passive: false });
    if (!lenis) document.addEventListener('wheel', block, { passive: false });
    // Окно с видеообзором: страница под ним тоже стоит
    const blockModal = (e) => { if (document.querySelector('.modal[open]')) e.preventDefault(); };
    document.addEventListener('wheel', blockModal, { passive: false });
    document.addEventListener('touchmove', blockModal, { passive: false });
    /*
      Кнопка «Назад» (Android, смахивание от края в iPhone) сначала закрывает плашку, а не уходит со страницы:
      при открытии добавляем шаг в историю, при закрытии своими кнопками — снимаем его.
    */
    const openPanel = (fromTop, trigger) => { setOpen(true, fromTop, trigger); history.pushState({ cpanel: 1 }, ''); };
    const closePanel = () => {
      if (!isOpen()) return;
      if (history.state?.cpanel) history.back(); else setOpen(false);
    };
    addEventListener('popstate', () => { if (isOpen()) setOpen(false); });
    document.querySelectorAll('.top__btn, .badge[href="#contact"], [data-panel]').forEach((el) => el.addEventListener('click', (e) => {
      if (!wide.matches && !narrow.matches) return; // планшет — обычная прокрутка к контактам
      // Черный блок уже показался — плашка не нужна (форма и контакты в нем): докручиваем к нему
      if (!isOpen() && contact.getBoundingClientRect().top < innerHeight) return;
      e.preventDefault(); e.stopPropagation();
      if (isOpen()) closePanel(); else openPanel(el.classList.contains('top__btn'), el);
    }));
    panel.querySelector('.cpanel__close').addEventListener('click', () => closePanel());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) closePanel(); });
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !isOpen()) return;
      const nodes=[...panel.querySelectorAll('a[href],button,input,[tabindex="0"]')].filter(node=>!node.disabled&&node.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    });
    document.addEventListener('click', (e) => {
      if (isOpen() && !panel.contains(e.target) && !e.target.closest('.top__btn')) closePanel();
    });
    wide.addEventListener('change', () => { if (isOpen()) closePanel(); });
    narrow.addEventListener('change', () => { if (isOpen()) closePanel(); });

    /* Шторка (телефон): смахнуть вниз — закрыть. Тянем за верх шторки, пока она не прокручена */
    let y0 = null, dy = 0;
    panel.addEventListener('touchstart', (e) => {
      if (!narrow.matches || panel.scrollTop > 0 || e.target.closest('input, button, a, label')) return;
      y0 = e.touches[0].clientY; dy = 0; panel.classList.add('is-dragging');
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.setProperty('--drag', `${dy}px`);
    }, { passive: true });
    panel.addEventListener('touchend', () => {
      if (y0 === null) return;
      y0 = null; panel.classList.remove('is-dragging'); panel.style.removeProperty('--drag');
      if (dy > 90) closePanel();
    });

    /* Клавиатура на телефоне: шторка поднимается над ней, высота — не больше видимой части экрана */
    const vv = window.visualViewport;
    if (vv) {
      const fit = () => {
        if (!narrow.matches) return;
        const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
        panel.style.setProperty('--kb', `${Math.round(kb)}px`);
        panel.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      };
      vv.addEventListener('resize', fit);
      vv.addEventListener('scroll', fit);
    }
    panel.addEventListener('sent', () => { clearTimeout(sentTimer); sentTimer=setTimeout(() => closePanel(), 2600); });
  }

  /*
    Обратный звонок: маска +7 XXX XXX-XX-XX, проверка номера и согласия, отправка {phone} на /api/contact
    (тот же обработчик, что на старом сайте: бот в Telegram и письмо). Без сервера — понятная ошибка с запасным путем.
  */
  document.querySelectorAll('.callback').forEach((cb, index) => {
    const input = cb.querySelector('input[type="tel"]');
    const agree = cb.querySelector('input[name="agree"]');
    const btn = cb.querySelector('button[type="submit"]');
    const msg = cb.querySelector('.callback__msg');
    let submitting = false, sent = false;
    input.classList.add('ym-disable-keys');
    const digitsOf = (v) => {
      let d = v.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d && d[0] !== '7') d = '7' + d;
      return d.slice(0, 11);
    };
    const fmt = (d) => {
      if (!d) return '';
      const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
      let out = '+7';
      if (p[0]) out += ' ' + p[0];
      if (p[1]) out += ' ' + p[1];
      if (p[2]) out += '-' + p[2];
      if (p[3]) out += '-' + p[3];
      return out;
    };
    const say = (text, err) => { msg.textContent = text; msg.classList.toggle('is-error', !!err); };
    const sync = () => {
      btn.disabled = submitting || sent;
      btn.classList.toggle('needs-input', digitsOf(input.value).length !== 11 || !agree.checked);
    };
    input.addEventListener('input', () => { input.value = fmt(digitsOf(input.value)); say(''); sync(); });
    msg.id = 'callback-status-' + index;
    input.setAttribute('aria-describedby', msg.id);
    agree.setAttribute('aria-describedby', msg.id);
    const checkPhone = () => {
      const incomplete = input.value !== '' && digitsOf(input.value).length !== 11;
      input.setAttribute('aria-invalid', String(incomplete));
      if (incomplete) say('Введите номер полностью, например +7 915 123-45-67.', true);
      return incomplete;
    };
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    input.addEventListener('blur', checkPhone);
    agree.addEventListener('change', () => {
      agree.removeAttribute('aria-invalid');
      if (!checkPhone()) say('');
      sync();
    });
    cb.addEventListener('reset', () => setTimeout(sync));
    sync();
    cb.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting || sent) return;
      const d = digitsOf(input.value);
      if (d.length !== 11) {
        input.setAttribute('aria-invalid', 'true');
        say('Введите номер полностью, например +7 915 123-45-67.', true);
        input.focus();
        return;
      }
      if (!agree.checked) {
        agree.setAttribute('aria-invalid', 'true');
        agree.focus();
        say('Подтвердите согласие на\u00a0обработку персональных данных.', true);
        return;
      }
      submitting = true; sync(); cb.setAttribute('aria-busy','true');
      btn.classList.add('is-sending'); say('Отправляем…');
      try {
        const r = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+' + d, consent: true }), signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw new Error(r.status);
        const response = await r.json();
        if (response.success !== true) throw new Error('Delivery failed');
        sent = true;
        document.dispatchEvent(new CustomEvent('pb:goal', { detail: { name: 'callback_success' } }));
        cb.classList.add('is-sent');
        say('Спасибо! Перезвоним в\u00a0рабочее время');
        cb.dispatchEvent(new Event('sent', { bubbles: true }));
        // Когда плашка закроется — форма снова чистая
        setTimeout(() => { sent=false; cb.classList.remove('is-sent'); cb.reset(); say(''); sync(); }, 3200);
      } catch {
        say('Не получилось отправить. Позвоните нам или напишите в\u00a0Telegram', true);
      } finally { submitting=false; cb.removeAttribute('aria-busy'); btn.classList.remove('is-sending'); sync(); }
    });
  });
})();
