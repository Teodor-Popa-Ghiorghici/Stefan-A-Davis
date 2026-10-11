/* FROM A CAREER AND AN EVENT TO A RACE (docs/vroom/plan.md sections 8 and 9). An event is "a cup's next race" or "a single race on this road with this car at this rating"; what comes out is what `createRace` takes: the
   built track, the entries in grid order (you, in your car and your paint with your garage's fittings; the rivals in the cars of the rating, each with the route parts a rival of that rating would have bought),
   the laps, the rating and the seed. The same function is used by the screens, the headless harness and the budget bot, so a race is the same race wherever it is started. Pure but for the dice it is given. */
import { trackFor } from './tracks.js';
import { entriesFor } from './rivals.js';
import { RIVALS } from './rivals.js';
import { liveryOf, PLAYER } from './livery.js';
import { ix, GREY, CYAN, RED, BROWN, GREEN, MAGENTA } from './palette.js';
import { kitOf, carFor } from './career.js';
import { raceOf } from './cups.js';
import { simParts, batteryMods } from './parts.js';
import { standings } from './cups.js';

/* the paints of the garage (parts.js COSMETICS.paint) as palette bytes. None is a rival's. */
export const PAINT = {
  cyan: ix(CYAN, 8), red: ix(RED, 7), yellow: ix(BROWN, 13), green: ix(GREEN, 6), white: ix(GREY, 15), orange: ix(BROWN, 8), violet: ix(MAGENTA, 6), black: ix(GREY, 2), pink: ix(MAGENTA, 15), gold: ix(BROWN, 11)
};
const DARK = ix(GREY, 2), WHITE = ix(GREY, 15);
/* the player's livery for a loadout: the band is white unless the paint is, and the plate reads the plate chosen */
export function playerLook(look) {
  const paint = PAINT[look.paint] != null ? PAINT[look.paint] : PAINT.cyan, num = look.plate || PLAYER.num, stripe = paint === WHITE || paint === PAINT.yellow || paint === PAINT.gold || paint === PAINT.pink ? DARK : WHITE;
  return { paint, num, stripe, livery: liveryOf({ num, stripe, pattern: 'band', logo: 'parcel' }) };
}

/* the route parts a rival of this rating has bought (docs/vroom/plan.md section 8, point 3: from the AMATEUR cup, which is the first whose roads have a shortcut, the rivals have the cheap route parts, a bumper bar in every other car, and take them). `k` is the rival's place in the field. */
export function rivalParts(rating, k) {
  return { snowTyres: rating >= 1, iceChains: rating >= 3, roofRack: rating >= 3 && k % 2 === 0, bumperBar: rating >= 1 && k % 2 === 1, headlights: rating >= 1, compound: 0 };
}

/* the player's entry */
export function playerEntry(c, carId, extra) {
  const kit = kitOf(c), look = playerLook(c.look);
  return Object.assign({ id: 'you', name: 'YOU', car: carId || c.car, human: true, tier: 0, paint: look.paint, livery: look.livery, num: look.num, kit, parts: simParts(kit), mods: batteryMods(kit) }, extra || {});
}

/* where the player stands on the grid: the leader of a cup is on pole, the rest in order; a first race or a single race starts you in the lower middle of the field */
function gridOrder(rivals, you, order) {
  const all = rivals.slice();
  if (order) { const rank = id => order.indexOf(id); all.sort((a, b) => rank(a.id) - rank(b.id)); const at = Math.max(0, rank('you')); all.splice(Math.min(at, all.length), 0, you); return all; }
  all.splice(Math.min(5, all.length), 0, you);
  return all;
}

/* ev: { kind: 'cup' } uses the run on the career. { kind: 'single', track, v, laps?, rating, n (cars, 2-8), seed, car? }. `proxy` (the bot) is { profile } and makes the player a CPU car with that driver. */
export function setup(c, ev, proxy) {
  let track, v, rating, rivals, order = null, seed, cup = null, car = ev.car || null, swapped = null;
  if (ev.kind === 'cup') {
    const run = c.run, r = raceOf(run);
    track = r.track; v = r.v; rating = r.rating; seed = (run.seed * 31 + run.race * 7919 + (run.salt | 0) * 104729) >>> 0;      /* `salt` is the budget bot's: the same rivals on the same road with another roll of the dice */
    rivals = entriesFor(run.rivals, rating, run.seed % RIVALS.length).map(e => Object.assign(e, { parts: rivalParts(rating, run.rivals.indexOf(e.id)) }));
    if (run.places.length) order = standingIds(run);          /* a run that has raced: the leader on pole */
    cup = r;
    car = carFor(c, rating);
    if (car !== c.car) swapped = { from: c.car, to: car };
  } else {
    track = ev.track; v = ev.v || 'f'; rating = ev.rating; seed = (ev.seed >>> 0) || 1;
    const n = Math.max(2, Math.min(8, ev.n || 8)) - 1, start = seed % RIVALS.length, ids = [];
    for (let k = 0; k < n; k++) ids.push(RIVALS[(start + k) % RIVALS.length].id);
    rivals = entriesFor(ids, rating, start).map((e, k) => Object.assign(e, { parts: rivalParts(rating, k) }));
  }
  const T = trackFor(track, v);
  const you = playerEntry(c, car, proxy ? { human: false, proxy: true, profile: proxy.profile } : null);
  const entries = gridOrder(rivals, you, order);
  return { track: T, entries, laps: ev.laps || T.laps, rating, seed, kind: ev.kind, trackId: track, v, cup, n: entries.length, swapped };
}
function standingIds(run) { return standings(run).map(s => s.id); }

/* CLOCKWORK (docs/vroom/plan.md section 9): sixteen wind-up kei trucks, yours and fifteen of the town's, all the same toy, no pickups: it is only ever the traffic. The rivals are the eleven and four of them again in other paint. */
export function setupClockwork(c, ev) {
  const T = trackFor(ev.track, ev.v || 'f'), look = playerLook(c.look), ids = RIVALS.map(r => r.id), rivals = entriesFor(ids, 0, 0);
  for (let k = 0; k < 4; k++) { const r = RIVALS[k], tw = Object.assign({}, rivals[k], { id: r.id + '2', name: r.name + ' II', paint: ix(GREY, 4 + k * 3), num: String(50 + k * 11) }); tw.livery = liveryOf({ num: tw.num, stripe: r.stripe, pattern: r.pattern, logo: r.logo }); rivals.push(tw); }
  const entries = rivals.slice(0, 15).map(e => Object.assign(e, { car: 'courier', tier: 1, parts: {} }));
  const you = { id: 'you', name: 'YOU', car: 'courier', human: true, tier: 0, paint: look.paint, livery: look.livery, num: look.num, parts: {}, mods: { coffee: 1, recover: 1 } };
  entries.splice(11, 0, you);
  return { track: T, entries, laps: ev.laps || 3, rating: 0, seed: (ev.seed >>> 0) || 1, kind: 'clockwork', trackId: ev.track, v: ev.v || 'f', n: entries.length, pickups: false };
}
