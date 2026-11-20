# Посадочная «Интерактивные экспонаты» (/works/eksponaty/) из нынешней главной.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2parts import SITE, Page

os.chdir(SITE)
t = open('_src/index.html', encoding='utf-8').read()
p = Page(B='../../', W='../', cur='eksponaty')
B = p.B

t = re.sub(r'<header class="top">.*?</header>', lambda m: p.header(p.sub_switch(), p.ctx_tags()), t, count=1, flags=re.S)
# Навигация по тегам наверху посадочной — два варианта для сравнения (?nav=switch или ?nav=tags), по умолчанию скрыта
t, n = re.subn(r'(<main>\n)', lambda m: m.group(1) + p.landing_nav(), t, count=1); assert n
# На этой странице только экспонаты: без мэппинга, архива, «Достижений» и YouTube
t = re.sub(r'\n    <section class="event".*?</section>\n', '\n', t, count=1, flags=re.S)
t = re.sub(r'\n    <section class="sect videos">.*?</section>\n', '\n', t, count=1, flags=re.S)
t, n = re.subn(r'    <section class="sect works-sect".*?</section>\n', '', t, count=1, flags=re.S); assert n
t, n = re.subn(r'\n    <section class="sect studio" id="awards">.*?</section>\n', '\n', t, count=1, flags=re.S); assert n

# Вставка между Хакасией и Херсонесом: одна ошибка из разбора «10 ошибок»
PLATE = p.plate('Из&nbsp;опыта на&nbsp;площадках',
                'В&nbsp;видео разбираем типичные ошибки мультимедиа-экспозиций. Например, тачскрин нельзя выбирать по&nbsp;характеристикам: как он&nbsp;отзывается на&nbsp;касания, видно только на&nbsp;живом тесте',
                'Video/errors/oshibka-02.mp4', 'fresh/media/oshibka-02.webp',
                'Артем Петрович показывает, как тачскрин с низкой частотой считывания отстает от пальца',
                'Смотреть разбор: параметры тач-панелей, 0:37')
t, n = re.subn(r'(\n      <article class="card" id="shturval">)', lambda m: PLATE + m.group(1), t, count=1); assert n

# Описание экспоната начинается с вопроса
DESC = {
  'khakasia': 'Что, если столешница станет пультом? Посетитель поворачивает ее и&nbsp;совмещает метку места с&nbsp;указателем&nbsp;— на&nbsp;экране появляются карта и&nbsp;ролик о&nbsp;достопримеча&shy;тельности.',
  'mengiry': 'Как оживить каменное изваяние? Посетитель собирает его изображение на&nbsp;сенсорном экране, а&nbsp;когда головоломка решена, на&nbsp;макете менгира загорается подсветка.',
  'shturval': 'Что, если посетитель сам поведет парусник? Он вращает настоящий штурвал, а&nbsp;ветер и&nbsp;волны сбивают его с&nbsp;курса. В&nbsp;конце&nbsp;— рассказ о&nbsp;месте и&nbsp;оценка точности.',
  'scanner': 'Как оживить чертеж корабля? Посетитель двигает экран на&nbsp;направляющих к&nbsp;чертежу&nbsp;— и&nbsp;на&nbsp;нем оживает 3D-модель корабля и&nbsp;видны его данные.',
}
for cid, text in DESC.items():
    q, rest = text.split('? ', 1)
    t, n = re.subn(rf'(<article class="card" id="{cid}">.*?<p class="card__desc reveal">).*?(</p>)', lambda m: m.group(1) + f'<span class="card__q">{q}?</span> {rest}' + m.group(2), t, count=1, flags=re.S); assert n, cid

# Под ценами — ссылка на страницу цен, потом частые вопросы и «Смотрите также»
SEE = ['muzei', 'vystavki', 'zastr', 'regiony', 'meropr', 'developery', 'video', 'mapping', 'scena', 'sayty', 'dizayn']
t, n = re.subn(r'(<section class="sect prices" id="prices">.*?</ul>\n)(      </div>\n    </section>\n)', lambda m: m.group(1) + p.prices_link() + m.group(2) + p.faq() + p.seealso(SEE), t, count=1, flags=re.S); assert n

t = re.sub(r'<title>.*?</title>', '<title>Интерактивные экспонаты для музеев и выставок — студия братьев Петрович</title>', t, count=1)
t = t.replace('https://petrovichbrothers.ru/"', 'https://petrovichbrothers.ru/works/eksponaty/"')
# Пути от /works/eksponaty/ к корню
def fix(m):
    attr, val = m.group(1), m.group(2)
    if re.match(r'(https?:|mailto:|tel:|#|/|\.\./|\./)', val) or val == '': return m.group(0)
    return f'{attr}="{B}{val}"'
t = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-video|data-preview|data-peek|data-peek-video|srcset)="([^"]*)"', fix, t)
t = t.replace(f'href="{B}./"', f'href="{B}"')
# Стол Хакасии теперь живет по новому адресу — ведем туда, а не на старый кейс
t = t.replace(f'href="{B}cases/khakasia/"', 'href="../khakasia/stol/"')
t = p.finish(t)
os.makedirs('works/eksponaty', exist_ok=True)
open('works/eksponaty/index.html', 'w', encoding='utf-8', newline='').write(t)
print('ok', len(t))
