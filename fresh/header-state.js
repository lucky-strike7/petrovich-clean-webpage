// Restore the desktop menu size before the logo is painted on the destination.
(() => {
  const header = document.currentScript.closest('header');
  const desktop = matchMedia('(min-width: 901px)');
  const key = 'pb:compact-header';
  try {
    const pending = JSON.parse(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
    const navigation = performance.getEntriesByType('navigation')[0]?.type;
    const fromMenu = navigation === 'navigate' && pending?.to === location.href &&
      pending.from === document.referrer && Date.now() - pending.at < 60000;
    if (desktop.matches && (fromMenu || (navigation === 'back_forward' && history.state?.compactHeader))) {
      header.setAttribute('data-compact-entry', '');
      header.classList.add('is-solid');
      if (fromMenu) history.replaceState({ ...history.state, compactHeader: true }, '');
    }
  } catch { /* Navigation also works without session storage. */ }

  document.addEventListener('click', event => {
    if (!desktop.matches || !header.classList.contains('is-solid') || event.defaultPrevented ||
        event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest('.top__nav a[href]');
    if (!link || link.target || link.origin !== location.origin || link.pathname === location.pathname) return;
    try {
      const from = new URL(location.href);
      from.hash = '';
      sessionStorage.setItem(key, JSON.stringify({ from: from.href, to: link.href, at: Date.now() }));
    } catch { /* The destination falls back to its normal header. */ }
  });
})();
