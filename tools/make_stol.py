# Страница экспоната «Стол Хакасии» (/works/khakasia/stol/) из кейса /cases/khakasia/.
# Содержание кейса не меняем; новая шапка, путь, теги, вставка «Из опыта на площадках», низ страницы.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, NAME

os.chdir(SITE)
SRC = 'cases/khakasia/'
t = open('_src/' + SRC + 'index.html', encoding='utf-8').read()
p = Page(B='../../../', W='../../', cta='museum')
B, W = p.B, p.W
TAGS = ['eksponaty', 'video', 'muzei', 'vystavki', 'regiony', 'developery']

# Пути: ../../x — от корня, media/… — медиа кейса остаются в его папке, ../<кейс>/ — соседние кейсы
def fix_one(val):
    if re.match(r'(https?:|mailto:|tel:|#|/|\./)', val) or val == '': return val
    if val.startswith('../../'): return B + val[6:]
    if val.startswith('../'): return B + 'cases/' + val[3:]
    return B + SRC + val
def fix(m):
    attr, val = m.group(1), m.group(2)
    if attr in ('srcset', 'imagesrcset'):
        return f'{attr}="' + ', '.join(' '.join([fix_one(part.split()[0])] + part.split()[1:]) for part in val.split(', ')) + '"'
    return f'{attr}="{fix_one(val)}"'
t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|poster|srcset|imagesrcset)="([^"]*)"', fix, t)

# Шапка
CRUMBS = f'<a href="{W}">Работы</a><span>→</span><a href="{W}khakasia/">Хакасия&nbsp;на&nbsp;ВДНХ</a><span>→</span>Интерактивный стол'
# Телефон: «Хакасия на ВДНХ ⌄» — в строке над заголовком и в шапке при прокрутке; открывает шторку с экспонатами проекта
from v2parts import DATA
PR = next(x for x in DATA['projects'] if x['id'] == 'khakasia')
EXH = [w for w in DATA['items'] if w.get('project') == 'khakasia' and not w.get('hidden')]
TITLE = {'stol': 'Интерактивный стол'}
PSHEET = p.sheet('psheet', 'Экспонаты проекта', f'<a class="tsheet__all" href="{B}{PR["href"]}">{PR["short"]}</a>',
                 [('', [(B + w['href'] if w['id'] != 'stol' else './', TITLE.get(w['id'], w['title']), w['id'] == 'stol') for w in EXH]),
                  ('', [(W, 'Все работы', False)])])
PNAV = (f'<nav class="pnav" aria-label="Проект"><a class="lnav__up" href="{W}">Работы</a><span class="lnav__sep" aria-hidden="true">→</span>'
        f'<button class="lnav__btn" type="button" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button></nav>')
CTX = (f'<button class="top__ctx" type="button" data-ctx-for=".pnav" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button>\n    ')
t, n = re.subn(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_crumbs(CRUMBS), CTX), t, count=1, flags=re.S); assert n
# Путь вместо подписи над заголовком: из него и так видно проект и что это за экспонат
t, n = re.subn(r'<p class="case-kicker">.*?</p>',
               lambda m: f'<p class="case-kicker crumbs">{CRUMBS}</p>\n      ' + PNAV,
               t, count=1, flags=re.S); assert n
# Теги под заголовком — ссылки на подборки
tags = ''.join(f'<li><a href="{W}{s}/">{NAME[s]}</a></li>' for s in TAGS)
# Строку тегов под заголовком убрали: ссылки на подборки есть внизу, в «Смотрите также».
# Вместо нее — полное название проекта обычной фразой: по брендам и событиям ищут.
# Полностью пишем один раз, дальше по тексту коротко.
t, n = re.subn(r'(<h1 class="case-hero__title">.*?</h1>)',
               lambda m: m.group(1) + '\n      <p class="case-sub">Интерактивный стол, стенд Республики Хакасия, выставка «Россия» на&nbsp;ВДНХ, 2023</p>',
               t, count=1, flags=re.S); assert n
for a, b in [
    ('<title>Интерактивный стол о Хакасии для выставки «Россия» — студия братьев Петрович</title>',
     '<title>Интерактивный стол для стенда Республики Хакасия на выставке «Россия», ВДНХ — студия братьев Петрович</title>'),
    ('<meta name="description" content="Интерактивный стол для стенда Хакасии на ВДНХ:',
     '<meta name="description" content="Интерактивный стол для стенда Республики Хакасия на выставке «Россия» на ВДНХ:'),
    ('<span>Стенд Хакасии, выставка «Россия»</span>', '<span>Стенд Республики Хакасия, выставка «Россия» на&nbsp;ВДНХ</span>'),
    ('<h2 class="case-label">Стенд Хакасии на&nbsp;выставке «Россия»</h2>', '<h2 class="case-label">Стенд Республики Хакасия на&nbsp;выставке «Россия»</h2>'),
    ('стенд Хакасии, RFID', 'стенд Республики Хакасия, ВДНХ, RFID'),
]:
    assert a in t, a[:50]; t = t.replace(a, b)
# Кружок «← Все проекты» и кнопка «←» на телефоне больше не нужны: назад ведет путь наверху
t, n = re.subn(r'\n    <a class="badge badge--back".*?</a>\n', '\n', t, count=1, flags=re.S); assert n
t, n = re.subn(r'\n    <a class="case-fab case-fab--back".*?</a>', '', t, count=1, flags=re.S); assert n

# Вставка «Из опыта на площадках» перед «Сделаем похожий…»
PLATE = p.plate('Из&nbsp;опыта на&nbsp;площадках',
                'В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, к&nbsp;каждому экспонату нужен проводной интернет: с&nbsp;удаленным доступом обновить его можно за&nbsp;минуту, а&nbsp;без провода на&nbsp;это уходят дни',
                'Video/errors/oshibka-05.mp4', 'fresh/media/oshibka-05.webp',
                'Артем Петрович рассказывает, почему экспонатам нужен проводной интернет, а не Wi-Fi',
                'Смотреть разбор: нет проводного интернета, 0:18', cls='plate plate--page')
t, n = re.subn(r'(\n    <section class="case-offer">)', lambda m: PLATE + m.group(1), t, count=1); assert n

# После «Стенд Хакасии на выставке „Россия“» (другие экспонаты проекта) — «Смотрите также»
SEE = ['muzei', 'vystavki', 'regiony', 'developery', 'eksponaty', 'video']
t, n = re.subn(r'(    <section class="case-more">.*?</section>\n)', lambda m: m.group(1) + p.next_work(project_id='khakasia') + p.seealso(SEE), t, count=1, flags=re.S); assert n

# Адрес страницы
# Только адрес страницы (canonical, og:url); картинка для соцсетей остается в папке кейса
t = t.replace('https://petrovichbrothers.ru/cases/khakasia/"', 'https://petrovichbrothers.ru/works/khakasia/stol/"')

t = p.finish(t, PSHEET)
os.makedirs('works/khakasia/stol', exist_ok=True)
open('works/khakasia/stol/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t))
