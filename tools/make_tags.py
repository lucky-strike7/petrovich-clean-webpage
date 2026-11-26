# Посадочные страницы из texts/tags.md и данных работ. make_landing.py вызывает этот сборщик для интерактива.
import os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, DATA, WHAT, WHO, TAG_PROJECTS, NAME, VISIBLE, typo, work_order, tag_card_ids

os.chdir(SITE)
home = open('_src/index.html', encoding='utf-8').read()
PROJECTS = {p['id']: p for p in DATA['projects']}
TAG_FIRST = {'video': ['rosatom']}

# Тексты. full=True — продающая посадочная со своим текстом, ценами и вопросами, открыта для поиска.
# Остальные — простые: заголовок, одна фраза, работы; тоже открыты для поиска (с 2026-11-26).
# plate — ошибка из разбора «10 ошибок» для вставки «Из опыта на площадках».
PLATES = {
  'internet': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, к&nbsp;каждому экспонату нужен проводной интернет: с&nbsp;удаленным доступом обновить его можно за&nbsp;минуту, а&nbsp;без провода на&nbsp;это уходят дни',
               'Video/errors/oshibka-05.mp4', 'fresh/media/oshibka-05.webp', 'Артем Петрович рассказывает, почему экспонатам нужен проводной интернет, а не Wi-Fi', 'Смотреть разбор: нет проводного интернета, 0:18'),
  'touch': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, тачскрин нельзя выбирать по&nbsp;характеристикам: как он&nbsp;отзывается на&nbsp;касания, видно только на&nbsp;живом тесте',
            'Video/errors/oshibka-02.mp4', 'fresh/media/oshibka-02.webp', 'Артем Петрович показывает, как тачскрин с низкой частотой считывания отстает от пальца', 'Смотреть разбор: параметры тач-панелей, 0:37'),
  'games': ('В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, сложную игру никто не&nbsp;проходит до&nbsp;конца: игры для стендов мы&nbsp;всегда упрощаем после тестов на&nbsp;людях',
            'Video/errors/oshibka-03.mp4', 'fresh/media/oshibka-03.webp', 'Артем Петрович рассказывает о сложных играх на стендах', 'Смотреть разбор: сложные игры на стендах, 0:34'),
  'simple': ('Один понятный сценарий помогает посетителю быстрее разобраться в проекте. В коротком видео объясняем, почему большой каталог на тачскрине часто уступает простому интерфейсу с понятным выбором.', 'Video/errors/oshibka-04.mp4', 'fresh/media/oshibka-04.webp', 'Артем Петрович объясняет, почему один понятный сценарий лучше большого каталога на тачскрине', 'Смотреть разбор: один понятный сценарий, 0:14'),
  'reset': ('После ухода посетителя интерактив должен сам возвращаться к началу. В коротком видео рассказываем, как это помогает следующему гостю начать знакомство со стендом и избавляет стендистов от ручного перезапуска.', 'Video/errors/oshibka-07.mp4', 'fresh/media/oshibka-07.webp', 'Артем Петрович рассказывает об автоматическом возврате интерактива к началу', 'Смотреть разбор: возврат к началу, 0:30'),
  'idle': ('Когда к экспонату никто не подходит, он все равно должен приглашать попробовать. В коротком видео рассказываем, как анимация, свет и звук помогают привлечь внимание посетителя на выставке.', 'Video/errors/oshibka-08.mp4', 'fresh/media/oshibka-08.webp', 'Артем Петрович рассказывает, как экспонат привлекает посетителей в режиме ожидания', 'Смотреть разбор: режим ожидания, 0:20'),
  'instructions': ('Посетителю должно быть понятно, что можно сделать с экспонатом, без длинной инструкции. В коротком видео разбираем, чем полезная подсказка отличается от объяснений, которыми пытаются исправить сложный интерфейс.', 'Video/errors/oshibka-09.mp4', 'fresh/media/oshibka-09.webp', 'Артем Петрович объясняет, почему интерфейс должен быть понятен без длинной инструкции', 'Смотреть разбор: интерфейс без инструкции, 0:22'),
  'sound': ('Звук помогает почувствовать ритм и настроение ролика. В коротком видео рассказываем, почему в видео и мэппинге ему стоит уделять столько же внимания, сколько изображению.', 'Video/errors/oshibka-10.mp4', 'fresh/media/oshibka-10.webp', 'Артем Петрович рассказывает о роли звука в видео, мэппинге и интерактиве', 'Смотреть разбор: роль звука, 0:22'),
}
# Тексты — в site/texts/tags.md: их правят там, без кода.
# Здесь только устройство страниц: какие полные (открыты для поиска, с ценами и вопросами) и какая вставка из «10 ошибок».
FULL = {'museums': 'internet', 'exhibitions': 'idle', 'stand-builders': 'reset', 'interactive': 'touch', 'mapping': 'sound', 'video': 'sound', 'industry': 'games', 'regions': 'instructions', 'developers': 'simple', 'events': None, 'event-graphics': None, 'film': None, 'websites': None, 'product-design': None}

TEXTS_MD = os.path.join(SITE, 'texts', 'tags.md')
TEXT = {}
for block in re.split(r'^## ', open(TEXTS_MD, encoding='utf-8').read(), flags=re.M)[1:]:
    slug = block.split()[0]
    f = dict(re.findall(r'^([^:\n]+):[ \t]*(.+?)[ \t]*$', block, flags=re.M))
    cards = {}
    for work_id, label, value in re.findall(r'^Карточка ([\w-]+), (Название|Описание|Подпись):[ \t]*(.+)$', block, flags=re.M):
        field = {'Название': 'title', 'Описание': 'desc', 'Подпись': 'meta'}[label]
        cards.setdefault(work_id, {})[field] = value.strip() if label == 'Описание' else typo(value.strip())
    questions = re.findall(r'^Вопрос:[ \t]*(.+)\nОтвет:[ \t]*(.+)$', block, flags=re.M)
    cta_fields = ('Текст обращения', 'Обращение строка 1', 'Обращение строка 2')
    cta_text = tuple(typo(f[key]) for key in cta_fields) if all(key in f for key in cta_fields) else None
    TEXT[slug] = dict(h1=typo(f['Заголовок']), lead=typo(f['Подзаголовок']), title=f.get('Вкладка') or f['Заголовок'],
                      full=slug in FULL, plate=FULL.get(slug), cards=cards, cta_text=cta_text,
                      scope=typo(f['Что берем на себя']) if f.get('Что берем на себя') else '',
                      plate_body=typo(f['Из опыта']) if f.get('Из опыта') else '',
                      prices=f.get('Цены') != 'нет',
                      cost=typo(f['Стоимость']) if f.get('Стоимость') else '',
                      cost_url=f.get('Ссылка на цены', '').strip(),
                      cost_link_label=typo(f.get('Текст ссылки на цены', 'Цены и услуги')),
                      selection=[s.strip() for s in f['Работы'].split(',')] if f.get('Работы') else None,
                      faq=[(typo(q), typo(a)) for q, a in questions],
                      siblings=[s.strip() for s in f['Смотрите также'].split(',')] if f.get('Смотрите также') else None)

# Подборки про видео, графику и сайты: внизу «Давайте обсудим задачу», а не «сделаем экспонат»
MEDIA = {'video', 'mapping', 'event-graphics', 'websites', 'product-design', 'film', 'events'}

def plural(n, one, few, many):
    return one if n % 10 == 1 and n % 100 != 11 else few if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else many

def build(slug):
    tx = TEXT[slug]
    p = Page(B='../../', W='../', cur=slug, cta='museum' if slug == 'museums' else 'media' if slug in MEDIA else None,
             cta_text=tx['cta_text'])
    B, W = p.B, p.W
    group_what = slug in dict(WHAT)
    items = [w for w in VISIBLE if slug in w['what'] + w['who']]
    # Сначала экспонаты крупных проектов (по порядку проектов), потом отдельные работы — новые выше
    order = {pid: k for k, pid in enumerate(PROJECTS)}
    items.sort(key=lambda w: (0, order[w['project']]) if w.get('project') else (1,) + work_order(w))

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

    # Явная подборка задает и состав, и порядок. Опечатки не пропускаем молча.
    if tx['selection'] is not None:
        by_id = {e['id']: e for e in entries}
        if slug == 'video':
            by_id['khersones'] = dict(PROJECTS['khersones'], kind='Видео для музея',
                                      img='fresh/media/mercury-tile.webp', preview='fresh/media/mercury-preview.mp4')
        selected = tx['selection']
        if len(selected) != len(set(selected)):
            raise ValueError(f'{slug}: повтор работы в подборке')
        missing = [work_id for work_id in selected if work_id not in by_id]
        if missing:
            raise ValueError(f'{slug}: работы нет в подборке тега: {", ".join(missing)}')
        # Подборка первой, за ней остальные отдельные работы тега (экспонаты крупных проектов только по подборке)
        entries = [by_id[work_id] for work_id in selected] + [e for e in entries if e['id'] not in selected and not e.get('project') and e['id'] not in PROJECTS]
    assert [e['id'] for e in entries] == tag_card_ids(slug), slug

    # Локальные подписи подборки не меняют исходную работу и другие страницы.
    entries = [dict(e, **tx['cards'].get(e['id'], {})) for e in entries]
    n = len(items)
    scope = ''
    if tx['scope']:
        scope = f'''    <section class="sect landing-scope">
      <h2 class="sect__label reveal">Что берем на себя</h2>
      <p class="sect__body about__desc reveal">{tx['scope']}</p>
    </section>
'''
        if slug == 'video':
            scope = scope.replace('</p>', f' <a class="text-link" href="{W}museums/#museum-video" '
                                  f'data-peek="{B}fresh/media/mercury-tile.webp" data-peek-video="{B}fresh/media/mercury-preview.mp4">'
                                  'Посмотреть видео для музейной экспозиции →</a></p>', 1)
    plate = ''
    if tx.get('plate'):
        body, video, poster, alt, aria = PLATES[tx['plate']]
        body = tx['plate_body'] or body
        plate = p.plate('Из&nbsp;опыта на&nbsp;площадках', body, video, poster, alt, aria, cls='plate plate--page')
    prices = ''
    if tx.get('full') and tx['prices'] and slug not in ('mapping', 'video', 'film'):
        m = re.search(r'    <section class="sect prices" id="prices">.*?</ul>\n', home, flags=re.S).group(0)
        prices = m + '      </div>\n    </section>\n'
    cost = ''
    if tx['cost']:
        cost_link = ''
        if tx['cost_url']:
            url = tx['cost_url']
            if not re.fullmatch(r'[a-z0-9][a-z0-9/-]*/', url) or not os.path.isfile(os.path.join(SITE, url, 'index.html')):
                raise ValueError(f'{slug}: ссылка на цены должна вести на готовую локальную страницу: {url}')
            cost_link = f'        <a class="sect__link reveal" href="{B}{url}">{tx["cost_link_label"]}</a>\n'
        cost = f'''    <section class="sect landing-scope landing-cost" id="cost">
      <h2 class="sect__label reveal">Стоимость проекта</h2>
      <div class="sect__body">
        <p class="about__desc reveal">{tx['cost']}</p>
{cost_link}      </div>
    </section>
'''
    faq = p.faq() if tx.get('full') and slug not in ('mapping', 'video', 'film') else ''
    if tx['faq']:
        faq = p.faq(tx['faq'])
    siblings = [k for k, _ in (WHAT if group_what else WHO) if k != slug] + [k for k, _ in (WHO if group_what else WHAT)][:3]
    if tx['siblings'] is not None:
        siblings = tx['siblings']

    museum_film = ''
    if slug == 'museums':
        with open(os.path.join(SITE, '_src/museum-video.html'), encoding='utf-8') as source:
            museum_film = source.read()
    # Музеи: крупно оба больших проекта (Херсонес и Хакасия), остальное маленькими карточками
    big = {0, 1} if slug == 'museums' else None
    works = p.works_mix(entries, after_first=museum_film, big=big)
    if slug == 'interactive':
        # Сохраняем крупные карточки и старые якоря посадочной.
        anchors = {'stol': 'khakasia', 'skanery': 'scanner'}
        for entry in entries:
            if entry['id'] == 'skanery':
                entry['href'] = PROJECTS[entry['project']]['href']
        cards = ''.join(p.big_card(e, anchor=anchors.get(e['id'], e['id'])) for e in entries)
        works = f'    <section class="works-mix">\n      <h2 class="sr-only">Примеры интерактивных экспонатов</h2>\n{cards}    </section>\n'

    # Мягкий перенос остается только в заголовке, метаданные сохраняют цельное слово.
    heading = tx['h1'].replace('промышленных', 'промыш&shy;ленных') if slug == 'industry' else tx['h1']
    if slug == 'events':
        heading = heading.replace('для&nbsp;', 'для ')  # Перенос перед длинным словом на узком телефоне.

    main = f'''<main>
{p.landing_nav()}
    <section class="about">
      <p class="about__label reveal">Студия братьев<br class="about__br"> Пе́трович</p>
      <h1 class="about__text reveal">{heading}</h1>
      <p class="about__desc reveal">{tx['lead']}</p>
    </section>

{works}{scope}{plate}{prices}{cost}{faq}{p.seealso(siblings)}
'''
    t = home
    t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_switch(), p.ctx_tags()), t, count=1, flags=re.S)
    t, k = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)', lambda m: main + m.group(1), t, count=1, flags=re.S); assert k
    title = tx.get('title') or re.sub(r'&nbsp;', ' ', tx['h1'])
    t = re.sub(r'<title>.*?</title>', f'<title>{title} | студия братьев Пе́трович</title>', t, count=1)
    desc = re.sub(r'<[^>]+>', '', re.sub(r'&nbsp;', ' ', tx['lead']))
    t = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', t, count=1)
    t = t.replace('https://petrovichbrothers.ru/"', f'https://petrovichbrothers.ru/works/{slug}/"')
    t = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', t)
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '': return m.group(0)
        return f'{attr}="{B}{val}"'
    t = re.sub(r'\b(href|src|poster|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|srcset)="([^"]*)"', fix, t)
    t = t.replace(f'href="{B}./"', f'href="{B}"')
    t = p.finish(t)
    if tx['full']:
        shared = slug not in ('museums', 'exhibitions')
        page_class = f'page-v2 page-{slug}' + (' page-landing' if shared else '')
        sheet = 'landings' if shared else slug
        sheet_version = {'video': 4, 'museums': 8}.get(slug, 3 if shared else 1)
        t = t.replace('class="page-v2"', f'class="{page_class}"', 1)
        t = t.replace('</head>', f'  <link rel="stylesheet" href="{B}fresh/{sheet}.css?v={sheet_version}">\n</head>', 1)
        page_title = title + ' | студия братьев Пе́трович'
        t = re.sub(r'<title>.*?</title>', f'<title>{html.escape(page_title)}</title>', t, count=1)
        for prop, value in [('og:title', page_title), ('og:description', html.unescape(desc))]:
            t = re.sub(r'<meta property="' + prop + r'" content="[^"]*">',
                       f'<meta property="{prop}" content="{html.escape(value)}">', t, count=1)
    os.makedirs(f'works/{slug}', exist_ok=True)
    open(f'works/{slug}/index.html', 'w', encoding='utf-8', newline='').write(t)
    return n

def main(requested=None):
    available = [k for k, _ in WHAT + WHO]
    slugs = requested or [k for k in available if k != 'interactive']
    unknown = [s for s in slugs if s not in available]
    if unknown:
        raise SystemExit('Неизвестная страница тега: ' + ', '.join(unknown))
    for slug in slugs:
        print(slug, build(slug), 'полная' if TEXT[slug].get('full') else 'простая')


if __name__ == '__main__':
    main(sys.argv[1:])
