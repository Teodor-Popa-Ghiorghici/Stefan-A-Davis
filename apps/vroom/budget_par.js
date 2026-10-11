/* PAR (dev-only, not packaged): measures every road in every variant for challenge_data.js. A PRO driver who makes no slips drives each of the four cars of the road's rating, flat out, with the route parts the road needs and
   none of the shortcuts', three laps, and the best of their best laps is the road's time; a challenge is that and three per cent more (a person can find three per cent over what a CPU line gives, and a car from a
   higher class held to the rating has about as much in hand). It prints the table to paste into challenge_data.js, and with --check measures against the table instead.     node apps/vroom/budget_par.js [--check] */
import { buildTrack } from './track_build.js';
import { allTracks, defFor } from './tracks.js';
import { createRace } from './race.js';
import { CARS } from './cars.js';
import { tierProfile } from './ai_profiles.js';
import { trackKey } from './career.js';

const PRO = Object.assign({}, tierProfile(4), { mistake: 0 }), MARGIN = 1.03;
export function bestLap(T, car, parts, tier) {
  const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car, profile: tier == null ? PRO : Object.assign({}, tierProfile(tier), { mistake: 0 }), parts }], laps: 3, seed: 4, pickups: false, rating: T.def.rating || 0 });
  for (let i = 0; i < 60 * 400 && race.state !== 'done'; i++) race.step();
  const f = race.field[0]; return f.finished ? Math.min(...f.lapTimes.slice(1)) : 999;
}
export const partsFor = T => Object.fromEntries(T.needs.filter(n => n !== 'headlights').map(n => [n, true]));
export function measure(id, v) {
  const T = buildTrack(defFor(id, v)), cars = Object.keys(CARS).filter(c => CARS[c].rating === (T.def.rating || 0) && !CARS[c].special && !CARS[c].noRival);
  let best = 999, who = ''; for (const c of cars) { const t = bestLap(T, c, partsFor(T)); if (t < best) { best = t; who = c; } }
  return { best, who };
}
const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const out = {};
  for (const [id, v] of allTracks()) { const m = measure(id, v); out[trackKey(id, v)] = Math.ceil(m.best * MARGIN * 10) / 10; console.error(trackKey(id, v).padEnd(14), m.best.toFixed(2), 'by', m.who, '->', out[trackKey(id, v)]); }
  console.log('export const PAR = ' + JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ').replace(/ }$/, ' };'));
}
