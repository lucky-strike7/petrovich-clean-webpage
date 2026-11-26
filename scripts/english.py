"""Build English pages from shared Russian markup and a reviewed string catalog.

Only HTML and text metadata are duplicated; all media, CSS and JavaScript stay shared.
New/changed source strings are reported without modifying approved translations.
"""
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import gzip
import math
import struct

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'locales/en/messages.json'
ATTRS = {'alt', 'title', 'aria-label', 'placeholder', 'content', 'data-title', 'data-cursor'}
CYRILLIC = re.compile('[А-Яа-яЁё]')


def key(value):
    return re.sub(r'\s+', ' ', value).strip()


def pages(root):
    return [root / 'index.html', root / '404.html', *sorted(
        p for section in ['works', 'services', 'prices', 'about', 'privacy', 'consent']
        for p in (root / section).rglob('*.html'))]


class Translator(HTMLParser):
    def __init__(self, messages, path):
        super().__init__(convert_charrefs=True)
        self.messages, self.path = messages, path
        self.output, self.pending, self.seen = [], {}, set()
        self.raw = None
        self.raw_json = False

    def translate(self, value):
        normalized = key(value)
        if not CYRILLIC.search(normalized):
            return value
        self.seen.add(normalized)
        if normalized not in self.messages:
            self.pending.setdefault(normalized, []).append(self.path)
            return value
        leading = re.match(r'^\s*', value)[0]
        trailing = re.search(r'\s*$', value)[0]
        translated = self.messages[normalized]
        # Inline emphasis often splits a sentence immediately before punctuation.
        # English may move or remove that punctuation when changing word order.
        if translated.startswith(('.', ',', ':', ';', '!', '?')):
            leading = ''
        elif normalized.startswith(('.', ',', ':', ';')) and translated[:1].isalnum() and not leading:
            leading = ' '
        return leading + translated + trailing

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        def attribute(match):
            name, quote, value = match.groups()
            if name.lower() in ATTRS:
                translated = self.translate(html.unescape(value))
                return name + '=' + quote + html.escape(translated, quote=True) + quote
            return match[0]
        raw = re.sub(r'([\w:-]+)\s*=\s*([\"\'])(.*?)\2', attribute, raw, flags=re.S)
        if tag == 'html':
            raw = re.sub(r'lang=[\"\']ru[\"\']', 'lang="en"', raw)
        if tag in ('script', 'style'):
            self.raw = tag
            self.raw_json = dict(attrs).get('type') == 'application/ld+json'
        self.output.append(raw)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.output.append('</' + tag + '>')
        if tag == self.raw:
            self.raw = None

    def handle_data(self, data):
        if self.raw_json and self.raw == 'script':
            def walk(value):
                if isinstance(value, str):
                    return self.translate(value)
                if isinstance(value, list):
                    return [walk(x) for x in value]
                if isinstance(value, dict):
                    return {k: walk(v) for k, v in value.items() if not (k == 'address' and value.get('@type') == 'Organization')}
                return value
            self.output.append(json.dumps(walk(json.loads(data)), ensure_ascii=False).replace('</', '<\\/'))
        elif self.raw:
            self.output.append(data)
        else:
            self.output.append(html.escape(self.translate(data), quote=False))

    def handle_comment(self, data):
        self.output.append('<!--' + data + '-->')

    def handle_decl(self, data):
        self.output.append('<!' + data + '>')


def client_logos(text):
    manifest = json.loads((ROOT / 'locales/en/client-logos.json').read_text())
    def replace(match):
        tag, filename = match.group(0), match.group(1).split("?", 1)[0]
        item = manifest.get(filename)
        if not item:
            return tag
        if 'asset' in item:
            asset = ROOT / 'fresh/media/clients/en' / item['asset']
            data = asset.read_bytes()
            digest = hashlib.sha256(data).hexdigest()[:12]
            tag = re.sub(r'clients/' + re.escape(filename) + r'(?:\?[^"\']*)?', 'clients/en/' + item['asset'] + '?v=' + digest, tag)
            if asset.suffix == '.svg':
                viewbox = re.search(r'viewBox=["\']([^"\']+)', data.decode())[1]
                width, height = map(float, viewbox.replace(',', ' ').split()[2:])
            else:
                width, height = struct.unpack('>II', data[16:24])
            ratio = width / height
            scale = {'etalon.svg': .88, 'modul.svg': 1.15}.get(filename, 1)
            width = min(math.sqrt(.1 * ratio), .76, .28 * ratio) * scale * 100
            return re.sub(r'width:\s*[\d.]+%', f'width: {width:.1f}%', tag)
        return tag
    return re.sub(r'<img\b[^>]*src=["\'][^"\']*fresh/media/clients/([^"\'/]+)["\'][^>]*>', replace, text)


def contacts(text):
    # Keep the original forms and navigation; localise only the contact details.
    text = text.replace('art@petrovichbrothers.ru', 'ars@petrovichbrothers.com')
    text = text.replace('https://t.me/artem_petrovich_1', 'https://t.me/ArsenyPetrovich')
    text = text.replace('tel:+79151978652', 'https://wa.me/79268521102')
    text = text.replace('+79151978652', '+79268521102')
    text = re.sub(r'(<a\b[^>]*href="https://wa.me/79268521102"[^>]*>).*?</a>', r'\1WhatsApp ↗</a>', text, flags=re.S)
    text = re.sub(r'\+7[\s\u00a0]*915[\s\u00a0]*197[-–\s\u00a0]*86[-–\s\u00a0]*52', 'WhatsApp', text)
    return text


def international_presentation(text, relative):
    text = re.sub(r'<form\b[^>]*class="callback[^"]*"[^>]*>[\s\S]*?</form>', '', text)
    # Project locations remain factual; remove the studio's postal address and location label.
    text = re.sub(r'(<p class="about__label[^"\']*">)Moscow<br>', r'\1', text)
    if relative == 'index.html':
        text = text.replace('<h1 class="about__text">Petrovich Brothers Multimedia Studio</h1>', '<h1 class="about__text"><span class="title-line">Petrovich Brothers</span> <span class="title-line">Multimedia Studio</span></h1>')
    if relative == 'privacy/index.html':
        text = re.sub(r"<p>The studio's underlying policy refers to Russian Federal Law No\.[\s\S]*?</p>", '', text)
        text = re.sub(r'<p>We process the phone number[\s\S]*?</p>', '<p>We use contact details and project information you choose to send us to respond to your enquiry and discuss your project.</p>', text)
        text = re.sub(r'<li>Yandex Metrica is not enabled on the English domain\.[\s\S]*?</li>', '<li>Yandex Metrica is not enabled on this website.</li>', text)
    return text


def prices(text):
    pricing = json.loads((ROOT / 'locales/en/pricing.json').read_text())
    def amount(match):
        rub = str(int(match[2]) * 1000)
        if rub not in pricing['amountsRubToUsd']:
            raise ValueError(f'Unreviewed English starting price: RUB {rub}')
        return match[1] + format(pricing['amountsRubToUsd'][rub], ',') + match[3]
    return re.sub(r'(<span class="price__num">)(\d+)(</span>)', amount, text)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    messages = json.loads(CATALOG.read_text()) if CATALOG.exists() else {}
    source = ROOT / 'dist' if mode == 'build' else ROOT
    pending, sources, outputs, seen = {}, {}, {}, set()
    for path in pages(source):
        relative = str(path.relative_to(source))
        text = path.read_text()
        parser = Translator(messages, relative)
        parser.feed(text)
        parser.close()
        seen.update(parser.seen)
        for value, locations in parser.pending.items():
            pending.setdefault(value, []).extend(locations)
        sources[relative] = hashlib.sha256(text.encode()).hexdigest()
        translated = ''.join(parser.output)
        translated = translated.replace('https://petrovichbrothers.ru', 'https://petrovichbrothers.com')
        translated = translated.replace('ru_RU', 'en_US')
        translated = client_logos(translated)
        translated = contacts(translated)
        translated = prices(translated)
        translated = international_presentation(translated, relative)
        path_url = '/' if relative == 'index.html' else '/' + relative.removesuffix('index.html')
        if relative != '404.html':
            alternates = ''.join(f'<link rel="alternate" hreflang="{lang}" href="https://petrovichbrothers.{domain}{path_url}">'
                                 for lang, domain in [('ru', 'ru'), ('en', 'com')])
            translated = translated.replace('</head>', alternates + '</head>')
        style_hash = hashlib.sha256((ROOT / 'fresh/english.css').read_bytes()).hexdigest()[:12]
        script_hash = hashlib.sha256((ROOT / 'fresh/english.js').read_bytes()).hexdigest()[:12]
        translated = translated.replace('</head>', f'<link rel="stylesheet" href="/fresh/english.css?v={style_hash}"></head>')
        translated = translated.replace('</body>', f'<script src="/fresh/english.js?v={script_hash}"></script></body>')
        outputs[relative] = translated
    report = {'pages': len(outputs), 'activeStrings': len(seen), 'pending': pending,
              'unusedStrings': sorted(set(messages) - seen)}
    (ROOT / 'locales/en/pending.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'English: {len(outputs)} pages; {len(pending)} source strings need translation/review.')
    if mode == 'extract':
        return
    if pending:
        sys.exit(1)
    if mode == 'build':
        destination = ROOT / 'dist/en'
        for relative, text in outputs.items():
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
        for name in ['sitemap.xml', 'robots.txt', 'site.webmanifest']:
            value = (source / name).read_text().replace('petrovichbrothers.ru', 'petrovichbrothers.com')
            if name == 'robots.txt':
                value = 'User-agent: Yandex\nDisallow: /\n\n' + value
            if name == 'site.webmanifest':
                value = json.dumps({'name': 'Petrovich Brothers', 'short_name': 'Petrovich Brothers', 'lang': 'en',
                                    'start_url': '/', 'display': 'browser', 'icons': json.loads(value).get('icons', [])})
            (destination / name).write_text(value)
        for target in destination.rglob('*'):
            if target.is_file():
                target.with_name(target.name + '.gz').write_bytes(gzip.compress(target.read_bytes(), mtime=0))


if __name__ == '__main__':
    main()
