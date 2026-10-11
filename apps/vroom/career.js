/* THE CAREER: everything a player has, as plain data that survives being saved (`ctx.save('vroom.v1', career)`, docs/vroom/plan.md section 11) and every way it can change. Pure: no window, no clock, no dice,
   so the budget bot plays whole careers on it and a check can save one, load it and find it the same. A career is changed only by the functions below, and each tells what it did (an `ok`, and the things the
   player should hear about in `news`) so the screens never have to work it out.
     tips        the game's own money (pay.js); parts, paint and the rest are bought with it
     cars, car   the cars won (unlocks.js) and the one in the garage
     own         what has been bought: route parts, a level of each tuning part, and each cosmetic that is theirs
     ballast     the weight dial, between minus and plus the level of the BALLAST part
     look        the cosmetic chosen of each kind
     cups, run   each cup's tries and record, and the cup being run now
     tracks      the best time on each road, in each variant, and how many races were run on it
     stats       races, wins, podiums and the like, for the trophies and the screens
   Parts are the garage's, not a car's: what is bought is fitted to whichever car goes out, and an event's rating holds it (parts.js). */
import { ROUTE, TUNING, COSMETICS, MAX_LEVEL, blankKit, nextPrice } from './parts.js';
import { CAR_RULES, carsFor, carsForStat, giftsFor } from './unlocks.js';
import { CUPS, freshCup, startCup, scoreRace, abandon, refill, raceOf, cupOpen, CUP_BY_ID, TRIES } from './cups.js';
import { racePay, cupPay } from './pay.js';
import { CARS } from './cars.js';

export const VERSION = 1;
export const SPARE_EVERY = 3;
const clone = o => JSON.parse(JSON.stringify(o));

export function fresh() {
  const kit = blankKit();
  const own = { route: {}, tune: Object.assign({}, kit.tune), look: {} };
  for (const k of Object.keys(COSMETICS)) own.look[k] = { [COSMETICS[k].items[0].id]: 1 };
  const cups = {}; for (const c of CUPS) cups[c.id] = freshCup();
  return { v: VERSION, tips: 0, earned: 0, cars: { courier: 1 }, car: 'courier', own, ballast: 0, look: Object.assign({}, kit.look), cups, run: null, tracks: {}, stats: { races: 0, wins: 0, podiums: 0, hits: 0, flips: 0, finishes: 0 }, news: [] };
}
/* anything that was saved -> a career that is safe to use: unknown ids dropped, numbers clamped, a missing piece made again. A save from the future is read as far as it can be. */
export function sanitize(raw) {
  const c = fresh();
  if (!raw || typeof raw !== 'object') return c;
  const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
  c.tips = int(raw.tips, 0, 1e9, 0); c.earned = int(raw.earned, 0, 1e10, c.tips);
  if (raw.cars && typeof raw.cars === 'object') for (const id of Object.keys(raw.cars)) if (CARS[id] && raw.cars[id]) c.cars[id] = 1;
  c.car = CARS[raw.car] && c.cars[raw.car] ? raw.car : 'courier';
  if (raw.own && typeof raw.own === 'object') {
    for (const id of Object.keys(ROUTE)) if (raw.own.route && raw.own.route[id]) c.own.route[id] = 1;
    for (const id of Object.keys(TUNING)) c.own.tune[id] = int(raw.own.tune && raw.own.tune[id], 0, MAX_LEVEL, 0);
    for (const k of Object.keys(COSMETICS)) for (const it of COSMETICS[k].items) if (raw.own.look && raw.own.look[k] && raw.own.look[k][it.id]) c.own.look[k][it.id] = 1;
  }
  c.ballast = int(raw.ballast, -MAX_LEVEL, MAX_LEVEL, 0);
  for (const k of Object.keys(COSMETICS)) { const pick = raw.look && raw.look[k]; if (pick && c.own.look[k][pick]) c.look[k] = pick; }
  fixBallast(c);
  if (raw.cups) for (const cup of CUPS) { const s = raw.cups[cup.id]; if (s) c.cups[cup.id] = { tries: int(s.tries, 0, TRIES, TRIES), passed: int(s.passed, 0, 1e6, 0), won: int(s.won, 0, 1e6, 0), sweeps: int(s.sweeps, 0, 1e6, 0), best: int(s.best, 0, 1e6, 0), runs: int(s.runs, 0, 1e6, 0) }; }
  c.run = raw.run && CUP_BY_ID[raw.run.cup] && raw.run.race < CUP_BY_ID[raw.run.cup].races.length && raw.run.pts ? clone(raw.run) : null;
  if (raw.tracks && typeof raw.tracks === 'object') for (const k of Object.keys(raw.tracks)) { const t = raw.tracks[k]; if (t && typeof t === 'object') c.tracks[String(k).slice(0, 40)] = { best: Number.isFinite(t.best) ? t.best : null, lap: Number.isFinite(t.lap) ? t.lap : null, races: int(t.races, 0, 1e6, 0), wins: int(t.wins, 0, 1e6, 0) }; }
  if (raw.stats) for (const k of Object.keys(c.stats)) c.stats[k] = int(raw.stats[k], 0, 1e9, 0);
  c.news = Array.isArray(raw.news) ? raw.news.filter(s => typeof s === 'string').slice(0, 20) : [];
  return c;
}
/* the dial can only sit within the level of ballast that is owned */
function fixBallast(c) { const l = c.own.tune.ballast | 0; c.ballast = Math.max(-l, Math.min(l, c.ballast | 0)); }

/* the fittings the sim and parts.js read: what is owned, the dial and the cosmetics chosen */
export const kitOf = c => ({ route: c.own.route, tune: c.own.tune, ballast: c.ballast, look: c.look });
export const hasCar = (c, id) => !!c.cars[id];
/* THE CLASS RULE of the championship (as in Re-Volt: a class has its cars): a car goes into a cup race of this rating only if it is of that rating or a lower one. A PRO car held to SEMI-PRO numbers is still the better car (the cap makes the numbers
   equal, not the cars), so letting it in would make the class a formality. The car in the garage is used if it is allowed; if it is not, the best car that is -- the highest rated, then the first in the table -- is taken out instead. A single race allows any car. */
export function carFor(c, rating) {
  if (CARS[c.car] && CARS[c.car].rating <= rating) return c.car;
  const ok = Object.keys(CARS).filter(id => c.cars[id] && CARS[id].rating <= rating && !CARS[id].special);
  ok.sort((a, b) => CARS[b].rating - CARS[a].rating);
  return ok[0] || 'courier';
}
export const carList = c => Object.keys(CARS).filter(id => c.cars[id]);

/* ---- buying ---- */
/* what a thing costs and whether it can be bought now: item { kind: 'route' | 'tune' | 'look', id, of? (the cosmetic's kind) } */
export function offer(c, item) {
  if (item.kind === 'route') { const p = ROUTE[item.id]; if (!p) return null; return { price: c.own.route[item.id] ? null : p.price, name: p.name }; }
  if (item.kind === 'tune') { const t = TUNING[item.id]; if (!t) return null; const l = c.own.tune[item.id]; return { price: l >= MAX_LEVEL ? null : t.prices[l], name: t.name + (l < MAX_LEVEL ? ' ' + 'I'.repeat(l + 1) : '') }; }
  if (item.kind === 'look') { const k = COSMETICS[item.of]; const it = k && k.items.find(x => x.id === item.id); if (!it) return null; return { price: c.own.look[item.of][item.id] ? null : (it.price > 0 ? it.price : -1), name: it.name }; }
  return null;
}
export function buy(c, item) {
  const o = offer(c, item);
  if (!o) return { ok: false, why: 'NO SUCH THING' };
  if (o.price == null) return { ok: false, why: 'YOU HAVE IT' };
  if (o.price < 0) return { ok: false, why: 'NOT FOR SALE: IT IS FOUND' };
  if (c.tips < o.price) return { ok: false, why: 'NEED ' + (o.price - c.tips) + ' MORE TIPS' };
  c.tips -= o.price;
  if (item.kind === 'route') c.own.route[item.id] = 1;
  else if (item.kind === 'tune') c.own.tune[item.id]++;
  else c.own.look[item.of][item.id] = 1;
  return { ok: true, price: o.price, name: o.name };
}
export function setBallast(c, v) { c.ballast = Math.max(-(c.own.tune.ballast | 0), Math.min(c.own.tune.ballast | 0, v | 0)); return c.ballast; }
export function setLook(c, kind, id) { if (c.own.look[kind] && c.own.look[kind][id]) { c.look[kind] = id; return true; } return false; }
export function pickCar(c, id) { if (c.cars[id]) { c.car = id; return true; } return false; }
/* hand over what a trigger earns: cars and found cosmetics. Returns the names, for the news. */
export function grant(c, t) {
  const got = [];
  for (const id of carsFor(t)) if (!c.cars[id]) { c.cars[id] = 1; got.push('NEW CAR: ' + CARS[id].name); }
  for (const [k, id] of giftsFor(t)) if (!c.own.look[k][id]) { c.own.look[k][id] = 1; got.push('FOUND: ' + COSMETICS[k].items.find(x => x.id === id).name); }
  return got;
}
export const allWins = c => CUPS.every(cup => c.cups[cup.id] && c.cups[cup.id].won > 0);

/* ---- a race is over ---- */
export const trackKey = (track, v) => track + ':' + (v || 'f');
/* o: { kind: 'cup' | 'single', track, v, rating, laps, n, place, time, tally (tally.js), rows (race.results() with ids) }
   Pays the tips, keeps the records, moves the cup on and earns what there is to earn. Returns { pay, lines, news, cup? } for the finish screen. */
export function finishRace(c, o) {
  const key = trackKey(o.track, o.v), tr = c.tracks[key] || (c.tracks[key] = { best: null, lap: null, races: 0, wins: 0 });
  const lap = o.tally ? o.tally.bestLap : null, record = lap != null && (tr.lap == null || lap < tr.lap - 1e-6) && tr.races > 0;
  if (lap != null && (tr.lap == null || lap < tr.lap)) tr.lap = lap;
  if (o.time != null && (tr.best == null || o.time < tr.best)) tr.best = o.time;
  tr.races++; if (o.place === 1) tr.wins++;
  c.stats.races++; if (o.place === 1) c.stats.wins++; if (o.place <= 3) c.stats.podiums++; if (o.time != null) c.stats.finishes++;
  if (o.tally) { c.stats.hits += o.tally.hitsDelivered; c.stats.flips += o.tally.flips; }
  const pay = racePay({ place: o.place, n: o.n, rating: o.rating, laps: o.laps, hits: o.tally ? o.tally.hitsDelivered : 0, repos: o.tally ? o.tally.repos : 0, record });
  const lines = pay.lines.slice(), news = [];
  let total = pay.total, cup = null;
  if (o.kind === 'cup' && c.run) {
    const run = c.run;
    cup = scoreRace(c, run, o.rows);
    if (cup.over) {
      const id = run.cup, rating = CUP_BY_ID[id].races[CUP_BY_ID[id].races.length - 1].rating, cp = cupPay(rating, cup.rank);
      lines.push(...cp.lines); total += cp.total;
      if (cup.passed) {
        news.push(...grant(c, { kind: 'cup-pass', cup: id }));
        if (cup.won) news.push(...grant(c, { kind: 'cup-win', cup: id }));
        if (run.places.every(p => p === 1)) news.push(...grant(c, { kind: 'cup-sweep', cup: id }));
        const idx = CUPS.findIndex(x => x.id === id);
        if (idx + 1 < CUPS.length) news.push('NEW CUP: ' + CUPS[idx + 1].name);
        if (allWins(c)) news.push(...grant(c, { kind: 'all-wins' }));
      } else news.push('NOT THIS TIME. ' + (c.cups[id].tries > 0 ? c.cups[id].tries + ' TRIES LEFT' : 'OUT OF TRIES: A PODIUM ELSEWHERE GIVES ONE BACK'));
      run.tips += total;
      c.run = null;
    } else c.run.tips += total;
  } else if (o.kind === 'single' && o.place <= 3) refill(c);
  c.tips += total; c.earned += total;
  /* a SPARE: every third race, whatever it was, the garage has turned up something you do not have and could have bought: the cheapest look that is not yours. It is what keeps something new arriving between the cars and the cups. */
  if (c.stats.races % SPARE_EVERY === 0) { const s = spare(c); if (s) news.push('A SPARE: ' + s); }
  for (const st of ['wins', 'podiums', 'hits']) for (const id of carsForStat(st, c.stats[st])) if (!c.cars[id]) { c.cars[id] = 1; news.push('NEW CAR: ' + CARS[id].name); }
  c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { pay: total, lines, news, cup, record, lap };
}
/* the cheapest cosmetic for sale that is not owned yet, handed over (its name, or null when there is none) */
export function spare(c) {
  let best = null;
  for (const kind of Object.keys(COSMETICS)) for (const it of COSMETICS[kind].items) if (it.price > 0 && !c.own.look[kind][it.id] && (!best || it.price < best.it.price)) best = { kind, it };
  if (!best) return null;
  c.own.look[best.kind][best.it.id] = 1;
  return best.it.name;
}
export function beginCup(c, id, seed) { return startCup(c, id, seed); }
export function quitCup(c) { abandon(c); }
export { raceOf, cupOpen, nextPrice };
void CAR_RULES;
