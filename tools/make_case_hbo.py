# Кейс «Игры Уолл-стрит» — 3D-заставка к документальному сериалу на HBO Max (/works/hbo/).
# Оболочка (шапка документа, «Сделаем…», «Другие проекты», контакты) — из старого кейса HBO в _src/, содержание — здесь.
# Тексты согласованы в texts/cases/hbo.md (по статье Артема на No Film School). Медиа — works/hbo/media/, ролик — Video/archive/hbo.mp4.
import os, re, sys, html, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, typo, video_len

os.chdir(SITE)
t = open('_src/cases/hbo/index.html', encoding='utf-8').read()
p = Page(B='../../', W='../', cta='media')
B, W = p.B, p.W
URL = 'https://petrovichbrothers.ru/works/hbo/'
NFS = 'https://nofilmschool.com/how-we-made-intro-gaming-wall-street-hbo-max'
PLAY = '<svg viewBox="0 0 16 16"><path d="M5 2.5 13.5 8 5 13.5z"/></svg>'
INTRO = ('Video/archive/hbo.mp4', 'Заставка к сериалу «Игры Уолл-стрит», HBO Max')

def btn(v, label, cls='card__review'):
    return (f'<button class="{cls} reveal" type="button" data-video="{B}{v[0]}" data-title="{html.escape(v[1])}">'
            f'<i class="card__play" aria-hidden="true">{PLAY}</i><span>{label}&nbsp;· {video_len(v[0])}</span></button>')
def lead(s): return f'      <p class="case-main case-lead reveal">{typo(s)}</p>\n'
def para(s): return f'      <p class="case-main case-p reveal">{typo(s)}</p>\n'
def size(path):
    w, h = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
                          capture_output=True, text=True).stdout.strip().split(',')[:2]
    return w, h
def fig(name, alt):
    w, h = size(f'works/hbo/media/{name}')
    return (f'      <figure class="case-wide reveal">\n        <img src="media/{name}" alt="{alt}" width="{w}" height="{h}" loading="lazy">\n      </figure>\n')
def quote(photo, who, role, text):
    return (f'      <figure class="case-main case-quote reveal">\n'
            f'        <img class="case-quote__photo" src="media/{photo}" alt="{who}" width="240" height="240" loading="lazy">\n'
            f'        <blockquote class="case-quote__text">{typo(text)}</blockquote>\n'
            f'        <figcaption class="case-quote__who">{who}<span>{role}</span></figcaption>\n'
            f'      </figure>\n')

HERO = f'''    <section class="case-hero">
      <p class="case-kicker">3D-заставка к&nbsp;документальному<br class="br-m"> сериалу на&nbsp;HBO Max</p>
      <h1 class="case-hero__title">Игры Уолл-стрит</h1>
      <figure class="case-hero__media case-hero__media--video">
        <video src="{B}fresh/media/archive/hbo-big.mp4" poster="media/loop-poster.webp" autoplay muted loop playsinline preload="auto" aria-label="Кадры заставки: светящийся город и биржевые механизмы"></video>
      </figure>
    </section>
'''

WATCH_LINKS = [('https://www.kinopoisk.ru/series/4893538/', 'Кинопоиск'),
               ('https://www.youtube.com/watch?v=ViEKPjkjEWI', 'Трейлер на&nbsp;YouTube'),
               ('https://www.imdb.com/title/tt18332840/', 'Gaming Wall Street на&nbsp;IMDb')]
WATCH = '<i class="case-aside__dot"> · </i>'.join(
    f'<a class="case-aside__src" href="{u}" target="_blank" rel="noopener">{t}&nbsp;<i>↗</i></a>' for u, t in WATCH_LINKS)
SIDE = ('      <figure class="case-side reveal">\n'
        '        <img src="media/call.webp" alt="Общий созвон команды сериала: 30 человек в семи часовых поясах" width="960" height="600" loading="lazy">\n'
        '        <figcaption class="case-review__cap">Общий созвон команды сериала</figcaption>\n'
        '      </figure>\n')

ASIDE = f'''      <aside class="case-aside" style="--rows: 9">
        <div class="case-aside__in">
          <h2 class="case-label case-aside__label">О&nbsp;проекте</h2>
          <p class="case-aside__meta"><span>{typo("Документальный сериал «Игры Уолл-стрит» о флешмобе вокруг акций GameStop вышел на HBO Max и Кинопоиске в 2022 году")}</span><span>{typo("Режиссер Тобиас Демл, Prodigium Pictures, Нью-Йорк")}</span></p>
          <h2 class="case-label case-aside__label">Что сделали</h2>
          <ul class="case-aside__done">
            <li>3D-заставка</li>
            <li>Трекинг камеры</li>
            <li>Частицы</li>
            <li>Композитинг</li>
            <li>Рендер в&nbsp;4K</li>
          </ul>
          {btn(INTRO, 'Смотреть заставку', 'card__review case-aside__review')}
          <h2 class="case-label case-aside__label case-aside__watch-label">Смотреть сериал</h2>
          <p class="case-aside__meta case-aside__watch">{WATCH}</p>
        </div>
      </aside>
'''
BRIEF = f'''      <div class="case-main case-brief reveal">
        <h2 class="case-label">Задача</h2>
        <p>{typo("Сделать заставку для фильма, которая за полторы минуты объясняет, как работает фондовый рынок.")}</p>
        <h2 class="case-label">Решение</h2>
        <p>{typo("3D-заставка в стиле фильма «Трон»: светящиеся линии на темном фоне. В четырех сценах графика наложена на настоящую съемку Нью-Йорка.")}</p>
      </div>

      <div class="case-review case-reviews case-reviews--short reveal">
        <figure class="case-reviews__item">
          <button class="case-review__btn" type="button" data-video="{B}{INTRO[0]}" data-title="{html.escape(INTRO[1])}" aria-label="Смотреть заставку, {video_len(INTRO[0])}">
            <img src="media/cover-intro.webp" alt="" width="1280" height="720" loading="lazy">
            <span class="case-review__play" aria-hidden="true">{PLAY}</span>
          </button>
          <figcaption class="case-review__cap">Заставка&nbsp;· {video_len(INTRO[0])}</figcaption>
        </figure>
      </div>
'''
TOBIAS = quote('tobias.webp', 'Тобиас Демл', 'Режиссер сериала',
               '«Артем, Арсений и их команда сделали вступление к нашему документальному сериалу: сложную смесь компьютерной графики. Они выполнили проект с высочайшим профессионализмом, разница в часовых поясах не помешала работе»')
TESSA = quote('tessa.webp', 'Тесса Буфорд', 'Продюсер сериала',
              '«Работа была выполнена на высоком уровне за три месяца. Коммуникация была отличной, несмотря на то что процесс был очень напряженным»')
SOURCE = ('      <p class="case-main case-p case-source reveal">Подробно о&nbsp;работе мы&nbsp;рассказали в&nbsp;'
          f'<a class="text-link" href="{NFS}" target="_blank" rel="noopener">статье на&nbsp;No&nbsp;Film School&nbsp;↗</a></p>\n')

GRID = ('    <div class="case-grid">\n' + ASIDE + '\n' + BRIEF + '\n'
  + lead('Команда в семи часовых поясах')
  + SIDE
  + para('Над сериалом работали 30 человек в разных странах. Общий созвон несколько раз переносили: кто-то подключался в пять утра, кто-то поздно вечером. На старте была только раскадровка и просьба сделать «как в «Троне»».')
  + fig('gears.webp', 'Кадр заставки: светящийся завод с шестеренками')
  + fig('storyboard.webp', 'Раскадровка заставки: у каждой сцены описание и два-три эскиза')
  + lead('Стиль Tron Legacy: одновременно и просто, и сложно')
  + para('Просто со светом: все светится само на темном фоне. Сложно с моделями: они видны ровно такими, какими их построили, и огрехи светом не спрячешь.')
  + fig('geometry.webp', 'Слева геометрия сцены, справа готовый кадр')
  + lead('Зеркальный Манхэттен')
  + para('Сначала хотели построить весь Манхэттен в 3D, но режиссер вовремя отговорил: он снял город с дрона. Мы добавили над ним светящийся «параллельный» город, модель домов взяли из Google Maps. Совместить два города точно и красиво сразу не получалось. Выбрали красиво: часть домов пришлось сдвинуть или убрать.')
  + para('Город появляется в три этапа: опора моста и дома вокруг, потом середина, потом остальное. Если выращивать все сразу, частицы смешиваются, и картинка выглядит слишком сложной.')
  + fig('particles.webp', 'Три части города разными цветами и готовый кадр над съемкой с дрона')
  + lead('Трекинг камеры')
  + para('Чтобы наложить графику на съемку, нужно восстановить движение настоящей камеры. Сложнее всего было с Эмпайр-стейт-билдинг: дрон снимал высоко, точки для трекинга остались далеко внизу, а на вращающемся здании опереться не на что. Линии на здании доводили вручную.')
  + fig('tracking.webp', 'Трекинг сцены с Эмпайр-стейт-билдинг и готовый кадр')
  + lead('Рулетка и одна текстура на все сцены')
  + para('Первые шарики то лениво падали на номер, то выпрыгивали за стол. Пришлось поставить вокруг рулетки невидимый бортик.')
  + fig('roulette.webp', 'Рулетка с невидимым бортиком и готовый кадр')
  + para('На всех поверхностях одна анимированная текстура: скругленные прямоугольники и точки. Так все предметы выглядят из одного мира. Линии от кнопок строятся процедурно: несколько настроек вместо ручной анимации сотен объектов.')
  + fig('texture.webp', 'Элементы анимированной текстуры')
  + fig('button.webp', 'Кадр заставки: рука нажимает красную кнопку')
  + lead('Формат поменяли посреди работы')
  + para('Когда сцены были готовы, HBO попросили сменить формат с 2,35:1 на 2:1, а потом вместо Full HD сделать 4K. Камеры во всех сценах перенастроили заново. Рендер в 4K идет в четыре раза дольше, поэтому вместо рендер-фермы собрали несколько облачных компьютеров: вышло в три раза дешевле, и результат было видно прямо во время рендера.')
  + TOBIAS
  + lead('20 сцен за два месяца')
  + para('Работали и в новогодние праздники. Из 2,5 минуты графики после монтажа получилась заставка на полторы минуты.')
  + fig('frames.webp', 'Все сцены заставки')
  + TESSA
  + SOURCE
  + '    </div>\n')

t, n = re.subn(r'    <section class="case-hero">.*?</section>\n', lambda m: HERO, t, count=1, flags=re.S); assert n
t, n = re.subn(r'    <div class="case-grid">.*?\n    </div>\n(?=\n    <section class="case-offer">)', lambda m: GRID, t, count=1, flags=re.S); assert n
t = re.sub(r'\n    <div class="case-fabs">.*?\n    </div>\n', '\n', t, count=1, flags=re.S)
# Шапка документа
TITLE = '3D-заставка к сериалу «Игры Уолл-стрит» для HBO Max'
DESC = 'Вступительная 3D-заставка к документальному сериалу «Игры Уолл-стрит» о флешмобе вокруг акций GameStop: стиль «Трона», трекинг камеры, частицы и рендер в 4K.'
t = re.sub(r'<title>.*?</title>', f'<title>{TITLE} — студия братьев Петрович</title>', t, count=1)
t = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(DESC)}">', t, count=1)
t = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(TITLE)}">', t, count=1)
t = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(DESC)}">', t, count=1)
t = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{URL}media/og.jpg">', t, count=1)
t = re.sub(r'<meta property="og:image:alt" content="[^"]*">', '<meta property="og:image:alt" content="Кадр заставки: светящийся завод с шестеренками">', t, count=1)
t = t.replace('https://petrovichbrothers.ru/cases/hbo/', URL)
t = re.sub(r'\n  <link rel="preload"[^>]*hbo[^>]*>', '', t)
# Пути к общим файлам старого кейса: оболочка лежала в cases/hbo/, страница — в works/hbo/ (та же глубина)
t = t.replace('"media/hbo-', '"../../cases/hbo/media/hbo-')
# Новая шапка, низ страницы
t, n = re.subn(r'<header class="top">.*?</header>', lambda m: p.header(), t, count=1, flags=re.S); assert n
t, n = re.subn(r'(    <section class="case-more">.*?</section>\n)', lambda m: m.group(1) + p.next_work(item_id='hbo') + p.seealso(['kino', 'video']), t, count=1, flags=re.S); assert n
t = p.finish(t)
os.makedirs('works/hbo', exist_ok=True)
open('works/hbo/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t))
