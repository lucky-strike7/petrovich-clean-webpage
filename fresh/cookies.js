// Cookies и Яндекс Метрика: плашка при первом заходе и счетчик (только на боевом домене).
// Подключается на всех страницах, в том числе служебных (политика, согласие), — поэтому отдельным файлом.
(() => {
  const base = new URL('../', document.currentScript.src); // корень сайта — на уровень выше fresh/

  /*
    Яндекс Метрика — счетчик старого сайта (46078563), чтобы сохранилась история посещений.
    Работает только на petrovichbrothers.ru: на GitHub Pages и локально статистику не засоряем.
  */
  const COUNTER = 46078563;
  if (/(^|\.)petrovichbrothers\.ru$/.test(location.hostname)) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(COUNTER, 'init', { defer: false, webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  /* Плашка: показываем, пока человек не нажал «Хорошо». Запоминаем в браузере */
  const KEY = 'pb-cookies';
  let seen = false;
  try { seen = localStorage.getItem(KEY) === 'ok'; } catch {}
  if (seen) return;

  const bar = document.createElement('div');
  bar.className = 'cookies';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Файлы cookie');
  bar.innerHTML =
    '<p class="cookies__text">Мы используем cookies и&nbsp;Яндекс Метрику, чтобы понимать, как работает сайт. ' +
    `<a href="${new URL('privacy/', base).href}">Подробнее</a></p>` +
    '<button class="cookies__ok" type="button">Хорошо</button>';
  bar.querySelector('.cookies__ok').addEventListener('click', () => {
    try { localStorage.setItem(KEY, 'ok'); } catch {}
    bar.classList.remove('is-shown');
    setTimeout(() => bar.remove(), 400);
  });
  const show = () => { document.body.append(bar); requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-shown'))); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(show, 1200));
  else setTimeout(show, 1200);
})();
