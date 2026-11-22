import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const boundWords = 'в во на о об обо к ко с со от ото до по за из изо у без безо для под подо над надо при про через чрез перед передо между меж около возле вокруг внутри вне вдоль вдали вместо кроме среди посреди сквозь после против из-за из-под из‑за из‑под ради мимо близ поверх сверх ввиду вследствие насчёт насчет путём путем посредством благодаря вопреки согласно относительно а и но или не ни';
const binding = new RegExp('(?<![\\p{L}\\p{M}\\p{N}_-])(?:' + boundWords.split(' ').join('|') +
  ')([ \\t\\r\\n]+)(?=[\\p{L}\\p{N}«„“"(№]|&(?:laquo|quot);)', 'giu');
const inlineTag = /^<\/?(?:a|b|i|em|strong|span|small|sup|sub|s|u|mark|abbr|label|time)\b/i;
const token = /<!--[\s\S]*?-->|<(script|style|svg|textarea|pre|code|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>|[^<]+|</gi;

// Work on the continuous visible text of each block, including words next to an inline link.
// The edits refer only to whitespace in text nodes. Tags and attributes stay byte-for-byte intact.
function formatRun(parts) {
  const text = parts.filter(part => !part.startsWith('<')).join('');
  const edits = new Map();
  for (const match of text.matchAll(binding)) {
    const start = match.index + match[0].length - match[1].length;
    edits.set(start, '&nbsp;');
    for (let i = 1; i < match[1].length; i++) edits.set(start + i, '');
  }
  if (!edits.size) return parts.join('');
  let position = 0;
  return parts.map(part => {
    if (part.startsWith('<')) return part;
    const start = position;
    position += part.length;
    return part.replace(/[ \t\r\n]/g, (space, offset) => edits.get(start + offset) ?? space);
  }).join('');
}

// Short hyphenated words (3D-модели, IT-решения, QR-код, из-за) must not break at the hyphen.
const shortHyphen = /(?<![\p{L}\p{N}_-])([\p{L}\p{N}]{1,3}[-‑][\p{L}\p{N}]+(?:[-‑][\p{L}\p{N}]+)*)/gu;
const nowrapOpen = '<span class="nowrap">';
function keepHyphens(html) {
  return html.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i, (_, open, body, close) => {
    let out = open, prev = '';
    for (const [part] of body.matchAll(token)) {
      if (part.startsWith('<') || prev === nowrapOpen) out += part;
      else out += part.replace(shortHyphen, nowrapOpen + '$1</span>');
      prev = part;
    }
    return out + close;
  });
}

export function bindPrepositions(html) {
  return keepHyphens(bindPrepositionsOnly(html));
}

function bindPrepositionsOnly(html) {
  return html.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i, (_, open, body, close) => {
    let out = open, parts = [];
    for (const [part] of body.matchAll(token)) {
      if (!part.startsWith('<') || inlineTag.test(part) || part.startsWith('<!--')) {
        parts.push(part);
      } else {
        out += formatRun(parts) + part;
        parts = [];
      }
    }
    return out + formatRun(parts) + close;
  });
}

// Format the same pages served by the local preview after regenerating their HTML.
async function formatFiles(dir, names) {
  for (const name of names) {
    const path = join(dir, name);
    if (name.endsWith('.html')) {
      const original = await readFile(path, 'utf8');
      const formatted = bindPrepositions(original);
      if (formatted !== original) await writeFile(path, formatted);
    } else {
      const children = await readdir(path, { withFileTypes: true });
      await formatFiles(path, children.filter(entry => entry.isDirectory() || entry.name.endsWith('.html')).map(entry => entry.name));
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await formatFiles(fileURLToPath(new URL('../', import.meta.url)), [
    'index.html', '404.html', 'works', 'about', 'services', 'prices', 'privacy', 'consent',
  ]);
}
