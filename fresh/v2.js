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

  onScroll();
})();
