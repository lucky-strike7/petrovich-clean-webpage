// Временная панель для телефона: подобрать рост карточки при прокрутке. После выбора значения переносятся в код, файл удаляется.
(() => {
  if (!matchMedia('(max-width: 767px)').matches) return;
  const KEY = 'tuner-grow';
  const DEF = { on: 'on', max: 150, zoom: 110, range: 60, fade: 60, video: 'on', gap: 85 };
  const root = document.documentElement;
  let s = { ...DEF };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}

  const seg = (k, opts) => `<div class="tm-seg"><span>${opts.label}</span>${opts.items.map(([v, l]) =>
    `<button type="button" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const range = (k, label, min, max, fmt) =>
    `<label class="tm-row"><span>${label}</span><input type="range" data-k="${k}" min="${min}" max="${max}"><b data-fmt="${fmt}"></b></label>`;
  const show = {
    ratio: (v) => '1:' + (v / 100).toFixed(2),
    pct: (v) => v + '%',
    px: (v) => v + ' px',
  };

  const panel = document.createElement('div');
  panel.innerHTML = `
    <style>
      .tm { position: fixed; left: 8px; right: 8px; bottom: 8px; z-index: 100; padding: 10px 12px 12px;
        background: rgba(255,255,255,.96); border-radius: 12px; box-shadow: 0 6px 30px rgba(0,0,0,.2);
        font: 13px/1.3 system-ui, sans-serif; color: #222; }
      .tm h4 { margin: 0; font-size: 13px; display: flex; justify-content: space-between; cursor: pointer; }
      .tm-body { display: grid; gap: 7px; margin-top: 10px; }
      .tm.is-min .tm-body { display: none; }
      .tm-seg { display: grid; grid-template-columns: 112px 1fr 1fr; gap: 4px; align-items: center; }
      .tm-seg button { padding: 6px 4px; border: 1px solid #ccc; border-radius: 6px; background: #fff; font: inherit; color: #222; }
      .tm-seg button.is-on { background: #222; border-color: #222; color: #fff; }
      .tm-row { display: grid; grid-template-columns: 112px 1fr 48px; align-items: center; gap: 8px; }
      .tm-row b { font-weight: 500; text-align: right; }
    </style>
    <div class="tm">
      <h4><span>Телефон: рост карточки</span><span data-toggle>свернуть</span></h4>
      <div class="tm-body">
        ${seg('on', { label: 'Рост', items: [['on', 'Вкл'], ['off', 'Выкл']] })}
        ${range('max', 'Вырастает до', 100, 180, 'ratio')}
        ${range('zoom', 'Наезд камеры', 100, 130, 'pct')}
        ${range('range', 'Начинает расти', 30, 100, 'pct')}
        ${range('fade', 'Растворение', 0, 160, 'px')}
        ${seg('video', { label: 'Ролик', items: [['on', 'Играет'], ['off', 'Нет']] })}
        ${range('gap', 'Между карточками', 0, 200, 'px')}
      </div>
    </div>`;
  document.body.append(panel);
  const box = panel.querySelector('.tm');

  const apply = () => {
    Object.assign(window.phoneGrow, {
      on: s.on === 'on', max: s.max / 100, zoom: s.zoom / 100, range: s.range / 100, video: s.video === 'on',
    });
    window.mediaFill.phone.fade = s.fade;
    root.style.setProperty('--projects-gap', s.gap + 'px');
    window.phoneGrow.update();
    panel.querySelectorAll('button[data-k]').forEach((b) => b.classList.toggle('is-on', s[b.dataset.k] === b.dataset.v));
    panel.querySelectorAll('input[data-k]').forEach((i) => {
      i.value = s[i.dataset.k];
      const b = i.nextElementSibling;
      b.textContent = show[b.dataset.fmt](s[i.dataset.k]);
    });
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  };

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) { s[b.dataset.k] = b.dataset.v; apply(); }
  });
  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (k) { s[k] = +e.target.value; apply(); }
  });
  panel.querySelector('h4').addEventListener('click', () => {
    box.classList.toggle('is-min');
    panel.querySelector('[data-toggle]').textContent = box.classList.contains('is-min') ? 'развернуть' : 'свернуть';
  });
  apply();
})();
