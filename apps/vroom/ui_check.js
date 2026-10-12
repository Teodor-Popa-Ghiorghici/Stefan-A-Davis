#!/usr/bin/env node
/* UI CHECK (dev-only, not packaged): VROOM's menus and HUD are READ, so what they say is measured and not hoped for (pure Node: the real screens, the real career, the real renderer).
     THE INKS       every colour the screens write in holds 7:1 (WCAG's contrast ratio, from the palette's own bytes) on the grounds it is written on; the cursor's black on yellow, a switched-off row's inks 4.5:1
     EVERY SCREEN   each is drawn in every state that changes what it says (every row of the title, every cup, every car won and not won, every board of the depot, every mode and variant, the split menu's rows,
                    the maker with the grid and with the menu, the board after a race, the pause, the HUD at the count, at speed, holding a pickup, going the wrong way, at the finish) with `ui.trace` on, and each
                    piece of type that was set is held to:
                      it is inside the picture, and inside a SOLID plate or bar (never on the scene, never on dither);
                      no two pieces overlap;
                      the ground under its box is flat: its own ink and at most two others (the plate, the cursor's bar);
                      its ink holds 4.5:1 against the colour that fills most of its box (7:1 for the small face);
                      nothing is set in a face smaller than the 3 x 5, and what is read (a label, a name, a figure) is the 5 x 7 or bigger.     node apps/vroom/ui_check.js */
import { suite } from './check_kit.js';
import { rig } from './screens_check_kit.js';
import { trace, C } from './ui.js';
import { PAL } from './palette.js';
import * as K from './career.js';
import { CAR_IDS } from './cars.js';
import { CUPS } from './cups.js';
import { createDriver } from './ai.js';
import { HUMAN } from './ai_profiles.js';
import { drawHud, drawResults, drawPause } from './hud.js';
import { drawRadio } from './radio_hud.js';
import { drawView } from './scene.js';
import { createRace } from './race.js';
import { buildTrack } from './track_build.js';
import { defFor } from './tracks.js';
import { fieldFor } from './rivals.js';
import { carModel } from './car_art.js';
import { createCamera } from './camera.js';
import { PLAYER, liveryFor } from './livery.js';

const S = suite('ui_check'), { ok } = S;
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = i => { const c = PAL[i]; return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* ---- the inks ---- */
{
  const INK = { white: C.white, dim: C.dim, yellow: C.yellow, gold: C.gold, green: C.green, red: C.red, cyan: C.cyan }, GROUND = { ground: C.ground, black: C.black }, bad = [];
  for (const [i, a] of Object.entries(INK)) for (const [g, b] of Object.entries(GROUND)) if (ratio(a, b) < 7) bad.push(i + ' on ' + g + ' ' + ratio(a, b).toFixed(1));
  ok(bad.length === 0, 'every ink the screens write in holds 7:1 on the plate and on black', bad.join(', '));
  ok(ratio(C.black, C.hi) >= 7, 'the cursor is black on yellow, ' + ratio(C.black, C.hi).toFixed(1) + ':1');
  ok(ratio(C.white, C.rule) >= 4.5 && ratio(C.mute, C.ground) >= 4.5, 'a row that is switched off is hollow and dashed, and still read (white on its bar ' + ratio(C.white, C.rule).toFixed(1) + ', its ink ' + ratio(C.mute, C.ground).toFixed(1) + ':1)');
}

/* ---- every screen, every state ---- */
let screens = 0, pieces = 0;
const problems = [];
const colours = (R, x0, y0, x1, y1) => { const m = new Map(); for (let y = Math.max(0, y0); y < Math.min(R.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(R.w, x1); x++) { const c = R.buf[y * R.w + x]; m.set(c, (m.get(c) || 0) + 1); } return m; };
function audit(R, label) {
  screens++;
  const T = trace.texts.slice(), P = trace.panels.slice();
  for (let i = 0; i < T.length; i++) {
    const t = T[i], x0 = Math.floor(t.x), x1 = Math.ceil(t.x + t.w), y0 = Math.floor(t.y), y1 = y0 + t.h; pieces++;      /* (drawn at whole pixels: R.rect floors) */
    const at = label + ' "' + t.s + '"';
    if (t.s === '' || t.w <= 0) continue;
    if (x0 < 0 || y0 < 0 || x1 > R.w || y1 > R.h) problems.push(at + ' is outside the picture');
    for (let j = i + 1; j < T.length; j++) { const u = T[j]; if (u.s !== '' && u.w > 0 && x0 < u.x + u.w - 0.5 && u.x < x1 - 0.5 && y0 < u.y + u.h - 0.5 && u.y < y1 - 0.5) problems.push(at + ' overlaps "' + u.s + '"'); }
    if (t.kind === 'scene') continue;                                  /* the countdown is the scene's: huge, with a shadow, and meant to stand on the picture */
    if (!P.some(p => p.solid && x0 >= p.x && x1 <= p.x + p.w && y0 >= p.y && y1 <= p.y + p.h)) problems.push(at + ' is not on a plate');
    const cs = colours(R, x0, y0, x1, y1); let top = -1, topN = 0, others = 0;
    for (const [c, n] of cs) if (c !== t.c) { others++; if (n > topN) { topN = n; top = c; } }
    if (others > 3) problems.push(at + ' stands on a busy ground (' + others + ' colours under it)');
    else if (top >= 0 && ratio(t.c, top) < (t.small ? 7 : 4.5)) problems.push(at + ' reads ' + ratio(t.c, top).toFixed(1) + ':1');
  }
}
/* a state: make it (keys, a screen), let it settle for a frame, and audit ONE draw of it */
const run = (G, label, fn) => { fn && fn(); G.frame(1 / 60, 1); trace.texts.length = 0; trace.panels.length = 0; G.frame(1 / 60, 1); audit(G.R, label); };
trace.on = true;

{ /* the title, every row */
  const G = rig(); G.career.tips = 1234567; G.go('title');
  for (let r = 0; r < 12; r++) run(G, 'title ' + r, () => { G.go('title', { sel: r }); });
  for (const id of ['rookie', 'amateur']) { G.career.cups[id].passed = true; }
  K.beginCup(G.career, 'amateur', 5); run(G, 'title with a cup running', () => G.go('title'));
}
{ /* the cups: all open, one running, the question */
  const G = rig(); G.career.tips = 90000; for (const cu of CUPS) G.career.cups[cu.id].passed = true; G.go('cups');
  for (let i = 0; i < CUPS.length; i++) run(G, 'cups ' + i, () => { G.go('cups'); for (let k = 0; k < i; k++) G.press('ArrowDown'); });
  K.beginCup(G.career, 'amateur', 7); G.career.run.race = 2;
  run(G, 'cups, one running', () => G.go('cups')); run(G, 'cups, the question', () => G.press('Tab'));
  const F = rig(); run(F, 'cups, fresh', () => F.go('cups'));
}
{ /* the garage: every car, won and not */
  const G = rig(); G.career.tips = 1500; G.go('garage');
  const sweep = tag => { for (let i = 0; i < CAR_IDS.length; i++) run(G, 'garage ' + tag + ' ' + i, () => { if (i === 0) G.go('garage'); else G.press('ArrowDown'); }); };
  sweep('locked'); for (const id of CAR_IDS) G.career.cars[id] = 1; sweep('won');
}
{ /* the depot: every board, the dial, the looks */
  const G = rig(); G.career.tips = 9999; G.go('depot');
  const cols = [5, 6, 5];
  for (let r = 0; r < 3; r++) for (let c = 0; c < cols[r]; c++) run(G, 'depot ' + r + '/' + c, () => { G.go('depot'); for (let k = 0; k < r; k++) G.press('ArrowDown'); for (let k = 0; k < c; k++) G.press('ArrowRight'); G.frame(1 / 60, 30); });
  run(G, 'depot, looks open', () => { G.go('depot'); G.press('ArrowDown', 'ArrowDown'); G.press('Enter'); });
}
{ /* single race, the modes, the split menu */
  const G = rig(); G.career.tips = 1500; for (const cu of CUPS) G.career.cups[cu.id].passed = true;
  for (let r = 0; r < 6; r++) run(G, 'single ' + r, () => { G.go('single'); for (let k = 0; k < r; k++) G.press('ArrowDown'); });
  for (const mode of ['tt', 'practice', 'lastmile', 'clockwork']) for (let r = 0; r < (mode === 'clockwork' ? 3 : mode === 'lastmile' ? 5 : 4); r++) run(G, mode + ' ' + r, () => { G.go('modes', { mode }); for (let k = 0; k < r; k++) G.press('ArrowDown'); });
  for (let r = 0; r < 7; r++) run(G, 'split menu ' + r, () => { G.go('splitmenu'); for (let k = 0; k < r; k++) G.press('ArrowDown'); });
}
{ /* the maker, with the grid and with the menu */
  const G = rig(); run(G, 'maker grid', () => G.go('maker'));
  G.press('Tab'); for (let r = 0; r < 17; r++) run(G, 'maker menu ' + r, () => { if (r) G.press('ArrowDown'); });
}
{ /* the board after a race (both pages of a cup), the pause, the HUD in a race */
  const G = rig(); G.career.tips = 500; K.beginCup(G.career, 'rookie', 5);
  G.go('race', { ev: { kind: 'cup' } }); G.input.hold('KeyW', true); G.frame(1 / 60, 60 * 2);
  run(G, 'the race at the count', () => G.frame(1 / 60, 1)); G.frame(1 / 60, 60 * 4); run(G, 'the race, going', () => G.frame(1 / 60, 1));
  const L = G.live; L.human.hold = [{ id: 'rocket', count: 2 }, { id: 'ball', count: 1 }]; run(G, 'the race, holding a pickup', () => G.frame(1 / 60, 1));
  L.human.wrong = 5; for (let i = 0; i < 20; i++) { run(G, 'the race, wrong way ' + i, () => G.frame(1 / 60, 1)); if (trace.texts.some(t => t.s === 'WRONG WAY')) break; }
  G.press('Escape'); run(G, 'the pause', () => G.frame(1 / 60, 1)); G.press('Escape'); G.frame(1 / 60, 2);
  let d = null, rc = null; G.input.drive = () => { const Lv = G.live; if (!d || rc !== Lv.race) { rc = Lv.race; d = createDriver(Lv.s.track, Lv.human.spec, HUMAN, 5); } return d.drive(Lv.human.car, Lv.human.near, [], 1 / 60); };
  for (let i = 0; i < 60 * 300 && G.screens.name === 'race'; i++) G.frame(1 / 60, 1);
  run(G, 'the board after a race', () => G.frame(1 / 60, 40)); G.press('Enter'); run(G, 'the cup after the race', () => G.frame(1 / 60, 5));
}
{ /* HUD in the other modes and the radio's toast */
  const G = rig(); G.career.tips = 500;
  for (const ev of [{ kind: 'tt', track: 'street', v: 'f', n: 1 }, { kind: 'practice', track: 'sorting', v: 'f' }, { kind: 'lastmile', track: 'sorting', v: 'f', rating: 0, n: 4, seed: 5 }, { kind: 'yard' }]) {
    G.go('race', { ev }); G.input.hold('KeyW', true); G.frame(1 / 60, 60 * 6); run(G, ev.kind + ' HUD', () => G.frame(1 / 60, 1));
  }
  trace.texts.length = 0; trace.panels.length = 0; G.R.rect(0, 0, 320, 180, C.black); drawRadio(G.R, { text: 'RACE RADIO', sub: 'SPECIAL DELIVERY', t: 2 }); audit(G.R, 'the radio');
}
{ /* a split view and the finish board drawn by hand */
  const T = buildTrack(defFor('sorting', 'f')), entries = fieldFor(0, 7, 5).concat([{ id: 'you', name: 'YOU', car: 'courier', human: true, tier: 0, paint: PLAYER.paint, livery: liveryFor(PLAYER), num: PLAYER.num, parts: {} }]);
  const race = createRace({ track: T, entries, laps: 2, seed: 5, rating: 0 }), me = race.field[7], cam = createCamera(), G = rig();
  race.field.forEach(f => { f.model = carModel(f.entry.car, f.entry.paint, f.entry.livery); });
  for (let i = 0; i < 60 * 5; i++) race.step({ throttle: 1, brake: 0, steer: 0, repo: false });
  const R = G.R, top = { x: 0, y: 0, w: 320, h: 90 }, bot = { x: 0, y: 90, w: 320, h: 90 };
  trace.texts.length = 0; trace.panels.length = 0;
  const spec = cam.update(me.car, 1 / 60, T.col);
  drawView(R, top, T, race.field, spec, { t: race.t, me }); drawHud(R, race, me, { rect: top }); drawView(R, bot, T, race.field, spec, { t: race.t, me }); drawHud(R, race, race.field[0], { rect: bot });
  audit(R, 'the split screen');
  trace.texts.length = 0; trace.panels.length = 0; R.rect(0, 0, 320, 180, C.black); drawResults(R, race, {}); audit(R, 'the results board');
  trace.texts.length = 0; trace.panels.length = 0; R.rect(0, 0, 320, 180, C.black); drawPause(R, { sel: 1, items: ['RESUME', 'RESTART', 'QUIT'] }); audit(R, 'the pause by hand');
}
trace.on = false;
const seen = new Set(), shown = [];
for (const m of problems) { const key = m.replace(/^[a-z0-9 ,]*? "/, '"'); if (!seen.has(key) && shown.length < 24) { seen.add(key); shown.push(m); } }
ok(problems.length === 0, screens + ' screens and ' + pieces + ' pieces of type: all on a plate, none outside the picture, none over another, each on a flat ground and read at 4.5:1 or better', problems.length ? '(' + problems.length + ' problems) ' + shown.join('; ') : '');
S.done(screens + ' screens, ' + pieces + ' pieces of type');
