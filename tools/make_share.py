# Превью ссылок (Telegram, WhatsApp, ВКонтакте): своя картинка, заголовок и описание у каждой страницы.
# Запускается последним в build_pages.py и правит уже собранные страницы.
#  - картинка: первая картинка страницы после <main>, обрезанная до 1200×630 (поменяли порядок работ — поменялась и обложка);
#    у главной — логотип на сером фоне (fresh/media/og/home.jpg, делается отдельно, здесь не пересобирается);
#  - заголовок: без приписки «| студия братьев Пе́трович» (Telegram сам пишет название сайта над заголовком);
#  - описание: то же, что для поисковиков.
import os, re, html, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, WHAT, WHO

os.chdir(SITE)
URL = 'https://petrovichbrothers.ru/'
OUT = 'fresh/media/og'
os.makedirs(OUT, exist_ok=True)

# Заголовки превью там, где заголовок страницы не годится
TITLES = {
    'index.html': 'Интерактивные экспонаты, видео и мэппинг для музеев, выставок и событий',
    'works/index.html': 'Работы студии: экспонаты, видео, мэппинг, сайты',
    'works/khakasia/index.html': 'Стенд Республики Хакасия на выставке «Россия», ВДНХ',
    'works/khersones/index.html': 'Зал Черноморского флота в музее «Новый Херсонес»',
    'services/index.html': 'Услуги: мультимедиа для музеев и выставок',
    'prices/index.html': 'Цены на мультимедиа для музеев и выставок',
    'about/index.html': 'О студии: команда, подход и проекты',
}
# Порядок важен: картинки не повторяются, и страница выше в списке забирает свою первую картинку раньше.
# Поэтому сначала проекты и главные теги, в конце общие страницы.
FIRST = ['khersones', 'khakasia', 'museums', 'interactive', 'mapping', 'film', 'video', 'websites', 'product-design',
         'developers', 'event-graphics', 'exhibitions', 'stand-builders', 'industry', 'events', 'regions']
TAGS = [k for k, _ in WHAT + WHO]
PAGES = (['index.html', 'about/index.html']
         + [f'works/{k}/index.html' for k in FIRST + [k for k in TAGS if k not in FIRST]]
         + ['works/index.html', 'services/index.html', 'prices/index.html'])
used = set()

def meta(t, prop, value, attr='property'):
    t, n = re.subn(rf'<meta {attr}="{re.escape(prop)}" content="[^"]*">',
                   f'<meta {attr}="{prop}" content="{html.escape(value)}">', t, count=1)
    assert n, prop
    return t

def first_image(page, t):
    body = t[t.find('<main'):]
    for m in re.finditer(r'\b(?:data-poster|poster|src)="([^"?]+\.(?:webp|jpe?g|png))(?:\?[^"]*)?"', body):
        path = os.path.normpath(os.path.join(os.path.dirname(page), m.group(1)))
        same = re.sub(r'-m(?=\.\w+$)', '', path)  # телефонная версия — та же картинка
        if os.path.exists(path) and 'logo' not in path and same not in used:
            used.add(same)
            return path
    # Все картинки страницы уже заняты — берем первую, пусть повторится
    for m in re.finditer(r'\b(?:data-poster|poster|src)="([^"?]+\.(?:webp|jpe?g|png))(?:\?[^"]*)?"', body):
        path = os.path.normpath(os.path.join(os.path.dirname(page), m.group(1)))
        if os.path.exists(path) and 'logo' not in path:
            return path
    raise SystemExit(f'нет картинки для превью: {page}')

for page in PAGES:
    t = open(page, encoding='utf-8').read()
    key = 'home' if page == 'index.html' else page.split('/')[-2]
    out = f'{OUT}/{key}.jpg'
    if key != 'home':
        src = first_image(page, t)
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf',
                            'scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630',
                            '-q:v', '3', out], check=True)
    title = TITLES.get(page) or re.search(r'<title>([^<]*)</title>', t).group(1)
    title = html.unescape(re.sub(r'\s*\|\s*студия братьев Пе́?трович$', '', title))
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)">', t).group(1))
    t = meta(t, 'og:title', title)
    t = meta(t, 'og:description', desc)
    t = meta(t, 'og:image', URL + out)
    t = meta(t, 'og:image:alt', 'Логотип студии братьев Пе́трович' if key == 'home' else title)
    open(page, 'w', encoding='utf-8', newline='').write(t)
print('ok', len(PAGES))
