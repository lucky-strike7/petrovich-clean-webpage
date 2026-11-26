import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('english', Path(__file__).resolve().parents[1] / 'scripts/english.py')
english = importlib.util.module_from_spec(spec)
spec.loader.exec_module(english)

class CatalogTests(unittest.TestCase):
    def test_client_artwork_replaces_versioned_build_urls_only_for_english(self):
        source = '<a href="works/rosatom/"><img src="fresh/media/clients/rosatom.svg?v=oldhash" style="width: 68.7%"></a>'
        result = english.client_logos(source)
        self.assertIn('clients/en/rosatom.svg?v=', result)
        self.assertNotIn('oldhash', result)
        self.assertIn('href="works/rosatom/"', result)
        self.assertNotIn('<span', result)
        untouched = '<img src="fresh/media/clients/donstroy.svg?v=original">'
        self.assertEqual(english.client_logos(untouched), untouched)

    def test_changed_source_requires_review_and_never_reuses_old_translation(self):
        parser = english.Translator({'Старый текст': 'Approved English'}, 'works/example/index.html')
        parser.feed('<p>Новый текст</p>')
        self.assertEqual(parser.pending, {'Новый текст': ['works/example/index.html']})
        self.assertNotIn('Approved English', ''.join(parser.output))

    def test_attributes_entities_and_structured_data_are_translated_without_changing_links(self):
        parser = english.Translator({'Текст проекта': 'Project & story'}, 'index.html')
        parser.feed('<html lang="ru"><a href="/works/" title="Текст проекта">Текст&nbsp;проекта</a><script type="application/ld+json">{"name":"Текст проекта","url":"/works/"}</script></html>')
        result = ''.join(parser.output)
        self.assertIn('lang="en"', result)
        self.assertIn('href="/works/"', result)
        self.assertIn('title="Project &amp; story"', result)
        self.assertIn('>Project &amp; story</a>', result)
        self.assertIn('"name": "Project & story"', result)
        self.assertEqual(parser.pending, {})

    def test_inline_translation_preserves_english_word_boundaries(self):
        parser = english.Translator({'Вставки': 'Inserts', ', которые объясняют.': 'that explain.'}, 'index.html')
        parser.feed('<p><span>Вставки</span>, которые объясняют.</p>')
        self.assertIn('</span> that explain.', ''.join(parser.output))

if __name__ == '__main__':
    unittest.main()
