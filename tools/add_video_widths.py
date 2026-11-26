# Обзоры в нескольких размерах: у каждой кнопки обзора data-video="Video/x.mp4" — если рядом лежат x-720.mp4, x-1280.mp4, x-1920.mp4,
# добавляем data-video-widths="<ширина основного> <другие>". По нему fresh.js выбирает файл под ширину окна (см. STRUCTURE.md, «Медиа»).
# Идет после всех сборщиков страниц: data-video ставят разные сборщики и шаблоны, а дописать атрибут проще в готовом HTML.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, video_widths

SKIP = {'node_modules', 'dist', 'archive-v1', 'archive-media', 'v1', '_src', 'tools', 'scripts', 'server', 'tests'}
cache, changed = {}, 0
for root, dirs, files in os.walk(SITE):
    dirs[:] = [d for d in dirs if d not in SKIP]
    for name in files:
        if not name.endswith('.html'): continue
        path = os.path.join(root, name)
        t = open(path, encoding='utf-8').read()
        def add(m):
            val = m.group(1)
            rel = os.path.relpath(os.path.normpath(os.path.join(root, val.split('?')[0])), SITE).replace(os.sep, '/')
            if rel not in cache: cache[rel] = video_widths(rel).replace('data-widths', 'data-video-widths')
            return f'data-video="{val}"' + cache[rel]
        # уже стоящий атрибут пересчитываем: набор размеров мог измениться
        new = re.sub(r'data-video="([^"]+\.mp4)"(?: data-video-widths="[^"]*")?', add, t)
        if new != t:
            open(path, 'w', encoding='utf-8', newline='').write(new); changed += 1
print('pages', changed, 'videos with sizes', sum(1 for v in cache.values() if v))
