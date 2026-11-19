// Новая структура (ветка structure-v2): шапка прячется при прокрутке вниз, меню на телефоне, круглая кнопка «Контакты».
(() => {
  const root = document.documentElement;
  const top = document.querySelector('.top--v2');

  // Шапка: вниз больше чем на 8 px — уезжает, вверх — возвращается. У самого верха видна всегда.
  // Пока открыто меню «Работы» или панель контактов, не прячется.
  // Кружок «Контакты» прячется, когда на экране черный блок контактов: там своя форма
  const orb = document.querySelector('.orb');
  const contact = document.querySelector('.contact');
  // На телефоне шапка уезжает не от первого движения пальца, а когда пролистал вниз заметно (60 px подряд)
  const phone = matchMedia('(max-width: 600px)');
  let lastY = scrollY, ticking = false, downRun = 0;
  const onScroll = () => {
    ticking = false;
    if (orb && contact) orb.classList.toggle('is-off', contact.getBoundingClientRect().top < innerHeight * 0.75);
    const y = scrollY, dy = y - lastY;
    if (Math.abs(dy) < 8) return;
    lastY = y;
    const busy = root.classList.contains('is-panel') || top.querySelector('.top__dd.is-open, .top__dd:focus-within, .lnav__dd.is-open');
    if (dy < 0 || busy || y <= 160) { downRun = 0; top.classList.remove('is-up'); return; }
    downRun += dy;
    if (downRun > (phone.matches ? 60 : 8)) top.classList.add('is-up');
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /*
    Шторки снизу (телефон): меню (бургер) и список тегов (подсказка в шапке). Закрываются крестиком,
    по фону, смахиванием вниз и кнопкой «Назад». Страница под открытой шторкой не прокручивается.
  */
  const makeSheet = (sheet, openers) => {
    const shade = sheet.nextElementSibling;
    const isOpen = () => sheet.classList.contains('is-open');
    const set = (open, byKeyboard = false) => {
      sheet.classList.toggle('is-open', open);
      sheet.inert = !open;
      openers.forEach((o) => o.setAttribute('aria-expanded', open));
      // Фокус на крестик — только при работе с клавиатуры; от пальца Safari рисует вокруг него синюю рамку
      if (open && byKeyboard) sheet.querySelector('.msheet__close').focus({ preventScroll: true });
    };
    const close = () => { if (!isOpen()) return; if (history.state?.sheet === sheet.id) history.back(); else set(false); };
    set(false);
    // На компьютере переключатель вверху страницы раскрывает свой список (data-phone-only) — шторку открываем только на телефоне
    openers.forEach((o) => o.addEventListener('click', (e) => {
      if (o.hasAttribute('data-phone-only') && !phone.matches) return;
      e.stopImmediatePropagation();
      set(true, root.classList.contains('kbd')); history.pushState({ sheet: sheet.id }, '');
    }, true));
    addEventListener('popstate', () => { if (isOpen()) set(false); });
    sheet.querySelector('.msheet__close').addEventListener('click', close);
    shade?.addEventListener('click', close);
    // Ссылки: закрываем шторку без возврата по истории, иначе переход сорвется
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('touchmove', (e) => { if (isOpen() && !sheet.contains(e.target)) e.preventDefault(); }, { passive: false });
    let y0 = null, dy = 0;
    sheet.addEventListener('touchstart', (e) => {
      if (sheet.scrollTop > 0) return;
      y0 = e.touches[0].clientY; dy = 0; sheet.classList.add('is-dragging');
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.setProperty('--drag', `${dy}px`);
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      if (y0 === null) return;
      y0 = null; sheet.classList.remove('is-dragging'); sheet.style.removeProperty('--drag');
      if (dy > 80) close();
    });
  };
  // Каждая шторка открывается всеми кнопками, которые на нее указывают (aria-controls)
  document.querySelectorAll('.msheet[id]').forEach((sheet) => {
    const openers = [...document.querySelectorAll(`[aria-controls="${sheet.id}"]`)];
    if (openers.length) makeSheet(sheet, openers);
  });
  const ctx = document.querySelector('.top__ctx');

  /*
    Подсказка «где ты» в шапке на телефоне: появляется вместо логотипа, когда свой путь или заголовок
    на странице уехал под шапку. Шапка ездит как обычно: вниз — уходит, вверх — возвращается вместе с подсказкой.
  */
  const ctxSrc = ctx && document.querySelector(ctx.dataset.ctxFor);
  if (ctx && ctxSrc) {
    const updCtx = () => {
      const shown = !ctxSrc.hidden && ctxSrc.offsetParent !== null && ctxSrc.getBoundingClientRect().bottom < top.offsetHeight;
      top.classList.toggle('has-ctx', shown);
    };
    addEventListener('scroll', updCtx, { passive: true });
    addEventListener('resize', updCtx);
    updCtx();
  }

  // Меню «Работы»: открывается при наведении, закрывается не сразу, а через 350 мс после ухода курсора.
  // Курсор можно вести к панели как угодно: короткий выход за край ее не закрывает.
  const dd = document.querySelector('.top__dd');
  if (dd) {
    let timer;
    const open = () => { clearTimeout(timer); dd.classList.add('is-open'); top.classList.remove('is-up'); };
    const close = () => { clearTimeout(timer); timer = setTimeout(() => dd.classList.remove('is-open'), 350); };
    dd.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') open(); });
    dd.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { clearTimeout(timer); dd.classList.remove('is-open'); } });
  }

  // Вставка с разбором: по нажатию здесь же играет кусок со звуком (при наведении только кнопка ▶ чуть растет — в CSS)
  const pb = document.querySelector('.plate__btn');
  if (pb) {
    // Панель управления внутри кнопки не работает, поэтому кнопку заменяем обычным видео на том же месте
    pb.addEventListener('click', () => {
      const full = document.createElement('video');
      Object.assign(full, { src: pb.dataset.full, controls: true, playsInline: true, className: 'plate__full' });
      full.setAttribute('aria-label', pb.getAttribute('aria-label'));
      pb.replaceWith(full);
      full.play().catch(() => {});
      full.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('pb:goal', { detail: { name: 'video_open' } }));
    });
  }

  // «Для кого» на странице «Работы» (телефон): раскрывается кнопкой
  const more = document.querySelector('.tagbar__more');
  if (more) more.addEventListener('click', () => {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', open);
    more.closest('.tagbar').classList.toggle('is-who', open);
  });

  /*
    Переключатель «Работы → тег ▾» наверху страницы тега. Показываем тем, кто пришел с нашего же сайта
    (из «Работ», меню, страницы экспоната): им нужна навигация. Кто пришел из рекламы, поиска или по ссылке —
    видит чистую продающую страницу. После перезагрузки страница помнит, что человек пришел с сайта.
    Для проверки: ?nav=1 — показать всегда, ?nav=0 — скрыть.
  */
  const lnav = document.querySelector('nav.lnav--switch');
  if (lnav) {
    const key = 'pb-nav:' + location.pathname;
    const param = new URLSearchParams(location.search).get('nav');
    let fromSite = false;
    try { fromSite = new URL(document.referrer).origin === location.origin; } catch {}
    let remembered = false;
    try { if (fromSite) sessionStorage.setItem(key, '1'); remembered = sessionStorage.getItem(key) === '1'; } catch {}
    const show = param === '0' ? false : param === '1' || param === 'switch' || fromSite || remembered;
    if (show) lnav.hidden = false;
  }
  document.querySelectorAll('.lnav__dd').forEach((ldd) => {
    const btn = ldd.querySelector('.lnav__btn');
    const toggle = (open) => { ldd.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', () => toggle(!ldd.classList.contains('is-open')));
    // На компьютере открывается при наведении, как меню «Работы»: с небольшой задержкой на открытие
    // (чтобы не выскакивал, когда курсор просто проходит к шапке) и на закрытие (чтобы не пропадал от рывка мыши)
    let lt;
    ldd.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(lt); lt = setTimeout(() => toggle(true), 120); });
    ldd.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(lt); lt = setTimeout(() => toggle(false), 350); });
    document.addEventListener('click', (e) => { if (!ldd.contains(e.target)) toggle(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  });


  // Превью на карточках работ всегда начинается с начала, а не с места, где остановилось в прошлый раз
  document.querySelectorAll('.work[data-preview]').forEach((card) => card.addEventListener('mouseenter', () => {
    const v = card.querySelector('.work__media video');
    if (v) v.currentTime = 0;
  }));

  /*
    Телефон и планшет: мыши нет, наведения тоже. Ролик плитки играет, пока плитка видна на экране
    (больше чем на 60%), и останавливается, когда уехала. Файл грузится, только когда плитка впервые показалась.
  */
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData) {
    const tileIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const card = e.target;
        let v = card.querySelector('.work__media video');
        if (e.isIntersecting && !document.hidden) {
          if (!v) {
            v = document.createElement('video');
            Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
            v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
            v.src = card.dataset.preview;
            card.querySelector('.work__media').append(v);
          }
          card.classList.add('is-previewing');
          v.play().catch(() => {});
        } else if (v) { v.pause(); card.classList.remove('is-previewing'); }
      }
    }, { threshold: 0.6 });
    document.querySelectorAll('.work[data-preview]').forEach((card) => tileIO.observe(card));
    // Вернулись на вкладку — снова запускаем то, что на экране (при уходе все ролики ставятся на паузу)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) document.querySelectorAll('.work.is-previewing video').forEach((v) => v.play().catch(() => {}));
    });
  }

  /*
    Вторая строка шапки: путь или переключатель. Появляется, когда свой путь на странице уехал под шапку,
    и дальше ездит вместе с шапкой: листаешь вниз — уходит, вверх — возвращается.
  */
  const sub = document.querySelector('.top__sub');
  // Источник — первый видимый из перечисленных (на телефоне путь на странице стола скрыт, тогда — заголовок)
  const subSrcs = sub ? [...document.querySelectorAll(sub.dataset.subFor)] : [];
  if (sub && subSrcs.length) {
    const updSub = () => {
      const src = subSrcs.find((el) => !el.hidden && el.offsetParent !== null);
      const shown = !!src && src.getBoundingClientRect().bottom < top.offsetHeight;
      top.classList.toggle('has-sub', shown);
    };
    addEventListener('scroll', updSub, { passive: true });
    addEventListener('resize', updSub);
    updSub();
  }

  // Работа с клавиатуры: по Tab включаем рамки фокуса, по нажатию мышью или пальцем — выключаем
  addEventListener('keydown', (e) => { if (e.key === 'Tab') root.classList.add('kbd'); });
  addEventListener('pointerdown', () => root.classList.remove('kbd'), { passive: true });

  // Строка тегов на телефоне: убираем затухание справа, когда долистали до конца
  const tb = document.querySelector('.tagbar--works');
  if (tb) {
    const updEnd = () => tb.classList.toggle('is-end', tb.scrollLeft + tb.clientWidth >= tb.scrollWidth - 4);
    tb.addEventListener('scroll', updEnd, { passive: true });
    addEventListener('resize', updEnd);
    updEnd();
  }

  onScroll();
})();
