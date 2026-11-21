"""Assemble the homepage from the shared case cards and contact shell."""
import re
from pathlib import Path

from v2parts import DATA, SITE, VISIBLE


CTA = ('Расскажите, что за площадка, что хотите показать и к какому сроку. Если пока есть только идея, с неё и начнём.',
       '<span class="acc">Обсудим</span>', 'ваш проект')

FEATURED = (
    ('strana-sveta', 'strana-sveta', 'Мэппинг на фасаде', '«Устьянские легенды» на Дворцовой площади в Петербурге.'),
    ('shturval', 'shturval', 'Корабельный симулятор', 'Посетитель ведёт парусник настоящим штурвалом в зале Черноморского флота музея «Новый Херсонес».'),
    ('stol', 'khakasia', 'Интерактивный стол', 'Поворачиваешь столешницу, выбираешь место на карте — и на экране начинается ролик. Стенд Республики Хакасия на выставке «Россия» на ВДНХ.'),
)


def render_home(shell, page):
    body = (Path(SITE) / '_src/home-content.html').read_text(encoding='utf-8')
    works = {work['id']: work for work in VISIBLE}
    cards = []
    for slug, anchor, kind, description in FEATURED:
        work = dict(works[slug], kind=kind, desc=description)
        cards.append(page.big_card(work, anchor=anchor, meta=False, link_title=True))
    prices = re.search(r'    <section class="sect prices".*?</section>', shell, flags=re.S)[0]
    body = body.replace('<!-- featured works -->', ''.join(cards)).replace('<!-- prices -->', prices)
    # The homepage introduces whole projects, including examples linked in the price list.
    projects = {project['id']: project['href'] for project in DATA['projects']}
    for work in VISIBLE:
        if work.get('project') and work.get('href'):
            body = body.replace(f'href="{work["href"]}"', f'href="{projects[work["project"]]}"')
    shell = re.sub(r'(<main>).*?(    <section class="contact" id="contact">)',
                   lambda m: m[1] + '\n' + body + '\n' + m[2], shell, count=1, flags=re.S)
    title = 'Мультимедиа-студия братьев Петрович — видео, мэппинг и интерактивные экспонаты'
    description = 'Делаем видео, мэппинг и интерактивные экспонаты для музеев, выставок и событий. Придумываем концепцию или работаем по готовой. Москва, работаем по всей России.'
    shell = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', shell, count=1)
    for attr, value in [('name="description"', description), ('property="og:title"', title), ('property="og:description"', description)]:
        shell = re.sub(r'(<meta ' + attr + r' content=")[^"]*', lambda m: m[1] + value, shell, count=1)
    first = works[FEATURED[0][0]]
    for old, new in [('khakasy-render-m.webp', first['img_m']), ('khakasy-render.webp', first['big_img'])]:
        shell = shell.replace(f'as="image" href="fresh/media/{old}"', f'as="image" href="{new}"')
    return shell.replace('</head>', '  <link rel="stylesheet" href="fresh/home-page.css">\n</head>', 1)
