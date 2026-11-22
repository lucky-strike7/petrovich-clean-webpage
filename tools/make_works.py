# Страница «Работы» (/works/): строка тегов и все работы карточками. Собирается из works.json.
import os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, DATA, WHAT, WHO, COUNT, DAT, work_order

os.chdir(SITE)
home = open('_src/index.html', encoding='utf-8').read()
p = Page(B='../', W='./')
B = p.B

def href(h):
    # Пути в данных — от корня сайта; «#якорь» — пока ведет на главную к этой карточке
    return B + h if not h.startswith('#') else B + h

def card(title, meta, img, preview=None, link=None, video=None, label=None):
    attrs = f' data-preview="{B}{preview}"' if preview else ''
    lab = f'<span class="work__label">{label}</span>' if label else ''
    inner = (f'\n            <span class="work__media"><img src="{B}{img}" alt="" width="650" height="500" loading="lazy">{lab}</span>'
             f'\n            <span class="work__title">{title}</span>'
             f'\n            <span class="work__meta">{meta}</span>\n          ')
    if video:  # своей страницы нет — открываем видео
        return f'          <li class="reveal"><button class="work" type="button" data-video="{B}{video}" data-title="{html.escape(title)}" data-cursor="Смотреть видео"{attrs}>{inner}</button></li>\n'
    return f'          <li class="reveal"><a class="work" href="{href(link)}" data-cursor="Посмотреть"{attrs}>{inner}</a></li>\n'

def plural(n, one, few, many):
    return one if n % 10 == 1 and n % 100 != 11 else few if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else many

items = [w for w in DATA['items'] if not w.get('hidden')]
# Сначала крупные проекты целиком (их экспонаты отдельно видны на страницах тегов), потом отдельные работы, новые выше
entries = [dict(pr, kind=pr['short'], desc=pr['meta'], meta=pr['where']) for pr in DATA['projects']]
entries += [dict(w, meta=f"{w['year']}&nbsp;· {w['kind']}") for w in sorted((w for w in items if not w.get('project')), key=work_order)]

def chips(tags, count):
    # Число работ у тега видно только на десктопе (на телефоне скрыто в CSS)
    return ''.join(f'<li><a href="./{s}/">{n}<sup class="tagbar__n">{COUNT[s]}</sup></a></li>' for s, n in tags)

MAIN = f'''<main>

    <section class="about works-hero">
      <p class="about__label reveal">Студия братьев<br class="about__br"> Пе́трович</p>
      <h1 class="about__text reveal">Работы, которыми мы&nbsp;гордимся</h1>
    </section>

    <nav class="tagbar tagbar--works" aria-label="Работы по направлениям">
      <span class="tagbar__label">Что делаем</span>
      <ul class="tagbar__list"><li><a href="./" aria-current="page">Все<sup class="tagbar__n">{len(entries)}</sup></a></li>{chips(WHAT, True)}</ul>
      <button class="tagbar__more" type="button" aria-expanded="false" aria-controls="tagbar-who">Для кого <i aria-hidden="true"></i></button>
      <span class="tagbar__label tagbar__label--who">Для кого</span>
      <ul class="tagbar__list tagbar__list--who" id="tagbar-who">{chips([(k, DAT[k]) for k, _ in WHO], True)}</ul>
    </nav>

{p.works_mix(entries)}'''

t = home
t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(), t, count=1, flags=re.S)
# Вместо содержимого главной — эта страница; контакты внизу остаются
t, n = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)', lambda m: MAIN + m.group(1), t, count=1, flags=re.S); assert n
t = re.sub(r'<title>.*?</title>', '<title>Работы студии братьев Петрович: интерактивные экспонаты, видео, мэппинг, сайты</title>', t, count=1)
t = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Интерактивные экспонаты для музеев и выставок, видео и 3D-анимация, мэппинг, графика для сцены и сайты: Новый Херсонес, стенд Хакасии на ВДНХ, HBO Max, «Иннопром», Эталон и другие работы студии.">', t, count=1)
t = t.replace('https://petrovichbrothers.ru/"', 'https://petrovichbrothers.ru/works/"')
# Предзагрузка картинки стола с главной здесь не нужна
t = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', t)
# Пути от /works/ к корню (кроме уже собранных кусков с ../ и ./)
def fix(m):
    attr, val = m.group(1), m.group(2)
    if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '' or '/' not in val and not val.endswith('.html') and '.' not in val: return m.group(0)
    return f'{attr}="{B}{val}"'
t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|srcset)="([^"]*)"', fix, t)
t = t.replace(f'href="{B}./"', f'href="{B}"')
# Ссылки тегов «interactive/» и т. п. — относительные, от /works/: их fix не трогает только если без точки; проверим
t = p.finish(t)
os.makedirs('works', exist_ok=True)
open('works/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t), 'cards:', len(entries))
