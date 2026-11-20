# Общие куски новых страниц (ветка structure-v2): шапка с меню «Работы», шторка на телефоне,
# кружок «Контакты», вставка «Из опыта на площадках», «Смотрите также», частые вопросы, пути.
import re, os
NL = chr(10)

# Корень сайта — папка над tools/ (сборщики лежат в репозитории рядом со страницами)
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2CSS = 'v2.css?v=91'
V2JS = 'v2.js?v=27'
# Страницы «Услуги», «Цены», «О студии» еще не сделаны: пока False, их нет в меню и на них нет ссылок.
# Когда страницы появятся — True и пересобрать все.
PAGES_READY = False

import json, os, html
DATA = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'works.json'), encoding='utf-8'))
WHAT = [tuple(x) for x in DATA['tags']['what']]
WHO = [tuple(x[:2]) for x in DATA['tags']['who']]
# «Кому» — дательный падеж для мест, где нет подписи «Для кого» (строка тегов на «Работах»)
DAT = {x[0]: x[2] for x in DATA['tags']['who']}
NAME = dict(WHAT + WHO)

def typo(text):
    """Неразрывный пробел после коротких слов, слова через дефис не разрываются по строкам."""
    text = html.escape(text, quote=False)
    text = re.sub(r'(?<![\w-])(«?[а-яА-Яy]{1,3}) (?=\S)', r'\1&nbsp;', text)
    return re.sub(r'(?<![\w«-])(«?[\w«]+(?:-[\w»]+)+»?)', r'<span class="nowrap">\1</span>', text)

def video_len(path):
    """Длительность ролика «м:сс» для кнопки обзора."""
    import subprocess
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(SITE, path)], capture_output=True, text=True).stdout)
    return f'{int(d // 60)}:{int(round(d % 60)):02d}'

# Работы — из site/texts/works.md (правится без кода). Теги и проекты пока в works.json.
WORKS_MD = os.path.join(SITE, 'texts', 'works.md')
_FIELDS = {'Название': 'title', 'Проект': 'project', 'Что это': 'kind', 'Год': 'year', 'Что делаем': 'what', 'Для кого': 'who',
           'Описание': 'desc', 'Где и когда': 'where', 'Картинка': 'img', 'Превью': 'preview', 'Крупное видео': 'big',
           'Крупное видео, телефон': 'big_m', 'Ссылка': 'href', 'Обзор': 'video', 'Скрыть': 'hidden',
           'Награда': 'award', 'Фон': 'dark', 'Картинка, телефон': 'img_m', 'Обложка крупной': 'big_img'}
def _load_works():
    items = []
    for block in re.split(r'^## ', open(WORKS_MD, encoding='utf-8').read(), flags=re.M)[1:]:
        lines = block.splitlines()
        w = {'id': lines[0].strip(), 'what': [], 'who': []}
        for ln in lines[1:]:
            m = re.match(r'^([^:]+?):\s*(.*?)\s*$', ln)
            if not m or m.group(1) not in _FIELDS or not m.group(2): continue
            k, v = _FIELDS[m.group(1)], m.group(2)
            if k in ('what', 'who'): v = [x.strip() for x in v.split(',') if x.strip()]
            elif k == 'year': v = int(v)
            elif k == 'hidden': v = v.lower() in ('да', 'yes', '1')
            elif k == 'dark': v = v.lower().startswith('черн')
            w[k] = v
        items.append(w)
    return items
DATA['items'] = _load_works()
# Число работ под каждым направлением — из файла данных (экспонаты крупных проектов по одному, скрытые не считаем)
VISIBLE = [w for w in DATA['items'] if not w.get('hidden')]
COUNT = {slug: sum(1 for w in VISIBLE if slug in w['what'] + w['who']) for slug, _ in WHAT + WHO}
# Кружок у курсора в меню: кадр и короткий ролик направления
PEEK = {'eksponaty': ('fresh/media/archive/referus.jpg', 'fresh/media/archive/referus-preview.mp4'),
        'video': ('fresh/media/hbo-intro.webp', 'fresh/media/hbo-intro.mp4'),
        'mapping': ('fresh/media/strana-sveta.webp', 'fresh/media/strana-sveta.mp4'),
        'scena': ('fresh/media/archive/premiarb.jpg', 'fresh/media/archive/premiarb-preview.mp4'),
        'sayty': ('fresh/media/archive/zebralog.jpg', 'fresh/media/archive/zebralog-preview.mp4'),
        'dizayn': ('fresh/media/archive/cyberbug.jpg', 'fresh/media/archive/cyberbug-preview.mp4')}

FAQ = [
  ('Сколько стоит экспонат?', 'Ориентир такой: программа для тачскрина от&nbsp;500&nbsp;тыс.&nbsp;₽, интерактивный экспонат с&nbsp;датчиками от&nbsp;900&nbsp;тыс.&nbsp;₽, видеоролик от&nbsp;700&nbsp;тыс.&nbsp;₽. Точная цена зависит от&nbsp;задачи: расскажите, что задумали, и&nbsp;мы посчитаем.'),
  ('Сколько длится работа?', 'Обычно около месяца. Большие проекты, например целый зал, занимают 3–5 месяцев. Если совсем срочно, можем уложиться в&nbsp;две недели.'),
  ('Вы делаете железо или только программу и&nbsp;контент?', 'Железо тоже. Вместе с&nbsp;проверенными подрядчиками делаем корпуса, механику, экраны, датчики и&nbsp;контроллеры. Мы придумываем, как все устроено, подрядчики изготавливают, а&nbsp;на&nbsp;площадке собираем и&nbsp;запускаем сами.'),
  ('Можно по&nbsp;нашей концепции или с&nbsp;нашим архитектором?', 'Да, на&nbsp;больших проектах так чаще всего и&nbsp;бывает. У&nbsp;музея уже есть архитектор и&nbsp;концепция, а&nbsp;мы развиваем ее в&nbsp;экспонатах, сценариях и&nbsp;интерфейсах.'),
  ('А&nbsp;концепцию экспозиции придумаете сами?', 'Конечно. Придумываем и&nbsp;отдельный экспонат, и&nbsp;всю экспозицию: сценарий, маршрут посетителя, что он трогает и&nbsp;что видит.'),
  ('Работаете в&nbsp;регионах?', 'Да, по&nbsp;всей России: от&nbsp;Севастополя до&nbsp;Екатеринбурга. Сами приезжаем на&nbsp;монтаж, запускаем и&nbsp;сопровождаем.'),
  ('Что будет, если экспонат сломается?', 'Приедем и&nbsp;починим. А&nbsp;многое решаем без выезда: настраиваем удаленный доступ, чтобы проверить экспонат и&nbsp;обновить контент, как в&nbsp;музее «Новый Херсонес».'),
  ('Можно экспонат для временной выставки?', 'Да, конечно. Например, игру для «Арнест-Юнирус» мы сделали специально к&nbsp;выставке «Иннопром-2025».'),
  ('Как с&nbsp;договором и&nbsp;НДС?', 'Работаем по&nbsp;договору, без НДС. Если проект идет через закупку, расскажите как, и&nbsp;вместе подберем удобную схему.'),
]

PLAY = '<span class="case-review__play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M5 2.5 13.5 8 5 13.5z"/></svg></span>'


class Page:
    """B — путь от страницы до корня сайта, W — до /works/, cur — тег этой страницы (если это страница тега)."""

    def __init__(self, B, W, cur=None, cta=None):
        # cta — тема призыва внизу страницы: 'museum', 'media' или None (как на главной, про экспонат)
        self.B, self.W, self.cur, self.cta = B, W, cur, cta

    # Призыв в черном блоке контактов: под тему страницы. Заголовок — две строки, во второй кружок с роликом.
    CTA = {
        None: ('Есть проект экспозиции или&nbsp;задача по&nbsp;отдельному экспонату?<br>Пришлите материалы и&nbsp;сроки, обсудим. Даем скидку за&nbsp;срочность',
               'Давайте <span class="acc">сделаем</span>', '<span class="acc">экспонат</span>'),
        'museum': ('Есть план зала или&nbsp;экспозиции?<br>Пришлите его, обсудим, где посетитель сможет взаимодействовать с&nbsp;экспозицией',
                   'Давайте <span class="acc">сделаем</span>', '<span class="acc">экспонат</span>'),
        'media': ('Нужны ролик, графика или&nbsp;сайт?<br>Пришлите задачу и&nbsp;сроки, обсудим',
                  'Давайте <span class="acc">обсудим</span>', '<span class="acc">задачу</span>'),
    }

    def project_photo(self, path, alt, caption=''):
        """Общий кадр проекта (стенд, зал) под заголовком страницы проекта. Появляется, только когда файл лежит на месте:
        положить картинку по адресу path (от корня сайта, ширина 2400 px, webp) и пересобрать."""
        if not os.path.exists(os.path.join(SITE, path)): return ''
        cap = f'\n        <figcaption class="project-photo__cap">{caption}</figcaption>' if caption else ''
        import subprocess  # размеры картинки — чтобы страница не прыгала, пока она грузится
        wh = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', os.path.join(SITE, path)], capture_output=True, text=True).stdout.strip().split(',')
        size = f' width="{wh[0]}" height="{wh[1]}"' if len(wh) == 2 else ''
        return f'''
    <figure class="project-photo reveal">
        <img src="{self.B}{path}" alt="{html.escape(alt)}"{size} loading="lazy">{cap}
    </figure>
'''

    def contact(self, t):
        lead, l1, l2 = self.CTA[self.cta]
        t = re.sub(r'(<p class="contact__lead reveal">).*?(</p>)', lambda m: m.group(1) + lead + m.group(2), t, count=1, flags=re.S)
        t = re.sub(r'(<h2 class="contact__title">\s*<span class="line"><span>).*?(</span></span>\s*<span class="line"><span>).*?( <i class="pill">)',
                   lambda m: m.group(1) + l1 + m.group(2) + l2 + m.group(3), t, count=1, flags=re.S)
        return t

    def tag_href(self, slug):
        return './' if slug == self.cur else f'{self.W}{slug}/'

    def _cur(self, slug):
        return ' aria-current="page"' if slug == self.cur else ''

    def links(self, tags):
        return ''.join(f'<li><a href="{self.tag_href(s)}"{self._cur(s)}>{n}</a></li>' for s, n in tags)

    def mega(self, tags, count=True):
        out = ''
        for s, n in tags:
            sup = ''  # количество работ убрали везде
            pk = ''
            if count and s in PEEK:
                img, vid = PEEK[s]
                pk = f' data-peek="{self.B}{img}" data-peek-video="{self.B}{vid}"'
            out += f'<li><a href="{self.tag_href(s)}"{self._cur(s)}{pk}><span>{n}</span>{sup}</a></li>'
        return out

    def more_links(self, sheet=False):
        """Услуги, Цены, О студии — только когда страницы готовы (PAGES_READY)."""
        if not PAGES_READY: return ''
        B = self.B
        items = [(f'{B}services/', 'Услуги'), (f'{B}prices/', 'Цены'), (f'{B}about/', 'О студии')]
        if sheet: return ''.join(f'<a href="{h}">{n}</a>' for h, n in items)
        return ''.join(f'      <a href="{h}">{n}</a>\n' for h, n in items)

    def prices_link(self):
        return f'        <a class="sect__link reveal" href="{self.B}prices/">Все цены и&nbsp;что входит&nbsp;→</a>\n' if PAGES_READY else ''

    def header(self, sub='', ctx=''):
        """sub — вторая строка шапки на компьютере (путь или переключатель), ctx — подсказка «где ты» в шапке на телефоне.
        Обе появляются, когда свой путь или заголовок на странице уехал вверх."""
        B, W = self.B, self.W
        return f'''<header class="top top--v2">
    <a class="top__logo" href="{B}" aria-label="Студия братьев Пе́трович, на главную">
      <img src="{B}fresh/logo-vertical.svg" alt="Petrovich Brothers" width="244" height="121">
    </a>
    <nav class="top__nav" aria-label="Основное меню">
      <div class="top__dd">
        <a class="is-on" href="{W}">Работы <i aria-hidden="true"></i></a>
        <div class="top__menu mega">
          <div class="mega__what"><ul>{self.mega(WHAT)}</ul></div>
          <div class="mega__who"><h4>Для кого</h4><ul>{self.mega(WHO, count=False)}</ul>
            <a class="mega__all" href="{W}"><span>Все работы</span> →</a></div>
        </div>
      </div>
{self.more_links()}      <a href="#contact" data-panel>Контакты</a>
    </nav>
    {ctx}<button class="top__burger" type="button" aria-expanded="false" aria-controls="msheet" aria-label="Меню"><i></i><i></i><i></i></button>{sub}
  </header>'''

    def msheet(self):
        B, W = self.B, self.W
        return f'''
  <div class="msheet" id="msheet" role="dialog" aria-label="Меню">
    <span class="msheet__grip" aria-hidden="true"></span>
    <button class="msheet__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 3 25 25M25 3 3 25"/></svg></button>
    <div class="msheet__main">
      <a href="{W}" aria-current="page">Работы</a>{self.more_links(sheet=True)}<a href="#contact">Контакты</a>
    </div>
  </div>
  <div class="msheet__shade"></div>
'''

    def switcher(self):
        """«Работы → тег ▾» со списком всех тегов."""
        return f'''<a class="lnav__up" href="{self.W}">Работы</a><span class="lnav__sep" aria-hidden="true">→</span>
      <div class="lnav__dd">
        <button class="lnav__btn" type="button" aria-expanded="false" aria-controls="tsheet" data-phone-only>{NAME.get(self.cur, '')} <i aria-hidden="true"></i></button>
        <div class="lnav__menu">
          <div><h4>Что делаем</h4><ul>{self.links(WHAT)}</ul></div>
          <div><h4>Для кого</h4><ul>{self.links(WHO)}</ul></div>
        </div>
      </div>'''

    def sub_switch(self):
        return f'''
    <div class="top__sub lnav--switch" data-sub-for=".lnav--switch:not(.top__sub)">{self.switcher()}</div>'''

    @staticmethod
    def sub_crumbs(html):
        return f'''
    <div class="top__sub crumbs" data-sub-for=".case-kicker.crumbs, .case-hero__title">{html}</div>'''

    def ctx_tags(self):
        """Телефон: «Интерактивные экспонаты ⌄» в шапке, открывает шторку со всеми тегами."""
        return f'<button class="top__ctx" type="button" data-ctx-for="nav.lnav--switch" aria-controls="tsheet" aria-expanded="false">{NAME.get(self.cur, "")} <i aria-hidden="true"></i></button>' + NL + '    '

    @staticmethod
    def ctx_back(label, href, src):
        """Телефон: «‹ куда вернуться» в шапке."""
        return f'<a class="top__ctx top__ctx--back" href="{href}" data-ctx-for="{src}"><span aria-hidden="true">‹</span> {label}</a>' + NL + '    '

    @staticmethod
    def sheet(sid, label, top_link, sections):
        """Шторка снизу со ссылками: крупная ссылка сверху и группы списков (заголовок, [(href, текст, текущий?)])."""
        groups = ''
        for title, items in sections:
            mark = ' aria-current="page"'
            lis = ''.join(f'<li><a href="{h}"{mark if cur else ""}>{n}</a></li>' for h, n, cur in items)
            groups += (f'<h4>{title}</h4>' if title else '') + f'<ul>{lis}</ul>'
        return f'''
  <div class="msheet tsheet" id="{sid}" role="dialog" aria-label="{label}">
    <span class="msheet__grip" aria-hidden="true"></span>
    <button class="msheet__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 3 25 25M25 3 3 25"/></svg></button>
    {top_link}
    {groups}
  </div>
  <div class="msheet__shade"></div>
'''

    def tsheet(self):
        """Шторка со всеми тегами — из переключателя на телефоне."""
        tags = lambda tt: [(self.tag_href(k), n, k == self.cur) for k, n in tt]
        # Без подписей «Что делаем» и «Для кого»: группы разделены отступом, «для кого» — в дательном падеже
        who = [(self.tag_href(k), DAT[k], k == self.cur) for k, _ in WHO]
        return self.sheet('tsheet', 'Работы по направлениям', f'<a class="tsheet__all" href="{self.W}">Все работы</a>',
                          [('', tags(WHAT)), ('', who)])

    def landing_nav(self):
        """Переключатель наверху страницы тега. Виден тем, кто пришел с нашего сайта."""
        return f'''
    <nav class="lnav lnav--switch" aria-label="Работы по направлениям" hidden>
      {self.switcher()}
    </nav>
'''

    ORB = '''
  <a class="orb" href="#contact" data-panel aria-label="Контакты">
    <svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="orb-c" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0"/></defs>
      <text><textPath href="#orb-c" textLength="230" lengthAdjust="spacing">КОНТАКТЫ · НАПИСАТЬ НАМ · </textPath></text></svg>
    <span class="orb__arrow" aria-hidden="true">→</span>
  </a>
'''

    def plate(self, title, body, video, poster, alt, aria, cls='plate'):
        B = self.B
        return f'''
      <section class="{cls}" aria-labelledby="plate-title">
        <div class="plate__text">
          <h2 class="plate__title reveal" id="plate-title">{title}</h2>
          <p class="plate__body reveal">{body}</p>
        </div>
        <figure class="plate__video reveal">
          <button class="plate__btn" type="button" data-full="{B}{video}" aria-label="{aria}">
            <img src="{B}{poster}" alt="{alt}" width="1280" height="720" loading="lazy">
            {PLAY}
          </button>
        </figure>
      </section>
'''

    # ---------- Работы: плитка в две колонки и крупные карточки «как экспонат» ----------
    @staticmethod
    def big_positions(n):
        """Какие карточки крупно: первая; на длинных страницах (9+) одна в середине;
        последняя, если в плитке ей не осталось пары."""
        big = {0}
        if n - 1 >= 8:
            big.add(1 + 2 * ((n - 1) // 4))  # перед ней четное число плиток — ряды без дыр
        if (n - len(big)) % 2:
            big.add(n - 1)
        return big

    def _media_attrs(self, w):
        """Куда ведет карточка: своя страница — ссылка, иначе открываем видео."""
        if w.get('href'):
            href = self.B + w['href']
            # Ссылка-обложка без текста внутри: имя для экранного диктора и поиска — название работы
            return 'a', f'href="{href}" data-cursor="Посмотреть" aria-label="{html.escape(re.sub("<[^>]+>|&nbsp;", " ", w["title"]))}"', href
        if w.get('video'):
            return 'div', f'data-video="{self.B}{w["video"]}" data-title="{html.escape(w["title"])}" data-cursor="Смотреть видео" role="button" tabindex="0" aria-label="Смотреть видео: {html.escape(w["title"])}"', None
        return 'div', '', None

    def tile(self, w):
        B = self.B
        prev = f' data-preview="{B}{w["preview"]}"' if w.get('preview') else ''
        inner = (f'\n            <span class="work__media"><img src="{B}{w["img"]}" alt="" width="650" height="500" loading="lazy"></span>'
                 f'\n            <span class="work__title">{w["title"]}</span>\n            <span class="work__meta">{w["meta"]}</span>\n          ')
        if w.get('video') and not w.get('href'):
            return f'          <li class="reveal"><button class="work" type="button" data-video="{B}{w["video"]}" data-title="{html.escape(w["title"])}" data-cursor="Смотреть видео"{prev}>{inner}</button></li>\n'
        return f'          <li class="reveal"><a class="work" href="{B}{w["href"]}" data-cursor="Посмотреть"{prev}>{inner}</a></li>\n'

    def big_card(self, w, review=False, anchor=None, meta=True, tile_phone=False):
        """Крупная карточка как у экспоната на главной: ролик 2:1 (на телефоне 4:5), слева название,
        справа описание с вопросом, «где и когда» и ссылка. Фон: черный — как блок «Страны Света» на главной."""
        B = self.B
        tag, attrs, href = self._media_attrs(w)
        if review:  # на странице проекта: ролик открывает обзор экспоната, ссылки на себя не нужно
            w = dict(w, href=None); href = None
            tag, attrs = 'div', f'data-video="{B}{w["video"]}" data-title="{html.escape(w["title"])} — видеообзор" data-cursor="Смотреть обзор"'
        big, big_m = w.get('big') or w.get('preview'), w.get('big_m') or w.get('big') or w.get('preview')
        # tile_phone: на телефоне крупная карточка такая же, как плитка — горизонтальный ролик плитки и маленькая обложка
        poster_m = w.get('img_m') or w.get('big_img') or w['img']
        if tile_phone:
            big_m, poster_m = w.get('preview') or big, w['img']
        if big:
            media = (f'<video data-poster="{B}{w.get("big_img") or w["img"]}" data-poster-m="{B}{poster_m}" muted loop playsinline data-lazy preload="none">'
                     f'<source data-src="{B}{big_m}" type="video/mp4" media="(max-width: 600px)"><source data-src="{B}{big}" type="video/mp4"></video>')
        else:
            media = f'<img src="{B}{w["img"]}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
        desc = typo(w.get('desc', ''))
        if '? ' in desc:
            q, rest = desc.split('? ', 1)
            desc = f'<span class="card__q">{q}?</span> {rest}'
        award = f' <span class="event__place">{w["award"]}</span>' if w.get('award') else ''
        go = 'Подробнее' if href else ('Смотреть обзор' if review else 'Смотреть видео')
        dur = f'&nbsp;· {video_len(w["video"])}' if review else ''
        if href:
            kind = f'<a class="card__kind" href="{href}">{w["kind"]}&nbsp;· {go}&nbsp;<span class="card__arrow">→</span></a>'
            if tile_phone: kind = f'<a class="card__kind" href="{href}">{w.get("meta") or w["kind"]}</a>'
            act = ''  # карточка и так ведет на страницу работы; «Подробнее» внизу лишнее
        elif w.get('video'):
            va = f'data-video="{B}{w["video"]}" data-title="{html.escape(w["title"])}"'
            kind = f'<p class="card__kind" {va}>{w["kind"]}&nbsp;· {go}&nbsp;<span class="card__arrow">→</span></p>'
            if tile_phone: kind = f'<p class="card__kind" {va}>{w.get("meta") or w["kind"]}</p>'
            act = (f'<button class="card__review reveal" type="button" {va}><i class="card__play" aria-hidden="true">'
                   f'<svg viewBox="0 0 16 16"><path d="M5 2.5 13.5 8 5 13.5z"/></svg></i><span>{go}{dur}</span></button>')
        else:
            kind, act = f'<p class="card__kind">{w["kind"]}</p>', ''
        card = f'''      <article class="card work-big" id="{anchor or "w-" + w["id"]}">
        <{tag} class="card__media" {attrs}>{media}</{tag}>
        <div class="card__row">
          <h3 class="card__title reveal">{w["title"]}{award}</h3>
          {kind}
          <div class="card__info">
            <p class="card__desc reveal">{desc}</p>
            {f'<p class="card__meta reveal"><span>{typo(w.get("where") or str(w["year"]))}</span></p>' if meta else ""}
            <div class="card__actions">{act}</div>
          </div>
        </div>
      </article>
'''
        if w.get('dark'):
            return f'    <section class="event work-dark">\n{card}    </section>\n'
        return card

    def works_mix(self, entries):
        """Работы по порядку: крупные по правилу big_positions, между ними — плитка в две колонки."""
        big = self.big_positions(len(entries))
        out, tiles = '', ''
        def flush():
            return f'      <ul class="works works--all">\n{tiles}      </ul>\n' if tiles else ''
        for i, w in enumerate(entries):
            if i in big:
                out += flush(); tiles = ''
                out += self.big_card(w, tile_phone=True)
            else:
                tiles += self.tile(w)
        out += flush()
        return f'    <section class="works-mix works-mix--tiles">\n      <h2 class="sr-only">Работы</h2>\n{out}    </section>\n'

    def seealso(self, slugs):
        items =''.join(f'<li><a href="{self.tag_href(s)}">{NAME[s]}</a></li>' for s in slugs)
        return f'''
    <section class="sect seealso">
      <h2 class="sect__label reveal">Смотрите также</h2>
      <ul class="sect__body seealso__list reveal">{items}</ul>
    </section>
'''

    def next_work(self, project_id=None, item_id=None):
        """«Следующая работа →»: следующая по порядку страницы «Работы» (проекты целиком, потом отдельные работы, новые выше).
        Для экспоната крупного проекта — следующий проект: соседние экспонаты и так показаны выше на странице."""
        order = [dict(p, _kind='project') for p in DATA['projects']] + sorted(
            (w for w in VISIBLE if not w.get('project')), key=lambda w: -w['year'])
        cur = project_id or item_id
        i = next(k for k, w in enumerate(order) if w['id'] == cur)
        nx = order[(i + 1) % len(order)]
        meta = nx.get('full') or nx.get('kind', '')
        # У работы без своей страницы (например, «Страна Света») — ее подборка, где она показана крупно
        if nx.get('href'): href = self.B + nx['href']
        elif nx.get('what'): href = self.tag_href(nx['what'][0])
        else: href = self.W
        return f'''
    <section class="sect next-work">
      <h2 class="sect__label reveal">Следующая работа</h2>
      <a class="sect__body next-work__link reveal" href="{href}">
        <span class="next-work__img"><img src="{self.B}{nx['img']}" alt="" width="650" height="500" loading="lazy"></span>
        <span class="next-work__text"><span class="next-work__title">{nx['title']}&nbsp;<i aria-hidden="true">→</i></span><span class="next-work__meta">{nx['year']}&nbsp;· {meta}</span></span>
      </a>
    </section>
'''

    def faq(self, items=FAQ):
        rows = ''.join(f'        <details class="faq__item reveal"><summary>{q}</summary><p>{a}</p></details>\n' for q, a in items)
        return f'''
    <section class="sect faq" id="faq">
      <h2 class="sect__label reveal">Частые вопросы</h2>
      <div class="sect__body">
{rows}      </div>
    </section>
'''

    def finish(self, t, sheets=''):
        """Меню на телефоне, кружок, класс страницы, свои стили и скрипт поверх общих."""
        t = self.contact(t)
        extra = (self.tsheet() if 'aria-controls="tsheet"' in t else '') + sheets
        t = t.replace('  <div class="cursor"', self.msheet() + extra + self.ORB + '\n  <div class="cursor"', 1)
        # Кружок у курсора для меню «Работы»: на страницах кейсов его не было
        if 'class="peek"' not in t:
            t = t.replace('  <div class="cursor"', '  <div class="peek" aria-hidden="true"><div class="peek__c"><img alt=""></div></div>\n\n  <div class="cursor"', 1)
        # Класс новой страницы: к уже имеющемуся классу body (у кейсов там case-page) или новым атрибутом
        t = re.sub(r'<body(?: class="([^"]*)")?>', lambda m: f'<body class="{(m.group(1) + " ") if m.group(1) else ""}page-v2">', t, count=1)
        B = self.B
        t, n = re.subn(r'(<link rel="stylesheet" href="' + re.escape(B) + r'fresh/fresh\.css\?v=\w+">)', lambda m: m.group(1) + f'\n  <link rel="stylesheet" href="{B}fresh/{V2CSS}">', t, count=1); assert n
        t, n = re.subn(r'(<script src="' + re.escape(B) + r'fresh/fresh\.js\?v=\w+"></script>)', lambda m: m.group(1) + f'\n  <script src="{B}fresh/{V2JS}"></script>', t, count=1); assert n
        return t
