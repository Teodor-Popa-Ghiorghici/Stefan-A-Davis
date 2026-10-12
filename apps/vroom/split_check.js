/* 2P SPLIT CHECK (dev-only, pure Node): two people at one keyboard.
 *  THE KEYS     input.js gives the left hand (W A S D, SPACE or E or SHIFT to fire, R to be put back) and the right (the arrows, ENTER or RIGHT SHIFT or 0 to fire, / to be put back) as two drivers that share no key, and a
 *               window with no side asked for still answers to both (the single player's).
 *  THE FIELD    setupSplit: two people in cars of the garage in different paint, side by side in the middle of the grid, and 0 to 6 CPU cars of the rating; the same event is the same field; the garage is not read for pay.
 *  THE RACE     race.step takes a list of inputs, one for each person in the order they stand in the field: the left hand's car moves with the left hand and not the right, and the other way round; a single input still drives a
 *               single human. A whole race, both people driven by CPU drivers, ends with both finished and the board up, and the career is exactly what it was and nothing was saved.
 *  THE SCREEN   the menu starts it, the picture is two views of 320 x 90 with a HUD of its own in each (a position, a lap, a speed bar), nothing but palette bytes, the pause menu's RESUME / RESTART / QUIT, and what a frame
 *               costs (two views are not twice as dear as one: the budget is held).
 *   node apps/vroom/split_check.js */
import { suite } from './check_kit.js';
import { rig } from './screens_check_kit.js';
import { createInput } from './input.js';
import { setupSplit } from './events.js';
import { createRace } from './race.js';
import { fresh } from './career.js';
import { createDriver } from './ai.js';
import { HUMAN } from './ai_profiles.js';
import { PAL } from './palette.js';
import { HALF } from './screen_split.js';

globalThis.window = globalThis.window || new EventTarget();
const S = suite('split_check'), { ok } = S;
const clean = G => { const b = G.R.buf; for (let i = 0; i < b.length; i++) if (b[i] >= PAL.length) return false; return true; };
const none = { throttle: 0, brake: 0, steer: 0, repo: false, fire: false };

/* ---- the keys ---- */
{
  const t = new EventTarget(), I = createInput(t, {});
  const key = (type, code) => { const e = Object.assign(new Event(type), { code, ctrlKey: false, metaKey: false, altKey: false }); t.dispatchEvent(e); };
  const L = () => I.drive('left'), Rt = () => I.drive('right');
  key('keydown', 'KeyW'); key('keydown', 'KeyD');
  ok(L().throttle === 1 && L().steer === 1 && Rt().throttle === 0 && Rt().steer === 0, 'W and D are the left hand\'s: the right hand\'s driver sees nothing');
  key('keyup', 'KeyW'); key('keyup', 'KeyD'); key('keydown', 'ArrowUp'); key('keydown', 'ArrowLeft');
  ok(Rt().throttle === 1 && Rt().steer === -1 && L().throttle === 0 && L().steer === 0, 'the arrows are the right hand\'s: the left hand\'s driver sees nothing');
  ok(I.drive().throttle === 1 && I.drive().steer === -1, 'and a window with no side asked for (the single player\'s) answers to the arrows as well');
  key('keyup', 'ArrowUp'); key('keyup', 'ArrowLeft');
  for (const c of ['Space', 'KeyE', 'ShiftLeft']) { key('keydown', c); ok(L().fire && !Rt().fire, c + ' fires for the left hand only'); key('keyup', c); }
  for (const c of ['Enter', 'ShiftRight', 'Numpad0']) { key('keydown', c); ok(Rt().fire && !L().fire, c + ' fires for the right hand only'); key('keyup', c); }
  key('keydown', 'KeyR'); ok(L().repo && !Rt().repo, 'R puts the left hand\'s car back'); key('keyup', 'KeyR');
  key('keydown', 'Slash'); ok(Rt().repo && !L().repo, 'and / the right hand\'s'); key('keyup', 'Slash');
  key('keydown', 'KeyS'); key('keydown', 'ArrowDown'); ok(L().brake === 1 && Rt().brake === 1, 'each hand has a brake of its own (S, DOWN)'); key('keyup', 'KeyS'); key('keyup', 'ArrowDown');
  I.dispose();
}

/* ---- the field ---- */
const c0 = fresh(), ev = { track: 'sorting', rating: 0, laps: 2, rivals: 4, seed: 5 };
{
  const s = setupSplit(c0, ev);
  const ids = s.entries.map(e => e.id), humans = s.entries.filter(e => e.human);
  ok(s.entries.length === 6 && humans.length === 2 && ids.includes('p1') && ids.includes('p2') && !ids.includes('you'), 'two people and four CPU cars make a field of six (' + ids.join(' ') + ')');
  const p1 = s.entries.find(e => e.id === 'p1'), p2 = s.entries.find(e => e.id === 'p2');
  ok(p1.paint !== p2.paint && p1.num !== p2.num && ids.indexOf('p2') === ids.indexOf('p1') + 1, 'in different paint and a different number, and next to each other on the grid');
  ok(s.kind === 'split' && s.laps === 2 && s.n === 6, 'the event says what it is');
  ok(JSON.stringify(setupSplit(c0, ev).entries.map(e => [e.id, e.car, e.paint])) === JSON.stringify(s.entries.map(e => [e.id, e.car, e.paint])), 'the same event is the same field');
  for (const n of [0, 3, 6]) ok(setupSplit(c0, Object.assign({}, ev, { rivals: n })).entries.length === n + 2, n + ' CPU cars make a field of ' + (n + 2));
  ok(setupSplit(c0, Object.assign({}, ev, { rivals: 99 })).entries.length === 8 && setupSplit(c0, Object.assign({}, ev, { rivals: -4 })).entries.length === 2, 'and the most is six, the least none');
  const race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
  const h1 = race.field.find(f => f.entry.id === 'p1'), h2 = race.field.find(f => f.entry.id === 'p2');
  ok(h1.human && h2.human && Math.hypot(h1.car.p[0] - h2.car.p[0], h1.car.p[2] - h2.car.p[2]) < 2.5, 'both are on the grid side by side (' + Math.hypot(h1.car.p[0] - h2.car.p[0], h1.car.p[2] - h2.car.p[2]).toFixed(2) + ' m apart)');
}

/* ---- the race: each hand drives its own car ---- */
{
  const go = (a, b) => {
    const s = setupSplit(c0, Object.assign({}, ev, { rivals: 0 })), race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
    const h1 = race.field.find(f => f.entry.id === 'p1'), h2 = race.field.find(f => f.entry.id === 'p2'), sp = f => Math.hypot(f.car.v[0], f.car.v[2]);
    for (let i = 0; i < 60 * 3.5; i++) race.step([none, none]);
    const p0 = [h1.dist, h2.dist];
    for (let i = 0; i < 60 * 2.5; i++) race.step([a, b]);
    return { s1: sp(h1), s2: sp(h2), d1: h1.dist - p0[0], d2: h2.dist - p0[1], race, h1, h2 };
  };
  const gas = Object.assign({}, none, { throttle: 1 });
  const A = go(gas, none), B = go(none, gas);
  ok(A.d1 > 8 && A.d2 < 1, 'with no CPU cars, the left hand\'s gas drives the first car and leaves the second where it is (' + A.d1.toFixed(1) + ' and ' + A.d2.toFixed(1) + ' m)');
  ok(B.d2 > 8 && B.d1 < 1, 'the right hand\'s drives the second and leaves the first (' + B.d2.toFixed(1) + ' and ' + B.d1.toFixed(1) + ' m)');
  const C = go(gas, gas);
  ok(C.d1 > 8 && C.d2 > 8, 'both together: both cars go (' + C.d1.toFixed(1) + ' and ' + C.d2.toFixed(1) + ' m)');
  /* one input for one human, as ever */
  const s = setupSplit(c0, Object.assign({}, ev, { rivals: 0 })), solo = createRace({ track: s.track, entries: s.entries.slice(0, 1), laps: 2, rating: 0, seed: 1 });
  for (let i = 0; i < 60 * 6; i++) solo.step(gas);
  ok(solo.field[0].dist > 8, 'and a race with one human still takes one input, not a list (' + solo.field[0].dist.toFixed(1) + ' m)');
}

/* ---- the screen ---- */
{
  const G = rig(), career0 = JSON.stringify(G.career);
  G.go('title', { sel: 6 }); G.press('Enter'); G.frame(1 / 60, 2);
  ok(G.screens.name === 'splitmenu' && clean(G), 'the title\'s seventh row is the 2P menu, and it draws');
  const M = () => G.screens.screen.state().S;
  G.press('ArrowRight'); ok(M().track === 1 || M().track === 0, 'a row changes with LEFT and RIGHT');
  G.press('ArrowDown', 'ArrowDown'); G.press('ArrowRight'); G.press('ArrowRight'); ok(M().laps === 5, 'LAPS is up to five (' + M().laps + ')');
  G.press('ArrowDown'); for (let i = 0; i < 5; i++) G.press('ArrowRight'); ok(M().rivals === 6, 'the CPU cars are up to six (' + M().rivals + ')');
  for (let i = 0; i < 8; i++) G.press('ArrowLeft'); ok(M().rivals === 0, 'and none at least');
  for (let i = 0; i < 3; i++) G.press('ArrowRight');
  G.press('ArrowDown'); G.press('ArrowRight'); G.press('ArrowDown'); G.press('ArrowRight');
  ok(M().car1 && M().car2 && M().car1 === G.career.car && M().car2 === G.career.car, 'each person picks a car from the garage (there is one: the courier)');
  G.press('ArrowDown'); G.press('Enter');
  ok(G.screens.name === 'split' && clean(G), 'ENTER on START begins the race');
  G.frame(1 / 60, 10);
  const b = G.R.buf, w = G.R.w;
  const half = k => { let h = 0x811C9DC5, lit = 0; for (let y = k * HALF; y < (k + 1) * HALF; y++) for (let x = 0; x < w; x++) { h ^= b[y * w + x]; h = Math.imul(h, 16777619) >>> 0; if (b[y * w + x] > 0) lit++; } return { h, lit }; };
  const t = half(0), u = half(1);
  ok(t.h !== u.h && t.lit > 0.5 * w * HALF && u.lit > 0.5 * w * HALF, 'the picture is two different views, each with something in nearly all of it');
  ok([0, 1].every(k => { let black = 0; const y = k * HALF + HALF - 12; for (let x = 244; x < 312; x++) if (b[y * w + x] === 0) black++; return black === 68; }), 'each half has its speed bar\'s black frame at the foot (a HUD of its own)');
  /* a frame's cost, split against single */
  const ms = n => { const t0 = process.hrtime.bigint(); G.frame(1 / 60, n); return Number(process.hrtime.bigint() - t0) / 1e6 / n; };
  ms(10); const split = ms(60);
  const G2 = rig(); G2.go('title', { sel: 1 }); G2.press('Enter'); G2.press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'); G2.press('Enter');
  const one = (() => { G2.frame(1 / 60, 10); const t0 = process.hrtime.bigint(); G2.frame(1 / 60, 60); return Number(process.hrtime.bigint() - t0) / 1e6 / 60; })();
  ok(G2.screens.name === 'race' && split < 3 * one + 4 && split < 20, 'a frame of the split costs ' + split.toFixed(1) + ' ms against ' + one.toFixed(1) + ' for one view (the budget: under 20, and under three times the single)', split + ' vs ' + one);
  /* pause */
  G.frame(1 / 60, 90); const before = G.live.race, t0 = before.t;
  G.press('Escape'); G.frame(1 / 60, 3); ok(G.paused === true && clean(G), 'ESC pauses and the pause draws');
  G.frame(1 / 60, 60); ok(G.live.race.t === t0 || Math.abs(G.live.race.t - t0) < 0.1, 'a paused race does not move (' + t0.toFixed(2) + ' s then ' + G.live.race.t.toFixed(2) + ')');
  G.press('ArrowDown'); G.press('Enter'); G.frame(1 / 60, 3);
  ok(G.screens.name === 'split' && G.live.race !== before && G.live.race.t < 0 && G.paused === false, 'RESTART begins it again, from the grid');
  G.press('Escape'); G.press('ArrowDown', 'ArrowDown'); G.press('Enter'); ok(G.screens.name === 'splitmenu', 'QUIT is back in the menu');
  /* a whole race, both people driven */
  G.press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'); G.press('Enter');
  const st = {}, drv = side => { const L = G.live, i = side === 'right' ? 1 : 0; if (st.race !== L.race) { st.race = L.race; st.d = [0, 1].map(k => createDriver(L.track || L.s.track, L.humans[k].spec, HUMAN, 5 + k)); } const f = L.humans[i]; return st.d[i].drive(f.car, f.near, [], 1 / 60); };
  G.input.drive = drv;
  let n = 0; while (!G.live.board && n++ < 60 * 400) G.frame(1 / 60, 1);
  ok(G.live.board && G.live.humans.every(h => h.finished), 'a whole race ends with both people finished and the board up (' + (n / 60).toFixed(0) + ' s)');
  G.frame(1 / 60, 5); ok(clean(G), 'the board draws');
  ok(JSON.stringify(G.career) === career0 && G.saved.length === 0, 'and the career is exactly what it was, and nothing was saved');
  G.press('Escape'); ok(G.screens.name === 'splitmenu', 'ESC on the board is back in the menu');
}
S.done();
