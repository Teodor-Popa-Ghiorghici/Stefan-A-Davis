/* A RUN ON YOUR OWN (docs/vroom/plan.md section 9): a TIME TRIAL (three laps against your best run, as a ghost) and PRACTICE (no rivals, no pickups, as many laps as you like, and a hidden star on every road to find).
   `createSolo(career, event, ghost)` makes the race of one car on a road at the road's rating, and with a ghost a second race of the same road and car that is fed the keys of the best run, a frame at a time: the
   two worlds are the same world, so the ghost drives the run again to the bit. Every frame's keys are written down as they are given (ghost.js), after being rounded to what the replay will be given, so that a
   run that is a record can be kept as the next ghost. Pure but for the career and the ghost it is given. */
import { createRace } from './race.js';
import { trackFor } from './tracks.js';
import { playerEntry } from './events.js';
import { simParts, batteryMods } from './parts.js';
import { recorder, player, quantize } from './ghost.js';
import { trackKey, kitOf } from './career.js';
import { CARS } from './cars.js';

export const TT_LAPS = 3, FREE_LAPS = 99, SEED = 7;
/* ev: { kind: 'tt' | 'practice', track, v, car? }; ghost: { text, car, kit } or null */
export function createSolo(c, ev, ghost) {
  const T = trackFor(ev.track, ev.v || 'f'), rating = T.def.rating || 0, kit = kitOf(c), car = ev.car || c.car;
  const tt = ev.kind === 'tt', laps = tt ? TT_LAPS : FREE_LAPS;
  const you = playerEntry(c, car, { kit: JSON.parse(JSON.stringify(kit)) });
  const race = createRace({ track: T, entries: [you], laps, rating, seed: SEED, pickups: false, stars: !tt });
  const S = { kind: ev.kind, track: ev.track, v: ev.v || 'f', key: trackKey(ev.track, ev.v || 'f'), T, race, rating, laps, car, kit: JSON.parse(JSON.stringify(kit)), human: race.field[0], rec: recorder(), ghost: null, ghostRace: null };
  if (tt && ghost && ghost.text) {
    const gk = ghost.kit, g = Object.assign({}, you, { id: 'ghost', name: 'GHOST', car: ghost.car, kit: gk, parts: simParts(gk), mods: batteryMods(gk) });
    S.ghost = player(ghost.text); S.ghostRace = createRace({ track: T, entries: [g], laps, rating, seed: SEED, pickups: false });
  }
  /* one frame: the keys of the player (rounded to what a replay is given), written down, and the ghost's keys into its own race */
  S.step = human => {
    const inp = quantize(human || { throttle: 0, brake: 0, steer: 0, repo: false });
    if (!S.human.finished) S.rec.push(inp);
    S.race.step(inp);
    if (S.ghostRace) S.ghostRace.step(S.ghost.next());
    return S.race.events;
  };
  /* the run as a record: its best lap and time, the keys as text, and what to build the ghost from */
  S.result = () => { const f = S.human; return { track: S.track, v: S.v, lap: f.best, time: f.finished ? f.finishT : null, car: S.car, kit: S.kit, text: S.rec.text(), frames: S.rec.frames }; };
  S.rating = rating; S.laps = laps; void CARS;
  return S;
}
