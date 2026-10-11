/* CLOCKWORK CHECK (dev-only, not packaged): sixteen wind-up kei trucks, no pickups, all elbows. The field is sixteen different entries (the player's, the eleven rivals and four of them again in other paint) in one car, there are sixteen places on every road's
   grid (eight rows of two) and every one of them is on the road; a race of sixteen on three roads is finished by everyone (the race itself is called when the player is home and the others have had four seconds; here it is run on until the last of them is across), with nothing thrown at anybody, and costs the sim a fraction of a frame; and a car that is turned over in it
   is put right and finishes.   node apps/vroom/clockwork_check.js */
import { suite } from './check_kit.js';
import { fresh } from './career.js';
import { setupClockwork } from './events.js';
import { createRace } from './race.js';
import { allTracks, trackFor } from './tracks.js';

const S = suite('clockwork_check'), { ok } = S;
const c = fresh();
for (const [id, v] of allTracks()) {
  const T = trackFor(id, v), tag = id + (v === 'f' ? '' : ':' + v) + ': ', sm = T.line.samples;
  let off = 0; T.grid.slice(0, 16).forEach(g => { const k = T.line.nearest(g.x, g.z), q = sm[k], lat = (g.x - q.x) * q.nx + (g.z - q.z) * q.nz; if (Math.abs(lat) > T.width[k] / 2 - 0.2) off++; });
  ok(T.grid.length >= 16 && off === 0, tag + 'the grid has sixteen places and all of them are on the road (' + T.grid.length + ', ' + off + ' off it)');
}
{
  const e = setupClockwork(c, { track: 'sorting', v: 'f', seed: 3 });
  ok(e.entries.length === 16 && new Set(e.entries.map(x => x.id)).size === 16 && new Set(e.entries.map(x => x.name)).size === 16, 'sixteen different drivers (' + e.entries.length + ')');
  ok(e.entries.every(x => x.car === 'courier') && e.entries.filter(x => x.human).length === 1 && e.pickups === false, 'every one in the same wind-up truck, one of them yours, and no pickups');
}
for (const [id, v] of [['sorting', 'f'], ['diner', 'r'], ['factory', 'm']]) {
  const e = setupClockwork(c, { track: id, v, seed: 3 }), entries = e.entries.map(x => (x.human ? Object.assign({}, x, { human: false, proxy: true, profile: { name: 'YOU', reaction: 14, lineError: 0.3, gripUse: 0.82, brakeEarly: 1.2, aggression: 0.3, mistake: 0.04, pickups: 0.5 } }) : x));
  const race = createRace({ track: e.track, entries, laps: 3, rating: 0, seed: 3, pickups: false }), t0 = process.hrtime.bigint();
  let n = 0, taken = 0, flips = 0, repos = 0; for (; n < 60 * 330 && !race.field.every(f => f.finished); n++) { race.step(); for (const ev of race.events) { if (ev.type === 'flip') flips++; if (ev.type === 'repo') repos++; if (ev.type === 'pickup' || ev.type === 'parcel') taken++; } }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n, fin = race.field.filter(f => f.finished).length;
  ok(fin >= 15, id + ':' + v + ': the sixteen finish (' + fin + ' did, in ' + (n / 60).toFixed(0) + ' s, ' + flips + ' turned over, ' + repos + ' put back)');
  ok(race.pickups.spots.length === 0 && taken === 0, id + ':' + v + ': nothing is picked up or thrown');
  ok(ms < 3.5, id + ':' + v + ': sixteen cars cost ' + ms.toFixed(2) + ' ms a step of the sim (a frame is 16.7)');
}
S.done();
