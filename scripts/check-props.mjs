#!/usr/bin/env node
/* The folders a mastered game leaves on the desktop: every game's props() draws without a hole in it (each name listed becomes a real file), the folder names the ledger lists
   (kernel/trophy_props.js FOLDER_OF) are the ones each game's props.js says, a folder is made once and is made of real files in the VFS (PNGs with a picture in them, programs as
   .HC), and earning a mastery makes its folder by itself.

     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/check-props.mjs */
import { launchTarget } from './lib/target.mjs';

const t = await launchTarget();
const page = await t.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(t.url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.powerOn === 'function'); await page.evaluate(() => window.powerOn());
await page.waitForSelector('#bootcursor', { state: 'attached', timeout: 30000 });
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '~', code: 'Backquote', bubbles: true, cancelable: true })));
await page.waitForSelector('#shell', { state: 'visible', timeout: 15000 });
await page.waitForTimeout(800);

let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS' : 'FAIL') + ' - ' + m); };

const r = await page.evaluate(async () => {
  const { GAMES, FOLDER_OF, GATED_FOLDERS, makeProps } = await import('/kernel/trophy_props.js');
  const { render } = await import('/apps/prop_kit.js');
  const { fs } = await import('/kernel/vfs.js');
  const out = { games: {}, names: [], made: {} };
  for (const g of Object.keys(GAMES)) {
    const mod = await GAMES[g](), list = await mod.props(), files = await render(list);
    const px = files.filter(f => f.canvas).map(f => { const c = f.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; });
    out.games[g] = { listed: list.length, files: files.length, blank: px.filter(n => n === 0).length, images: px.length };
    const row = FOLDER_OF[g] || GATED_FOLDERS[g];
    if (!row || row[0] !== mod.FOLDER || row[1] !== mod.NAME) out.names.push(g + ': ' + row + ' vs ' + mod.FOLDER + ', ' + mod.NAME);
  }
  /* one folder, made for real */
  const n = await makeProps('garden', { quiet: true });
  const names = await fs.list('::/GardenProps');
  const rec = await fs.read('::/GardenProps/POT_TERRACOTTA_POT.PNG');
  out.made = { n, listed: names.length, type: rec && rec.type, src: rec && rec.src && rec.src.slice(0, 22), readme: !!(await fs.read('::/GardenProps/README.TXT')), flag: JSON.parse(localStorage.getItem('templeos.props.v1') || '{}').garden };
  /* a mastery earned makes its own */
  window.Trophies.award('mastery_cook', true); window.Trophies.st.earned.mastery_cook = Date.now();
  window.dispatchEvent(new CustomEvent('trophy-earned', { detail: { id: 'mastery_cook', mastery: true } }));
  await new Promise(r => setTimeout(r, 2500));
  out.cook = (await fs.list('::/CookProps')).length;
  return out;
});
Object.keys(r.games).forEach(g => { const x = r.games[g]; ok(x.files === x.listed && x.images >= (g === 'holyc' ? 0 : 8) && x.blank === 0, g + ': ' + x.listed + ' listed, ' + x.files + ' drawn, ' + x.images + ' pictures, ' + x.blank + ' blank'); });
ok(r.games.holyc.files > 80, 'HOLYC.EXE leaves its programs (' + r.games.holyc.files + ' files)');
ok(r.names.length === 0, 'the folder names the ledger lists are the games\' own' + (r.names.length ? ': ' + r.names.join('; ') : ''));
ok(r.made.n > 40 && r.made.listed >= r.made.n && r.made.type === 'image' && /^data:image\/png/.test(r.made.src || '') && r.made.readme && r.made.flag === r.made.n, 'a folder is made of real PNGs and a README, and remembered (' + JSON.stringify(r.made) + ')');
ok(r.cook >= 9, 'earning a mastery makes its folder by itself (' + r.cook + ' files in CookProps)');
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
await t.close();
console.log(fails ? '\n' + fails + ' FAILED' : '\nprops: all ok');
process.exit(fails ? 1 : 0);
