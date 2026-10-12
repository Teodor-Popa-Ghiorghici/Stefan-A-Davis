#!/usr/bin/env node
/* THE VIEWER'S ARROWS (apps/viewer): walking through a folder of photographs is done quickly, with the pointer left on the arrow, and nothing in the window may move under it or answer a click meant for it.
   Real photographs (4:3, several MB each: the pane is filled by one, so a stray click lands on it), real mouse events:
     the bar is built once and is never empty: the arrows are where they were in every frame of every step, and the bar is one height;
     the arrows are a proper target (38 x 24 or more) and the photograph is not selectable or draggable;
     a single click on the photograph does nothing; FIT / 1:1 is a button, and a double click on the photograph does the same, but not within half a second of a step;
     presses faster than a photograph loads are steps all the same (five presses go five along), and a photograph that arrives after a newer press is not shown;
     the photograph stays until the next one is decoded: the pane is never empty between two photographs.
     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/check-viewer.mjs        (HOLYTRON_URL=http://127.0.0.1:8099/index.html runs it in plain Chromium) */
import { launchTarget } from './lib/target.mjs';

const t = await launchTarget();
const page = await t.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} - ${m}`); if (!c) fails++; };

await page.goto(t.url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.powerOn === 'function'); await page.evaluate(() => window.powerOn());
await page.waitForSelector('#bootcursor', { state: 'attached', timeout: 120000 });
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '~', code: 'Backquote', bubbles: true, cancelable: true })));
await page.waitForSelector('#shell', { state: 'visible', timeout: 15000 });
await page.waitForTimeout(800);

/* six 4:3 photographs of several MB each, in a folder of their own, and the viewer on the first */
const bytes = await page.evaluate(async () => {
  const { fs } = await import('/kernel/vfs.js');
  let total = 0;
  for (let i = 0; i < 6; i++) {
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200; const g = cv.getContext('2d');
    const id = g.createImageData(1600, 1200);
    for (let k = 0; k < id.data.length; k += 4) { const v = (Math.random() * 90) | 0; id.data[k] = 40 + v + i * 20; id.data[k + 1] = 60 + v; id.data[k + 2] = 90 + v; id.data[k + 3] = 255; }
    g.putImageData(id, 0, 0); g.fillStyle = '#fff'; g.font = '240px sans-serif'; g.fillText('PHOTO ' + (i + 1), 160, 640);
    const src = cv.toDataURL('image/png'); total += src.length;
    await fs.write(`::/Pics/P${i + 1}.BMP`, { type: 'image', content: '', src });
  }
  await (await import('/kernel/wm.js')).openWindow('viewer', { path: '::/Pics/P1.BMP', type: 'image' });
  return total;
});
console.log(`(six photographs, ${(bytes / 1e6).toFixed(0)} MB)`);
await page.waitForFunction(() => document.querySelectorAll('.vbar button').length >= 4 && document.querySelector('.imgpane img'), null, { timeout: 20000 });
await page.waitForTimeout(500);

const geo = () => page.evaluate(() => {
  const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; };
  const btn = s => [...document.querySelectorAll('.vbar button')].find(b => b.textContent === s);
  const img = document.querySelector('.imgpane img'), bar = document.querySelector('.vbar'), pane = document.querySelector('.imgpane');
  return { next: r(btn('>')), prev: r(btn('<')), bar: r(bar), pane: r(pane), img: r(img), actual: pane.classList.contains('actual'), title: (document.querySelector('.win .wtitle, .win .title') || document.querySelector('.win')).innerText.split('\n')[0], count: (document.querySelector('.vcount') || {}).textContent, fit: (btn('1:1') || btn('FIT') || {}).textContent };
});
const g0 = await geo();
const at = { x: g0.next.x + g0.next.w / 2, y: g0.next.y + g0.next.h / 2 };
ok(g0.next && g0.next.w >= 38 && g0.next.h >= 24, `the arrows are a proper target (${g0.next && g0.next.w} x ${g0.next && g0.next.h})`);
ok(g0.count === '1/6', `the bar says where you are (${g0.count})`);

/* ---- the bar and the arrows do not move or blank while photographs are read: sampled every frame ---- */
await page.evaluate(() => {
  const S = window.__s = { frames: 0, moved: 0, empty: 0, barH: new Set(), paneEmpty: 0 };
  const first = (() => { const b = [...document.querySelectorAll('.vbar button')].find(x => x.textContent === '>').getBoundingClientRect(); return [b.x, b.y, b.width, b.height].join(); })();
  const tick = () => {
    const bar = document.querySelector('.vbar'), pane = document.querySelector('.imgpane');
    const b = bar && [...bar.querySelectorAll('button')].find(x => x.textContent === '>');
    S.frames++; if (!b) S.empty++; else { const q = b.getBoundingClientRect(); if ([q.x, q.y, q.width, q.height].join() !== first) S.moved++; S.barH.add(Math.round(bar.getBoundingClientRect().height)); }
    if (pane && !pane.querySelector('img') && !pane.querySelector('canvas')) S.paneEmpty++;
    window.__raf = requestAnimationFrame(tick);
  };
  tick();
});
for (let i = 0; i < 5; i++) { await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.waitForTimeout(50); await page.mouse.up(); await page.waitForTimeout(900); }
const S = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return { ...window.__s, barH: [...window.__s.barH] }; });
ok(S.empty === 0 && S.moved === 0, `across five steps (${S.frames} frames) the > arrow is always there and never moves (${S.empty} frames without it, ${S.moved} moved)`);
ok(S.barH.length === 1, `and the bar is one height (${S.barH.join(', ')} px)`);
ok(S.paneEmpty === 0, `and the pane is never empty between two photographs (${S.paneEmpty} empty frames)`);
const g1 = await geo();
ok(g1.title.includes('P6.BMP') && g1.count === '6/6', `five presses went five along (${g1.title}, ${g1.count})`);

/* ---- a single click on the photograph does nothing; a double click does, and a button ---- */
const c = { x: g1.img.x + g1.img.w / 2, y: g1.img.y + g1.img.h / 2 };
const low = { x: g1.img.x + 40, y: g1.img.y + g1.img.h - 6 };                 /* the corner of the photograph just above the arrows */
await page.mouse.click(c.x, c.y); await page.waitForTimeout(150); ok(!(await geo()).actual, 'a click on the photograph leaves it as it is');
for (let i = 0; i < 4; i++) { await page.mouse.click(low.x + i * 9, low.y); await page.waitForTimeout(60); }
ok(!(await geo()).actual, 'so do four clicks in the corner just above the arrows (where a miss lands)');
await page.waitForTimeout(600);
await page.mouse.dblclick(c.x, c.y); await page.waitForTimeout(200);
const gd = await geo(); ok(gd.actual && gd.fit === 'FIT', `a double click on the photograph switches it to its actual size (the button now says ${gd.fit})`);
await page.evaluate(() => [...document.querySelectorAll('.vbar button')].find(b => b.textContent === 'FIT').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
await page.waitForTimeout(200);
const gb = await geo(); ok(!gb.actual && gb.fit === '1:1', 'and the button switches it back');
/* a double click aimed at an arrow that lands on the photograph just after a step does nothing */
await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up();
await page.waitForTimeout(250);
const g2 = await geo(), c2 = { x: g2.img.x + g2.img.w / 2, y: g2.img.y + g2.img.h / 2 };
await page.mouse.dblclick(c2.x, c2.y); await page.waitForTimeout(200);
ok(!(await geo()).actual, 'a double click on the photograph 0.3 s after a step is ignored');

/* ---- the photograph cannot be selected or dragged ---- */
const sel = await page.evaluate(() => { const i = document.querySelector('.imgpane img'); const cs = getComputedStyle(i); return { drag: i.draggable, us: cs.userSelect }; });
ok(sel.drag === false && sel.us === 'none', `the photograph is not draggable or selectable (draggable ${sel.drag}, user-select ${sel.us})`);

/* ---- rapid presses and the stale photograph: ten presses 30 ms apart end on the tenth place, once everything has loaded ---- */
const before = (await geo()).count;
for (let i = 0; i < 10; i++) { await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.waitForTimeout(15); await page.mouse.up(); await page.waitForTimeout(15); }
await page.waitForTimeout(2500);
const after = await geo();
const idx = Number(before.split('/')[0]), want = ((idx - 1 + 10) % 6) + 1;
ok(after.count === `${want}/6` && after.title.includes('P' + want + '.BMP'), `ten quick presses from ${before} end where ten steps go: ${want}/6 (${after.count}, ${after.title}): what is on the glass is where the last press went`);
ok(!after.actual, 'and the photograph was not touched by any of them');

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await t.close();
console.log(fails ? `${fails} FAILED` : 'check-viewer: ok');
process.exit(fails ? 1 : 0);
