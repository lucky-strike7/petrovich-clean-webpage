# Пересобрать все страницы сайта из исходников: python tools/build_pages.py
# Порядок важен только для удобства чтения вывода: каждый сборщик читает исходники сам и пишет свои страницы.
import os, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = [
    ('make_shell.py', 'главная, старые кейсы, 404 — новая шапка поверх _src/'),
    ('make_services.py', '/services/ — услуги'),
    ('make_prices.py', '/prices/ — цены'),
    ('make_about.py', '/about/ — студия'),
    ('make_works.py', '/works/ — «Работы, которыми мы гордимся»'),
    ('make_tags.py', '/works/<тег>/ — страницы тегов'),
    ('make_landing.py', '/works/interactive/ — посадочная «Интерактивные экспонаты»'),
    ('make_project_khakasia.py', '/works/khakasia/ — проект «Стенд Республики Хакасия»'),
    ('make_stol.py', '/works/khakasia/stol/ — экспонат «Интерактивный стол»'),
    ('make_case_strana.py', '/works/strana-sveta/ — кейс «Устьянские легенды»'),
    ('make_case_hbo.py', '/works/hbo/ — кейс «Игры Уолл-стрит»'),
    ('make_project_khersones.py', '/works/khersones/ — проект «Зал Черноморского флота»'),
    ('add_peeks.py', 'кружки с видеопетлей у ссылок на работы в тексте'),
    ('add_video_widths.py', 'обзоры в нескольких размерах: data-video-widths у кнопок обзора'),
    ('make_share.py', 'превью ссылок: картинка, заголовок, описание (последним)'),
]
env = dict(os.environ, PYTHONIOENCODING='utf-8')
failed = False
for script, what in STEPS:
    r = subprocess.run([sys.executable, os.path.join(HERE, script)], capture_output=True, text=True, encoding='utf-8', env=env)
    ok = r.returncode == 0
    failed |= not ok
    print(('ok   ' if ok else 'FAIL ') + f'{script:28} {what}')
    if not ok: print(r.stderr.strip())
if failed:
    sys.exit(1)
subprocess.run(['node', os.path.join(HERE, '..', 'scripts', 'typography.mjs')], check=True)
