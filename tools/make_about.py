"""Build the studio page."""
from pathlib import Path

from make_info_page import build_info_page
from v2parts import SITE, Page, typo

page = Page(B='../', W='../works/', nav_page='about', cta_text=tuple(map(typo, (
    'Расскажите, что хотите показать и когда открытие. Если есть план, сценарий или референсы, пришлите их.',
    'Давайте обсудим',
    'вашу идею',
))))
body = (Path(SITE) / '_src/about-content.html').read_text(encoding='utf-8')
build_info_page(
    page, 'about', body,
    'О студии братьев Петрович | Команда, подход и проекты',
    'Артем и Арсений Петровичи. Как студия придумывает, проектирует и запускает мультимедиа для музеев и выставок. Проекты, публикации и награды.',
)
