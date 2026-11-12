/*
  Петля при наведении. Файл петли собран «вперёд, затем назад»: кадр на времени t
  совпадает с кадром на времени (длительность − t). Поэтому:
  — пока курсор на картинке, ролик ходит туда-обратно и на крайних кадрах стоит HOLD_MS:
    дошёл до последнего кадра — постоял — пошёл назад — на первом кадре постоял — снова вперёд;
  — курсор ушёл — ролик возвращается к первому кадру; как именно, задаёт loopLeave.mode:
      instant — сразу назад: прыгаем на зеркальный кадр и доигрываем файл до конца;
      pause   — замирает на месте на delay мс, потом назад;
      finish  — доигрывает вперёд до последнего кадра, стоит delay мс, потом назад;
      brake   — плавно тормозит (brake мс), разворачивается и плавно разгоняется назад;
    назад ролик идёт со скоростью rate (1 — как вперёд);
  — курсор вернулся до конца возврата — ролик снова идёт вперёд с обычной скоростью.
  Видео грузится заранее, когда карточка подходит к окну, и сразу встаёт поверх обложки
  на первом кадре. Так при наведении нет подмены картинка → видео (она давала
  «перещёлкивание» цвета и резкости), а после возврата ролик стоит на первом кадре.
*/
const LOOP_FPS = 24;
const HOLD_MS = 3500; // сколько ролик стоит на последнем и на первом кадре, пока курсор на картинке
const loopLeave = window.loopLeave = {
  mode: 'instant',
  delay: 1500,  // мс — пауза перед возвратом (pause, finish)
  rate: 1,      // скорость возврата
  brake: 700,   // мс — торможение и разгон (brake)
};

document.querySelectorAll('.project__media[data-loop]').forEach((media) => {
  let video = null;
  let hovered = false;
  let holding = false;     // стоим на крайнем кадре, пока курсор на картинке
  let holdTimer = null;
  let leaveTimer = null;   // пауза перед возвратом после ухода курсора
  let rampId = 0;          // плавное изменение скорости (brake)
  let lastPos = 0;

  // Прыжок на зеркальный кадр: картинка та же, меняется направление движения
  const mirror = (v) => { v.currentTime = v.duration - v.currentTime; };
  const inFirstHalf = (v) => v.currentTime < v.duration / 2;
  // Последний кадр рендера — середина файла (файл: вперёд 0…238, назад 237…0, всего 477 кадров)
  const turnPos = () => Math.floor(video.duration * LOOP_FPS / 2);
  const play = () => video.play().catch(() => {});

  // Постоять HOLD_MS, потом, если курсор всё ещё на картинке, выполнить next
  const hold = (next) => {
    clearTimeout(holdTimer);
    holding = true;
    holdTimer = setTimeout(() => { holding = false; if (hovered) next(); }, HOLD_MS);
  };
  const cancelHold = () => { clearTimeout(holdTimer); holding = false; };

  // Плавно менять скорость from → to за ms, потом done
  const ramp = (from, to, ms, done) => {
    const id = ++rampId;
    const t0 = performance.now();
    const step = () => {
      if (id !== rampId) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      video.playbackRate = from + (to - from) * k * k * (3 - 2 * k);
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  };
  const cancelLeave = () => { clearTimeout(leaveTimer); rampId++; };

  // Возврат к первому кадру
  const rewind = () => {
    if (hovered) return;
    if (inFirstHalf(video)) mirror(video);
    video.playbackRate = loopLeave.rate;
    play();
  };

  // Стоим на последнем кадре: при наведении — пауза HOLD_MS и назад; после ухода (finish) — пауза delay и назад
  const stopAtTurn = (turn) => {
    video.pause();
    video.currentTime = (turn + 0.5) / LOOP_FPS; // ровно на последнем кадре
  };
  const checkTurn = (pos) => {
    const turn = turnPos();
    const crossed = lastPos < turn && pos >= turn;
    lastPos = pos;
    if (!crossed) return;
    if (hovered && !holding) {
      stopAtTurn(turn);
      hold(play);
    } else if (!hovered && loopLeave.mode === 'finish') {
      stopAtTurn(turn);
      leaveTimer = setTimeout(rewind, loopLeave.delay);
    }
  };
  const watchFrames = () => {
    if ('requestVideoFrameCallback' in video) {
      const onFrame = (now, meta) => {
        checkTurn(Math.round(meta.mediaTime * LOOP_FPS));
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    } else {
      video.addEventListener('timeupdate', () => checkTurn(Math.round(video.currentTime * LOOP_FPS)));
    }
  };

  const ensureVideo = () => {
    if (video) return video;
    video = document.createElement('video');
    video.className = 'project__loop';
    // 4K-версия — только если карточка на экране шире ~2200 физических пикселей
    const wide = media.clientWidth * devicePixelRatio > 2200;
    video.src = (wide && media.dataset.loopUhd) || media.dataset.loop;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    // первый кадр готов — показываем видео вместо обложки
    video.addEventListener('loadeddata', () => {
      media.classList.add('is-playing');
      // карточку показываем, когда кадр ролика уже на экране
      requestAnimationFrame(() => requestAnimationFrame(() => media.classList.add('is-ready')));
    }, { once: true });
    // Дошли до конца файла — он кончается тем же первым кадром, с которого начинается,
    // так что перестановка в начало не видна. Если курсор на картинке — стоим и снова идём вперёд
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      video.playbackRate = 1;
      if (hovered) hold(play);
    });
    watchFrames();
    media.appendChild(video);
    return video;
  };

  const start = () => {
    hovered = true;
    cancelLeave();
    const v = ensureVideo();
    v.playbackRate = 1;
    if (!v.paused && !inFirstHalf(v)) mirror(v); // шёл возврат — разворачиваем вперёд
    v.play().then(() => {
      // курсор ушёл, пока ролик грузился, — не запускаем
      if (!hovered && inFirstHalf(v) && v.currentTime < 0.2) { v.pause(); v.currentTime = 0; return; }
      media.classList.add('is-playing');
    }).catch(() => {});
  };

  const stop = () => {
    hovered = false;
    if (!video) return;
    cancelLeave();
    if (holding) {
      cancelHold();
      // стоял на последнем кадре — возвращаемся (после паузы, если она задана); стоял на первом — остаёмся
      if (!inFirstHalf(video)) {
        const wait = loopLeave.mode === 'pause' || loopLeave.mode === 'finish' ? loopLeave.delay : 0;
        leaveTimer = setTimeout(rewind, wait);
      }
      return;
    }
    if (video.paused) return;
    if (!inFirstHalf(video)) { video.playbackRate = loopLeave.rate; return; } // и так идёт назад

    switch (loopLeave.mode) {
      case 'pause':
        video.pause();
        leaveTimer = setTimeout(rewind, loopLeave.delay);
        break;
      case 'finish':
        break; // доиграет до последнего кадра, дальше — checkTurn
      case 'brake':
        ramp(video.playbackRate, 0.1, loopLeave.brake, () => {
          mirror(video);
          ramp(0.1, loopLeave.rate, loopLeave.brake);
        });
        break;
      default:
        rewind();
    }
  };

  // Заранее грузим видео, когда карточка подходит к окну (только на устройствах с мышью)
  if (matchMedia('(hover: hover)').matches) {
    media.dataset.waitsVideo = '';
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { ensureVideo(); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(media);
  }

  // Телефон запускает и останавливает петлю сам, когда карточка разворачивается (см. «Рост карточки»)
  media.loopStart = start;
  media.loopStop = stop;
  media.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') start(); });
  media.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') stop(); });
});

// Готовность карточки к показу: где ждём ролик — его ставит обработчик выше; иначе — когда загрузилась обложка.
// Страховка: через 1,5 с показываем в любом случае
document.querySelectorAll('.project__media').forEach((media) => {
  const reveal = () => media.classList.add('is-ready');
  setTimeout(reveal, 1500);
  if ('waitsVideo' in media.dataset) return;
  const img = media.querySelector('.project__cover');
  if (img.complete) reveal();
  else { img.addEventListener('load', reveal, { once: true }); img.addEventListener('error', reveal, { once: true }); }
});

/*
  Поля по бокам кадра. На низких экранах кадр 16:9 пришлось бы сильно резать сверху и снизу.
  Вместо этого срезаем не больше crop (доля высоты), кадр встаёт по центру, а поля слева и справа
  заливаются фоном, снятым с краёв кадра: на каждой высоте берётся более светлый из двух краёв —
  тень только затемняет, поэтому так получается чистый фон без тени. Края кадра растворяются
  в этом фоне на ширину fade. Для видео фон обновляется на каждом кадре, пока ролик играет.
  Пиксели не читаются: края просто рисуются в canvas, «светлее» — режимом наложения lighten.
  Так работает и при открытии страницы файлом, где чтение пикселей браузер запрещает.
*/
const FRAME = 16 / 9;
const phone = matchMedia('(max-width: 767px)');
const FILL_ROWS = 90; // по вертикали фон плавный, хватает 90 строк — браузер растянет их сам
const mediaFill = window.mediaFill = {
  crop: 0.2,          // сколько высоты кадра можно срезать: 0 — кадр целиком, 1 — как раньше, без полей
  fade: 230,          // ширина растворения краёв, px
  source: 'sides',    // откуда брать фон: sides — каждое поле со своего края, lighter — светлее из двух, left, right
  // Телефон: кадр стоит по высоте так, будто карточка квадратная (crop), или так, что видна
  // доля visible его ширины (extend). Если карточка выше кадра — сверху и снизу достраивается фон.
  // focus — какая часть кадра по горизонтали в центре (0.5 — середина), fade — растворение краёв, px.
  // Наезд камеры на конкретную карточку — media.zoom (ставит рост карточки при прокрутке)
  phone: { mode: 'crop', visible: 0.75, fade: 60, focus: 0.51 },
  items: [],
  update() { this.items.forEach((f) => f.layout()); },
};

document.querySelectorAll('.project__media').forEach((media) => {
  const img = media.querySelector('.project__cover');
  const fill = document.createElement('canvas');
  fill.className = 'project__fill';
  // 4 столбца: левая пара — для левого поля, правая — для правого. Растянутые на всю ширину,
  // они смешиваются только в середине, а там поле закрыто кадром
  fill.width = 4;
  fill.height = FILL_ROWS;
  fill.setAttribute('aria-hidden', 'true');
  media.prepend(fill);
  const fillCtx = fill.getContext('2d');
  let bars = false;
  let vertical = false; // поля сверху и снизу (телефон) вместо боковых

  // Что сейчас видно: ролик, если он уже поверх обложки, иначе обложка.
  // Пока ролик перескакивает на другой кадр или кадр ещё не готов, он отдаёт пустой (чёрный) кадр —
  // тогда фон не трогаем, остаётся прежний
  const source = () => {
    const v = media.querySelector('.project__loop');
    if (v && media.classList.contains('is-playing')) {
      return v.readyState >= 2 && !v.seeking && v.videoWidth ? v : null;
    }
    return img.complete && img.naturalWidth ? img : null;
  };

  const sample = () => {
    if (!bars) return;
    const src = source();
    if (!src) return;
    const sw = src.videoWidth || src.naturalWidth;
    const sh = src.videoHeight || src.naturalHeight;
    if (vertical) {
      // Видимая по ширине часть кадра; верхняя полоска — в две верхние строки, нижняя — в две нижние
      const visW = sw * Math.min(1, media.clientWidth / parseFloat(media.style.getPropertyValue('--box-w')));
      const x = (sw - visW) / 2;
      fillCtx.globalCompositeOperation = 'copy';
      fillCtx.drawImage(src, x, 2, visW, 6, 0, 0, FILL_ROWS, 2);
      fillCtx.globalCompositeOperation = 'source-over';
      fillCtx.drawImage(src, x, sh - 8, visW, 6, 0, 2, FILL_ROWS, 2);
      return;
    }
    // Видимая по высоте часть кадра (object-fit: cover по центру)
    const boxW = parseFloat(media.style.getPropertyValue('--box-w'));
    const visH = Math.min(sh, sh * media.clientHeight / (boxW * sh / sw));
    const y = (sh - visH) / 2;
    // Полоска в несколько пикселей от края, сжатая в узкий столбик, — заодно усредняет шум сжатия
    const left = (dx = 0, w = 4) => fillCtx.drawImage(src, 2, y, 6, visH, dx, 0, w, FILL_ROWS);
    const right = (dx = 0, w = 4) => fillCtx.drawImage(src, sw - 8, y, 6, visH, dx, 0, w, FILL_ROWS);
    fillCtx.globalCompositeOperation = 'copy';
    if (mediaFill.source === 'sides') {
      left(0, 2);
      fillCtx.globalCompositeOperation = 'source-over';
      right(2, 2);
      return;
    }
    if (mediaFill.source === 'right') right(); else left();
    if (mediaFill.source === 'lighter') {
      fillCtx.globalCompositeOperation = 'lighten';
      right();
    }
  };

  const setCanvas = (v) => {
    if (vertical === v && fill.width) return;
    vertical = v;
    fill.width = v ? FILL_ROWS : 4;
    fill.height = v ? 4 : FILL_ROWS;
  };

  const layout = () => {
    const W = media.clientWidth, H = media.clientHeight;
    const ph = mediaFill.phone;
    if (phone.matches) {
      const base = ph.mode === 'extend' ? W / ph.visible / FRAME : W;
      const boxH = base * (media.zoom || 1);
      const boxW = boxH * FRAME;
      setCanvas(true);
      bars = boxH < H - 1;
      media.style.setProperty('--box-w', boxW + 'px');
      media.style.setProperty('--box-h', boxH + 'px');
      media.style.setProperty('--box-x', ((0.5 - ph.focus) * (boxW - W)).toFixed(1) + 'px');
      media.style.setProperty('--fade', Math.min(ph.fade, boxH / 2) + 'px');
      media.classList.remove('has-fill');
      media.classList.toggle('has-fill-v', bars);
      sample();
      return;
    }
    setCanvas(false);
    media.style.removeProperty('--box-h');
    media.style.removeProperty('--box-x');
    media.classList.remove('has-fill-v');
    const boxW = mediaFill.crop >= 1 ? W : Math.min(W, FRAME * H / (1 - mediaFill.crop));
    bars = boxW < W - 1;
    media.style.setProperty('--box-w', boxW + 'px');
    media.style.setProperty('--fade', Math.min(mediaFill.fade, boxW / 2) + 'px');
    media.classList.toggle('has-fill', bars);
    sample();
  };

  new ResizeObserver(layout).observe(media);
  img.addEventListener('load', sample);
  // События видео не всплывают, поэтому слушаем их на фазе перехвата
  const onVideoFrame = () => {
    sample();
    const v = media.querySelector('.project__loop');
    if (v && !v.paused && 'requestVideoFrameCallback' in v) v.requestVideoFrameCallback(onVideoFrame);
  };
  media.addEventListener('play', onVideoFrame, true);
  // После перескока и после загрузки снимаем фон, только когда новый кадр уже на экране
  const afterFrame = (e) => {
    const v = e.target;
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => sample());
    else requestAnimationFrame(sample);
  };
  media.addEventListener('seeked', afterFrame, true);
  media.addEventListener('loadeddata', afterFrame, true);
  media.layoutFill = layout;
  mediaFill.items.push({ layout });
  phone.addEventListener('change', layout);
});

// Окно с видео
const modal = document.querySelector('.video-modal');
const modalVideo = modal.querySelector('video');

let unloadTimer = null;

// Видео проявляется, когда готов первый кадр, — без чёрного прямоугольника на время загрузки
modalVideo.addEventListener('playing', () => modalVideo.classList.add('is-ready'));

document.querySelectorAll('[data-video]').forEach((btn) => {
  btn.addEventListener('click', () => {
    clearTimeout(unloadTimer);
    modalVideo.classList.remove('is-ready');
    modalVideo.src = btn.dataset.video;
    modal.setAttribute('aria-label', btn.dataset.title || 'Видео');
    modal.showModal();
    modalVideo.play().catch(() => {});
  });
});

// Ролик ставим на паузу сразу, не полагаясь только на событие close (оно приходит не во всех браузерах),
// а выгружаем после того, как окно растворится, — иначе при закрытии мелькает пустой кадр
const FADE_MS = 450;
const stopVideo = () => {
  modalVideo.pause();
  clearTimeout(unloadTimer);
  unloadTimer = setTimeout(() => {
    if (modal.open) return;
    modalVideo.classList.remove('is-ready');
    modalVideo.removeAttribute('src');
    modalVideo.load();
  }, FADE_MS);
};
const closeModal = () => { stopVideo(); modal.close(); };

modal.querySelector('.video-modal__close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modal.addEventListener('cancel', stopVideo); // Esc
modal.addEventListener('close', stopVideo);

/*
  Сжатие шапки при прокрутке (стили — в styles.css, «Сжатие шапки»).
  p — доля сжатия от 0 (полная шапка) до 1 (строка высотой --bar-h).
  Первая половина: вертикальный логотип и заголовок уезжают вверх со страницей и гаснут.
  Вторая половина: проявляется горизонтальный логотип. Контакты всё это время
  переезжают из столбика в ряд по центру строки, Telegram — к правому полю.
*/
const header = document.querySelector('.header');
const desktop = matchMedia('(min-width: 1024px)');
if (header) {
  const root = document.documentElement;
  const fullLogo = header.querySelector('.logo__full');
  const lineLogo = header.querySelector('.logo__line');
  const title = header.querySelector('.header__title');
  const links = [...header.querySelectorAll('.header__contacts a')];
  const CONTACTS_GAP = 24;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);
  let fullH = 0, barH = 0, moves = [];

  // Полная высота и пути контактов меряются без сдвигов, при загрузке и при смене размера окна
  const measure = () => {
    [fullLogo, lineLogo, title, ...links].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
    header.style.removeProperty('--header-now');
    if (!desktop.matches) {
      root.style.removeProperty('--header-h');
      return;
    }
    const cs = getComputedStyle(header);
    fullH = header.offsetHeight + parseFloat(cs.getPropertyValue('--header-space'));
    barH = parseFloat(cs.getPropertyValue('--bar-h'));
    root.style.setProperty('--header-h', fullH + 'px');
    const right = header.clientWidth - parseFloat(cs.paddingRight);
    let edge = right;
    moves = links.slice().reverse().map((a) => {
      // offset* не учитывают transform — замер верный, даже пока идёт анимация появления.
      // Пока она идёт, столбик контактов сам становится offsetParent, поэтому прибавляем его положение.
      const nav = a.parentElement;
      const x = a.offsetLeft + (a.offsetParent === nav ? nav.offsetLeft : 0);
      const y = a.offsetTop + (a.offsetParent === nav ? nav.offsetTop : 0);
      const left = edge - a.offsetWidth;
      edge = left - CONTACTS_GAP;
      return { a, dx: left - x, dy: (barH - a.offsetHeight) / 2 - y };
    }).reverse();
    update();
  };

  const update = () => {
    if (!desktop.matches) return;
    const y = Math.max(0, scrollY);
    const now = Math.max(barH, fullH - y);
    const p = (fullH - now) / (fullH - barH);
    const shift = fullH - now;
    header.style.setProperty('--header-now', now + 'px');

    const fadeOut = (1 - clamp01(p / 0.5)).toFixed(3);
    fullLogo.style.opacity = fadeOut;
    fullLogo.style.transform = `translateY(${-shift}px)`;
    title.style.opacity = fadeOut;
    title.style.transform = `translateY(${-shift}px)`;
    lineLogo.style.opacity = ease(clamp01((p - 0.5) / 0.5)).toFixed(3);

    const k = ease(p);
    moves.forEach(({ a, dx, dy }) => { a.style.transform = `translate(${dx * k}px, ${dy * k}px)`; });
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  measure();
}

/*
  Рост карточки на телефоне. Когда карточка подходит к середине экрана, картинка из квадрата
  вытягивается в высоту до 1 : max, камера чуть наезжает (zoom), фон сверху и снизу достраивается,
  и запускается петля; уходит от середины — всё обратно.
  Чтобы страница не прыгала, место под карточку отведено сразу под самую высокую картинку:
  высота .project постоянная, картинка прижата к её верху и растёт вниз, текст едет следом.
  range — доля высоты экрана: на таком расстоянии от середины карточка начинает расти.
*/
const phoneGrow = window.phoneGrow = { on: true, max: 1.5, zoom: 1.1, range: 0.6, video: true, update: () => {} };
{
  const cards = [...document.querySelectorAll('.project')].map((project) => ({
    project,
    media: project.querySelector('.project__media'),
    row: project.querySelector('.project__row'),
    active: false,
  }));
  const ease = (t) => t * t * (3 - 2 * t);

  const reset = () => cards.forEach((c) => {
    c.project.style.height = '';
    c.media.style.height = '';
    c.media.style.aspectRatio = '';
    c.media.zoom = 1;
  });

  const frame = () => {
    if (!phone.matches || !phoneGrow.on) return;
    const vh = innerHeight;
    cards.forEach((c) => {
      const W = c.media.clientWidth;
      // Ориентир — середина картинки в развёрнутом виде:
      // карточка полностью развёрнута, когда картинка ровно посередине экрана, а текст — ниже
      const anchor = c.project.getBoundingClientRect().top + W * phoneGrow.max / 2;
      const d = Math.abs(anchor - vh / 2) / (vh * phoneGrow.range);
      const e = ease(Math.max(0, 1 - d));
      c.media.style.height = (W * (1 + (phoneGrow.max - 1) * e)).toFixed(1) + 'px';
      c.media.zoom = 1 + (phoneGrow.zoom - 1) * e;
      c.media.layoutFill?.();
      if (!c.media.loopStart) return;
      if (phoneGrow.video && e > 0.85 && !c.active) { c.active = true; c.media.loopStart(); }
      if ((!phoneGrow.video || e < 0.5) && c.active) { c.active = false; c.media.loopStop(); }
    });
  };

  // Высота места под карточку: самая высокая картинка + текст
  const measure = () => {
    reset();
    if (!phone.matches || !phoneGrow.on) { mediaFill.update(); return; }
    cards.forEach((c) => {
      c.media.style.aspectRatio = 'auto';
      c.project.style.height = (c.media.clientWidth * phoneGrow.max + c.row.offsetHeight) + 'px';
    });
    frame();
  };
  phoneGrow.update = measure;

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; frame(); });
  }, { passive: true });
  // На телефоне resize приходит и когда прячется адресная строка — пересчитываем место, только если сменилась ширина
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) { frame(); return; }
    lastW = innerWidth;
    measure();
  });
  phone.addEventListener('change', measure);
  document.fonts?.ready.then(measure);
  measure();
}
