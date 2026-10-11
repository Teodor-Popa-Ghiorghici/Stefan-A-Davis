/* THE BUDGET BOT, THE PLAYING HALF (dev-only, not packaged; budget_bot.js is the measuring half). A person is a CPU driver with a human's numbers (ai_profiles.js HUMAN) at the wheel of the player's car, and a
   sensible shopper around it. Everything a person could do to the career is done here through the same functions the game calls (career.js, events.js, cups.js), so what the bot finds is what a player finds:
   how often a cup is passed, how long it takes, how often something new arrives, how much chaos a race has. Never a hidden number: the bot is given a profile and a career and nothing else. */
import * as C from './career.js';
import { setup } from './events.js';
import { createRace } from './race.js';
import { createTally } from './tally.js';
import { CUPS, CUP_BY_ID, startCup, raceOf, askKit, cupOpen, standings, POINTS } from './cups.js';
import { CARS } from './cars.js';
import { trackFor } from './tracks.js';
import { HUMAN, TIERS } from './ai_profiles.js';
import { ROUTE, TUNING, COSMETICS, MAX_LEVEL, simParts, batteryMods } from './parts.js';
import { readiness } from './cups.js';

/* the people the bot can be: HUMAN is the one the plan's numbers are for; a casual player is a little worse than ROOKIE's field, a keen one as good as AMATEUR's */
export const PROFILES = { novice: Object.assign({}, HUMAN, { tag: 'novice', reaction: 20, lineError: 0.55, gripUse: 0.72, brakeEarly: 2.2, aggression: 0.2, mistake: 0.09, pickups: 0.25 }), casual: Object.assign({}, HUMAN, { tag: 'casual', reaction: 17, lineError: 0.4, gripUse: 0.76, brakeEarly: 1.8, mistake: 0.06, pickups: 0.3 }), human: Object.assign({}, HUMAN, { tag: 'human' }), keen: Object.assign({}, TIERS[2], { tag: 'keen', aggression: 0.4, pickups: 0.7 }) };

/* the pace of a person: how long a race takes to start and finish (menus, the count, the board), and a visit to the depot */
export const OVERHEAD = { race: 25, shop: 20 };

/* ---- one race ---- */
/* run a race to its end without telling the career: the race, the rows with ids, the tally and the chaos of it */
export function runRace(c, ev, profile) {
  const s = setup(c, ev, { profile });
  const race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
  const me = race.field.findIndex(f => f.entry.id === 'you'), tally = createTally(me);
  for (let g = 0; g < 60 * 600 && race.state !== 'done'; g++) { race.step(); tally.eat(race); }
  const rows = race.results(), P = race.pickups.stats;
  return { s, race, rows, tally, mine: rows.find(r => r.id === 'you'), seconds: race.t, chaos: { hits: P.hits, picks: P.picks, uses: P.uses, booms: P.booms, passes: P.passes, flips: race.stats.flips, leadChanges: race.stats.leadChanges, swaps: race.stats.swaps } };
}
/* run one and give it to the career (the pay, the records, the cup moving on) */
export function playRace(c, ev, profile) {
  const r = runRace(c, ev, profile), s = r.s;
  const out = C.finishRace(c, { kind: s.kind, track: s.trackId, v: s.v, rating: s.rating, laps: s.laps, n: s.n, place: r.mine.place, time: r.mine.time, tally: r.tally, rows: r.rows });
  return { seconds: r.seconds, place: r.mine.place, out, tally: r.tally, rows: r.rows, chaos: r.chaos };
}

/* ---- the car ---- */
/* what a sensible player takes out: the car that goes round fastest for them. A person finds that by driving, so the bot does: two laps of each car it owns, on two of the roads, with the garage's fittings and the
   driver it is, a repositioned car counting three seconds against it. The answers are kept (a car, a rating, the fittings and the driver make the question). */
const pace = new Map();
export function paceOf(c, id, rating, profile) {
  const kit = C.kitOf(c), key = [id, rating, profile.tag, JSON.stringify(kit.tune), kit.ballast, Object.keys(kit.route).join()].join('|');
  if (pace.has(key)) return pace.get(key);
  let sum = 0, n = 0;
  for (const v of ['f', 'rm']) {
    const race = createRace({ track: trackFor('sorting', v), entries: [{ id: 'you', name: 'YOU', car: id, profile, kit, parts: simParts(kit), mods: batteryMods(kit), proxy: true }], laps: 3, rating, seed: 2, pickups: false });
    let repos = 0; for (let g = 0; g < 60 * 200 && race.state !== 'done'; g++) { race.step(); for (const e of race.events) if (e.type === 'repo') repos++; }
    const laps = race.field[0].lapTimes.slice(1); sum += laps.reduce((a, b) => a + b, 0) / Math.max(1, laps.length) + repos * 3; n++;
  }
  pace.set(key, sum / n);
  return sum / n;
}
export function chooseCar(c, rating, profile) {
  profile = profile || PROFILES.human;
  const times = C.carList(c).filter(id => CARS[id].rating <= rating && !CARS[id].special).map(id => [id, paceOf(c, id, rating, profile)]), fastest = Math.min(...times.map(t => t[1]));
  /* among the cars within two per cent of the quickest the heavier one is taken: a light car is the first to be shoved off the road, and a person who has been bumped a few times learns it */
  const near = times.filter(t => t[1] <= fastest * 1.02).map(t => t[0]);
  if (!near.length) return 'courier';
  return near.sort((a, b) => CARS[b].num.mass - CARS[a].num.mass || (a < b ? -1 : 1))[0];
}

/* ---- the depot ---- */
const TUNE_ORDER = ['motor', 'tyres', 'gearing', 'battery', 'springs', 'ballast'];
/* what a sensible player buys, in order: the route parts the next cup asks for, then tuning a level at a time (the cup's level first, then up), then the other cups' parts, then paint. Returns what was bought. */
export function shop(c, cupId) {
  const bought = [], buy = item => { const r = C.buy(c, item); if (r.ok) bought.push(r.name); return r.ok; };
  const cups = cupId ? CUPS.slice(CUPS.findIndex(x => x.id === cupId)) : CUPS;
  for (const cup of cups) {
    const want = askKit(cup);
    for (const id of Object.keys(want.route).sort((a, b) => ROUTE[a].price - ROUTE[b].price)) if (!c.own.route[id]) { if (!buy({ kind: 'route', id })) return bought; }
    for (let lvl = 1; lvl <= want.tune.motor; lvl++) for (const id of TUNE_ORDER) { if (id === 'ballast') continue; while (c.own.tune[id] < lvl) { if (!buy({ kind: 'tune', id })) return bought; } }
  }
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) for (const id of TUNE_ORDER) while (c.own.tune[id] < lvl) { if (!buy({ kind: 'tune', id })) return bought; }
  for (const id of Object.keys(ROUTE)) if (!c.own.route[id]) { if (!buy({ kind: 'route', id })) return bought; }
  for (const kind of Object.keys(COSMETICS)) for (const it of COSMETICS[kind].items) if (it.price > 0 && !c.own.look[kind][it.id]) buy({ kind: 'look', of: kind, id: it.id });
  return bought;
}
/* ---- a cup ---- */
/* run a cup start to end; `hooks.race(result)` hears each race. Returns { passed, won, rank, seconds, races, results }. */
export function playCup(c, cupId, seed, profile, hooks) {
  startCup(c, cupId, seed);
  let seconds = 0, last = null; const results = [];
  while (c.run) {
    const r = raceOf(c.run);
    C.pickCar(c, chooseCar(c, r.rating, profile));
    const res = playRace(c, { kind: 'cup' }, profile);
    seconds += res.seconds; results.push(res); last = res;
    if (hooks && hooks.race) hooks.race(res);
  }
  const st = c.cups[cupId], out = last.out.cup;
  void st;
  return { passed: out.passed, won: out.won, rank: out.rank, seconds, races: results.length, results };
}

/* a career standing at the door of cup number `idx`, with a kit: 'none' (no parts), 'asked' (what that cup asks) or 'all' (everything). The earlier cups are passed (and won, which opens what winning opens). */
export function careerAt(idx, preset) {
  const c = C.fresh();
  if (idx > 0) for (const id of ['snowbug', 'milkfloat', 'paperboy']) c.cars[id] = 1;            /* played its way to them (a first win, five podiums, twenty-five hits) */
  for (let i = 0; i < idx; i++) { const id = CUPS[i].id; c.cups[id].passed = 1; c.cups[id].won = 1; C.grant(c, { kind: 'cup-pass', cup: id }); C.grant(c, { kind: 'cup-win', cup: id }); }
  const lvl = /^l[0-3]$/.test(preset) ? +preset[1] : -1;                       /* l0..l3: the cup's route parts and every tuning part at that level, for finding what a cup should ask */
  const kit = preset === 'all' ? askKit({ ask: { route: Object.keys(ROUTE), tune: MAX_LEVEL } }) : preset === 'asked' ? askKit(CUPS[idx]) : lvl >= 0 ? askKit({ ask: { route: CUPS[idx].ask.route, tune: lvl } }) : null;
  if (kit) { Object.assign(c.own.route, kit.route); Object.assign(c.own.tune, kit.tune); }
  if (preset === 'all') c.own.tune.ballast = MAX_LEVEL;
  return c;
}

/* ---- a cell of the measuring ---- */
/* THE POOL OF A CUP: the same seven rivals in the same cars, each of the cup's four roads raced `seeds` times with a different roll of the dice, the rows of every race kept. A cup is four races, one of each road, so
   a cup can be put together from any one race of each: `bootstrap` does that thousands of times, which tells the first-try pass rate from a few dozen races instead of a few dozen cups. */
export function poolFor(cupIdx, preset, rivalSeed, seeds, profile) {
  const cup = CUPS[cupIdx], c = careerAt(cupIdx, preset), slots = [], chaos = [];
  C.pickCar(c, chooseCar(c, cup.races[0].rating, profile));
  startCup(c, cup.id, rivalSeed);
  let seconds = 0;
  for (let slot = 0; slot < cup.races.length; slot++) {
    const pool = [];
    for (let k = 0; k < seeds; k++) {
      c.run.race = slot; c.run.salt = k + 1;
      C.pickCar(c, chooseCar(c, cup.races[slot].rating, profile));
      const r = runRace(c, { kind: 'cup' }, profile);
      pool.push(r.rows.map(x => ({ id: x.id, place: x.place }))); chaos.push(r.chaos); seconds += r.seconds;
    }
    slots.push(pool);
  }
  return { slots, chaos, seconds, car: c.car };
}
/* cups made of one race from each road's pool, at random: the share finished in the top three (and first) and the mean rank */
export function bootstrap(slots, n, seed) {
  let s = seed >>> 0 || 1; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  let pass = 0, win = 0, rankSum = 0;
  for (let i = 0; i < n; i++) {
    const pts = {}, wins = {}, last = {};
    for (const pool of slots) { const rows = pool[Math.floor(rnd() * pool.length)]; for (const r of rows) { pts[r.id] = (pts[r.id] || 0) + POINTS[Math.min(7, r.place - 1)]; wins[r.id] = (wins[r.id] || 0) + (r.place === 1 ? 1 : 0); last[r.id] = r.place; } }
    const st = standings({ pts, wins, last }), me = st.find(x => x.id === 'you').rank;
    if (me <= 3) pass++; if (me === 1) win++; rankSum += me;
  }
  return { pass: pass / n, win: win / n, rank: rankSum / n };
}

/* ---- a whole career ---- */
/* play from nothing to the last cup passed, the way a person with `profile` would: buy what the next cup asks for, drive a single race or two when the garage is not ready, try a cup, try it again.
   Returns the log: every race with what it earned and what was new in it, the hours, the tries. */
export function playCareer(seed, profile, o) {
  o = o || {};
  const c = C.fresh(), log = [], rate = { n: 0 };
  let sim = 0, overhead = 0, visits = 0, grind = 0, guard = 0, attempts = {};
  const note = (tags, extra) => log.push(Object.assign({ n: log.length + 1, tags }, extra));
  const shopNow = cupId => { const b = shop(c, cupId); if (b.length) { visits++; overhead += OVERHEAD.shop; } return b; };
  while (guard++ < 400 && log.length < (o.maxRaces || 400)) {
    const cup = CUPS.find(x => cupOpen(c, x.id) && !c.cups[x.id].passed);
    if (!cup) break;
    const bought = shopNow(cup.id);
    const st = c.cups[cup.id];
    const need = o.ready == null ? 0.6 : o.ready;
    const mustGrind = st.tries <= 0 || (readiness(c, cup) < need && grind < (o.grindMax == null ? 14 : o.grindMax));
    if (mustGrind) {
      /* a single race at the highest rating already passed, on the best road, to earn TIPS (and a podium gives a spent cup its tries back) */
      const rating = Math.max(0, CUPS.indexOf(cup) - 1);
      C.pickCar(c, chooseCar(c, rating, profile));
      const res = playRace(c, { kind: 'single', track: 'sorting', v: 'f', rating, n: 8, seed: seed * 101 + log.length }, profile);
      sim += res.seconds; overhead += OVERHEAD.race; grind++;
      note(bought.map(b => 'BOUGHT ' + b).concat(res.out.news), { kind: 'single', place: res.place, pay: res.out.pay, rating, chaos: res.chaos });
      continue;
    }
    grind = 0;
    attempts[cup.id] = (attempts[cup.id] || 0) + 1;
    const first = log.length;
    const r = playCup(c, cup.id, seed * 977 + attempts[cup.id] * 31 + CUPS.indexOf(cup), profile, { race: res => { overhead += OVERHEAD.race; const b = shopNow(cup.id); note(res.out.news.concat(b.map(x => 'BOUGHT ' + x)), { kind: 'cup', cup: cup.id, place: res.place, pay: res.out.pay, chaos: res.chaos }); } });
    sim += r.seconds;
    if (log[first] && bought.length) log[first].tags = bought.map(b => 'BOUGHT ' + b).concat(log[first].tags);
    if (log[log.length - 1]) log[log.length - 1].cupDone = { cup: cup.id, passed: r.passed, rank: r.rank };
  }
  const passedAll = CUPS.every(x => c.cups[x.id].passed);
  return { seed, c, log, passedAll, attempts, simSeconds: sim, hours: (sim + overhead) / 3600, races: log.length, visits };
}
void CARS;
