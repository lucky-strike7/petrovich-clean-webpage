"""Build the studio page."""
from pathlib import Path

from make_info_page import build_info_page
from v2parts import SITE, Page, typo
from clients import render_clients


# Percent positions on the Natural Earth map. Nearby northern cities are offset
# slightly to leave room for the full-size markers at the desktop breakpoint.
CITIES = (
    ('Москва', 59.2, 18.2, (
        ('khakasia', 'Стенд Республики Хакасия на ВДНХ'),
        ('gorodobrazovaniya', 'Город образования'),
        ('donstroy', 'Донстрой'),
        ('rosatom', 'Росатом'),
        ('rosnano', 'Роснано'),
        ('nanolek', 'Нанолек'),
        ('artmonta', 'Артмонта'),
    )),
    ('Санкт-Петербург', 56.6, 12.2, (
        ('strana-sveta', '«Страна Света-2025»'),
    )),
    ('Екатеринбург', 63.828, 16.716, (
        ('referus', 'Реферус'),
        ('etalon', 'Эталон'),
    )),
    ('Калининград', 53.9, 18.7, (
        ('yantarny', 'Янтарный комбинат'),
    )),
    ('Севастополь', 58.237, 25.030, (
        ('khersones', 'Новый Херсонес'),
    )),
    ('Нью-Йорк', 31.470, 27.773, (
        ('hbo', '«Игры Уолл-стрит»'),
    )),
    ('Барселона', 50.542, 27.294, (
        ('carrera', 'Carrera y Carrera'),
    )),
)


def render_geography():
    cities = []
    for name, x, y, projects in CITIES:
        links = '\n'.join(
            f'                <li><a class="text-link" href="works/{slug}/">{typo(title)}</a></li>'
            for slug, title in projects
        )
        note = '<span class="geo-city__note">Тут много</span>' if name == 'Москва' else ''
        cities.append(f'''          <details class="geo-city" name="studio-geography" style="--geo-x: {x:.3f}%; --geo-y: {y:.3f}%; --geo-space: {100-x:.3f}cqw;">
            <summary><span>{name}</span></summary>
            <div class="geo-city__projects">
{note}
              <ul>
{links}
              </ul>
            </div>
          </details>''')
    joined = '\n'.join(cities)
    return f'''    <section class="sect studio-geography" id="geography" aria-label="География наших проектов">
      <h2 class="sect__label reveal studio-geography__list-title">География наших проектов</h2>
      <div class="studio-geography__note">
        <p class="about__text"><span>53°</span></p>
        <h2 id="geography-title">Средняя широта<br>наших проектов</h2>
      </div>
      <div class="studio-geography__places">
{joined}
      </div>
    </section>
    <script src="fresh/studio-geography.js" defer></script>'''

page = Page(B='../', W='../works/', nav_page='about', cta_text=tuple(map(typo, (
    'Расскажите, что хотите показать и когда открытие. Если есть план, сценарий или референсы, пришлите их.',
    'Давайте обсудим',
    'вашу идею',
))))
body = (Path(SITE) / '_src/about-content.html').read_text(encoding='utf-8')
body = body.replace('    <!-- studio geography -->', render_geography(), 1)
body = body.replace('    <!-- clients -->\n', render_clients(), 1)
build_info_page(
    page, 'about', body,
    'О студии братьев Пе́трович | Команда, подход и проекты',
    'Студия с 2017 года, мультимедиа для музеев и выставок с 2019 года, больше 100 проектов. Кто ведет проекты, как работаем, география и достижения.',
)
