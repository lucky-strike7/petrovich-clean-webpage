# Новая шапка на страницах старого дизайна: главная и кейсы. Кейсы живут по адресам /works/<slug>/,
# их картинки и видео остаются в cases/<slug>/media/ (старые адреса /cases/<slug>/ перенаправляет сервер).
# Содержание не меняем. Исходники в старом виде лежат в site/_src/ (сервер эту папку не отдает):
# из них же собираются страницы /works/ (главная — шаблон), поэтому живые страницы можно пересобирать сколько угодно.
import os, re, sys, glob, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, V2CSS, V2JS

from homepage import CTA as HOME_CTA, render_home

os.chdir(SITE)
pages = ['index.html'] + sorted(glob.glob('cases/*/index.html'))
# Кейсы, у которых уже своя страница в новой структуре (собираются отдельными скриптами)
OWN_PAGE = {'hbo', 'khakasia'}
CASES = [os.path.basename(os.path.dirname(f)) for f in sorted(glob.glob('_src/cases/*/index.html'))]
CASES = [s for s in CASES if s not in OWN_PAGE]

# Первый запуск: сохраняем старые страницы как исходники
for f in pages:
    src = os.path.join('_src', f)
    if not os.path.exists(src):
        t = open(f, encoding='utf-8').read()
        assert 'top--v2' not in t, f'{f} уже с новой шапкой, а исходника нет'
        os.makedirs(os.path.dirname(src) or '_src', exist_ok=True)
        shutil.copyfile(f, src)

# Кейсы про видео, графику, сайты и продукт: внизу «Давайте обсудим задачу»
MEDIA_CASES = {'hbo', 'rosatom', 'premiarb', 'yantarny', 'nanolek', 'zebralog', 'artmonta', 'cyberbug', 'carrera'}

def build(f):
    t = open(os.path.join('_src', f), encoding='utf-8').read()
    home = f == 'index.html'
    slug = f.replace(os.sep, '/').split('/')[1] if not home else ''
    p = Page(B='' if home else '../../', W='works/' if home else '../../works/', cta='media' if slug in MEDIA_CASES else None,
             cta_text=HOME_CTA if home else None)
    header = p.header()
    if home:  # на главной «Работы» не текущий раздел
        header = header.replace('<a class="is-on" href=', '<a href=', 1).replace('class="top__logo" href=""', 'class="top__logo" href="./"', 1)
    t, n = re.subn(r'<header class="top">.*?</header>', lambda m: header, t, count=1, flags=re.S); assert n, f
    if home:
        t = render_home(t, p)
    if not home:
        # Кнопка «← Все проекты» на телефоне ведет к «Работам» (у кнопки бывают и другие атрибуты, например data-back)
        t = re.sub(r'(<a class="case-fab case-fab--back" href=")[^"]*("[^>]*>.*?)Все проекты', rf'\g<1>{p.W}\g<2>Все работы', t, count=1, flags=re.S)
        t = re.sub(r'(<a class="badge badge--back" href=")[^"]*(".*?)Все проекты', rf'\g<1>{p.W}\g<2>Все работы', t, count=1, flags=re.S)
    if home:  # кейсы переехали в «Работы»
        t = t.replace('href="cases/hbo/"', 'href="works/hbo/"')
        t = re.sub(r'href="cases/([a-z]+)/"', r'href="works/\1/"', t)
    else:
        # Страница лежит в works/<slug>/, а картинки и видео — в cases/<slug>/media/
        med = f'../../cases/{slug}/media/'
        t = re.sub(r'\b((?:src|href|poster|data-src|data-poster|data-video)=")media/', lambda m: m.group(1) + med, t)
        t = re.sub(r'\b(srcset=")([^"]*)"', lambda m: m.group(1) + re.sub(r'(^|,\s*)media/', lambda k: k.group(1) + med, m.group(2)) + '"', t)
        t = t.replace(f'https://petrovichbrothers.ru/cases/{slug}/"', f'https://petrovichbrothers.ru/works/{slug}/"')  # только адрес страницы, картинки для соцсетей остаются в cases/
    t = p.finish(t)
    if home:
        t = t.replace('<a href="works/" aria-current="page">Все работы</a>', '<a href="works/">Все работы</a>', 1)
    return t

open('index.html', 'w', encoding='utf-8', newline='').write(build('index.html'))
for slug in CASES:
    os.makedirs(f'works/{slug}', exist_ok=True)
    open(f'works/{slug}/index.html', 'w', encoding='utf-8', newline='').write(build(f'cases/{slug}/index.html'))

# 404: своя страница без общих скриптов (адреса от корня через <base href="/">).
# Шапка как везде; «Контакты» ведут к контактам на главной; меню на телефоне — шторкой.
def build_404():
    t = open('_src/404.html', encoding='utf-8').read()
    p = Page(B='', W='works/')
    header = (p.header().replace('<a class="is-on" href=', '<a href=', 1)
              .replace('class="top__logo" href=""', 'class="top__logo" href="./"', 1)
              .replace('href="#contact" data-panel', 'href="./#contact"'))
    t, n = re.subn(r'<header class="top top--doc">.*?</header>', lambda m: header, t, count=1, flags=re.S); assert n
    t = t.replace('<body class="doc-page">', '<body class="doc-page page-v2">', 1)
    t, n = re.subn(r'(<link rel="stylesheet" href="fresh/fresh\.css\?v=\w+">)', lambda m: m.group(1) + f'\n  <link rel="stylesheet" href="fresh/{V2CSS}">', t, count=1); assert n
    t = re.sub(r'<p class="nf__text">.*?</p>', '<p class="nf__text">Возможно, ссылка устарела: мы&nbsp;обновили сайт. Все работы собраны в&nbsp;разделе «Работы».</p>', t, count=1, flags=re.S)
    t = re.sub(r'<div class="nf__links">.*?</div>', '<div class="nf__links">\n      <a class="nf__btn" href="works/">Все работы</a>\n      <a class="sect__link" href="./">На&nbsp;главную</a>\n    </div>', t, count=1, flags=re.S)
    sheet = p.msheet().replace('<a href="works/" aria-current="page">Все работы</a>', '<a href="works/">Все работы</a>').replace('href="#contact"', 'href="./#contact"')
    t = t.replace('</body>', sheet + f'  <script src="fresh/{V2JS}"></script>\n</body>', 1)
    open('404.html', 'w', encoding='utf-8', newline='').write(t)

build_404()
print('ok', len(CASES) + 2)
