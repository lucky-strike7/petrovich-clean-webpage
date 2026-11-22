"""Блок «Клиенты»: сетка черно-белых логотипов, каждый ведет на работу для этого клиента.

Логотипы лежат в fresh/media/clients/. Порядок примерно по крупности компании.
Размер каждого логотипа подбирается по пропорциям, чтобы у всех была примерно одинаковая площадь.
"""
import math
import os
import re

from PIL import Image

from v2parts import SITE

DIR = 'fresh/media/clients/'

# файл, название, ссылка на работу, поправка размера для тонких или жирных логотипов
CLIENTS = (
    ('rosatom.svg', 'Росатом', 'rosatom'),
    ('rostec.svg', 'Ростех', 'rostec-skolkovo'),
    ('rusal.svg', 'Русал', 'rusal-future'),
    ('rusnano.svg', 'Роснано', 'rosnano'),
    ('fosagro.svg', 'ФосАгро', 'fosagro'),
    ('hbo.svg', 'HBO', 'hbo', .75),
    ('lafargeholcim.svg', 'LafargeHolcim', 'lafargeholcim'),
    ('eurocement.png', 'Евроцемент', 'eurocement'),
    ('carrera.svg', 'Carrera y Carrera', 'carrera', 1.15),  # перед узким КРЭТ, чтобы справа было место
    ('kret.svg', 'КРЭТ', 'kret-report'),
    ('artmonta.svg', 'Артмонта', 'artmonta', .9),
    ('etalon.svg', 'Эталон', 'etalon', .88),
    ('referus.svg', 'Реферус', 'referus', 1.2),
    ('amperka.svg', 'Амперка', 'cyberbug'),
    ('donstroy.svg', 'Донстрой', 'donstroy'),
    ('amber.svg', 'Янтарный комбинат', 'yantarny', 1.35),
    ('innopolis.svg', 'Иннополис', 'innopolis'),
    ('novy-chersones.svg', 'Новый Херсонес', 'khersones', 1.25),
    ('nanolek.png', 'Нанолек', 'nanolek'),
    ('ator.svg', 'АТОР', 'ator'),
    ('modul.svg', 'Модуль', 'modul', 1.15),
    ('zebra-bw.png', 'Зебра логистикс', 'zebralog'),
    ('arzamas.svg', 'Arzamas', 'arzamas', .85),
    ('tamozhennaya-karta.svg', 'Таможенная карта', 'tamozhennaya-karta', 1.1),
)

AREA = .1                # площадь логотипа в квадратах ширины ячейки
MAX_W, MAX_H = .76, .28  # пределы ширины и высоты в долях ширины ячейки


def ratio(name):
    path = os.path.join(SITE, DIR, name)
    if name.endswith('.svg'):
        box = re.search(r'viewBox="([^"]+)"', open(path, encoding='utf-8', errors='ignore').read())[1]
        w, h = map(float, box.replace(',', ' ').split()[2:])
    else:
        w, h = Image.open(path).size
    return w / h


def render_clients():
    items = []
    for name, title, work, *fix in CLIENTS:
        r = ratio(name)
        w = min(math.sqrt(AREA * r), MAX_W, MAX_H * r) * (fix[0] if fix else 1)
        items.append(
            f'          <li><a href="works/{work}/" title="{title}">'
            f'<img src="{DIR}{name}" alt="{title}" style="width: {w * 100:.1f}%" loading="lazy"></a></li>')
    joined = '\n'.join(items)
    return f'''    <section class="sect clients" id="clients">
      <h2 class="sect__label reveal">Клиенты</h2>
      <div class="sect__body">
        <ul class="clients__grid reveal">
{joined}
        </ul>
      </div>
    </section>
'''
