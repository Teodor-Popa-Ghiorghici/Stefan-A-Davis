/* THE STUNT YARD AS A RUN (docs/vroom/plan.md section 9): one car, no rivals, no pickups and no laps, in the open yard of yard_def.js, with its twenty stars. A star is the career's once it has been driven through (career_modes.js
   yardStar), and a star that is the career's is not hung up again. `createYard(career, event)` is the whole run, in the shape solo.js gives a time trial's, so the race screen steps it the same way. The built yard is kept: it is a few
   thousand faces and the same every time. Pure but for the career it is given. */
import { createRace } from './race.js';
import { buildTrack } from './track_build.js';
import { YARD } from './yard_def.js';
import { playerEntry } from './events.js';
import { kitOf } from './career.js';

let built = null;
export const yardTrack = () => built || (built = buildTrack(YARD));
export const YARD_SEED = 7;

export function createYard(c, ev) {
  const T = yardTrack(), kit = kitOf(c), car = (ev && ev.car) || c.car;
  const you = playerEntry(c, car, { kit: JSON.parse(JSON.stringify(kit)) });
  const race = createRace({ track: T, entries: [you], laps: YARD.laps, rating: YARD.rating, seed: YARD_SEED, pickups: false, stars: true });
  for (const k of Object.keys(c.yard)) race.starsGot.add(+k);                      /* the stars already found are not hung up again */
  const S = { kind: 'yard', track: 'yard', v: 'f', T, race, rating: YARD.rating, laps: YARD.laps, car, human: race.field[0], step: inp => race.step(inp) };
  /* the nearest star not yet found, as how far and which way from where the car is pointing: { star, d, a } with a in radians, + to the right */
  S.nearest = () => {
    const p = S.human.car.p, R = S.human.car.R, yaw = Math.atan2(R[2], R[8]); let best = null, bd = 1e9;
    for (const st of T.stars) { if (race.starsGot.has(st.id)) continue; const d = Math.hypot(st.x - p[0], st.z - p[2]); if (d < bd) { bd = d; best = st; } }
    if (!best) return null;
    let a = Math.atan2(best.x - p[0], best.z - p[2]) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
    return { star: best, d: bd, a };
  };
  return S;
}
