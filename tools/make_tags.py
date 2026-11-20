# Страницы тегов (/works/<тег>/) из works.json. «Интерактивные экспонаты» собирается отдельно (make_landing.py).
import os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, DATA, WHAT, WHO, TAG_PROJECTS, NAME, VISIBLE, typo

os.chdir(SITE)
home = open('_src/index.html', encoding='utf-8').read()
PROJECTS = {p['id']: p for p in DATA['projects']}
TAG_FIRST = {'video': ['rosatom']}

# Тексты. full=True — продающая посадочная со своим текстом, ценами и вопросами, открыта для поиска.
# Остальные — простые: заголовок, одна фраза, работы; закрыты от поиска (noindex), пока не наполним.
# plate — ошибка из разбора «10 ошибок» для вставки «Из опыта на площадках».
PLATES = {
  'internet': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, к&nbsp;каждому экспонату нужен проводной интернет: с&nbsp;удаленным доступом обновить его можно за&nbsp;минуту, а&nbsp;без провода на&nbsp;это уходят дни',
               'Video/errors/oshibka-05.mp4', 'fresh/media/oshibka-05.webp', 'Артем Петрович рассказывает, почему экспонатам нужен проводной интернет, а не Wi-Fi', 'Смотреть разбор: нет проводного интернета, 0:18'),
  'touch': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, тачскрин нельзя выбирать по&nbsp;характеристикам: как он&nbsp;отзывается на&nbsp;касания, видно только на&nbsp;живом тесте',
            'Video/errors/oshibka-02.mp4', 'fresh/media/oshibka-02.webp', 'Артем Петрович показывает, как тачскрин с низкой частотой считывания отстает от пальца', 'Смотреть разбор: параметры тач-панелей, 0:37'),
  'games': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, сложную игру никто не&nbsp;проходит до&nbsp;конца: игры для стендов мы&nbsp;всегда упрощаем после тестов на&nbsp;людях',
            'Video/errors/oshibka-03.mp4', 'fresh/media/oshibka-03.webp', 'Артем Петрович рассказывает о сложных играх на стендах', 'Смотреть разбор: сложные игры на стендах, 0:34'),
}
# Тексты — в site/texts/tags.md: их правят там, без кода.
# Здесь только устройство страниц: какие полные (открыты для поиска, с ценами и вопросами) и какая вставка из «10 ошибок».
FULL = {'muzei': 'internet', 'vystavki': 'touch', 'zastr': 'games', 'mapping': None, 'video': None}

TEXTS_MD = os.path.join(SITE, 'texts', 'tags.md')
TEXT = {}
for block in re.split(r'^## ', open(TEXTS_MD, encoding='utf-8').read(), flags=re.M)[1:]:
    slug = block.split()[0]
    f = dict(re.findall(r'^(Заголовок|Подзаголовок|Вкладка):\s*(.+?)\s*$', block, flags=re.M))
    TEXT[slug] = dict(h1=typo(f['Заголовок']), lead=typo(f['Подзаголовок']), title=f.get('Вкладка') or f['Заголовок'],
                      full=slug in FULL, plate=FULL.get(slug))

# Подборки про видео, графику и сайты: внизу «Давайте обсудим задачу», а не «сделаем экспонат»
MEDIA = {'video', 'mapping', 'scena', 'sayty', 'dizayn', 'kino', 'meropr'}

def plural(n, one, few, many):
    return one if n % 10 == 1 and n % 100 != 11 else few if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else many

def build(slug):
    tx = TEXT[slug]
    p = Page(B='../../', W='../', cur=slug, cta='museum' if slug == 'muzei' else 'media' if slug in MEDIA else None)
    B, W = p.B, p.W
    group_what = slug in dict(WHAT)
    items = [w for w in VISIBLE if slug in w['what'] + w['who']]
    # Сначала экспонаты крупных проектов (по порядку проектов), потом отдельные работы — новые выше
    order = {pid: k for k, pid in enumerate(PROJECTS)}
    items.sort(key=lambda w: (0, order[w['project']]) if w.get('project') else (1, -w['year']))

    # Подпись плитки: год · что это · проект
    entries = [dict(w, meta=f"{w['year']}&nbsp;· {w['kind']}" + (f"&nbsp;· {PROJECTS[w['project']]['short']}" if w.get('project') else '')) for w in items]
    # Первой на странице тега — самая известная работа направления (на «Видео» — ролик Росатома, а не экспонаты Хакасии)
    if slug in TAG_FIRST:
        first = [e for e in entries if e['id'] in TAG_FIRST[slug]]
        entries = first + [e for e in entries if e['id'] not in TAG_FIRST[slug]]
    # Музеи и выставки: первыми обложки крупных проектов, их экспонаты — внутри проекта, здесь не повторяем
    if slug in TAG_PROJECTS:
        pids = TAG_PROJECTS[slug]
        entries = ([dict(PROJECTS[pid], kind=PROJECTS[pid]['short'], desc=PROJECTS[pid]['meta'], meta=PROJECTS[pid]['where']) for pid in pids]
                   + [e for e in entries if e.get('project') not in pids])

    n = len(items)
    plate = ''
    if tx.get('plate'):
        body, video, poster, alt, aria = PLATES[tx['plate']]
        plate = p.plate('Из&nbsp;опыта на&nbsp;площадках', body, video, poster, alt, aria, cls='plate plate--page')
    prices = ''
    if tx.get('full') and slug not in ('mapping', 'video', 'kino'):
        m = re.search(r'    <section class="sect prices" id="prices">.*?</ul>\n', home, flags=re.S).group(0)
        prices = m + p.prices_link() + '      </div>\n    </section>\n'
    faq = p.faq() if tx.get('full') and slug not in ('mapping', 'video', 'kino') else ''
    siblings = [k for k, _ in (WHAT if group_what else WHO) if k != slug] + [k for k, _ in (WHO if group_what else WHAT)][:3]

    main = f'''<main>
{p.landing_nav()}
    <section class="about">
      <p class="about__label reveal">Студия братьев<br class="about__br"> Пе́трович</p>
      <h1 class="about__text reveal">{tx['h1']}</h1>
      <p class="about__desc reveal">{tx['lead']}</p>
    </section>

{p.works_mix(entries)}{plate}{prices}{faq}{p.seealso(siblings)}
'''
    t = home
    t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_switch(), p.ctx_tags()), t, count=1, flags=re.S)
    t, k = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)', lambda m: main + m.group(1), t, count=1, flags=re.S); assert k
    title = tx.get('title') or re.sub(r'&nbsp;', ' ', tx['h1'])
    t = re.sub(r'<title>.*?</title>', f'<title>{title} — студия братьев Петрович</title>', t, count=1)
    desc = re.sub(r'<[^>]+>', '', re.sub(r'&nbsp;', ' ', tx['lead']))
    t = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', t, count=1)
    t = t.replace('https://petrovichbrothers.ru/"', f'https://petrovichbrothers.ru/works/{slug}/"')
    if not tx.get('full'):  # без своего текста — пока закрыта от поиска
        t = t.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="robots" content="noindex, follow">', 1)
    t = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', t)
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '': return m.group(0)
        return f'{attr}="{B}{val}"'
    t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|srcset)="([^"]*)"', fix, t)
    t = t.replace(f'href="{B}./"', f'href="{B}"')
    t = p.finish(t)
    os.makedirs(f'works/{slug}', exist_ok=True)
    open(f'works/{slug}/index.html', 'w', encoding='utf-8', newline='').write(t)
    return n

for slug in [k for k, _ in WHAT + WHO if k != 'eksponaty']:
    print(slug, build(slug), 'полная' if TEXT[slug].get('full') else 'простая')
