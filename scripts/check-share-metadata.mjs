import assert from 'node:assert/strict';

export function checkShareMetadata(html, file, warn = console.warn) {
  for (const property of ['og:title', 'og:type', 'og:image', 'og:url']) {
    assert(html.includes(`property="${property}"`), `Missing ${property}: ${file}`);
  }
  if (!html.includes('property="og:image:alt"')) {
    warn(`Missing recommended og:image:alt: ${file}`);
  }
}
