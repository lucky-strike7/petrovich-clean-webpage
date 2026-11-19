// Новая структура (ветка structure-v2): шапка прячется при прокрутке вниз, меню на телефоне, круглая кнопка «Контакты».
(() => {
  const root = document.documentElement;
  const top = document.querySelector('.top--v2');

  // Шапка: вниз больше чем на 8 px — уезжает, вверх — возвращается. У самого верха видна всегда.
  // Пока открыто меню «Работы» или панель контактов, не прячется.
  // Кружок «Контакты» прячется, когда на экране черный блок контактов: там своя форма
  const orb = document.querySelector('.orb');
  const contact = document.querySelector('.contact');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    if (orb && contact) orb.classList.toggle('is-off', contact.getBoundingClientRect().top < innerHeight * 0.75);
    const y = scrollY, dy = y - lastY;
    if (Math.abs(dy) < 8) return;
    const busy = root.classList.contains('is-panel') || top.querySelector('.top__dd.is-open, .top__dd:focus-within');
    top.classList.toggle('is-up', dy > 0 && y > 160 && !busy);
    lastY = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // Меню на телефоне: шторка снизу. Закрывается крестиком, по фону, смахиванием вниз и кнопкой «Назад»
  const sheet = document.querySelector('.msheet');
  const burger = document.querySelector('.top__burger');
  if (sheet && burger) {
    const isOpen = () => sheet.classList.contains('is-open');
    const set = (open, byKeyboard = false) => {
      sheet.classList.toggle('is-open', open);
      sheet.inert = !open;
      burger.setAttribute('aria-expanded', open);
      // Фокус на крестик — только если открыли с клавиатуры; от пальца Safari рисует вокруг него синюю рамку
      if (open && byKeyboard) sheet.querySelector('.msheet__close').focus({ preventScroll: true });
    };
    const close = () => { if (!isOpen()) return; if (history.state?.msheet) history.back(); else set(false); };
    set(false);
    burger.addEventListener('click', (e) => { set(true, e.detail === 0); history.pushState({ msheet: 1 }, ''); });
    addEventListener('popstate', () => { if (isOpen()) set(false); });
    sheet.querySelector('.msheet__close').addEventListener('click', close);
    document.querySelector('.msheet__shade').addEventListener('click', close);
    // Пункты меню: сначала закрываем шторку без возврата по истории, иначе переход по ссылке сорвется
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // Страница под открытой шторкой не прокручивается
    document.addEventListener('touchmove', (e) => { if (isOpen() && !sheet.contains(e.target)) e.preventDefault(); }, { passive: false });
    // Смахнуть вниз — закрыть (тянем, пока шторка не прокручена)
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
  const lnav = document.querySelector('.lnav--switch');
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
  const ldd = document.querySelector('.lnav__dd');
  if (ldd) {
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
  }

  // Превью на карточках работ всегда начинается с начала, а не с места, где остановилось в прошлый раз
  document.querySelectorAll('.work[data-preview]').forEach((card) => card.addEventListener('mouseenter', () => {
    const v = card.querySelector('.work__media video');
    if (v) v.currentTime = 0;
  }));

  onScroll();
})();
