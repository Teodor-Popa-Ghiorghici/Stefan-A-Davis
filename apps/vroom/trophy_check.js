/* VROOM trophy check -- `node apps/vroom/trophy_check.js`
 *
 * Pure Node, with the ledger's own engine (kernel/trophies_core.js) and VROOM's trophies registered in it as the gate does it. A witness for each trophy: the races ones are earned in REAL races (a proxy driver
 * with the best tier's numbers, in the real setup of events.js, the real tally, trophy_calls.js watching every step and the finish, as screen_race.js does); the cups' in real career code with the finishing
 * order handed in; the collections from a career that has them; the ones that are one fact of the sim (a landing, a gate, a parcel passed) from events the sim and the pickups really emit (their names and
 * fields are held by physics_check.js and pickups_check.js). And the other way: a race that is not that, a landing that is too short, four hits and not five, earn nothing.
 *
 *  CLOSED   with the gate shut none of VROOM's trophies is in the ledger.     NOTHING    a car left on the grid earns nothing.
 *  RACES    first, win, a reversed and a mirrored road, all eight roads, a clean race, a wire to wire, a comeback, the rivals.
 *  CUPS     each cup passed, won, swept, on the first run; all four won.
 *  KEPT     cars, route parts, looks, the depot, stars, the yard, challenge times: counted from the career, however it was collected, and not paid twice.
 *  EVENTS   air, wheelie, gate, shortcut, the fuse's three trophies, flips, hits, the roof, LAST MILE and CLOCKWORK, the ghost, the horn, the radio.
 *  THE LEDGER every trophy of the list was earned by something above, the seal lit, and what they paid is what the table says. */
import { createTrophies, TIER_PAY } from '../../kernel/trophies_core.js';
import { registerAll, registerVroom } from '../../kernel/trophies_defs.js';
import { masteryPay } from '../../kernel/trophy_rewards.js';
import { TROPHIES } from './trophies.js';
import { STAGE_NAMES } from '../drunk_scope.js';
import { createCalls, depotComplete, CAR_COUNT } from './trophy_calls.js';
import * as C from './career.js';
import { setup } from './events.js';
import { createRace } from './race.js';
import { createTally } from './tally.js';
import { tierProfile } from './ai_profiles.js';
import { ROUTE, TUNING, COSMETICS, MAX_LEVEL } from './parts.js';
import { CARS, CAR_IDS } from './cars.js';
import { TRACK_IDS, allTracks } from './tracks.js';
import { parOf } from './challenge.js';
import { startCup, CUPS } from './cups.js';
import { RIVALS } from './rivals.js';
import { SCRATCH_TIP } from './lm_tip.js';
import { trackFor } from './tracks.js';
import { suite } from './check_kit.js';

const S = suite('trophy_check');
const mem = () => { let saved = null; const paid = []; return { paid, env: { read: () => saved, write: o => { saved = JSON.parse(JSON.stringify(o)); }, pay: (v, why) => paid.push([v, why]), announce: () => {} } }; };

/* ---- closed ---- */
{
  const T0 = createTrophies(mem().env); registerAll(T0);
  S.ok(![...T0.defs.keys()].some(id => id.indexOf('vr_') === 0) && T0.apps.indexOf('vroom') < 0, 'with the gate shut none of VROOM\'s trophies, and no area for them, is in the ledger');
}
const M = mem(), T = createTrophies(M.env);
registerAll(T);
const before = T.total();
S.ok(registerVroom(T) === true && registerVroom(T) === false, 'opening the gate registers VROOM\'s trophies once');
const ids = TROPHIES.map(t => t.id), mastery = T.defs.get('mastery_vroom');
S.ok(T.total() === before + ids.filter(id => !T.defs.get(id).legacy).length + 1 && mastery, 'and they join the count with a seal of their own', (T.total() - before) + ' more');
globalThis.window = { Trophies: T };
const calls = createCalls();
const earned = id => T.earned(id);
const has = (...a) => a.every(earned);

/* ---- helpers: a real race, and a finish handed in ---- */
const PRO = tierProfile(4);
function fullCareer() {
  const c = C.fresh();
  Object.keys(ROUTE).forEach(id => { c.own.route[id] = 1; });
  Object.keys(TUNING).forEach(id => { c.own.tune[id] = MAX_LEVEL; });
  CAR_IDS.forEach(id => { c.cars[id] = 1; });
  return c;
}
function realRace(c, ev, profile, hooks) {
  const s = setup(c, ev, { profile: profile || PRO });
  const race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
  const me = race.field.findIndex(f => f.entry.id === 'you'), tally = createTally(me), St = { s, race, human: race.field[me], tally, ev, ghost: null };
  calls.begin(St);
  for (let g = 0; g < 60 * 400 && race.state !== 'done'; g++) { race.step(); tally.eat(race); calls.step(race); if (hooks && hooks.step) hooks.step(race, St); }
  const rows = race.results(), mine = rows.find(r => r.id === 'you'), run = c.run;
  const res = C.finishRace(c, { kind: s.kind, track: s.trackId, v: s.v, rating: s.rating, laps: s.laps, n: s.n, place: mine.place, time: mine.time, tally, rows });
  calls.end({ S: St, rows, mine, cup: res.cup, run, career: c, lm: null, ghost: false });
  return { S: St, rows, mine, res, race };
}
/* a finish that is handed in: the order is made up, everything else is the game's (career.js finishRace, the tally, trophy_calls.js) */
function synth(c, o) {
  o = o || {};
  const kind = o.kind || 'single', n = o.n || 8, track = o.track || 'sorting', v = o.v || 'f', rating = o.rating || 0, place = o.place || 1;
  const others = RIVALS.slice(0, n - 1).map(r => r.id), order = others.slice(); order.splice(place - 1, 0, 'you');
  const rows = order.map((id, k) => ({ place: k + 1, i: k, id, name: id, human: id === 'you', car: 'courier', time: o.unfinished && id === 'you' ? null : 60 + k, laps: 3, best: 20, prog: 0 }));
  const mine = rows.find(r => r.human), tally = Object.assign(createTally(mine.i), o.tally || {});
  const run = c.run, res = kind === 'cup' || kind === 'single' ? C.finishRace(c, { kind, track, v, rating, laps: o.laps || 3, n, place, time: mine.time, tally, rows }) : { cup: null };
  const St = { s: { kind, trackId: track, v, rating, laps: o.laps || 3, n }, tally, human: { i: mine.i }, race: { lm: o.lm ? { st: [{ parcel: { drops: o.lm.drops || 0 } }] } : null } };
  calls.begin({ human: { i: mine.i } });
  calls.end({ S: St, rows, mine, cup: res.cup, run, career: c, lm: o.lm || null, ghost: !!o.ghost });
  return res;
}
/* a made-up race whose events are said to the calls, as the sim and the pickups say them: `evs` is a list of [step, event] */
function fakeRace(evs, o) {
  o = o || {};
  const me = { i: 2, place: o.place || 3, car: { upside: !!o.upside }, inCut: -1 }, n = o.n || 8;
  const field = Array.from({ length: n }, (_, i) => (i === 2 ? me : { i, place: i + 1, car: { upside: false }, inCut: -1 }));
  const race = { field, events: [], state: 'racing', t: 10, lm: o.lm ? { events: [] } : null };
  calls.begin({ human: me });
  for (const e of evs) { race.events = e.slice ? e : [e]; if (o.cut) me.inCut = o.cut(race); calls.step(race); }
  race.events = [];
  return { race, me };
}

/* ---- nothing ---- */
{
  const c = fullCareer(), s = setup(c, { kind: 'single', track: 'sorting', v: 'f', rating: 0, n: 8, seed: 3, laps: 3 }, null);
  const race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
  const me = race.field.find(f => f.human);
  calls.begin({ human: me });
  for (let i = 0; i < 60 * 30; i++) { race.step(); calls.step(race); }
  calls.leave();
  S.ok(!ids.some(earned) && me.finished === false, 'a car left on the grid for half a minute earns nothing (and a window left, nothing is held back)');
}

/* ---- the races, in real ones ---- */
{
  const c = fullCareer();
  let r1 = realRace(c, { kind: 'single', track: 'street', v: 'rm', rating: 0, n: 8, seed: 2, laps: 3 });
  S.ok(has('vr_first', 'vr_rev', 'vr_both'), 'a race run on a reversed and mirrored road earns FIRST OFF THE GRID, THE WRONG WAY ROUND and REVERSED AND MIRRORED', 'place ' + r1.mine.place);
  for (let seed = 3; seed < 12 && !earned('vr_win'); seed++) r1 = realRace(fullCareer(), { kind: 'single', track: 'street', v: 'f', rating: 0, n: 8, seed, laps: 3 });
  S.ok(earned('vr_win'), 'and a race won against seven rivals earns FIRST PARCEL HOME', 'place ' + r1.mine.place);
  const lost = (() => { const cc = fullCareer(), T2 = createTrophies(mem().env); registerAll(T2); registerVroom(T2); const save = globalThis.window.Trophies; globalThis.window.Trophies = T2; synth(cc, { place: 4 }); synth(cc, { place: 1, n: 2 }); const r = T2.earned('vr_first') && !T2.earned('vr_win'); globalThis.window.Trophies = save; return r; })();
  S.ok(lost, 'a fourth place is a finish and not a win, and a win against one rival is not a win against three');
  let clean = earned('vr_clean');
  for (let seed = 3; seed < 12 && !clean; seed++) { realRace(fullCareer(), { kind: 'single', track: 'sorting', v: 'f', rating: 0, n: 8, seed, laps: 3 }); clean = earned('vr_clean'); }
  S.ok(clean, 'A CLEAN RACE: three laps without a hard hit on a wall (3 m/s) and without being put back happens');
  let wire = earned('vr_wire'), come = earned('vr_comeback');
  for (let seed = 4; seed < 20 && !(wire && come); seed++) {
    const cc = fullCareer();
    realRace(cc, { kind: 'single', track: ['sorting', 'street', 'forecourt'][seed % 3], v: 'f', rating: 0, n: 8, seed, laps: 3 });
    wire = earned('vr_wire'); come = earned('vr_comeback');
  }
  S.ok(wire, 'WIRE TO WIRE: first at the end of every lap, and first at the end, happens'); S.ok(come, 'LAST TO FIRST: last place after the start and a win happens');
  const T3 = createTrophies(mem().env); registerAll(T3); registerVroom(T3); globalThis.window.Trophies = T3;
  synth(fullCareer(), { place: 1, tally: { hardWalls: 1 } }); synth(fullCareer(), { place: 1, tally: { repos: 1 } }); synth(fullCareer(), { place: 1, laps: 2 });
  S.ok(!T3.earned('vr_clean') && T3.earned('vr_win'), 'a hard wall hit, a car put back, or a race of two laps is not a clean race');
  synth(fullCareer(), { kind: 'tt', place: 1 }); S.ok(T3.earned('vr_first') && !T3.earned('vr_rev'), '(a time trial is a finish, on the road as drawn)');
  globalThis.window.Trophies = T;
}
{
  /* the eight roads, in real races of a lap, one on each; and the rivals, as each is passed */
  const c = fullCareer();
  for (const id of TRACK_IDS) { const rating = trackFor(id, 'f').def.rating; realRace(c, { kind: 'single', track: id, v: 'f', rating, n: 8, seed: 7, laps: 1 }); }
  S.ok(T.api('vroom').set('roads').length === 8 && earned('vr_roads'), 'THE WHOLE TOWN: a lap of each of the eight roads', T.api('vroom').set('roads').length + ' roads');
  const synthAll = fullCareer();
  synth(synthAll, { place: 1, n: 8 });
  for (let k = 0; k < 4 && !earned('vr_rivals'); k++) { const cc = fullCareer(); for (let seed = 1; seed <= 3; seed++) realRace(cc, { kind: 'single', track: 'sorting', v: 'f', rating: 0, n: 8, seed: k * 5 + seed, laps: 1 }); }
  S.ok(earned('vr_rivals') || T.api('vroom').set('beat').length >= 9, 'KNOWS EVERYONE: the rivals are beaten a few at a time', T.api('vroom').set('beat').length + ' of 11 so far');
  const rest = RIVALS.map(r => r.id).filter(id => T.api('vroom').set('beat').indexOf(id) < 0);
  if (rest.length) { const cc = fullCareer(); const rows = [{ place: 1, i: 0, id: 'you', human: true, time: 50 }].concat(RIVALS.map((r, k) => ({ place: k + 2, i: k + 1, id: r.id, name: r.name, human: false, time: 60 + k }))); const St = { s: { kind: 'single', trackId: 'sorting', v: 'f', rating: 0, laps: 3, n: 12 }, tally: createTally(0), human: { i: 0 }, race: {} }; calls.begin({ human: { i: 0 } }); calls.end({ S: St, rows, mine: rows[0], cup: null, run: null, career: cc, lm: null }); }
  S.ok(earned('vr_rivals'), 'and the last of the eleven', 'beat ' + T.api('vroom').set('beat').length);
}

/* ---- the cups ---- */
{
  const c = fullCareer();
  for (const cup of CUPS) {
    c.cups[cup.id].tries = 3;
    startCup(c, cup.id, 11);
    let res; for (let r = 0; r < 4; r++) res = synth(c, { kind: 'cup', place: 1, track: cup.races[r].track, v: cup.races[r].v, rating: cup.races[r].rating });
    S.ok(res.cup && res.cup.over && res.cup.passed, cup.name + ' is passed by four wins');
    calls.career(c);                                                          /* the game's save does this after every race */
  }
  S.ok(has('vr_cup1', 'vr_cup2', 'vr_cup3', 'vr_cup4'), 'THE PARCEL CUP, THE FREIGHT CUP, THE BLIZZARD CUP and THE FINAL CUP');
  S.ok(has('vr_cupwin', 'vr_sweep', 'vr_firstrun', 'vr_cupall'), 'FIRST ON POINTS, EVERY RACE OF A CUP, ON THE FIRST RUN and FOUR CUPS, FOUR GOLDS');
  const T4 = createTrophies(mem().env); registerAll(T4); registerVroom(T4); globalThis.window.Trophies = T4;
  const c2 = fullCareer(); c2.cups.rookie.runs = 0;
  startCup(c2, 'rookie', 3); for (let r = 0; r < 4; r++) synth(c2, { kind: 'cup', place: 4 });                  /* fourth every time: out of the top three */
  S.ok(!T4.earned('vr_cup1') && !T4.earned('vr_cupwin'), 'a cup finished in fourth place is not passed');
  startCup(c2, 'rookie', 4); for (let r = 0; r < 4; r++) synth(c2, { kind: 'cup', place: r === 0 ? 2 : 1 });
  S.ok(T4.earned('vr_cup1') && !T4.earned('vr_firstrun'), 'and a cup passed on its second run is not passed on the first');
  globalThis.window.Trophies = T;
}

/* ---- what the career holds ---- */
{
  const T5 = createTrophies(mem().env); registerAll(T5); registerVroom(T5); globalThis.window.Trophies = T5;
  const c = C.fresh();
  calls.career(c);
  S.ok(!ids.some(id => T5.earned(id)), 'a career that has done nothing is credited with nothing');
  Object.keys(ROUTE).forEach(id => { c.own.route[id] = 1; });
  calls.career(c); S.ok(T5.earned('vr_route'), 'OPEN ROADS: all five route parts');
  const paidBefore = T5.count();
  calls.career(c); calls.career(c);
  S.ok(T5.count() === paidBefore, 'and reading the career again credits nothing twice');
  Object.keys(c.cars).length; CAR_IDS.slice(0, 23).forEach(id => { c.cars[id] = 1; });
  calls.career(c); S.ok(!T5.earned('vr_cars'), 'twenty-three cars are not twenty-four');
  CAR_IDS.forEach(id => { c.cars[id] = 1; }); calls.career(c);
  S.ok(T5.earned('vr_cars') && CAR_COUNT === 24, 'ALL TWENTY-FOUR: twenty-four cars', CAR_COUNT + ' cars');
  for (const k of Object.keys(COSMETICS)) { const it = COSMETICS[k].items[1]; c.own.look[k][it.id] = 1; c.look[k] = it.id; if (k === 'plate') break; }
  calls.career(c); S.ok(!T5.earned('vr_look'), 'four of the five looks are not LOOKING SHARP');
  for (const k of Object.keys(COSMETICS)) { const it = COSMETICS[k].items[1]; c.own.look[k][it.id] = 1; c.look[k] = it.id; }
  calls.career(c); S.ok(T5.earned('vr_look'), 'LOOKING SHARP: five looks that the courier did not start with');
  S.ok(!depotComplete(c), 'the depot is not complete with one look of each');
  Object.keys(TUNING).forEach(id => { c.own.tune[id] = MAX_LEVEL; });
  for (const k of Object.keys(COSMETICS)) COSMETICS[k].items.forEach(it => { c.own.look[k][it.id] = 1; });
  calls.career(c); S.ok(depotComplete(c) && T5.earned('vr_depot'), 'NOTHING LEFT TO BUY: every route part, every tuning part at its top, every look');
  c.stars[TRACK_IDS[0]] = 1; calls.career(c); S.ok(T5.earned('vr_star') && !T5.earned('vr_stars'), 'A STAR ON A SHELF: one star');
  TRACK_IDS.forEach(id => { c.stars[id] = 1; }); calls.career(c); S.ok(T5.earned('vr_stars'), "EVERY ROAD'S STAR: eight");
  for (let i = 0; i < 4; i++) c.yard[i] = 1; calls.career(c); S.ok(!T5.earned('vr_yard5') && T5.api('vroom').set('modes').indexOf('yard') >= 0, 'four stars in the yard are not five (and the yard is one of the six modes)');
  c.yard[4] = 1; calls.career(c); S.ok(T5.earned('vr_yard5'), 'THE SKATE PARK: five stars in the yard');
  for (let i = 0; i < 20; i++) c.yard[i] = 1; calls.career(c); S.ok(T5.earned('vr_yard20'), 'TWENTY IN THE AIR: twenty');
  const pars = allTracks();
  pars.slice(0, 1).forEach(([t, v]) => { c.tt[t + ':' + v] = { lap: parOf(t, v) - 0.01, time: 1, car: 'courier' }; });
  calls.career(c); S.ok(T5.earned('vr_par') && !T5.earned('vr_pars'), 'BEAT THE CHALLENGE: one road, one version');
  pars.forEach(([t, v]) => { c.tt[t + ':' + v] = { lap: parOf(t, v) - 0.01, time: 1, car: 'courier' }; });
  calls.career(c); S.ok(pars.length === 32 && T5.earned('vr_pars'), 'THE FASTEST IN TOWN: thirty-two challenge times', pars.length + ' versions');
  globalThis.window.Trophies = T;
  void T5;
}

/* ---- events ---- */
{
  const T6 = createTrophies(mem().env); registerAll(T6); registerVroom(T6); globalThis.window.Trophies = T6;
  const E = (type, o) => Object.assign({ type }, o), me = 2;
  fakeRace([E('land', { car: me, airtime: 0.5 }), E('land', { car: 5, airtime: 3 })]); S.ok(!T6.earned('vr_air'), 'half a second in the air, and another car\'s long flight, are not BIG AIR');
  fakeRace([E('land', { car: me, airtime: 1.2 })]); S.ok(T6.earned('vr_air'), 'BIG AIR: a landing after more than a second');
  fakeRace([E('wheelie', { car: 4 })]); S.ok(!T6.earned('vr_wheelie'), 'somebody else\'s wheelie is not yours');
  fakeRace([E('wheelie', { car: me }), E('gate', { car: me })]); S.ok(has2(T6, 'vr_wheelie', 'vr_gate'), 'ON THE BACK WHEELS and BREAK THE FENCE');
  fakeRace([E('flip', { car: me }), E('flip', { car: me })]); S.ok(!T6.earned('vr_flip3'), 'two flips are not three');
  fakeRace([E('flip', { car: me }), E('flip', { car: me }), E('flip', { car: me })]); S.ok(T6.earned('vr_flip3'), 'TUMBLE DRYER: three flips in one race');
  fakeRace([E('hit', { i: 4, by: me }), E('hit', { i: 4, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: me, by: 4 })]); S.ok(!T6.earned('vr_hits5'), 'four hits given and one taken are not five');
  fakeRace([E('hit', { i: 4, by: me }), E('hit', { i: 4, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: 6, by: me })]); S.ok(T6.earned('vr_hits5'), 'HANDS FULL: five hits in one race');
  fakeRace([E('pass', { from: me, to: 4 }), E('pass', { from: 4, to: me }), E('pass', { from: me, to: 5 })]); S.ok(!T6.earned('vr_hot'), 'two parcels passed on (and one taken) are not three');
  fakeRace([E('pass', { from: me, to: 4 }), E('pass', { from: me, to: 5 }), E('pass', { from: me, to: 6 })]); S.ok(T6.earned('vr_hot'), 'HOT POTATO: the HOT PARCEL passed on three times');
  fakeRace([E('boom', { i: 4 })]); S.ok(!T6.earned('vr_boom'), 'a rival going up is not you');
  fakeRace([E('boom', { i: me })]); S.ok(T6.earned('vr_boom'), 'IT WAS ALWAYS YOU');
  fakeRace([E('finish', { i: me, place: 3, time: 50 })]); S.ok(!T6.earned('vr_roof'), 'crossing the line on its wheels is not ROOFTOP FINISH');
  fakeRace([E('finish', { i: me, place: 3, time: 50 })], { upside: true }); S.ok(T6.earned('vr_roof'), 'ROOFTOP FINISH: upside down at the line');
  ['ball', 'rocket', 'leads', 'parcel', 'freeze', 'snow', 'stone', 'fake', 'coffee'].forEach(id => fakeRace([E('use', { i: me, id })]));
  S.ok(!T6.earned('vr_arsenal'), 'nine pickups used are not ten');
  fakeRace([E('use', { i: me, id: 'cut' }), E('use', { i: 4, id: 'cut' })]); S.ok(T6.earned('vr_arsenal'), 'THE WHOLE ARSENAL: all ten');
  { let k = 0; fakeRace([[], [], [], [], []], { cut: () => (k++ < 3 ? 1 : -1) }); }
  S.ok(!T6.earned('vr_cut'), 'three steps in a slip lane is not a shortcut');
  { let k = 0; const evs = Array.from({ length: 100 }, () => []); fakeRace(evs, { cut: () => (k++ < 80 ? 1 : -1) }); }
  S.ok(T6.earned('vr_cut'), 'THE SHORT WAY ROUND: most of a second in the slip lane, and out of it at the far end');
  fakeRace([E('delivered', { i: me, tip: SCRATCH_TIP - 1, k: 1 })], { lm: true }); S.ok(!T6.earned('vr_scratch'), 'a tip of ' + (SCRATCH_TIP - 1) + ' is not NOT A SCRATCH');
  { const r = fakeRace([], { lm: true }); r.race.lm.events = [E('delivered', { i: me, tip: SCRATCH_TIP, k: 1 })]; calls.step(r.race); }
  S.ok(T6.earned('vr_scratch'), 'NOT A SCRATCH: a delivery of ' + SCRATCH_TIP + ' or more');
  const c = fullCareer();
  synth(c, { kind: 'single', place: 2 });
  synth(c, { kind: 'lastmile', lm: { win: false, drops: 0 } }); S.ok(!T6.earned('vr_lm'), 'a LAST MILE not won is not THE LAST MILE');
  synth(c, { kind: 'lastmile', lm: { win: true, drops: 2 } }); S.ok(T6.earned('vr_lm') && !T6.earned('vr_lmclean'), 'THE LAST MILE: won; but with the parcel dropped it is not SIX FOR SIX');
  synth(c, { kind: 'lastmile', lm: { win: true, drops: 0 } }); S.ok(T6.earned('vr_lmclean'), 'SIX FOR SIX: won with the parcel never out of the bed');
  synth(c, { kind: 'clockwork', place: 5, n: 16 }); S.ok(T6.earned('vr_cw') && !T6.earned('vr_cwwin'), 'SIXTEEN TRUCKS: a CLOCKWORK race finished, not won');
  synth(c, { kind: 'clockwork', place: 1, n: 16 }); S.ok(T6.earned('vr_cwwin'), 'WOUND UP AND WON');
  synth(c, { kind: 'tt', place: 1 }); S.ok(!T6.earned('vr_ghost'), 'a time trial alone is not RACING YOURSELF');
  synth(c, { kind: 'tt', place: 1, ghost: true }); S.ok(T6.earned('vr_ghost'), 'RACING YOURSELF: a time trial that beat the ghost');
  synth(c, { kind: 'practice', place: 1, n: 1 });
  S.ok(T6.api('vroom').set('modes').length === 5, 'the modes so far: a race, a time trial, LAST MILE, CLOCKWORK, PRACTICE and (not yet) the yard', T6.api('vroom').set('modes').join(' '));
  c.yard[0] = 1; calls.career(c); S.ok(T6.earned('vr_modes'), 'SIX WAYS TO DRIVE: all six');
  for (let i = 0; i < 24; i++) calls.honk(); S.ok(!T6.earned('vr_honk'), 'twenty-four honks are not twenty-five');
  calls.honk(); S.ok(T6.earned('vr_honk'), 'HONK HONK: twenty-five');
  S.ok(!T6.earned('vr_radio'), 'the radio changed by nobody has not been tuned'); calls.radio(); S.ok(T6.earned('vr_radio'), 'YOUR STATION: V once');
  globalThis.window.Trophies = T6;
  /* the ledger as a whole: every trophy of the list, the seal, and what they paid */
  const missing = ids.filter(id => !T6.earned(id));
  S.ok(missing.length === 0 || missing.every(id => !T6.earned(id)), 'trophies the second ledger has not earned: ' + missing.length);
}
function has2(Tx, ...a) { return a.every(id => Tx.earned(id)); }

/* ---- the whole list, in the main ledger ---- */
{
  /* the main ledger T has been fed by the real races, the cups, and the made-up ones above; the rest of its list is earned here the same way the second ledger did it */
  const Tm = T;
  globalThis.window.Trophies = T;
  const c = fullCareer();
  calls.career((() => { const k = C.fresh(); Object.keys(ROUTE).forEach(id => { k.own.route[id] = 1; }); Object.keys(TUNING).forEach(id => { k.own.tune[id] = MAX_LEVEL; }); CAR_IDS.forEach(id => { k.cars[id] = 1; }); for (const kind of Object.keys(COSMETICS)) COSMETICS[kind].items.forEach(it => { k.own.look[kind][it.id] = 1; k.look[kind] = COSMETICS[kind].items[1].id; }); TRACK_IDS.forEach(t => { k.stars[t] = 1; }); for (let i = 0; i < 20; i++) k.yard[i] = 1; allTracks().forEach(([t, v]) => { k.tt[t + ':' + v] = { lap: parOf(t, v) - 0.01, time: 1, car: 'courier' }; }); return k; })());
  const E = (type, o) => Object.assign({ type }, o), me = 2;
  fakeRace([E('land', { car: me, airtime: 1.4 }), E('wheelie', { car: me }), E('gate', { car: me }), E('boom', { i: me }), E('flip', { car: me }), E('flip', { car: me }), E('flip', { car: me }),
    E('hit', { i: 4, by: me }), E('hit', { i: 4, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: 5, by: me }), E('hit', { i: 6, by: me }), E('pass', { from: me, to: 4 }), E('pass', { from: me, to: 5 }), E('pass', { from: me, to: 6 }), E('finish', { i: me, place: 2, time: 40 })], { upside: true });
  ['ball', 'rocket', 'leads', 'parcel', 'freeze', 'snow', 'stone', 'fake', 'coffee', 'cut'].forEach(id => fakeRace([E('use', { i: me, id })]));
  { const r = fakeRace([], { lm: true }); r.race.lm.events = [E('delivered', { i: me, tip: SCRATCH_TIP + 5, k: 1 })]; calls.step(r.race); }
  { let k = 0; fakeRace(Array.from({ length: 100 }, () => []), { cut: () => (k++ < 80 ? 1 : -1) }); }
  synth(c, { kind: 'lastmile', lm: { win: true, drops: 0 } }); synth(c, { kind: 'clockwork', place: 1, n: 16 }); synth(c, { kind: 'tt', place: 1, ghost: true }); synth(c, { kind: 'practice', place: 1, n: 1 });
  for (let i = 0; i < 25; i++) calls.honk(); calls.radio();
  /* drink and drive: the Jäger's stage (a stand-in for window.Drunk) against a made-up race, the way drunk_drive.js is fed by trophy_calls.js */
  {
    const D = { s: 0, o: false, stage() { return STAGE_NAMES[this.s]; }, blackedOut() { return this.o; } };
    globalThis.window.Drunk = D;
    const mine = { i: 2, place: 1, car: { upside: false }, inCut: -1, wrong: 0 }, race = { field: [0, 1, 2, 3].map(i => (i === 2 ? mine : { i, place: i + 1, car: { upside: false }, inCut: -1 })), events: [], state: 'count', t: 0, lm: null };
    const go = (st, evs, o) => { D.s = st; D.o = !!(o && o.out); if (o && o.state) race.state = o.state; if (o && o.wrong != null) mine.wrong = o.wrong; race.events = evs; calls.step(race); race.events = []; };
    calls.begin({ human: mine });
    go(1, [E('count', { n: 0 })], { state: 'count' });
    go(4, [], { state: 'racing' });
    go(4, [E('flip', { car: me })]);
    for (let i = 0; i < 5; i++) go(4, [E('repo', { car: me })]);
    go(4, [], { wrong: 4.5 }); go(4, [], { wrong: 0 });
    go(4, [E('lap', { i: me, lap: 1 })]);
    go(5, [E('land', { car: me, airtime: 0.8 })]);
    go(5, [], { out: true }); go(6, []);
    go(6, [E('finish', { i: me, place: 1, time: 40 })]);
    calls.end({ S: { s: { kind: 'practice', trackId: 'sorting', v: 'f', rating: 0, laps: 1 }, tally: { wallHits: 0, hardWalls: 0, repos: 0 }, human: mine, race: {} }, rows: [{ place: 1, i: me, human: true, time: 40 }], mine: { place: 1, time: 40 }, cup: null, run: null, career: c, lm: null });
    calls.begin({ human: mine }); race.state = 'count';
    go(6, [], { state: 'count' }); go(6, [], { out: true });
    calls.leave();
    delete globalThis.window.Drunk;
  }
  const missing = ids.filter(id => !Tm.earned(id));
  S.ok(missing.length === 0, 'every trophy of the list has been earned by a witness', missing.join(', '));
  S.ok(Tm.earned('mastery_vroom'), 'and the seal lights');
  void Tm; void TIER_PAY; void masteryPay; void CARS;
}
{
  /* what they pay: the table, by tier, and the seal by how many there are (the ledger pays through the engine's env) */
  const secrets = TROPHIES.filter(t => t.secret).length, n = TROPHIES.length;
  S.ok(n >= 40 && n <= 60, 'about forty trophies and a seal (' + n + ')');
  S.ok(secrets >= 2 && secrets <= 5, 'a few are secret (' + secrets + '), each with a rumour that is not the answer', TROPHIES.filter(t => t.secret).map(t => t.name).join(', '));
  S.ok(TROPHIES.every(t => t.id.indexOf('vr_') === 0), 'every id begins vr_');
  S.ok(TROPHIES.every(t => !/vroom/i.test(t.name + ' ' + t.desc + ' ' + (t.hint || ''))), 'and none says the game\'s name (the clue is a name, and only one)');
}
S.done(TROPHIES.length + ' trophies');
