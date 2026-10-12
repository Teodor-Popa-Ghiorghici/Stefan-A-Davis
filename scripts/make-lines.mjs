#!/usr/bin/env node
/* node scripts/make-lines.mjs -- count the lines of the machine itself and write assets/lines.json, which the LINES command and Charter.DD's button read.
   The Charter allowed 100,000 lines for everything; this says how the machine is doing against it, honestly. What counts is what ships and runs: index.html,
   kernel/, apps/ and electron/, as .js .cjs .mjs .css .html, without the dev-only checks (`*_check*.js`, the harnesses, the budget bots, the renderer's test town: the files electron-builder.yml leaves out of the package). Run it again before a release. */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXT = new Set(['.js', '.cjs', '.mjs', '.css', '.html']);
const SKIP = /(_check[a-z_]*\.js$|^check_kit\.js$|^headless_harness\.js$|^budget_[a-z_]*\.js$|^raster_scene\.js$)/;

const count = f => { const s = readFileSync(f, 'utf8'); let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n + (s.length && s.charCodeAt(s.length - 1) !== 10 ? 1 : 0); };
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name), st = statSync(f);
    if (st.isDirectory()) walk(f, out);
    else if (EXT.has(extname(name)) && !SKIP.test(name)) out.push({ f, lines: count(f) });
  }
  return out;
}
const area = (name, files) => ({ name, lines: files.reduce((a, x) => a + x.lines, 0), files: files.length });

const kernel = walk(join(ROOT, 'kernel'), []), electron = walk(join(ROOT, 'electron'), []);
const apps = readdirSync(join(ROOT, 'apps')).map(id => {
  const d = join(ROOT, 'apps', id);
  return statSync(d).isDirectory() ? area(id, walk(d, [])) : null;
}).filter(Boolean);
const loose = readdirSync(join(ROOT, 'apps')).filter(n => EXT.has(extname(n)) && !SKIP.test(n)).map(n => ({ f: n, lines: count(join(ROOT, 'apps', n)) }));
const rest = [{ f: 'index.html', lines: count(join(ROOT, 'index.html')) }].concat(loose);
const areas = [area('kernel', kernel), ...apps.sort((a, b) => b.lines - a.lines), area('electron', electron), area('the page and shared app kits', rest)];
const total = areas.reduce((a, x) => a + x.lines, 0), files = areas.reduce((a, x) => a + x.files, 0);
writeFileSync(join(ROOT, 'assets', 'lines.json'), JSON.stringify({ total, files, areas }, null, 1) + '\n');
console.log(`${total.toLocaleString()} lines in ${files.toLocaleString()} files; the Charter allowed 100,000 (${(total / 1000).toFixed(0)}%). Wrote assets/lines.json.`);
