# Сохраняем команду сборки /works/interactive/ для tools/build_pages.py.
# Тексты, вопросы и подборка — в texts/tags.md; крупные карточки — в make_tags.build.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_tags import build

if __name__ == '__main__':
    print('interactive', build('interactive'), 'полная')
