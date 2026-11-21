# Страница проекта «Зал Черноморского флота» (/works/khersones/): все экспонаты зала крупными карточками.
# Устроена как страница Хакасии; экспонаты и тексты — из texts/works.md (Проект: khersones).
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, DATA, typo

os.chdir(SITE)
home = open('_src/index.html', encoding='utf-8').read()
p = Page(B='../../', W='../', cta='museum')
B, W = p.B, p.W
PR = next(x for x in DATA['projects'] if x['id'] == 'khersones')
EXH = [w for w in DATA['items'] if w.get('project') == 'khersones' and not w.get('hidden')]
ANCHOR = lambda w: w['href'].split('#', 1)[1]

# Вставка в конце экспонатов: в музее экспонаты работают годами, обновляем их удаленно
PLATE = p.plate('Из&nbsp;опыта на&nbsp;площадках',
                'В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, к&nbsp;каждому экспонату нужен проводной интернет: с&nbsp;удаленным доступом обновить его можно за&nbsp;минуту, а&nbsp;без провода на&nbsp;это уходят дни',
                'Video/errors/oshibka-05.mp4', 'fresh/media/oshibka-05.webp',
                'Артем Петрович рассказывает, почему экспонатам нужен проводной интернет, а не Wi-Fi',
                'Смотреть разбор: нет проводного интернета, 0:18')

CRUMBS = f'<a href="{W}">Работы</a><span>→</span>{PR["short"].replace(" ", "&nbsp;")}'
JUMP = ''.join(f'<li><a href="#{ANCHOR(w)}">{w["title"]}</a></li>' for w in EXH)
PSHEET = p.sheet('psheet', 'Экспонаты проекта', f'<a class="tsheet__all" href="./" aria-current="page">{PR["short"]}</a>',
                 [('', [(f'#{ANCHOR(w)}', w['title'], False) for w in EXH]), ('', [(W, 'Все работы', False)])])
PNAV = (f'<nav class="pnav" aria-label="Проект"><a class="lnav__up" href="{W}">Работы</a><span class="lnav__sep" aria-hidden="true">→</span>'
        f'<button class="lnav__btn" type="button" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button></nav>')
CTX = f'<button class="top__ctx" type="button" data-ctx-for=".pnav" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button>\n    '

# Правило: карточка на странице своего проекта не повторяет «где и когда» — это сказано вверху один раз
cards = [p.big_card(w, review=True, anchor=ANCHOR(w), meta=False) for w in EXH]
# Зал вокруг штурвала: три кадра из ТЗ музея после первого экспоната (один крупно, два рядом)
HALL = [('khersones-hall-02.webp', 'Штурвал на палубе корабля в зале'),
        ('khersones-hall-04.webp', 'Нос корабля и стена с чертежами и экраном'),
        ('khersones-hall-05.webp', 'Стена «История Черноморского флота»: штурвалы, фонари, такелаж')]
GALLERY = ('    <div class="project-gallery reveal">\n'
           + ''.join(f'      <img src="fresh/media/{f}" alt="{a}" width="2048" height="1152" loading="lazy">\n' for f, a in HALL)
           + '    </div>\n')
cards.insert(1, GALLERY)
cards.append(PLATE)  # «Из опыта на площадках» — после всех экспонатов, чтобы не разбивать их ряд

# Сразу под общим кадром зала: задача, решение и «Что сделали» (строкой через точку). Монтаж и поддержка в этом списке всегда.
DONE_ITEMS = ['Концепция экспонатов', 'Дизайн интерфейсов', '3D-модели кораблей', 'Видео', 'Программирование',
              'Датчики и контроллеры', 'Монтаж на площадке', 'Поддержка после открытия']
TASK = 'Сделать интерактивные экспонаты для зала о Черноморском флоте в музее «Новый Херсонес».'
SOLUTION = ('Зал построен вокруг двух деревянных кораблей. Мы сделали для него четыре экспоната: штурвал-симулятор, '
            'сканеры кораблей над чертежами, таймлайн истории флота и игру «Сборка кораблей».')
BRIEF = f'''
    <section class="sect project-brief">
      <h2 class="sect__label reveal">Задача</h2>
      <p class="sect__body project-brief__text reveal">{typo(TASK)}</p>
      <h2 class="sect__label reveal">Решение</h2>
      <p class="sect__body project-brief__text reveal">{typo(SOLUTION)}</p>
      <h2 class="sect__label reveal">Что сделали</h2>
      <ul class="sect__body seealso__list project-brief__done reveal">{''.join(f'<li>{typo(x)}</li>' for x in DONE_ITEMS)}</ul>
    </section>
'''

MAIN = f'''<main>

    <section class="about project-hero">
      <p class="about__label crumbs reveal">{CRUMBS}</p>
      {PNAV}
      <h1 class="about__text reveal">{PR["title"]}</h1>
      <p class="project-meta reveal">{typo(PR["where"])}</p>
      <p class="about__desc reveal">{typo(PR["meta"])}</p>
      <ul class="pjump reveal" aria-label="Экспонаты проекта">{JUMP}</ul>
    </section>

{p.project_photo('fresh/media/khersones-hall.webp', 'Зал Черноморского флота в музее «Новый Херсонес»: общий вид')}{BRIEF}
    <section class="works-mix project-exhibits" id="exhibits">
      <h2 class="sr-only">Экспонаты</h2>
{''.join(cards)}    </section>
{p.next_work(project_id='khersones')}{p.seealso(['museums', 'interactive', 'video', 'exhibitions', 'regions'])}
'''

t = home
t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_crumbs(CRUMBS).replace('data-sub-for=".case-kicker.crumbs, .case-hero__title"', 'data-sub-for=".project-hero .crumbs, .project-hero h1"'), CTX), t, count=1, flags=re.S)
t, n = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)', lambda m: MAIN + m.group(1), t, count=1, flags=re.S); assert n
t = re.sub(r'<title>.*?</title>', '<title>Интерактивные экспонаты для зала Черноморского флота в музее «Новый Херсонес» — студия братьев Петрович</title>', t, count=1)
t = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Зал Черноморского флота в музее «Новый Херсонес», Севастополь: корабельный симулятор со штурвалом, сканеры кораблей, таймлайн истории флота и игра «Сборка кораблей». Концепция, дизайн, 3D, программирование.">', t, count=1)
t = t.replace('https://petrovichbrothers.ru/"', 'https://petrovichbrothers.ru/works/khersones/"')
t = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', t)
def fix(m):
    attr, val = m.group(1), m.group(2)
    if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '': return m.group(0)
    return f'{attr}="{B}{val}"'
t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|data-full|srcset)="([^"]*)"', fix, t)
t = t.replace(f'href="{B}./"', f'href="{B}"')
t = p.finish(t, PSHEET)
os.makedirs('works/khersones', exist_ok=True)
open('works/khersones/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t), 'экспонатов:', len(EXH))
