(() => {
  const map = document.querySelector('.studio-geography__places');
  const desktop = matchMedia('(min-width: 1024px)');
  let pinned;
  let closeTimer;

  for (const city of map.querySelectorAll('.geo-city')) {
    const marker = city.querySelector('summary');
    city.addEventListener('pointerenter', () => clearTimeout(closeTimer));

    marker.addEventListener('pointerenter', event => {
      if (!desktop.matches || event.pointerType !== 'mouse') return;
      clearTimeout(closeTimer);
      if (pinned !== city) pinned = null;
      city.open = true;
    });
    city.addEventListener('pointerleave', event => {
      if (!desktop.matches || event.pointerType !== 'mouse' || pinned === city) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (pinned !== city && !city.matches(':hover, :focus-within')) city.open = false;
      }, 140);
    });
    marker.addEventListener('click', event => {
      if (!desktop.matches) return;
      event.preventDefault();
      clearTimeout(closeTimer);
      pinned = pinned === city ? null : city;
      city.open = pinned === city;
    });
  }

  map.addEventListener('keydown', event => {
    if (!desktop.matches || event.key !== 'Escape') return;
    const city = map.querySelector('.geo-city[open]');
    if (!city) return;
    city.querySelector('summary').focus();
    city.open = false;
    pinned = null;
  });
})();
