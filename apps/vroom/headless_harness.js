/* THE RACE WITHOUT A SCREEN (dev-only, not packaged): drives a whole race of CPU cars (and, if asked, a bot standing in for a person) through race.js and prints what happened. The budget bot, the checks
   and a person trying a change to tune.js all start here:   node apps/vroom/headless_harness.js [track] [laps] [seed] */
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { fieldFor } from './rivals.js';

export function field(n, human, rating, seed) {
  const e = fieldFor(rating || 0, n, seed || 1);
  if (human) e.push({ id: 'you', name: 'YOU', car: 'courier', human: true, tier: 0 });
  return e;
}
/* run a race to its end (or `maxSeconds`): `onStep(race)` is called every step and may return an input for the human */
export function runRace(track, entries, o) {
  o = o || {};
  const race = createRace({ track, entries, laps: o.laps, rating: o.rating, seed: o.seed });
  const maxSteps = Math.round((o.maxSeconds || 600) * 60), log = [];
  for (let i = 0; i < maxSteps && race.state !== 'done'; i++) {
    const inp = o.onStep ? o.onStep(race) : undefined;
    race.step(inp);
    for (const e of race.events) { if (e.type === 'lap' || e.type === 'finish') log.push(e); if (o.onEvent) o.onEvent(e, race); }
  }
  return { race, log, seconds: race.t };
}
const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const [id, laps, seed] = [process.argv[2] || 'sorting', +process.argv[3] || 0, +process.argv[4] || 1];
  const track = buildTrack(TRACKS[id]), t0 = Date.now();
  const { race, log, seconds } = runRace(track, field(7, false, 0, seed), { laps: laps || undefined, seed });
  for (const e of log) if (e.type === 'lap') console.log(race.field[e.i].name.padEnd(8), 'lap', e.lap, e.time.toFixed(2) + ' s');
  console.log(race.results().map(r => r.place + ' ' + r.name + (r.time ? ' ' + r.time.toFixed(2) : ' (' + r.laps + ' laps)')).join('   '));
  console.log(race.laps + ' laps of ' + track.length.toFixed(0) + ' m, ' + seconds.toFixed(1) + ' s of race in ' + (Date.now() - t0) + ' ms');
}
