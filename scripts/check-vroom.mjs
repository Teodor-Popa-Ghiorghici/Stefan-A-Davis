#!/usr/bin/env node
/* VROOM in the real machine (Electron, under xvfb): the gate end to end, and later the game itself.
     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/check-vroom.mjs
   Phase 0: a machine with nothing earned shows nothing of it (no icon, GO TO, the terminal answers `vroom` like any unknown word) and a window asked for by hand is the black NOT YET.; the same machine
   with the two hundredth trophy in its save opens the gate at boot (key, icon in the games' corner, one toast, GO TO, the terminal, the game's title), and RESTORE SYSTEM FILES brings a deleted icon back.
   Later phases add to the end: the game played with real keys. A check that drives the game sets templeos.vroom.v1 first. */
import { _electron as electron } from 'playwright';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = mkdtempSync(join(tmpdir(), 'holytron-vroom-'));
const noSandbox = process.platform === 'linux' && (process.getuid?.() === 0 || process.env.CI);
const EXE = process.env.HOLYTRON_EXE;
let fails = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'} - ${m}${!c && d ? '   ' + d : ''}`); if (!c) fails++; };

const launch = () => electron.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: [...(EXE ? [] : [ROOT]), ...(noSandbox ? ['--no-sandbox'] : [])],
  env: { ...process.env, HOLYTRON_USER_DATA: profile },
});
async function boot(app) {
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });
  await page.setViewportSize?.({ width: 1400, height: 900 }).catch(() => {});
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setMinimumSize(1, 1); w.setContentSize(1400, 900); });
  await page.waitForFunction(() => typeof window.powerOn === 'function'); await page.evaluate(() => window.powerOn());
  await page.waitForSelector('#bootcursor', { state: 'attached', timeout: 30000 });
  await page.keyboard.press('Backquote');
  await page.waitForSelector('#icons .icon', { timeout: 30000 });
  await page.waitForTimeout(1200);
  return { page, errors };
}
const iconNames = page => page.evaluate(() => [...document.querySelectorAll('#icons .icon')].map(e => e.dataset.name));
/* GO TO: what the box lists for a few letters */
async function goTo(page, q) {
  await page.keyboard.press('Control+Space');
  await page.waitForSelector('#launcher .lnch-q', { timeout: 5000 });
  await page.fill('#launcher .lnch-q', q);
  await page.waitForTimeout(250);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#launcher .lnch-row')].map(r => r.textContent));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  return rows;
}
/* the terminal: open one, type a line, read what came back */
async function term(page, line) {
  await page.evaluate(async () => { const m = await import('/kernel/wm.js'); await m.openWindow('terminal'); });
  await page.waitForSelector('.terminput', { timeout: 5000 });
  const before = await page.evaluate(() => document.querySelector('.termout').children.length);
  await page.fill('.terminput', line);
  await page.press('.terminput', 'Enter');
  await page.waitForTimeout(700);
  /* what came back, not the line that was typed (the terminal echoes it first, after its prompt) */
  return (await page.evaluate(n => [...document.querySelector('.termout').children].slice(n).map(c => c.textContent), before)).filter(l => !/^::.*>/.test(l));
}
const winTitles = page => page.evaluate(() => [...document.querySelectorAll('.win .titlebar .t')].map(e => e.textContent));
/* the pixels of the first game canvas in a window: { w, h, colours: Set of 'rrggbb', lit } */
const canvasOf = page => page.evaluate(() => {
  const cv = document.querySelector('.win canvas.gamecv'); if (!cv) return null;
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, cols = {};
  for (let i = 0; i < d.length; i += 4) { const k = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0'); cols[k] = (cols[k] || 0) + 1; }
  return { w: cv.width, h: cv.height, cols };
});

try {
  /* ---- 1. a machine with nothing earned ---- */
  let app = await launch();
  let { page, errors } = await boot(app);
  ok((await iconNames(page)).indexOf('Vroom') < 0, 'virgin: no Vroom icon on the desktop', (await iconNames(page)).join());
  ok(await page.evaluate(() => localStorage.getItem('templeos.vroom.v1')) === null, 'virgin: the key is not set');
  for (const q of ['vroom', 'vro', 'racing', 'laps', 'courier']) {
    const rows = await goTo(page, q);
    ok(!rows.some(r => /VROOM/i.test(r)), `virgin: GO TO "${q}" does not list it`, rows.join(' | '));
  }
  const say = await term(page, 'vroom');
  ok(say.length > 0 && !say.some(l => /OPENED|ENGINE|VROOM/i.test(l)), 'virgin: the terminal answers VROOM like any unknown word', say.join(' | '));
  const say2 = await term(page, 'open vroom');
  ok(say2.some(l => /NOT FOUND/.test(l)), 'virgin: OPEN VROOM is NOT FOUND', say2.join(' | '));
  const tab = await page.evaluate(() => { const i = document.querySelector('.terminput'); i.value = 'vro'; return i.value; });
  await page.press('.terminput', 'Tab'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('.terminput').value) === tab, 'virgin: Tab on "vro" completes to nothing');
  ok(!(await winTitles(page)).some(t => /VROOM/i.test(t)), 'virgin: no window of it is open');
  /* a window asked for by hand (devtools): the black NOT YET. */
  await page.evaluate(async () => { const m = await import('/kernel/wm.js'); await m.openWindow('vroom'); });
  await page.waitForSelector('.win canvas.gamecv', { timeout: 5000 });
  await page.waitForTimeout(300);
  const nope = await canvasOf(page);
  const keys = nope ? Object.keys(nope.cols) : [];
  ok(nope && nope.w === 320 && nope.h === 180 && keys.every(k => k === '000000' || k === 'aaaaaa') && nope.cols.aaaaaa > 40 && nope.cols.aaaaaa < 800, 'virgin: asked for by hand it is a 320 x 180 black picture with a little grey writing', JSON.stringify(nope && nope.cols));
  ok((await winTitles(page)).some(t => /VROOM\.EXE/.test(t)), 'virgin: the window is titled VROOM.EXE (it is the app\'s own, not a hint)');
  ok(await page.evaluate(() => localStorage.getItem('templeos.vroom.v1')) === null, 'virgin: opening it by hand does not open the gate');
  ok(errors.length === 0, 'virgin: no page errors', errors.join(' | '));

  /* put the two hundredth trophy into the save, and let the durable store take it before the machine goes off */
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('templeos.trophies.v1') || 'null') || { v: 1, earned: {}, stats: {}, sets: {}, streaks: {}, days: [], seen: { near: {}, revealed: {} }, recent: [], pinned: null, pins: [], lang: 'en' };
    raw.earned.meta_200 = Date.now();
    localStorage.setItem('templeos.trophies.v1', JSON.stringify(raw));
  });
  await page.waitForTimeout(1500);
  await app.close();

  /* ---- 2. the same machine, the clue in its save ---- */
  app = await launch();
  ({ page, errors } = await boot(app));
  await page.waitForSelector('#icons .icon[data-name="Vroom"]', { timeout: 20000 }).catch(() => {});
  const names = await iconNames(page);
  ok(names.indexOf('Vroom') >= 0, 'clue earned: ::/Vroom is on the desktop at boot', names.join());
  ok(await page.evaluate(() => localStorage.getItem('templeos.vroom.v1')) === '1', 'clue earned: the key is set');
  const where = await page.evaluate(() => { const e = document.querySelector('#icons .icon[data-name="Vroom"]'), d = document.getElementById('desktop').getBoundingClientRect(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left - d.left, w: d.width }; });
  ok(where && where.x > where.w / 2, 'clue earned: it stands in the games\' corner (right half of the desk)', JSON.stringify(where));
  await page.waitForFunction(() => /STARTED ITS ENGINE/.test((document.getElementById('toast') || {}).textContent || '') && getComputedStyle(document.getElementById('toast')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
  ok(await page.evaluate(() => /SOMETHING IN THE GARAGE STARTED ITS ENGINE\. ::\/Vroom/.test((document.getElementById('toast') || {}).textContent || '')), 'clue earned: one toast says so');
  const rows = await goTo(page, 'vroom');
  ok(rows.length > 0 && /VROOM/.test(rows[0]), 'clue earned: GO TO "vroom" lists it first', rows.join(' | '));
  const hello = await term(page, 'vroom');
  ok(hello.some(l => /ENGINE IS WARM/.test(l)), 'clue earned: the terminal word VROOM opens it', hello.join(' | '));
  await page.waitForSelector('.win canvas.gamecv', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const shown = await canvasOf(page);
  ok(shown && shown.w === 320 && shown.cols.ffff55 > 20, 'clue earned: the window is the game, not the locked picture', JSON.stringify(shown && shown.cols));
  const clue = await term(page, 'trophy vroom');
  ok(clue.some(l => /VROOM/.test(l)) && clue.some(l => /EARNED/.test(l)), 'clue earned: TROPHY VROOM shows the gold trophy, earned', clue.join(' | '));

  /* ---- 3. RESTORE SYSTEM FILES brings a deleted icon back ---- */
  const back = await page.evaluate(async () => {
    const { fs } = await import('/kernel/vfs.js');
    await fs.removeQuiet('::/Vroom');
    const gone = !(await fs.stat('::/Vroom'));
    const names = await fs.restoreSystem();
    return { gone, names, here: !!(await fs.stat('::/Vroom')) };
  });
  ok(back.gone && back.here && back.names.indexOf('Vroom') >= 0, 'RESTORE: a deleted ::/Vroom is made again', JSON.stringify(back));
  ok(errors.length === 0, 'clue earned: no page errors', errors.join(' | '));
  await app.close();
} catch (e) {
  ok(false, 'the check ran to the end', e && e.stack || String(e));
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(fails ? fails + ' FAILED' : 'check-vroom: ok');
process.exit(fails ? 1 : 0);
