"""Render a standalone page with the site's shared header and contact section."""
from pathlib import Path
import html
import re

from v2parts import SITE


def build_info_page(page, slug, body, title, description):
    root = Path(SITE)
    base = page.B
    template = (root / '_src/index.html').read_text(encoding='utf-8')
    template, count = re.subn(r'<main>.*?(\n    <section class="contact" id="contact">)',
                             lambda match: '<main>\n' + body + match[1], template, count=1, flags=re.S)
    assert count == 1
    template = re.sub(r'<header class="top">.*?</header>', lambda _: page.header(), template, count=1, flags=re.S)
    template = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', template, count=1)
    for attr, name, value in (
        ('name', 'description', description),
        ('property', 'og:title', title),
        ('property', 'og:description', description),
    ):
        template = re.sub(fr'(<meta {attr}="{name}" content=")[^"]*(">)',
                          lambda m: m[1] + html.escape(value) + m[2], template, count=1)
    template = re.sub(r'(<link rel="canonical" href="|<meta property="og:url" content=")https://petrovichbrothers.ru/"',
                      lambda match: match[1] + f'https://petrovichbrothers.ru/{slug}/"', template)
    template = re.sub(r'\n  <link rel="preload" as="image" href="fresh/media/khakasy-render[^>]*>', '', template)

    def relative_to_root(match):
        attr, value = match.groups()
        if not value or re.match(r'(?:[a-z]+:|/|#|\./|\.\./)', value, flags=re.I):
            return match[0]
        return f'{attr}="{base}{value}"'

    template = re.sub(r'\b(href|src|data-src|data-poster|data-poster-m|data-preview|data-peek|data-peek-video)="([^"]*)"',
                      relative_to_root, template)
    template = page.finish(template).replace('class="page-v2"', f'class="page-v2 page-{slug}"', 1)
    template = template.replace('</head>', f'  <link rel="stylesheet" href="{base}fresh/{slug}-page.css?v=4">\n</head>', 1)
    out = root / slug / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(template, encoding='utf-8', newline='\n')
