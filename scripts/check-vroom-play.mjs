#!/usr/bin/env node
/* VROOM's 2P SPLIT and TRACK MAKER in the real machine (Electron, under xvfb), played with real keys.
     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/check-vroom-play.mjs
   THE MAKER: the title's eighth row opens it; a ring is painted with the pen, a jump put on it, the road named in the machine's own name box and saved: the file is in the machine's files at ::/Home/Vroom with the road
   and the jump in it; TEST DRIVE races it (the speed bar is lit by W) and the pause menu's QUIT is back in the maker; and the career in the save has nothing in it of a road of your own.
   THE SPLIT: the title's seventh row opens the 2P menu, START races two cars: W lights the speed bar in the top half only and the arrows light the bottom half only, every pixel of the picture is still one of the 128, and
   the career is the same after it as before. F11 makes the game fullscreen, as big as its shape allows, and it keeps up. Nothing in either leaves a page error. */
import { _electron as electron } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, ix, GREEN, RED } from '../apps/vroom/palette.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = mkdtempSync(join(tmpdir(), 'holytron-vroomplay-'));
const noSandbox = process.platform === 'linux' && (process.getuid?.() === 0 || process.env.CI);
const EXE = process.env.HOLYTRON_EXE;
let fails = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'} - ${m}${!c && d ? '   ' + d : ''}`); if (!c) fails++; };

const app = await electron.launch({ ...(EXE ? { executablePath: EXE } : {}), args: [...(EXE ? [] : [ROOT]), ...(noSandbox ? ['--no-sandbox'] : [])], env: { ...process.env, HOLYTRON_USER_DATA: profile } });
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });
const PALSET = new Set(PAL.map(c => c.join(',')));
/* the game's picture, whole or a band of rows of it: how many pixels are not one of the 128 colours, and a hash of what is there */
async function picture(y0, y1) {
  const px = await page.evaluate(() => { const cv = document.querySelector('.win canvas.gamecv'); if (!cv) return null; return { w: cv.width, h: cv.height, d: Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data) }; });
  if (!px) return null;
  let stray = 0, h = 0x811C9DC5;
  for (let y = y0 == null ? 0 : y0; y < (y1 == null ? px.h : y1); y++) for (let x = 0; x < px.w; x++) {
    const i = (y * px.w + x) * 4, k = px.d[i] + ',' + px.d[i + 1] + ',' + px.d[i + 2];
    if (!PALSET.has(k) || px.d[i + 3] !== 255) stray++;
    h ^= px.d[i] ^ (px.d[i + 1] << 8) ^ (px.d[i + 2] << 16); h = Math.imul(h, 16777619) >>> 0;
  }
  return { w: px.w, h: px.h, stray, hash: h };
}
/* the speed bar of the view whose bottom edge is `bottom`, read off the pixels: how many columns, counted from the bar's left end (x 271), are filled in the bar's own green or red in all four rows. A pixel of the scene
   that happens to be green is not a column of four, so a car going by behind the bar does not count. */
const FILL = [ix(GREEN, 10), ix(RED, 10)].map(i => PAL[i]);
const bar = bottom => page.evaluate(([b, fill]) => {
  const cv = document.querySelector('.win canvas.gamecv'); if (!cv) return null;
  const d = cv.getContext('2d').getImageData(271, b - 12, 44, 4).data, is = i => fill.some(f => d[i] === f[0] && d[i + 1] === f[1] && d[i + 2] === f[2]);
  let n = 0; for (let x = 0; x < 44; x++) { if (![0, 1, 2, 3].every(y => is((y * 44 + x) * 4))) break; n++; }
  return n;
}, [bottom, FILL]);
const tap = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await page.keyboard.press(k); await page.waitForTimeout(55); } };
const career = () => page.evaluate(() => localStorage.getItem('app_vroom_vroom.v1'));
/* the career has had nothing happen to it: no save at all yet, or a save that is the fresh one (no tips, no race, no time trial, no road, nothing of a road of your own) */
async function untouched() {
  const c = await career(); if (c === null) return true;
  const j = JSON.parse(c);
  return j.tips === 0 && j.earned === 0 && j.stats.races === 0 && !Object.keys(j.tt).length && !Object.keys(j.tracks).length && !Object.keys(j.stars).length && !/user:/.test(c);
}
/* both bars, sampled every 300 ms for `ms`: the highest each reached and the last reading (a busy machine runs the race slower than an idle one, so no one reading is trusted) */
async function watch(ms) {
  const hi = [0, 0]; let last = [0, 0];
  for (let t = 0; t < ms; t += 300) { await page.waitForTimeout(300); last = [await bar(90), await bar(180)]; hi[0] = Math.max(hi[0], last[0]); hi[1] = Math.max(hi[1], last[1]); }
  return { hi, last };
}
const readRoad = name => page.evaluate(async n => { const { fs } = await import('/kernel/vfs.js'); const r = await fs.read('::/Home/Vroom/' + n); return r && typeof r.content === 'string' ? r.content : null; }, name);

try {
  await page.setViewportSize?.({ width: 1400, height: 900 }).catch(() => {});
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setMinimumSize(1, 1); w.setContentSize(1400, 900); });
  await page.waitForFunction(() => typeof window.powerOn === 'function'); await page.evaluate(() => window.powerOn());
  await page.waitForSelector('#bootcursor', { state: 'attached', timeout: 30000 });
  await page.keyboard.press('Backquote');
  await page.waitForSelector('#icons .icon', { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.setItem('templeos.vroom.v1', '1'); window.CRT.sfx = 0; window.CRT.mus = 0; });
  await page.evaluate(async () => { const m = await import('/kernel/wm.js'); await m.openWindow('vroom'); });
  await page.waitForSelector('.win canvas.gamecv', { timeout: 8000 });
  await page.click('.win canvas.gamecv'); await page.waitForTimeout(900);
  const title = await picture();
  ok(title && title.w === 320 && title.stray === 0, 'the title is the game, every pixel one of the 128');

  /* ================= THE TRACK MAKER ================= */
  await tap('ArrowDown', 7); await tap('Enter'); await page.waitForTimeout(300);
  const empty = await picture();
  ok(empty && empty.stray === 0 && empty.hash !== title.hash, 'the title\'s eighth row opens the track maker (a different picture, still the 128)');
  await tap('ArrowLeft', 3); await tap('ArrowUp', 2);
  await tap('Enter'); await tap('ArrowRight', 6); await tap('ArrowDown', 4); await tap('ArrowLeft', 6); await tap('ArrowUp', 4); await tap('Enter');
  const ringed = await picture();
  ok(ringed && ringed.stray === 0 && ringed.hash !== empty.hash, 'a ring painted with the pen changes the picture (and the red boxes and arrows are still palette)');
  await tap('ArrowRight', 3); await tap('Digit2'); await tap('Enter');
  await tap('Tab'); await tap('ArrowDown', 12); await tap('Enter');
  await page.waitForSelector('.dlgpane input', { timeout: 4000 });
  await page.fill('.dlgpane input', 'GUI RING'); await page.press('.dlgpane input', 'Enter');
  await page.waitForTimeout(900);
  const text = await readRoad('GUI_RING.TRK');
  ok(text && /^VROOM ROAD 1\nNAME GUI RING\n/.test(text) && /\nJUMP 5,1\n/.test(text) && (text.match(/\nROAD ([^\n]+)\n/) || [, ''])[1].split(' ').length === 20, 'SAVE asks for a name in the machine\'s own box and writes ::/Home/Vroom/GUI_RING.TRK: twenty tiles of road and a jump', String(text).slice(0, 120));
  const listed = await page.evaluate(async () => { const { fs } = await import('/kernel/vfs.js'); return (await fs.list('::/Home/Vroom')).map(f => f.name); });
  ok(listed.includes('GUI_RING.TRK'), 'the folder is a real folder of the machine (' + listed.join(', ') + ')');
  /* TEST DRIVE: the menu's row 15 (we are on 12) */
  await tap('ArrowDown', 3); await tap('Enter'); await page.waitForTimeout(600);
  const grid = await bar(180);
  ok(grid === 0, 'TEST DRIVE starts a race: on the grid the speed bar is empty (' + grid + ')');
  await page.waitForTimeout(3800);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500);
  const fast = await bar(180);
  ok(fast > 15, 'and W lights it once the lights are out (' + fast + ' of 44 px)');
  await page.keyboard.up('KeyW');
  const racing = await picture();
  ok(racing && racing.stray === 0, 'the race on a road of your own is every pixel one of the 128');
  await tap('Escape'); await tap('ArrowDown', 2); await tap('Enter'); await page.waitForTimeout(400);
  const back = await picture();
  ok(back && back.hash !== racing.hash && back.stray === 0, 'QUIT from the pause menu is back in the maker');
  ok(await untouched(), 'and the career in the save has had nothing happen to it: nothing paid, no race counted, nothing of a road of your own in it');
  await tap('Escape'); await page.waitForTimeout(300);                           /* saved: one ESC leaves */
  const home = await picture();
  ok(home && home.stray === 0 && home.hash !== back.hash, 'ESC (nothing unsaved) leaves the maker for the title');

  /* ================= THE 2P SPLIT ================= */
  await tap('Escape'); await tap('ArrowDown');                               /* the title keeps its cursor: ESC sends it to QUIT and one more goes round to the first row */
  await tap('ArrowDown', 6); await tap('Enter'); await page.waitForTimeout(300);
  const menu = await picture();
  ok(menu && menu.stray === 0, 'the title\'s seventh row is the 2P menu');
  await tap('ArrowDown', 6); await tap('Enter'); await page.waitForTimeout(700);
  const split0 = await picture();
  ok(split0 && split0.stray === 0 && split0.hash !== menu.hash, 'START races two cars: the picture is cut in two, every pixel of both halves one of the 128');
  const top = await picture(0, 90), bot = await picture(90, 180);
  ok(top.hash !== bot.hash, 'and the halves are different views');
  await page.waitForTimeout(3700);
  const idle = [await bar(90), await bar(180)];
  await page.keyboard.down('KeyW');
  const w = await watch(4200);
  ok(w.hi[0] > 20 && w.hi[1] < 8, 'W (the left hand) lights the TOP half\'s speed bar and not the bottom\'s (top up to ' + w.hi[0] + ', bottom up to ' + w.hi[1] + ' of 44 px)');
  await page.keyboard.up('KeyW'); await page.keyboard.down('ArrowUp');
  const ar = await watch(4200);
  ok(ar.hi[1] > 20 && ar.last[0] < w.hi[0], 'the arrows (the right hand) light the BOTTOM half\'s (up to ' + ar.hi[1] + ') while the top car only coasts (' + w.hi[0] + ' to ' + ar.last[0] + ')');
  await page.keyboard.up('ArrowUp');
  const split1 = await picture();
  ok(split1 && split1.stray === 0 && split1.hash !== split0.hash, 'the race moves and every pixel of it is still one of the 128');
  await tap('Escape'); await tap('ArrowDown', 2); await tap('Enter'); await page.waitForTimeout(300);
  const menu2 = await picture();
  ok(menu2 && menu2.stray === 0, 'QUIT from the pause menu is back in the 2P menu');
  ok(await untouched(), 'and the career has had nothing happen to it: a second person\'s race pays nothing and keeps nothing');
  /* FULLSCREEN (F11): in a window the picture is a whole multiple of its pixels; fullscreen takes the largest of its shape that fits; it keeps up, and F11 again puts it back */
  const size = () => page.evaluate(() => { const r = document.querySelector('.win canvas.gamecv').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  const fps = () => page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  const small = await size();
  await page.click('.win canvas.gamecv'); await page.keyboard.press('F11'); await page.waitForTimeout(900);          /* (F11 is the front window's: a click makes sure it is) */
  const big = await size(), rate = await fps();
  ok(small.w % 320 === 0 && big.w > small.w * 1.5 && Math.abs(big.w / big.h - 320 / 180) < 0.02, 'in a window it is a whole multiple of 320 x 180 (' + small.w + ' x ' + small.h + '), and F11 gives it the largest picture of its shape the room holds (' + big.w + ' x ' + big.h + ')');
  ok(rate >= 20, 'and the window keeps up in fullscreen (' + rate.toFixed(0) + ' frames a second under the test display, at least 20)', rate.toFixed(1));
  const full = await picture();
  ok(full && full.stray === 0, 'the picture in fullscreen is still every pixel one of the 128');
  await page.keyboard.press('F11'); await page.waitForTimeout(700);
  ok((await size()).w === small.w, 'F11 again puts the window back (' + (await size()).w + ' px wide)');
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  fails++; console.log('FAIL - ' + (e && e.stack || e));
}
await app.close();
console.log(fails ? fails + ' FAILED' : 'vroom play: all ok');
process.exit(fails ? 1 : 0);
