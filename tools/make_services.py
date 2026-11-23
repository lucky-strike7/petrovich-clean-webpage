"""Build the services page."""
from pathlib import Path

from make_info_page import build_info_page
from v2parts import DATA, SITE, Page, typo

root = Path(SITE)
page = Page(B='../', W='../works/', nav_page='services', cta_text=tuple(map(typo, (
    'Напишите, что хотите показать, где и к какой дате. Если уже есть концепция, сценарий или план площадки, пришлите их. Вместе определим, с чего начать.',
    'Обсудим',
    'ваш проект',
))))
projects = {item['id']: item for item in DATA['projects']}
tiles = ''.join(page.tile(dict(projects[slug], meta=typo(projects[slug]['where'])))
                for slug in ('khersones', 'khakasia'))
body = (root / '_src/services-content.html').read_text(encoding='utf-8')
body = body.replace('{{project_tiles}}', tiles.rstrip())
build_info_page(
    page, 'services', body,
    'Мультимедиа для музеев и выставок | Услуги студии братьев Петрович',
    'Концепция, интерактивные экспонаты, видео и 3D-графика для музеев, выставочных стендов и мероприятий. Услуги и примеры работ.',
)
