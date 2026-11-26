// English fallback for dynamically opened video dialogs. Media remains unchanged.
(() => {
  if (document.documentElement.lang !== 'en') return;
  const modal = document.querySelector('.modal');
  if (!modal) return;
  const observer = new MutationObserver(() => {
    if (modal.getAttribute('aria-label') === 'Видео') modal.setAttribute('aria-label', 'Video');
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['aria-label'] });
})();
