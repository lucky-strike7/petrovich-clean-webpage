# Кружок с картинкой или видеопетлей у ссылок в тексте (класс text-link), которые ведут на работу, проект или тег.
# Если у ссылки уже есть data-peek, ее не трогаем. Видео берем, если оно есть, иначе только картинку.
import glob, os, posixpath, re, sys
from v2parts import DATA, PEEK, SITE

sys.stdout.reconfigure(encoding='utf-8')

MEDIA = {}  # путь страницы от корня сайта ('works/etalon/') -> (картинка, видео)
for slug, (img, vid) in PEEK.items():
    MEDIA[f'works/{slug}/'] = (img, vid)
for entry in DATA['projects'] + DATA['items']:
    href = entry.get('href') or ''
    if '#' in href or not entry.get('img'):
        continue
    MEDIA.setdefault(href, (entry['img'], entry.get('preview')))


def page_url(path):
    rel = os.path.relpath(path, SITE).replace(os.sep, '/')
    return rel[:-len('index.html')] if rel.endswith('index.html') else rel


def add(path):
    html = open(path, encoding='utf-8').read()
    here = posixpath.dirname(page_url(path).rstrip('/') + '/x')
    prefix = posixpath.relpath('.', here) + '/' if here else ''

    def fix(m):
        tag = m.group(0)
        if 'data-peek' in tag or 'text-link' not in (re.search(r'class="([^"]*)"', tag) or [None, ''])[1]:
            return tag
        href = re.search(r'href="([^"#]*)"', tag)
        if not href or href.group(1).startswith(('http', 'mailto:', 'tel:')):
            return tag
        target = posixpath.normpath(posixpath.join(here, href.group(1))) + '/'
        if target not in MEDIA:
            return tag
        img, vid = MEDIA[target]
        extra = f' data-peek="{prefix}{img}"' + (f' data-peek-video="{prefix}{vid}"' if vid else '')
        return tag[:-1] + extra + '>'

    new = re.sub(r'<a\b[^>]*>', fix, html)
    if new != html:
        open(path, 'w', encoding='utf-8').write(new)
        return new.count('data-peek') - html.count('data-peek')
    return 0


pages = [os.path.join(SITE, p) for p in ('index.html', 'about/index.html', 'services/index.html', 'prices/index.html')]
pages += glob.glob(os.path.join(SITE, 'works', '**', 'index.html'), recursive=True)
total = sum(add(p) for p in pages if os.path.exists(p))
print(f'кружки добавлены у {total} ссылок')
