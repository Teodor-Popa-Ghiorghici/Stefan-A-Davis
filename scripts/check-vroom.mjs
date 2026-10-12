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
import { PAL } from '../apps/vroom/palette.js';
import { POOLS, NAMES as TUNE_NAMES, IDS as TUNE_IDS } from '../apps/vroom/score.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = mkdtempSync(join(tmpdir(), 'holytron-vroom-'));
const noSandbox = process.platform === 'linux' && (process.getuid?.() === 0 || process.env.CI);
const EXE = process.env.HOLYTRON_EXE;
let fails = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'} - ${m}${!c && d ? '   ' + d : ''}`); if (!c) fails++; };

const launch = (dir) => electron.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: [...(EXE ? [] : [ROOT]), ...(noSandbox ? ['--no-sandbox'] : [])],
  env: { ...process.env, HOLYTRON_USER_DATA: dir || profile },
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

/* the game's picture: how many colours, and how many pixels are NOT one of VGA128 (a palette comes from apps/vroom/palette.js, the same file the game uses) */
const PALSET = PAL.map(c => c.join(','));
async function gamePicture(page) {
  const px = await page.evaluate(() => {
    const cv = document.querySelector('.win canvas.gamecv'); if (!cv) return null;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; return { w: cv.width, h: cv.height, d: Array.from(d) };
  });
  if (!px) return null;
  const set = new Set(PALSET), seen = new Set(); let stray = 0, h = 0x811C9DC5;
  for (let i = 0; i < px.d.length; i += 4) { const k = px.d[i] + ',' + px.d[i + 1] + ',' + px.d[i + 2]; seen.add(k); if (!set.has(k) || px.d[i + 3] !== 255) stray++; h ^= px.d[i] ^ (px.d[i + 1] << 8) ^ (px.d[i + 2] << 16); h = Math.imul(h, 0x01000193) >>> 0; }
  return { w: px.w, h: px.h, colours: seen.size, stray, hash: h };
}

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
  const shown = await gamePicture(page);
  ok(shown && shown.w === 320 && shown.h === 180 && shown.colours > 25, 'clue earned: the window is the game (a picture of many colours), not the locked one', JSON.stringify(shown && { w: shown.w, colours: shown.colours }));
  ok(shown && shown.stray === 0, 'clue earned: every pixel of the game is one of the 128 colours of VGA128 (none blended, none stray)', shown && shown.stray + ' stray');
  /* the race, played with real keys. The speed bar (bottom right of the glass) is read off the pixels: how much of it is lit tells how fast the car is going. */
  const bar = () => page.evaluate(() => {
    const cv = document.querySelector('.win canvas.gamecv'); if (!cv) return null;
    const d = cv.getContext('2d').getImageData(245, 169, 66, 4).data; let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 200 && d[i] < 200) lit++; else if (d[i] > 200 && d[i + 1] < 120) lit++;
    return lit / 4;
  });
  const lum = () => page.evaluate(() => { const cv = document.querySelector('.win canvas.gamecv'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4); });
  await page.click('.win canvas.gamecv');
  /* the title, and the way in: ENTER on CHAMPIONSHIP, ENTER on the first cup */
  await page.waitForTimeout(600);
  const title = await gamePicture(page);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const cups = await gamePicture(page);
  ok(title && cups && cups.stray === 0 && cups.hash !== title.hash, 'clue earned: ENTER on the title opens the championship screen (a different picture, every pixel still one of the 128)');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  const idle = await bar();
  ok(idle === 0, 'clue earned: on the grid the speed bar is empty (' + idle + ' px)');
  await page.waitForTimeout(3600);                                   /* the countdown */
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2600);
  const fast = await bar();
  ok(fast > 27, 'clue earned: holding W for 2.6 s after GO lights the speed bar (' + fast + ' of 66 px)', String(fast));
  await page.keyboard.up('KeyW'); await page.keyboard.down('KeyS'); await page.waitForTimeout(1500); await page.keyboard.up('KeyS');
  /* the fire key (SPACE, E, SHIFT) on a car that holds nothing, or something: nothing breaks and the page reports no error */
  for (const k of ['Space', 'KeyE', 'ShiftLeft', 'Space']) { await page.keyboard.press(k); await page.waitForTimeout(80); }
  const slow = await bar();
  ok(slow < fast - 6, 'clue earned: the brake slows it (' + slow + ' px)', fast + ' -> ' + slow);
  const mid = await gamePicture(page);
  ok(mid && mid.stray === 0 && mid.hash !== shown.hash, 'clue earned: the race moves and every pixel is still one of the 128', mid && mid.stray + ' stray');
  const before = await lum();
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  const paused = await lum();
  ok(paused < before - 6, 'clue earned: ESC pauses (the picture goes down through the dither, ' + before.toFixed(0) + ' to ' + paused.toFixed(0) + ')');
  const hp = await gamePicture(page); await page.waitForTimeout(500); const hp2 = await gamePicture(page);
  ok(hp.hash === hp2.hash, 'clue earned: a paused game does not move');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await lum() > paused + 4, 'clue earned: ESC again goes on');
  /* leaving the cup from the pause menu costs a try, and the career is saved where the machine keeps an app's saves */
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  const career = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('app_vroom_vroom.v1')); } catch (e) { return null; } });
  ok(career && career.v === 1 && career.cups && career.cups.rookie.tries === 2 && career.run === null, 'clue earned: quitting a cup costs a try and the career is saved (tries left: ' + (career && career.cups && career.cups.rookie.tries) + ')');
  const fps = await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  ok(fps >= 20, 'clue earned: the window keeps up (' + fps.toFixed(0) + ' frames a second under the test display, at least 20)', fps.toFixed(1));
  /* ---- the sound: the radio, the layers, and every tune rendered offline ---- */
  await page.evaluate(() => { window.CRT.mus = 6; window.CRT.sfx = 6; });
  const tune = () => page.evaluate(async () => { const { Studio } = await import('/kernel/studio.js'); const d = Studio.decks.get('vroom'); return d && d.playing && d.song ? d.song.title : null; });
  const nightNames = POOLS.night.map(i => TUNE_NAMES[i]), raceNames = POOLS.race.map(i => TUNE_NAMES[i]);
  await page.waitForTimeout(3500);
  const menuTune = await tune();
  ok(nightNames.includes(menuTune), 'sound: in the menus the NIGHT station is playing (' + menuTune + ')', String(menuTune));
  const beforeRace = await gamePicture(page);
  await page.keyboard.press('Enter'); await page.waitForTimeout(8500);                           /* the cup's race: the count, GO, and the crossfade on a bar line */
  const raceTune = await tune();
  ok(raceNames.includes(raceTune), 'sound: a road by day plays the RACE station (' + raceTune + ')', String(raceTune));
  await page.keyboard.down('KeyW');
  /* the fight layer is asked for while a car is near, which is a matter of where the field happens to be this second; so it is read every quarter second for three seconds and the highest is taken (a test machine that is busy does not run the race at the pace of an idle one) */
  const readLayers = () => page.evaluate(async () => { const { Studio } = await import('/kernel/studio.js'); const d = Studio.decks.get('vroom'); const lv = {}; if (d && d.song) d.song.tracks.forEach(t => { if (t.layer) lv[t.layer] = Math.max(lv[t.layer] || 0, t.lv == null ? 1 : t.lv); }); return lv; });
  const layers = { fight: 0, last: 0 };
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(250); const lv = await readLayers(); layers.fight = Math.max(layers.fight, lv.fight || 0); layers.last = Math.max(layers.last, lv.last || 0); }
  ok(layers.fight > 0.2 && layers.last === 0, 'sound: on the grid and just after it a car is close, so the fight layer is in, and the last lap is not asked for', JSON.stringify(layers));
  const picBefore = await gamePicture(page);
  await page.keyboard.press('KeyV'); await page.waitForTimeout(450);
  const toastPic = await gamePicture(page);
  ok(picBefore && toastPic && picBefore.hash !== toastPic.hash && toastPic.stray === 0, 'sound: V puts the radio\'s name on the glass (still only the 128 colours)');
  await page.waitForTimeout(4200);
  const nightTune = await tune();
  ok(nightTune && nightNames.includes(nightTune), 'sound: V takes the other station: NIGHT (' + nightTune + ')', String(nightTune));
  ok(await page.evaluate(() => localStorage.getItem('app_vroom_vroom.radio.v1')) === '"night"' || await page.evaluate(() => localStorage.getItem('app_vroom_vroom.radio.v1')) === 'night', 'sound: and the choice is kept');
  await page.keyboard.press('KeyV'); await page.waitForTimeout(4800);
  const backTune = await tune();
  ok(backTune && raceNames.includes(backTune), 'sound: V again goes back to RACE (' + backTune + ')', String(backTune));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyH'); await page.waitForTimeout(120); }
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  ok(await tune() !== null, 'sound: a pause leaves the music playing');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);   /* QUIT */
  const rend = await page.evaluate(async () => {
    const { Studio } = await import('/kernel/studio.js'), S = await import('/apps/vroom/score.js');
    const peak = buf => { let p = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a; } } return p; };
    const out = [];
    for (const id of S.IDS) {
      const sg = S.song(Studio.lang, id), bare = JSON.parse(JSON.stringify(sg)); bare.tracks.forEach(t => { if (t.layer) t.mute = true; });
      const from = 32, to = 48;
      const full = peak(await Studio.render(sg, { level: 0.9, from, to, tail: 1 })), core = peak(await Studio.render(bare, { level: 0.9, from, to, tail: 1 }));
      out.push([id, +full.toFixed(2), +core.toFixed(2)]);
    }
    return out;
  });
  ok(rend.length === TUNE_IDS.length && rend.every(r => r[2] > 0.05 && r[1] <= 1.0001 && r[1] >= r[2] * 0.9), 'sound: all nine tunes render in the real studio: the core alone is heard, all of it together does not clip', rend.map(r => r.join(':')).join(' '));
  const led = await page.evaluate(async () => {
    const T = window.Trophies, vr = [...T.defs.values()].filter(d => d.app === 'vroom'), { stackFolders } = await import('/apps/hifi/library.js');
    const f = stackFolders().find(x => x[0] === 'VROOM');
    return { n: vr.length, seal: !!T.get('mastery_vroom'), area: T.apps.indexOf('vroom') >= 0, names: vr.slice(0, 3).map(d => T.plainName(d)), folder: f ? f[2].length : -1, tint: f ? f[1] : null };
  });
  ok(led.n >= 40 && led.seal && led.area, 'trophies: with the gate open the ledger has VROOM\'s trophies and its seal (' + led.n + ')', JSON.stringify(led));
  ok(led.folder === 9, 'the Stack: a VROOM folder of nine discs (' + led.folder + ')');

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

  /* ---- 4. the gate opened while the machine runs; SUN for a career that has earned it; the folder a mastery leaves ---- */
  const profile2 = mkdtempSync(join(tmpdir(), 'holytron-vroom2-'));
  try {
    app = await launch(profile2);
    ({ page, errors } = await boot(app));
    ok((await iconNames(page)).indexOf('Vroom') < 0, 'live: a fresh machine has no Vroom icon');
    const before = await page.evaluate(() => window.Trophies.total());
    await page.evaluate(() => { window.Trophies.st.earned.meta_200 = Date.now(); window.dispatchEvent(new CustomEvent('trophies-changed')); });
    await page.waitForSelector('#icons .icon[data-name="Vroom"]', { timeout: 10000 }).catch(() => {});
    ok((await iconNames(page)).indexOf('Vroom') >= 0 && await page.evaluate(() => localStorage.getItem('templeos.vroom.v1')) === '1', 'live: earning the two hundredth trophy puts the icon on the desk and sets the key, with the machine running');
    const after = await page.evaluate(() => ({ total: window.Trophies.total(), area: window.Trophies.apps.indexOf('vroom') >= 0 }));
    ok(after.area && after.total > before + 40, 'live: and the ledger gets the area and the seal at once (' + before + ' to ' + after.total + ')');
    await page.waitForFunction(() => /STARTED ITS ENGINE/.test((document.getElementById('toast') || {}).textContent || ''), null, { timeout: 12000 }).catch(() => {});
    ok(await page.evaluate(() => /STARTED ITS ENGINE/.test((document.getElementById('toast') || {}).textContent || '')), 'live: one toast says so');
    /* a career that has passed the first cup, won a road and found a star is paid SUN once when the window opens */
    const sun0 = await page.evaluate(() => window.Economy.balance());
    await page.evaluate(() => {
      const c = { v: 1, tips: 0, earned: 0, cars: { courier: 1 }, car: 'courier', cups: { rookie: { tries: 3, passed: 1, won: 1, sweeps: 0, best: 30, runs: 1 } }, tracks: { 'sorting:f': { best: 80, lap: 26, races: 1, wins: 1 } }, stars: { sorting: 1 }, news: [] };
      localStorage.setItem('app_vroom_vroom.v1', JSON.stringify(c));
    });
    await page.evaluate(async () => { const m = await import('/kernel/wm.js'); await m.openWindow('vroom'); });
    await page.waitForSelector('.win canvas.gamecv', { timeout: 8000 });
    await page.waitForTimeout(1200);
    const sun1 = await page.evaluate(() => window.Economy.balance());
    /* what the game paid, from the machine's ledger (a trophy the career's stars earn pays its own SUN beside it) */
    const lines = await page.evaluate(() => window.Economy.ledger().slice(0, 12).map(l => [l.s, l.n]));
    const mine = lines.filter(l => /^VROOM: /.test(l[0])), paid = mine.reduce((a, l) => a + l[1], 0), expect = 500 + 200 + 100 + 200;       /* the cup, winning it, the first win on the sorting room, its star */
    ok(paid === expect && mine.length === 4, 'SUN: a career that earned a cup passed and won, a first win and a star is paid ' + expect + ' SUN in four lines when the window opens (' + paid + ')', JSON.stringify(mine));
    ok(sun1 - sun0 >= expect, 'SUN: and it is in the balance (' + (sun1 - sun0) + ' with whatever trophies it earned)');
    const ledger = lines.map(l => l[0]);
    ok(ledger.some(l => /VROOM: PARCEL CUP PASSED/.test(l)) && ledger.some(l => /VROOM: HIDDEN STAR/.test(l)), 'SUN: each line is in the machine\'s ledger as VROOM: <what for>', ledger.join(' | '));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('app_vroom_vroom.v1')));
    ok(saved && saved.sun && saved.sun['cup:rookie'] === 1 && saved.sun['star:sorting'] === 1, 'SUN: what was paid is marked in the career');
    await page.evaluate(async () => { const m = await import('/kernel/wm.js'); (m.openWins || []).filter(w => w.appId === 'vroom').forEach(w => w.close && w.close()); });
    await page.waitForTimeout(300);
    await page.evaluate(async () => { const m = await import('/kernel/wm.js'); await m.openWindow('vroom'); });
    await page.waitForTimeout(1200);
    ok((await page.evaluate(() => window.Economy.ledger().filter(l => /^VROOM: /.test(l.s)).length)) === 4, 'SUN: opening it again pays nothing twice');
    /* the folder a mastery leaves */
    const props = await page.evaluate(async () => {
      const { makeProps, folderOf } = await import('/kernel/trophy_props.js'), { fs } = await import('/kernel/vfs.js');
      const n = await makeProps('vroom', { quiet: true });
      return { n, listed: (await fs.list('::/VroomProps')).length, folder: folderOf().vroom && folderOf().vroom[0], png: (await fs.read('::/VroomProps/CAR_KEI_COURIER_SIDE.PNG') || {}).type };
    });
    ok(props.n >= 60 && props.listed >= 60 && props.folder === 'VroomProps' && props.png === 'image', 'props: the folder is made of real pictures once the gate is open (' + props.n + ' files)', JSON.stringify(props));
    ok(errors.length === 0, 'live: no page errors', errors.join(' | '));
    await app.close();
  } finally { rmSync(profile2, { recursive: true, force: true }); }
} catch (e) {
  ok(false, 'the check ran to the end', e && e.stack || String(e));
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(fails ? fails + ' FAILED' : 'check-vroom: ok');
process.exit(fails ? 1 : 0);
