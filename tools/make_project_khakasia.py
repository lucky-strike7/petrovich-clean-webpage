# Страница проекта «Стенд Республики Хакасия» (/works/khakasia/): три экспоната блоками.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page, DATA, typo

os.chdir(SITE)
home = open('_src/index.html', encoding='utf-8').read()
p = Page(B='../../', W='../', cta='museum')
B, W = p.B, p.W
PR = next(x for x in DATA['projects'] if x['id'] == 'khakasia')

# Карточки стола и Менгиров — как на главной и посадочной, описание начинается с вопроса
cards = {cid: re.search(rf'      <article class="card" id="{cid}">.*?</article>\n', home, flags=re.S).group(0) for cid in ('khakasia', 'mengiry')}
DESC = {
  'khakasia': 'Что, если столешница станет пультом? Посетитель поворачивает ее и&nbsp;совмещает метку места с&nbsp;указателем: на&nbsp;экране появляются карта и&nbsp;ролик о&nbsp;достопримеча&shy;тельности.',
  'mengiry': 'Как оживить каменное изваяние? Посетитель собирает его изображение на&nbsp;сенсорном экране, а&nbsp;когда головоломка решена, на&nbsp;макете менгира загорается подсветка.',
}
for cid, text in DESC.items():
    q, rest = text.split('? ', 1)
    cards[cid] = re.sub(r'(<p class="card__desc reveal">).*?(</p>)', lambda m: m.group(1) + f'<span class="card__q">{q}?</span> {rest}' + m.group(2), cards[cid], count=1, flags=re.S)
# Правило: карточка на странице своего проекта не повторяет «где и когда» — это сказано вверху страницы один раз
for cid in cards:
    cards[cid] = re.sub(r'(<p class="card__meta reveal">)<span>Стенд Хакасии, выставка «Россия», 2023</span>', r'\1', cards[cid])
# Стол — со своей страницей; якорь стола на этой странице — #stol
cards['khakasia'] = cards['khakasia'].replace('id="khakasia"', 'id="stol"').replace('href="cases/khakasia/"', 'href="stol/"')

DOST = '''      <article class="card" id="dostizheniya">
        <div class="card__media" data-cursor="Смотреть обзор" data-video="Video/05_Khakasia_Displax.mp4" data-title="Достижения Хакасии — видеообзор">
          <img src="cases/khakasia/media/displax-dostizheniya-khakasii.jpg" alt="Стол Displax «Достижения Хакасии»: посетитель ставит фишку на карту республики" width="1200" height="676" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
        </div>
        <div class="card__row">
          <h3 class="card__title reveal">Достижения Хакасии</h3>
          <p class="card__kind" data-video="Video/05_Khakasia_Displax.mp4" data-title="Достижения Хакасии — видеообзор">Стол с&nbsp;распознаванием фишек&nbsp;· Смотреть обзор&nbsp;<span class="card__arrow">→</span></p>
          <div class="card__info">
            <p class="card__desc reveal"><span class="card__q">Как рассказать о&nbsp;достижениях республики без длинных текстов?</span> Пять фишек с&nbsp;названиями достижений: посетитель ставит фишку на&nbsp;карту, и&nbsp;чем ближе она к&nbsp;нужному месту, тем зеленее подсветка.</p>
            <p class="card__meta reveal"><span>Стол Displax с&nbsp;распознаванием фишек</span></p>
            <div class="card__actions">
              <button class="card__review reveal" type="button" data-video="Video/05_Khakasia_Displax.mp4" data-title="Достижения Хакасии — видеообзор">
                <i class="card__play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M5 2.5 13.5 8 5 13.5z"/></svg></i>
                <span>Смотреть обзор&nbsp;· 0:49</span>
              </button>
            </div>
          </div>
        </div>
      </article>
'''

# Вставка после всех экспонатов — про сложные игры (в том числе про «пятнашки» на менгирах)
PLATE = p.plate('Из&nbsp;опыта на&nbsp;площадках',
                'В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, сложную игру никто не&nbsp;проходит до&nbsp;конца: «пятнашки» на&nbsp;менгирах мы&nbsp;упрощали после тестов на&nbsp;выставке, пока не&nbsp;оставили поле 2&nbsp;×&nbsp;3',
                'Video/errors/oshibka-03.mp4', 'fresh/media/oshibka-03.webp',
                'Артем Петрович рассказывает о сложных играх на стендах',
                'Смотреть разбор: сложные игры на стендах, 0:34')

# Сразу под общим кадром стенда: задача, решение и «Что сделали» (строкой через точку). Монтаж пишем только тот, что делали сами (стенд собирала «Артмонта»).
DONE_ITEMS = ['Проектирование взаимодействия', 'Дизайн интерфейсов', '3D-графика', 'Видео о достопримечательностях', 'Программирование',
              'Датчики и подсветка', 'Монтаж датчиков и подсветки менгиров', 'Проверка экспонатов на площадке', 'Поддержка и замена роликов во время выставки']
TASK = 'Показать на выставке «Россия» достопримечательности и достижения Хакасии и рассказать о менгирах так, чтобы посетитель узнавал о них через действие.'
SOLUTION = ('Стенд построен вокруг двух деревянных куполов и каменных менгиров. Мы спроектировали и сделали три экспоната: '
            'стол, который работает как пульт, головоломку, которая зажигает менгир, и карту, на которую кладут фишки. '
            'Стол о достопримечательностях сделали за 30 дней.')
BRIEF = f'''
    <section class="sect project-brief">
      <h2 class="sect__label reveal">Задача</h2>
      <p class="sect__body project-brief__text reveal">{typo(TASK)}</p>
      <h2 class="sect__label reveal">Решение</h2>
      <p class="sect__body project-brief__text reveal">{typo(SOLUTION)}</p>
      <h2 class="sect__label reveal">Что сделали</h2>
      <ul class="sect__body seealso__list project-brief__done reveal">{''.join(f'<li>{typo(x)}</li>' for x in DONE_ITEMS)}</ul>
    </section>
'''
# Стенд вокруг стола: три кадра в ряд на компьютере, лента с прокруткой на телефоне
HALL = [('khakasia-stand-05.webp', 'Стена с менгирами и экранами под степной панорамой'),
        ('khakasia-stand-04.webp', 'Менгир и карта Хакасии у стены с наскальными рисунками'),
        ('khakasia-stand-06.webp', 'Стенд сверху: два купола, менгиры и полукруглая стена')]
GALLERY = ('    <div class="project-gallery project-gallery--swipe reveal">\n'
           + '      <div class="project-gallery__track" role="region" aria-label="Фотографии стенда Республики Хакасия">\n'
           + ''.join(f'        <picture><source media="(max-width: 600px)" srcset="fresh/media/{f[:-5]}-mobile.webp">'
                     f'<img src="fresh/media/{f}" alt="{a}" width="1600" height="1200" loading="lazy"></picture>\n' for f, a in HALL)
           + '      </div>\n'
           + '    </div>\n')

CRUMBS = f'<a href="{W}">Работы</a><span>→</span>Хакасия&nbsp;на&nbsp;ВДНХ'
EXH = [('#stol', 'Интерактивный стол'), ('#mengiry', 'Менгиры Хакасии'), ('#dostizheniya', 'Достижения Хакасии')]
JUMP = ''.join(f'<li><a href="{h}">{n}</a></li>' for h, n in EXH)
PSHEET = p.sheet('psheet', 'Экспонаты проекта', f'<a class="tsheet__all" href="./" aria-current="page">{PR["short"]}</a>',
                 [('', [(h, n, False) for h, n in EXH]), ('', [(W, 'Все работы', False)])])
PNAV = (f'<nav class="pnav" aria-label="Проект"><a class="lnav__up" href="{W}">Работы</a><span class="lnav__sep" aria-hidden="true">→</span>'
        f'<button class="lnav__btn" type="button" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button></nav>')
CTX = f'<button class="top__ctx" type="button" data-ctx-for=".pnav" aria-controls="psheet" aria-expanded="false">{PR["short"]} <i aria-hidden="true"></i></button>\n    '

MAIN = f'''<main>

    <section class="about project-hero">
      <p class="about__label crumbs reveal">{CRUMBS}</p>
      {PNAV}
      <h1 class="about__text reveal">Стенд Республики Хакасия</h1>
      <p class="project-meta reveal">Выставка «Россия», ВДНХ, 2023</p>
      <p class="about__desc reveal">Для стенда республики мы&nbsp;сделали три интерактивных экспоната. Для всех трех рисовали графику и&nbsp;писали код: он управляет поворотом круглого стола, подсветкой менгира и&nbsp;столом Displax, который распознает фишки.</p>
      <ul class="pjump reveal" aria-label="Экспонаты проекта">{JUMP}</ul>
    </section>

{p.project_photo('fresh/media/khakasia-stand.webp', 'Стенд Республики Хакасия на выставке «Россия», ВДНХ: общий вид', mobile='fresh/media/khakasia-stand-mobile.webp')}{BRIEF}
    <section class="projects" id="exhibits">
      <h2 class="sr-only">Экспонаты</h2>
{cards['khakasia']}
{GALLERY}
{cards['mengiry']}
{DOST}{PLATE}
    </section>
{p.next_work(project_id='khakasia')}{p.seealso(['museums', 'exhibitions', 'regions', 'developers', 'interactive', 'video'])}
'''

t = home
t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_crumbs(CRUMBS).replace('data-sub-for=".case-kicker.crumbs, .case-hero__title"', 'data-sub-for=".project-hero .crumbs, .project-hero h1"'), CTX), t, count=1, flags=re.S)
t, n = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)', lambda m: MAIN + m.group(1), t, count=1, flags=re.S); assert n
t = re.sub(r'<title>.*?</title>', '<title>Интерактивные экспонаты для стенда Республики Хакасия на выставке «Россия», ВДНХ | студия братьев Пе́трович</title>', t, count=1)
t = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Стенд Республики Хакасия на выставке «Россия» на ВДНХ: интерактивный стол о достопримечательностях, игра про менгиры и стол Displax с картой достижений. Графика, программирование, монтаж.">', t, count=1)
t = t.replace('https://petrovichbrothers.ru/"', 'https://petrovichbrothers.ru/works/khakasia/"')
t = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', t)
def fix(m):
    attr, val = m.group(1), m.group(2)
    if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '' or val == 'stol/': return m.group(0)
    return f'{attr}="{B}{val}"'
t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|srcset)="([^"]*)"', fix, t)
t = t.replace(f'href="{B}./"', f'href="{B}"')
t = p.finish(t, PSHEET)
os.makedirs('works/khakasia', exist_ok=True)
open('works/khakasia/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t))
