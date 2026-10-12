#!/usr/bin/env node
/* node apps/vroom/vroom_gate_check.js: the secret is kept (pure Node, no browser).
   SHUT       nothing a player can look at gives VROOM away: GO TO, the terminal (the word, Tab, HELP), the help window, the Stack, the ledger (areas, cards, the terminal's list, the seal), the
              count of doors, RESTORE, the desktop zone's names; and a source scan: only the files that know about the gate say its name.
   THE CLUE   the gold trophy is called VROOM and is otherwise exactly what it was (id, tier, pay, description, shelf reward)
   OPENING    the clue earned (or found in an old save) is due; the key opens everything above at once, the ledger gets the area and the seal, and RESTORE is owed the icon
   LOCKED APP the window that can still be asked for mounts a black picture of NOT YET., no timer, no listener, nothing else; it unmounts clean */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
let bad = 0, checks = 0;
const ok = (c, m, d) => { checks++; if (c) return true; bad++; console.log('FAIL: ' + m + (d ? '   ' + d : '')); return false; };

/* a stand-in machine: a window that is the global object, a store that can be emptied, a VroomGate as kernel/trophies.js puts up */
const store = {};
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, configurable: true, writable: true });
const heard = { add: 0, timers: 0, raf: 0 };
globalThis.window = globalThis;
globalThis.addEventListener = () => { heard.add++; }; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => true;
globalThis.document = { getElementById: () => null, createElement: tag => mkEl(tag), body: { appendChild() {} }, addEventListener() { heard.add++; }, documentElement: { toggleAttribute() {} } };
const timers = { setTimeout: globalThis.setTimeout, setInterval: globalThis.setInterval };
const mkEl = tag => { const el = { tag, children: [], dataset: {}, style: {}, className: '', width: 0, height: 0, appendChild(c) { el.children.push(c); return c; }, remove() {}, addEventListener() { heard.add++; }, getContext: () => ctx2d }; return el; };
/* a 2D context that keeps the pixels it is asked to fill */
const painted = []; let fill = '#000000';
const ctx2d = { set fillStyle(v) { fill = v; }, get fillStyle() { return fill; }, fillRect(x, y, w, h) { painted.push([x, y, w, h, fill]); }, clearRect() {}, imageSmoothingEnabled: false };

const core = await import('../../kernel/vroom_gate_core.js');
const { KEY, CLUE, PATH, isOpen, openGate, owed, due } = core;
globalThis.VroomGate = { open: () => isOpen() };
const shut = () => { delete store[KEY]; }, open = () => { store[KEY] = '1'; };

/* ---- the question itself ---- */
shut();
ok(!isOpen() && owed().length === 0, 'a machine with nothing stored has the gate shut and is owed nothing');
ok(openGate() && isOpen() && store[KEY] === '1', 'openGate() sets the key and the gate is open');
shut(); store[KEY] = ''; ok(!isOpen(), 'an empty key is a shut gate');
shut(); ok(!isOpen({ getItem() { throw new Error('storage is gone'); } }) && !openGate({ setItem() { throw new Error('full'); } }), 'storage that throws is a shut gate, and cannot be opened');
ok(!isOpen({}), 'a store without getItem is a shut gate');

/* ---- the clue: the gold trophy is called VROOM and is nothing else different ---- */
const sys2 = readFileSync(join(ROOT, 'kernel/trophies_system2.js'), 'utf8');
ok(/t\('meta_200', 'VROOM', 'G', 'M', 'Earn 200 trophies\.', rule\.count\(200\)\)/.test(sys2), 'meta_200 is VROOM, gold, "Earn 200 trophies.", counted at 200');
ok(!/TWO HUNDRED'/.test(sys2.replace(/TWO HUNDRED THINGS/g, '')), 'nothing in the machine\'s set is still called TWO HUNDRED');
ok(/meta_200: 4000/.test(readFileSync(join(ROOT, 'kernel/trophy_rewards.js'), 'utf8')), 'its pay is still 4,000');
ok(/reward: 'meta_200'/.test(readFileSync(join(ROOT, 'kernel/cos_rewards.js'), 'utf8')), 'its shelf reward is still there');
ok(CLUE === 'meta_200', 'the gate listens for meta_200');

/* ---- GO TO ---- */
const LM = await import('../../kernel/launcher_model.js');
{
  shut();
  const items = LM.buildItems([], []);
  ok(!items.some(i => /vroom/i.test(i.id + i.name + i.words)), 'GO TO: shut, no item says VROOM');
  ['vroom', 'racing', 'laps', 'kei', 'courier'].forEach(q => ok(!LM.rank(items, q, [], 12).some(i => i.app === 'vroom'), 'GO TO: shut, "' + q + '" finds nothing of it'));
  open();
  ok(LM.rank(LM.buildItems([], []), 'vroom', [], 5)[0].app === 'vroom', 'GO TO: open, it is found by name');
}

/* ---- the terminal ---- */
const CMD = await import('../../kernel/commands.js');
const TC = await import('../terminal/complete.js');
{
  shut();
  ok(Object.keys(CMD.aliases()).every(w => CMD.aliases()[w] !== 'vroom'), 'terminal: shut, no word opens it');
  ok(!('VROOM' in CMD.APP_ALIASES) && !('RACE' in CMD.APP_ALIASES) && !('CARS' in CMD.APP_ALIASES), 'terminal: the static table never has it');
  const termSrc = readFileSync(join(ROOT, 'apps/terminal/index.js'), 'utf8');
  ok(!/vroom/i.test(termSrc), 'terminal: its own source never says the name (HELP, the unknown-command answers, the cases)');
  ok(!TC.COMMANDS.some(c => /VROOM/.test(c)), 'terminal: Tab\'s own list never has it');
  const r = await TC.complete('vroo', { commands: Object.keys(CMD.aliases()), list: async () => [], resolve: a => a });
  ok(r.matches === 0 && r.line === 'vroo', 'terminal: shut, Tab on "vroo" does nothing');
  open();
  ok(CMD.aliases().VROOM === 'vroom' && CMD.aliases().RACE === 'vroom', 'terminal: open, VROOM and RACE open it');
  const r2 = await TC.complete('vroo', { commands: Object.keys(CMD.aliases()), list: async () => [], resolve: a => a });
  ok(r2.line === 'VROOM ', 'terminal: open, Tab completes it', r2.line);
  ok(typeof CMD.APP_HELLO.vroom === 'string' && CMD.APP_HELLO.vroom === CMD.APP_HELLO.vroom.toUpperCase(), 'terminal: it has a greeting, in capitals');
}

/* ---- the help window ---- */
const HT = await import('../../kernel/help_text.js');
{
  shut();
  ok(HT.TOPICS.length === 7 && !HT.TOPICS.some(t => /vroom/i.test(t.join())) && !Object.keys(HT.PAGES).some(k => /vroom/i.test(k + HT.PAGES[k])), 'help: the static topics and pages never say it');
  ok(HT.topicsNow().length === 7 && HT.pageNow('vroom') === null, 'help: shut, 7 topics and no page for it');
  open();
  ok(HT.topicsNow().length === 8 && HT.topicsNow()[7][0] === 'vroom' && /VROOM/.test(HT.pageNow('vroom')), 'help: open, a page appears at the end');
  ok(HT.pageNow('start') === HT.PAGES.start, 'help: the other pages are as they were');
}

/* ---- the Stack ---- */
{
  /* library.js reaches the whole audio kernel (a ring of imports only a machine can start), so Node reads its guard and runs the folder; the shell run (check:stack) opens the real Stack */
  const lib = readFileSync(join(ROOT, 'apps/hifi/library.js'), 'utf8');
  ok(/if \(vroom\(\)\.open\(\)\) out\.push\(vroomFolder\(disc, Lang\)\);/.test(lib), 'the Stack: the folder is pushed only inside the gate\'s question');
  ok((lib.match(/vroomFolder/g) || []).length === 2 && !/VROOM/.test(lib.replace(/vroomFolder|VROOM'S|VROOM's|VROOM. tunes|VROOM'|until its gate/g, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'the Stack: nothing else in the library says it');
  const Lang = await import('../../kernel/songtext.js'), disc = (song, tint, artist, layers) => ({ song, tint, artist, layers });
  const folder = (await import('./stack.js')).vroomFolder(disc, Lang);
  ok(folder[0] === 'VROOM' && Array.isArray(folder[2]) && folder[2].length === 9 && folder[2].every(d => d[1].song.tracks.length > 4), 'the Stack: the folder is a name, a tint and nine discs, each a whole tune');
}

/* ---- the folder a mastery leaves: the table the ledger lists from is without it until the gate is open ---- */
{
  const src = readFileSync(join(ROOT, 'kernel/trophy_props.js'), 'utf8'), tro = readFileSync(join(ROOT, 'kernel/trophies.js'), 'utf8');
  const table = /export const FOLDER_OF = \{[\s\S]*?\n\};/.exec(src)[0];
  ok(!/vroom/i.test(table), 'props: the table the ledger lists folders from (FOLDER_OF) says nothing of it');
  ok(/export const folderOf = \(\) => \(vroomOpen\(\) \?/.test(src) && /GATED_FOLDERS\[game\] && !vroomOpen\(\)/.test(src), 'props: the folder is in the table only through the gate\'s question, and is not made while it is shut');
  ok(/folderOf\(\)/.test(tro) && !/FOLDER_OF/.test(tro), 'props: the ledger lists folders through folderOf()');
}

/* ---- the ledger ---- */
{
  const { createTrophies } = await import('../../kernel/trophies_core.js');
  const defs = await import('../../kernel/trophies_defs.js');
  const model = await import('../trophies/model.js');
  const cli = await import('../../kernel/trophies_cli.js');
  const { t, rule } = await import('../trophy_kit.js');
  const mk = () => { const mem = { st: null }; const T = createTrophies({ read: () => mem.st, write: o => { mem.st = JSON.parse(JSON.stringify(o)); } }); defs.registerAll(T); return T; };
  const WITNESS = [t('vr_first', 'FIRST FLAG', 'B', 'P', 'Win a race.', rule.on('win')), t('vr_laps', 'FIFTY LAPS', 'S', 'P', 'Drive fifty laps.', rule.stat('laps', 50))];
  shut();
  const T = mk();
  ok(T.apps.indexOf('vroom') < 0 && ![...T.defs.values()].some(d => d.app === 'vroom' || d.id === 'mastery_vroom'), 'ledger: shut, the engine has no VROOM trophy and no seal');
  const listing = JSON.stringify(cli.summary(T, defs.NAMES)) + JSON.stringify(model.areas(T)) + JSON.stringify(model.shown());
  ok(!/vroom/i.test(listing), 'ledger: shut, the terminal\'s TROPHIES list, the areas and the area order say nothing of it');
  ok(cli.findArea(T, 'vroom', defs.NAMES) === null, 'ledger: shut, TROPHIES VROOM names no area (TROPHY VROOM still finds the clue)');
  const named = [...T.defs.values()].filter(d => /vroom/i.test(T.plainName(d) + T.plainDesc(d)));
  ok(named.length === 1 && named[0].id === 'meta_200', 'ledger: shut, the only trophy that says VROOM is the clue', named.map(d => d.id).join());
  ok(model.areas(T).every(a => a.id !== 'vroom') && !model.shown().includes('vroom'), 'ledger: shut, no area');
  ok(defs.registerVroom(T, WITNESS) === true, 'ledger: the engine can be given the area (the gate does this)');
  ok(model.areas(T).every(a => a.id !== 'vroom') && !model.cards(T, 'vroom').own.length && !model.cards(T, 'all').own.some(d => d.app === 'vroom'), 'ledger: even registered, a shut gate shows no area and no card (the second lock)');
  ok(T.total() === mk().total() + WITNESS.length + 1, 'ledger: registered, the total grows by the area and its seal', T.total() + ' vs ' + mk().total());
  open();
  ok(model.areas(T).some(a => a.id === 'vroom' && a.total === 2 && a.sealed), 'ledger: open, the area is there with its two trophies and a seal', JSON.stringify(model.areas(T).find(a => a.id === 'vroom')));
  ok(T.get('mastery_vroom') && T.plainName(T.get('mastery_vroom')) === 'MASTER OF VROOM.EXE', 'ledger: open, the seal is MASTER OF VROOM.EXE');
  ok(defs.registerVroom(T, WITNESS) === false, 'ledger: registering twice does nothing');
  ok(cli.findArea(T, 'vroom', defs.NAMES) === 'vroom', 'ledger: open, TROPHIES VROOM finds the area');
  shut();
  const T2 = mk();
  ok(!T2.apps.includes('vroom'), 'ledger: a boot with the gate shut registers nothing');
  /* an empty list is not a seal of nothing */
  ok(defs.registerVroom(mk(), []) === false, 'ledger: an empty list registers nothing, not even a seal');
  /* the trigger: earned and not open is due; open, or not earned, is not */
  const T3 = mk();
  ok(!due(T3), 'gate: not earned, not due');
  T3.award(CLUE, true);
  ok(due(T3) && T3.earned(CLUE), 'gate: the clue earned (silently, as a backfill does) is due');
  openGate(); ok(!due(T3), 'gate: open, no longer due');
  /* the count of doors: EVERY DOOR does not ask for an app nobody can open */
  const registry = [...readFileSync(join(ROOT, 'kernel/registry.js'), 'utf8').matchAll(/^\s*(\w+):\s*\(\)\s*=>\s*import/gm)].map(m => m[1]);
  ok(registry.includes('vroom'), 'registry: vroom is in it');
  const tsrc = readFileSync(join(ROOT, 'kernel/trophies.js'), 'utf8');
  ok(/k !== 'vroom' \|\| vroomOpen\(\)/.test(tsrc), 'EVERY DOOR: the count of doors leaves VROOM out until its gate is open');
}

/* ---- RESTORE SYSTEM FILES ---- */
{
  const { handedItems } = await import('../../kernel/handed.js');
  shut();
  ok((await handedItems()).every(it => it.path !== PATH), 'RESTORE: shut, it is owed no icon');
  open();
  const got = (await handedItems()).filter(it => it.path === PATH);
  ok(got.length === 1 && got[0].type === 'app' && got[0].app === 'vroom', 'RESTORE: open, it is owed ::/Vroom, an app record for vroom');
  const grid = await import('../../kernel/desk_grid.js');
  ok(grid.zoneOf({ name: 'Vroom', type: 'app' }) === 'games', 'the desk: ::/Vroom stands in the games\' corner');
}

/* ---- the window that can still be asked for ---- */
{
  shut();
  const lk = await import('./locked.js');
  painted.length = 0; lk.paintLocked(ctx2d);
  const colours = new Set(painted.map(p => p[4]));
  ok([...colours].every(c => c === '#000000' || c === '#AAAAAA'), 'NOT YET.: black and one grey, nothing else', [...colours].join());
  ok(painted[0][2] === 320 && painted[0][3] === 180 && painted[0][4] === '#000000', 'NOT YET.: the whole picture is black first');
  /* the words, read back from the pixels */
  const buf = new Uint8Array(320 * 180);
  painted.forEach(([x, y, w, h, c]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) buf[(y + j) * 320 + x + i] = c === '#000000' ? 0 : 1; });
  const lit = []; for (let i = 0; i < buf.length; i++) if (buf[i]) lit.push(i);
  const ys = lit.map(i => Math.floor(i / 320)), xs = lit.map(i => i % 320);
  ok(lit.length > 40 && Math.min(...xs) > 100 && Math.max(...xs) < 220 && Math.min(...ys) > 60 && Math.max(...ys) < 120, 'NOT YET.: a short line in the middle of the picture, ' + lit.length + ' pixels');
  /* mounted through the app itself */
  const app = (await import('./index.js')).default;
  const root = mkEl('div');
  heard.add = 0; let timerUse = 0; globalThis.setTimeout = (...a) => { timerUse++; return timers.setTimeout(...a); }; globalThis.setInterval = (...a) => { timerUse++; return timers.setInterval(...a); }; globalThis.requestAnimationFrame = () => { timerUse++; return 0; };
  await app.mount(root, { load: async () => null, save: async () => {}, close() {}, toast() {} });
  globalThis.setTimeout = timers.setTimeout; globalThis.setInterval = timers.setInterval; delete globalThis.requestAnimationFrame;
  const pane = root.children[0], cv = pane && pane.children[0];
  ok(root.children.length === 1 && pane.className === 'gamepane' && cv && cv.tag === 'canvas' && cv.width === 320 && cv.height === 180 && cv.dataset.fit === 'int', 'NOT YET.: one pane holding one 320 x 180 canvas, fitted by whole pixels');
  ok(cv.children.length === 0 && pane.children.length === 1, 'NOT YET.: nothing else in the window (no bar, no button, no text node)');
  ok(heard.add === 0 && timerUse === 0, 'NOT YET.: no listener, no timer, no frame loop', JSON.stringify({ listeners: heard.add, timers: timerUse }));
  ok(app.unmount() === undefined, 'NOT YET.: unmount is clean');
  ok(app.id === 'vroom' && app.title === 'VROOM.EXE' && app.fluid === true, 'the app contract: id, title, fluid');
}

/* ---- the source scan: only files that know about the gate say its name ---- */
{
  const ALLOWED = new Set([
    'kernel/vroom_gate_core.js', 'kernel/vroom_gate.js', 'apps/vroom_scope.js', 'kernel/registry.js', 'kernel/launcher_model.js', 'kernel/commands.js', 'kernel/help_text.js', 'kernel/desk_grid.js',
    'kernel/icons_dom.js', 'kernel/sprites_extra.js', 'kernel/mixer.js', 'kernel/eggs_core.js', 'kernel/trophy_props.js', 'kernel/trophies.js', 'kernel/trophies_defs.js', 'kernel/trophies_system2.js', 'apps/hifi/library.js', 'apps/trophies/model.js',
    'apps/terminal/complete_check.js',                   /* a check, not shipped */
    'electron-builder.yml', 'package.json'               /* the build's file list and the npm script that runs the shell check: nothing the machine ever shows */
  ]);
  const skip = new Set(['node_modules', '.git', 'dist', 'vendor']);
  const hits = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = join(dir, name), st = statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      const rel = relative(ROOT, p).split('\\').join('/');
      if (rel.startsWith('apps/vroom/') || rel.startsWith('docs/') || rel.startsWith('scripts/') || rel === 'CLAUDE.md') continue;
      if (!/\.(js|mjs|cjs|css|html|json|yml|svg|md)$/.test(name)) continue;
      if (/vroom/i.test(readFileSync(p, 'utf8'))) hits.push(rel);
    }
  })(ROOT);
  const stray = hits.filter(h => !ALLOWED.has(h));
  ok(stray.length === 0, 'the source scan: no file outside the gate\'s own says VROOM', stray.join(', '));
}

console.log(bad ? bad + ' FAILED (of ' + checks + ')' : 'vroom_gate_check: ok (' + checks + ' checks)');
process.exit(bad ? 1 : 0);
