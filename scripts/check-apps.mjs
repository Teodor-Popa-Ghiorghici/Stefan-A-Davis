#!/usr/bin/env node
/* Every app in kernel/registry.js: open, poke, close through the real X button,
   twice. Fails on page/console errors, a window that doesn't open or doesn't go
   away, and on anything an app leaves behind - the unmount() contract in
   CLAUDE.md ("remove every timer, interval, requestAnimationFrame loop and
   listener attached to window/document"). Leaks are measured, not guessed:
   addEventListener/removeEventListener on window+document, setInterval, rAF and
   setTimeout are wrapped before boot.
   A window opened and closed through the kernel leaves two document listeners
   behind on its own (wm.js createWindow), so each app is judged against what
   the trivial `placeholder` app leaves, not against zero.

     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/check-apps.mjs [appId ...] */
import { launchTarget } from './lib/target.mjs';
import { readFileSync } from 'node:fs';

const KNOWN = JSON.parse(readFileSync(new URL('./check-apps.known.json', import.meta.url), 'utf8'));
delete KNOWN._about;

const ONLY = process.argv.slice(2);
/* apps that open a file or folder need a path, as the desktop would pass them */
const ARGS = {
  folder: { path: '::/Demo' },
  editor: { path: '::/Adam/Adam.HC', type: 'code' },
  viewer: { path: '::/Home/Temple.BMP', type: 'image' },
};

const t = await launchTarget();
const page = await t.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });

await page.addInitScript(() => {
  const L = window.__leak = { listeners: new Map(), intervals: new Set(), raf: 0, timeouts: 0 };
  const ids = new WeakMap(); let nid = 0;
  const idOf = f => { if (typeof f !== 'object' && typeof f !== 'function') return String(f); if (!ids.has(f)) ids.set(f, ++nid); return ids.get(f); };
  const keyOf = (type, f, o) => `${type}|${idOf(f)}|${(typeof o === 'boolean' ? o : o && o.capture) ? 1 : 0}`;
  const watched = tg => tg === window || tg === document;
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, f, o) {
    if (watched(this) && f && !(o && o.once)) { const k = keyOf(type, f, o); if (!L.listeners.has(k)) L.listeners.set(k, type); }
    return add.call(this, type, f, o);
  };
  EventTarget.prototype.removeEventListener = function (type, f, o) {
    if (watched(this)) L.listeners.delete(keyOf(type, f, o));
    return rem.call(this, type, f, o);
  };
  const si = window.setInterval, ci = window.clearInterval, st = window.setTimeout, raf = window.requestAnimationFrame;
  window.setInterval = function (...a) { const id = si.apply(this, a); L.intervals.add(id); return id; };
  window.clearInterval = function (id) { L.intervals.delete(id); return ci.call(this, id); };
  window.setTimeout = function (...a) { L.timeouts++; return st.apply(this, a); };
  window.requestAnimationFrame = function (cb) { return raf.call(this, (ts) => { L.raf++; return cb(ts); }); };
});

/* every app gets a freshly booted page, so one app's leaked loop or listener can
   never be blamed on the next */
async function freshBoot() {
  await page.goto(t.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.powerOn === 'function'); await page.evaluate(() => window.powerOn());
  /* a profile that has never run owes the long boot (ten seconds of timers on a normal machine); a loaded Windows runner
     stretches those timers, so allow far more than 30 s and say what the screen was doing if it still does not arrive */
  try { await page.waitForSelector('#bootcursor', { state: 'attached', timeout: 120000 }); }
  catch (e) {
    const seen = await page.evaluate(() => (document.getElementById('bios') || {}).textContent || '(no bios text)').catch(() => '(page gone)');
    throw new Error('boot never reached PRESS [~] TO ENTER; errors so far: ' + JSON.stringify(errors) + '; bios: ' + String(seen).slice(-300));
  }
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '~', code: 'Backquote', bubbles: true, cancelable: true })));
  await page.waitForSelector('#shell', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
}

const snapshot = () => page.evaluate(() => {
  const L = window.__leak, byType = {};
  for (const ty of L.listeners.values()) byType[ty] = (byType[ty] || 0) + 1;
  return { listeners: L.listeners.size, byType, intervals: L.intervals.size, wins: document.querySelectorAll('.win').length };
});
/* background activity over one second: rAF callbacks run + setTimeouts scheduled */
const activity = () => page.evaluate(() => new Promise(r => {
  const L = window.__leak, a = L.raf, b = L.timeouts;
  setTimeout(() => r({ raf: L.raf - a, timeouts: L.timeouts - b }), 1000);
}));

async function cycle(id) {
  const before = await snapshot();
  const err0 = errors.length;
  const opened = await page.evaluate(async ([id, args]) => {
    const wm = await import('/kernel/wm.js');
    const had = new Set(document.querySelectorAll('.win'));
    window.__had = had;
    try { await wm.openWindow(id, args); } catch (e) { return { error: String(e) }; }
    return { n: [...document.querySelectorAll('.win')].filter(w => !had.has(w)).length };
  }, [id, ARGS[id] || {}]);
  if (opened.error) return { id, fatal: 'openWindow threw: ' + opened.error };
  await page.waitForTimeout(700);
  const during = await snapshot();
  /* poke it the way a person would: click into the body, a few keys */
  const box = await page.evaluate(() => {
    const ws = [...document.querySelectorAll('.win')], w = ws[ws.length - 1];
    if (!w) return null; const r = w.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (box) {
    await page.mouse.click(box.x, box.y);
    for (const k of ['ArrowRight', 'Space', 'ArrowDown', 'Enter']) { await page.keyboard.press(k); await page.waitForTimeout(60); }
    await page.waitForTimeout(300);
  }
  /* close through the real X button of every window this cycle opened, newest
     first: poking a folder with Enter opens whatever is selected, and that is
     not a leak of the folder */
  await page.evaluate(() => {
    const ws = [...document.querySelectorAll('.win')].filter(w => !window.__had.has(w)).reverse();
    ws.forEach(w => {
      const x = w.querySelector('.x');
      if (x) x.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
  });
  await page.waitForTimeout(500);
  /* closing the shop leaves Dave's farewell box on the desktop (kernel/dave_box.js). It is the machine's, not the app's, and has its own
     timers while it types: take it down so it is not measured as something the shop left behind. */
  await page.evaluate(() => { if (window.DaveBox) window.DaveBox.dismiss(); });
  const after = await snapshot();
  return { id, opened: opened.n, winsDuring: during.wins - before.wins, winsAfter: after.wins - before.wins, before, after, errs: errors.slice(err0) };
}

await freshBoot();
const ids = await page.evaluate(async () => Object.keys((await import('/kernel/registry.js')).registry));
const list = ONLY.length ? ids.filter(i => ONLY.includes(i)) : ids;

/* kernel baseline: what a bare window leaves behind per cycle */
await freshBoot();
const idle = await activity();
await cycle('placeholder');                       /* warm-up: lazy import, one-time init */
const p1 = await cycle('placeholder'), p2 = await cycle('placeholder');
const kernelPerCycle = p2.after.listeners - p1.after.listeners;
console.log(`kernel baseline: idle ${idle.raf} rAF/s ${idle.timeouts} timeouts/s; a bare window leaves ${kernelPerCycle} window/document listeners per cycle`);

let fails = 0;
const fail = (id, msg) => {
  if (KNOWN[id]) { known++; console.log(`KNOWN ${id.padEnd(12)} ${msg}`); return; }
  fails++; console.log(`FAIL ${id.padEnd(12)} ${msg}`);
};
let known = 0;
/* an app behind a gate (kernel/vroom_gate_core.js) is opened twice: shut, where it is a black NOT YET., and with its key set, where it is the real thing */
const GATES = { vroom: 'templeos.vroom.v1' };
const jobs = [];
list.forEach(id => { jobs.push({ id, label: id }); if (GATES[id]) jobs.push({ id, label: id + ' (gate open)', key: GATES[id] }); });
for (const { id, label, key } of jobs) {
  await freshBoot();
  if (key) await page.evaluate(k => localStorage.setItem(k, '1'), key);
  const quiet = await activity();                  /* this page, before the app is ever opened */
  const c1 = await cycle(id);                      /* first: lazy import + one-time setup */
  if (c1.fatal) { fail(label, c1.fatal); continue; }
  const c2 = await cycle(id);                      /* second: the steady-state leak */
  const problems = [];
  if (c1.winsDuring < 1) problems.push('no window opened');
  if (c1.winsAfter !== 0 || c2.winsAfter !== 0) problems.push(`window did not close (${c1.winsAfter}/${c2.winsAfter} left)`);
  const grow = c2.after.listeners - c1.after.listeners - kernelPerCycle;
  if (grow > 0) {
    const kinds = Object.entries(c2.after.byType).filter(([k, v]) => v > (c1.after.byType[k] || 0)).map(([k]) => k).join(',');
    problems.push(`leaks ${grow} window/document listener(s) per open/close (${kinds})`);
  }
  if (c2.after.intervals > c1.after.intervals) problems.push(`leaks ${c2.after.intervals - c1.after.intervals} interval(s)`);
  const act = await activity();
  if (act.raf > quiet.raf + 8) problems.push(`rAF loop still running after close (${act.raf}/s, was ${quiet.raf}/s)`);
  if (act.timeouts > quiet.timeouts * 1.5 + 8) problems.push(`timer chain still running after close (${act.timeouts}/s, was ${quiet.timeouts}/s)`);
  const errs = [...c1.errs, ...c2.errs];
  if (errs.length) problems.push(`${errs.length} error(s): ${errs[0]}`);
  if (problems.length) fail(label, problems.join('; '));
  else console.log(KNOWN[id] ? `PASS ${label}   (listed in check-apps.known.json - it passes now, remove the entry)` : `PASS ${label}`);
}

await t.close();
console.log(fails ? `${fails} of ${jobs.length} apps FAILED` : `${jobs.length - known} apps clean, ${known} with known pre-existing leaks, 0 new problems`);
process.exit(fails ? 1 : 0);
