// Собирает игру в один HTML-файл: стили и скрипты встраиваются в страницу.
//   node tools/build.mjs            → dist/astana.html (полный документ, можно открыть офлайн)
//   node tools/build.mjs --fragment → dist/astana-fragment.html (без <html>/<head>/<body>, для встраивания)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fragment = process.argv.includes('--fragment');
let html = readFileSync(join(root, 'index.html'), 'utf8');

const css = readFileSync(join(root, 'style.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`);
html = html.replace(/<script src="(src\/[\w.]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(root, src), 'utf8');
  if (js.includes('</script')) throw new Error(`${src} содержит </script> — его нельзя встроить`);
  return `<script>\n${js}</script>`;
});

if (fragment) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html[^>]*>\s*/gi, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body>\s*/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
}

const out = join(root, 'dist', fragment ? 'astana-fragment.html' : 'astana.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out} — ${(html.length / 1024).toFixed(0)} КБ`);
