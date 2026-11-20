# Кейс «Устьянские легенды» — мэппинг для конкурса «Страна Света-2025» (/works/strana-sveta/).
# Оболочка (шапка документа, «Сделаем…», «Другие проекты», контакты) — из кейса HBO в _src/, содержание — здесь.
# Тексты согласованы в texts/cases/strana-sveta.md. Медиа — works/strana-sveta/media/ и Video/strana-sveta-*.mp4.
import os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, typo, video_len

os.chdir(SITE)
t = open('_src/cases/hbo/index.html', encoding='utf-8').read()
p = Page(B='../../', W='../', cta='media')
B, W = p.B, p.W
URL = 'https://petrovichbrothers.ru/works/strana-sveta/'
PLAY = '<svg viewBox="0 0 16 16"><path d="M5 2.5 13.5 8 5 13.5z"/></svg>'

MAPPING = ('Video/strana-sveta-2025.mp4', '«Устьянские легенды» — мэппинг на конкурсе «Страна Света-2025»')
MAKING = ('Video/strana-sveta-making.mp4', 'Как мы делали мэппинг «Устьянские легенды»')
ARTYOM = ('Video/strana-sveta-artyom.mp4', 'Артем Петрович о проекте «Устьянские легенды»')
ARSENY = ('Video/strana-sveta-arseny.mp4', 'Арсений Петрович о проекте «Устьянские легенды»')

def btn(v, label, cls='card__review'):
    return (f'<button class="{cls} reveal" type="button" data-video="{B}{v[0]}" data-title="{html.escape(v[1])}">'
            f'<i class="card__play" aria-hidden="true">{PLAY}</i><span>{label}&nbsp;· {video_len(v[0])}</span></button>')
def lead(s): return f'      <p class="case-main case-lead reveal">{typo(s)}</p>\n'
def para(s): return f'      <p class="case-main case-p reveal">{typo(s)}</p>\n'
def size(path):
    import subprocess
    w, h = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip().split(',')[:2]
    return w, h
def fig(name, alt):
    w, h = size(f'works/strana-sveta/media/{name}')
    return (f'      <figure class="case-wide reveal">\n        <img src="media/{name}" alt="{alt}" width="{w}" height="{h}" loading="lazy">\n      </figure>\n')

HERO = f'''    <section class="case-hero">
      <p class="case-kicker">Мэппинг для конкурса<br class="br-m"> «Страна Света-2025»</p>
      <h1 class="case-hero__title">Устьянские легенды</h1>
      <figure class="case-hero__media case-hero__media--video">
        <video src="{B}fresh/media/strana-loop.mp4" poster="{B}fresh/media/strana-storm.webp" autoplay muted loop playsinline preload="auto" aria-label="Мэппинг на фасаде на Дворцовой площади"></video>
      </figure>
    </section>
'''

ASIDE = f'''      <aside class="case-aside" style="--rows: 9">
        <div class="case-aside__in">
          <h2 class="case-label case-aside__label">О&nbsp;проекте</h2>
          <p class="case-aside__meta"><span>Конкурс современного медиаискусства «Страна Света» при&nbsp;поддержке ПФКИ проходил на&nbsp;Дворцовой площади в&nbsp;Санкт-Петербурге в&nbsp;декабре 2025&nbsp;года</span><span>Мы&nbsp;заняли третье место<a class="case-aside__src" href="https://stranasveta.com/news/pobediteli-2025" target="_blank" rel="noopener">Все победители на&nbsp;сайте конкурса&nbsp;↗</a></span></p>
          <h2 class="case-label case-aside__label">Что сделали</h2>
          <ul class="case-aside__done">
            <li>Сценарий</li>
            <li>Стиль</li>
            <li>Ключевые кадры</li>
            <li>Анимация</li>
            <li>Сборка и&nbsp;монтаж</li>
            <li>Нейрогенерации</li>
          </ul>
          {btn(MAPPING, 'Смотреть мэппинг', 'card__review case-aside__review')}
        </div>
      </aside>
'''
def REVIEW(v, name, label):
    return (f'        <figure class="case-reviews__item">\n'
            f'          <button class="case-review__btn" type="button" data-video="{B}{v[0]}" data-title="{html.escape(v[1])}" aria-label="{label}, {video_len(v[0])}">\n'
            f'            <img src="media/cover-{name}.webp" alt="" width="1280" height="720" loading="lazy">\n'
            f'            <span class="case-review__play" aria-hidden="true">{PLAY}</span>\n'
            f'          </button>\n'
            f'          <figcaption class="case-review__cap">{label}&nbsp;· {video_len(v[0])}</figcaption>\n'
            f'        </figure>\n')
BRIEF = f'''      <div class="case-main case-brief reveal">
        <h2 class="case-label">Задача</h2>
        <p>{typo("По правилам конкурса нужно рассказать сказки, легенды и мифы своего места силы. Мы выбрали Устье, село под Вологдой на берегу Кубенского озера.")}</p>
        <h2 class="case-label">Решение</h2>
        <p>{typo("Рассказ из пяти частей о легендах Устья, стилизованный под вологодскую глиняную игрушку. Кадры и анимацию делали с нейросетями, а собирали и доводили вручную.")}</p>
      </div>

      <div class="case-review case-reviews reveal">
{REVIEW(MAKING, 'making', 'Как делали')}{REVIEW(ARTYOM, 'artyom', 'Артем о проекте')}{REVIEW(ARSENY, 'arseny', 'Арсений о проекте')}      </div>
'''
QUOTE = '''      <figure class="case-main case-quote reveal">
        <img class="case-quote__photo" src="media/artyom.webp" alt="Артем Петрович" width="480" height="480" loading="lazy">
        <blockquote class="case-quote__text">«Тысячи человек смотрят на&nbsp;твою работу на&nbsp;доме шириной больше ста метров. Мы&nbsp;же видим ее на&nbsp;нескольких мониторах, а&nbsp;тут она невероятного масштаба»</blockquote>
        <figcaption class="case-quote__who">Артем Петрович</figcaption>
      </figure>
'''
PAIR = '''      <figure class="case-pair-block reveal">
        <div class="case-pair">
          <video src="media/ustye-vertical.mp4" poster="media/ustye-vertical.webp" autoplay muted loop playsinline preload="none" aria-label="Ролик про Устье: стела, дом Никуличева, набережная Кубенского озера"></video>
          <img src="media/mk-bike.webp" alt="Кадр из ролика: улица в Устье, велосипедист на пенни-фартинге" width="1920" height="1080" loading="lazy">
        </div>
        <figcaption class="case-pair__cap">Ролик об&nbsp;Устье. По&nbsp;правилам конкурса нужно было снять ролик о&nbsp;месте, про&nbsp;которое мы&nbsp;делаем мэппинг</figcaption>
      </figure>
'''

GRID = ('    <div class="case-grid">\n' + ASIDE + '\n' + BRIEF + '\n'
  + lead('Почему Устье')
  + para('Сначала мы заявили на конкурс мэппинг про Белое море. Но летом Артем оказался в Устье по приглашению приятеля: почти месяц ходили под парусом по Кубенскому озеру, ездили по заброшенным деревням. Прямо оттуда написал организаторам и попросил поменять тему на Устье. Перед отъездом зашел в местную библиотеку, там посоветовали книги про село. Из них и собрали сценарий.')
  + fig('mk-air.webp', 'Устье с высоты: храм на берегу Кубенского озера')
  + lead('Пять частей и пять фасадов')
  + para('Начало, легенда об острове Спас-Камень, легенда о монахе, легенда о колоколе и эпилог. Дома Устья похожи на книги с резными обложками, за каждым своя история. Поэтому у каждой легенды свой фасад: он рушится, плавится и уходит под воду, а из-под него проступает следующий.')
  + fig('ss-ustye.webp', 'Фасад со словом «Устье» в стиле глиняной игрушки')
  + lead('Как вологодская глиняная игрушка')
  + para('Организаторы дали модель здания в Cinema 4D и маску фасада шириной около 8000 пикселей. Первый дом сделали в Midjourney по этой маске и референсам. Midjourney пугался такой широкой картинки и размывал края, поэтому здание поставили в центр кадра 16:9.')
  + fig('mk-mask.webp', 'Маска фасада от организаторов, 8880 на 1920 пикселей')
  + fig('ss-island.webp', 'Остров Спас-Камень с монастырем среди волн')
  + lead('Ключевые кадры и анимация')
  + para('Ключевые кадры собирали из первого дома, по очереди убирая его элементы: большую часть делала Nano Banana, остальное дорабатывали руками в Photoshop. По первому кадру должно быть понятно, как пойдет анимация: из пустого черного фона получится непонятно что, а с подтеками желтого фона Kling все понимает.')
  + fig('mk-photoshop.webp', 'Ключевой кадр фасада в Photoshop')
  + fig('mk-keyframes.webp', 'Ключевые кадры желтого фасада по порядку')
  + PAIR
  + lead('Сборка')
  + para('Сложный технический моушн нейросети осенью 2025 года не умели. Но в мэппинге камера неподвижна, поэтому ролик можно склеить из разных генераций и подобрать порядок и тайминги. Все собирали в After Effects: маски, ротобраш, несколько дней работы на каждые 20 секунд. Потом апскейл в Topaz и перевод в финальный формат.')
  + fig('mk-after.webp', 'Сборка анимации в After Effects')
  + fig('ss-bell.webp', 'Колокол проламывает фасад')
  + QUOTE
  + lead('Третье место на конкурсе «Страна Света-2025»')
  + para('После показа на Дворцовой площади у нас взял интервью Первый канал.')
  + fig('mk-tv.webp', 'Артем и Арсений Пе́тровичи в сюжете Первого канала на Дворцовой площади')
  + '    </div>\n')

t, n = re.subn(r'    <section class="case-hero">.*?</section>\n', lambda m: HERO, t, count=1, flags=re.S); assert n
t, n = re.subn(r'    <div class="case-grid">.*?\n    </div>\n(?=\n    <section class="case-offer">)', lambda m: GRID, t, count=1, flags=re.S); assert n
t, n = re.subn(r'(<section class="case-offer">\s*<p class="case-lead reveal">).*?(</p>)', lambda m: m.group(1) + 'Сделаем мэппинг для&nbsp;вашего фасада или&nbsp;события' + m.group(2), t, count=1, flags=re.S); assert n
t = re.sub(r'\n    <div class="case-fabs">.*?\n    </div>\n', '\n', t, count=1, flags=re.S)
# Шапка документа
TITLE = 'Мэппинг «Устьянские легенды» для конкурса «Страна Света-2025»'
DESC = 'Мэппинг о легендах села Устье на фасаде на Дворцовой площади: третье место на конкурсе «Страна Света-2025». Как делали: сценарий, стиль глиняной игрушки, нейросети и сборка в After Effects.'
t = re.sub(r'<title>.*?</title>', f'<title>{TITLE} — студия братьев Петрович</title>', t, count=1)
t = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(DESC)}">', t, count=1)
t = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(TITLE)}">', t, count=1)
t = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(DESC)}">', t, count=1)
t = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{URL}media/og.jpg">', t, count=1)
t = re.sub(r'<meta property="og:image:alt" content="[^"]*">', '<meta property="og:image:alt" content="Фасад со словом «Устье» в стиле глиняной игрушки">', t, count=1)
t = t.replace('https://petrovichbrothers.ru/cases/hbo/', URL)
t = re.sub(r'\n  <link rel="preload"[^>]*hbo[^>]*>', '', t)
# Новая шапка, низ страницы
t, n = re.subn(r'<header class="top">.*?</header>', lambda m: p.header(), t, count=1, flags=re.S); assert n
t, n = re.subn(r'(    <section class="case-more">.*?</section>\n)', lambda m: m.group(1) + p.next_work(item_id='strana-sveta') + p.seealso(['mapping', 'video', 'meropr', 'regiony', 'scena']), t, count=1, flags=re.S); assert n
t = p.finish(t)
os.makedirs('works/strana-sveta', exist_ok=True)
open('works/strana-sveta/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t))
