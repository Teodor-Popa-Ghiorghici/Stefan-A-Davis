/* THE CHAMPIONSHIP (docs/vroom/plan.md sections 8 and 9): four cups of four races. Re-Volt's rule: points for the place in each race (POINTS), and the cup is passed by being in the top three of the eight after the
   fourth. Three tries a cup: a cup missed costs one, and a cup with none left comes back with three the next time you finish a race on the podium anywhere else (so a stuck player is sent to drive, not made to
   wait). A passed cup opens the next, and opens its cars (unlocks.js). The rivals of a cup are seven of the eleven and stay the same four races running; the rating of each race is the cup's (the last cup
   climbs from SEMI-PRO to PRO), and the rivals' cars are the rating's.
   `ask` is what the cup wants of the car: the route parts its roads need and the level of tuning a driver of ordinary skill needs to be in the fight; it is what the budget bot measures against, and what the cup
   screen tells the player. A race's `track` and `v` (the variant: tracks.js) say where it is run. Pure. */
import { RIVALS } from './rivals.js';
import { ROUTE, TUNING } from './parts.js';

export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
export const TRIES = 3, PASS_RANK = 3, RACES = 4;

const race = (track, v, rating) => ({ track, v, rating });
export const CUPS = [
  { id: 'rookie', name: 'PARCEL CUP', blurb: 'THE SORTING ROOM AND MAIN STREET, AT NIGHT.', ask: { route: [], tune: 0 },
    races: [race('sorting', 'f', 0), race('street', 'f', 0), race('sorting', 'r', 0), race('street', 'r', 0)] },
  { id: 'amateur', name: 'FREIGHT CUP', blurb: 'THE FORECOURT AND ITS SHOP, THE DINER AND ITS KITCHEN.', ask: { route: ['snowTyres', 'bumperBar'], tune: 1 },
    races: [race('forecourt', 'f', 1), race('diner', 'f', 1), race('forecourt', 'r', 1), race('diner', 'r', 1)] },
  { id: 'advanced', name: 'BLIZZARD CUP', blurb: 'SNOW ON THE ROAD, THE DAM BELOW IT. BRING TYRES AND LAMPS.', ask: { route: ['snowTyres', 'headlights'], tune: 2 },
    races: [race('pass', 'f', 2), race('dam', 'f', 2), race('pass', 'r', 2), race('dam', 'r', 2)] },
  { id: 'pro', name: 'GRAND TOUR', blurb: 'THE FROZEN HARBOUR, THEN THE FACTORY. ICE, GATES, NO MERCY.', ask: { route: ['iceChains', 'bumperBar'], tune: 3 },
    races: [race('harbour', 'f', 3), race('harbour', 'r', 3), race('factory', 'f', 4), race('factory', 'r', 4)] }
];
export const CUP_BY_ID = Object.fromEntries(CUPS.map(c => [c.id, c]));
export const CUP_IDS = CUPS.map(c => c.id);

/* the kit a cup asks for, as a loadout (parts.js): its route parts fitted, every tuning part at its level */
export function askKit(cup) {
  const kit = { route: {}, tune: { motor: 0, gearing: 0, tyres: 0, springs: 0, battery: 0, ballast: 0 }, ballast: 0, look: { paint: 'cyan', bobble: 'cat', horn: 'beep', plate: '01', light: 'off' } };
  for (const r of cup.ask.route) kit.route[r] = 1;
  for (const k of ['motor', 'gearing', 'tyres', 'springs', 'battery']) kit.tune[k] = cup.ask.tune;
  return kit;
}

/* the state of a cup in a career (career.js keeps `cups`) */
export const freshCup = () => ({ tries: TRIES, passed: 0, won: 0, sweeps: 0, best: 0, runs: 0 });
export function cupOpen(c, id) {
  const i = CUP_IDS.indexOf(id);
  if (i < 0) return false;
  return i === 0 || !!(c.cups[CUP_IDS[i - 1]] && c.cups[CUP_IDS[i - 1]].passed);
}

/* seven of the eleven rivals, a block that moves on with the seed */
export function rivalIds(seed) {
  const start = (seed >>> 0) % RIVALS.length, out = [];
  for (let k = 0; k < 7; k++) out.push(RIVALS[(start + k) % RIVALS.length].id);
  return out;
}
/* begin a cup: nothing is spent until it is missed. Returns the run (also kept on the career). */
export function startCup(c, id, seed) {
  const cup = CUP_BY_ID[id];
  if (!cup || !cupOpen(c, id)) return null;
  const st = c.cups[id] || (c.cups[id] = freshCup());
  if (st.tries <= 0) return null;
  const ids = rivalIds(seed), pts = { you: 0 }, wins = { you: 0 }, last = { you: 0 };
  ids.forEach(r => { pts[r] = 0; wins[r] = 0; last[r] = 0; });
  c.run = { cup: id, race: 0, seed: seed >>> 0, rivals: ids, pts, wins, last, places: [], tips: 0, news: [] };
  st.runs++;
  return c.run;
}
/* the race to run now */
export function raceOf(run) { const cup = CUP_BY_ID[run.cup], r = cup.races[run.race]; return Object.assign({ index: run.race, of: cup.races.length, cup: cup.id, name: cup.name }, r); }

/* the order of the eight: points, then wins, then the last race (a cup is decided on the road) */
export function standings(run) {
  const ids = Object.keys(run.pts);
  return ids.sort((a, b) => run.pts[b] - run.pts[a] || run.wins[b] - run.wins[a] || run.last[a] - run.last[b] || (a < b ? -1 : 1)).map((id, k) => ({ id, rank: k + 1, pts: run.pts[id], wins: run.wins[id] }));
}
/* a race is over: `rows` is race.results() with each row's `id` (the entry's: 'you' or a rival's). Points are given, the cup moves on. Returns { gained, standings, over, rank, passed }. */
export function scoreRace(c, run, rows) {
  const gained = {};
  rows.forEach(r => { const p = POINTS[Math.min(POINTS.length - 1, r.place - 1)]; run.pts[r.id] = (run.pts[r.id] || 0) + p; gained[r.id] = p; if (r.place === 1) run.wins[r.id]++; run.last[r.id] = r.place; });
  const me = rows.find(r => r.id === 'you');
  run.places.push(me ? me.place : rows.length);
  run.race++;
  const over = run.race >= CUP_BY_ID[run.cup].races.length, st = standings(run), mine = st.find(s => s.id === 'you');
  const out = { gained, standings: st, over, rank: mine.rank, passed: false, won: false };
  if (over) {
    const cs = c.cups[run.cup];
    out.passed = mine.rank <= PASS_RANK; out.won = mine.rank === 1;
    if (out.passed) { cs.passed++; cs.tries = TRIES; if (out.won) cs.won++; if (run.places.every(p => p === 1)) cs.sweeps++; }
    else cs.tries = Math.max(0, cs.tries - 1);
    cs.best = Math.max(cs.best, mine.pts);
    run.done = { rank: mine.rank, passed: out.passed, won: out.won };
  }
  return out;
}
/* give up on a cup run (a quit): it counts as a miss */
export function abandon(c) { if (!c.run) return; const cs = c.cups[c.run.cup]; if (cs) cs.tries = Math.max(0, cs.tries - 1); c.run = null; }
/* finishing on the podium in a single race refills the tries of every cup that has run out */
export function refill(c) { for (const id of Object.keys(c.cups)) if (c.cups[id].tries <= 0) c.cups[id].tries = 1; }

/* how ready the garage is for a cup: the share of what the cup asks for (priced in TIPS) that is owned. The cup screen shows it and a sensible player waits for it. */
export function readiness(c, cup) {
  const want = askKit(cup); let have = 0, total = 0;
  for (const id of Object.keys(want.route)) { total += ROUTE[id].price; if (c.own.route[id]) have += ROUTE[id].price; }
  for (const id of ['motor', 'gearing', 'tyres', 'springs', 'battery']) for (let l = 0; l < want.tune[id]; l++) { total += TUNING[id].prices[l]; if (c.own.tune[id] > l) have += TUNING[id].prices[l]; }
  return total ? have / total : 1;
}

