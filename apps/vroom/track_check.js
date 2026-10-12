/* TRACK CHECK (dev-only, not packaged): every track is data, and the data has to make a place a car can drive. For each track in track_def.js: the line closes; the road is wide enough and the walls are on its
   edges; the start grid is on the road and behind the line; the checkpoints stretch across it in order; the nodes a car is put back on are on the road, facing the right way, and none is in a pit; each thing
   set on the road (a belt, a jump, a kerb, a pinch, a counter) is where its data says and does what it is for; and a CPU car drives a whole lap of it without being put back, over every checkpoint, in a
   time that is a lap and not a crawl. The jump is held to the harder promise: whatever a player does with the keys in the air, a car that arrives at a speed a ROOKIE reaches clears it and lands on its wheels.
   The pickups are held to the same promise: every parcel is on the road, clear of the walls and of every belt, jump, kerb, pinch and counter, inside what the CPU may drive, and a car driven straight down its lane takes it.
   (Stars and gates join this check in the phases that add them.) The checks of one road are `trackChecks` in track_check_kit.js, which the track maker's roads go through as well.   node apps/vroom/track_check.js */
import { buildTrack } from './track_build.js';
import { trackChecks } from './track_check_kit.js';
import { allTracks, defFor, TRACK_IDS } from './tracks.js';
import { suite } from './check_kit.js';

const S = suite('track_check'), { ok } = S;

const ONLY = (process.env.TRACK || '').split(',').filter(Boolean), ONLYV = (process.env.VARIANT || '').split(',').filter(Boolean);          /* TRACK=street,dam VARIANT=f node apps/vroom/track_check.js: while a road is being made */
for (const [tid, tv] of allTracks()) {
  if ((ONLY.length && !ONLY.includes(tid)) || (ONLYV.length && !ONLYV.includes(tv))) continue;
  const id = tid + (tv === 'f' ? '' : ':' + tv);
  trackChecks(S, buildTrack(defFor(tid, tv)), id + ': ');
}
/* ---- a variant is the same road turned over ---- */
for (const tid of TRACK_IDS) {
  if (ONLY.length && !ONLY.includes(tid)) continue;
  const f = buildTrack(defFor(tid, 'f')), m = buildTrack(defFor(tid, 'm')), r = buildTrack(defFor(tid, 'r')), rm = buildTrack(defFor(tid, 'rm')), tag = tid + ': ';
  ok([m, r, rm].every(t => Math.abs(t.length - f.length) < 0.5), tag + 'every variant is as long a lap as the road it is made from (' + [f, m, r, rm].map(t => t.length.toFixed(1)).join(', ') + ' m)');
  let worst = 0; for (let i = 0; i < f.line.samples.length; i += 7) worst = Math.max(worst, Math.abs(m.line.samples[i].x + f.line.samples[i].x), Math.abs(m.line.samples[i].z - f.line.samples[i].z));
  ok(worst < 0.01, tag + 'the mirrored road is the same road with x turned over (' + worst.toFixed(4) + ' m at the worst of its samples)');
  const turnF = f.line.samples.reduce((a, p) => a + p.k, 0), turnM = m.line.samples.reduce((a, p) => a + p.k, 0), turnR = r.line.samples.reduce((a, p) => a + p.k, 0);
  ok(Math.sign(turnF) === -Math.sign(turnM) && Math.sign(turnF) === -Math.sign(turnR) && Math.sign(turnF) === Math.sign(turnF * 1), tag + 'mirrored, or driven the other way, the road turns the other way round (' + [turnF, turnM, turnR].map(x => x.toFixed(1)).join(', ') + ')');
  ok(f.features.belts.every((b, i) => r.features.belts[i] && r.features.belts[i].speed === -b.speed && rm.features.belts[i].speed === -b.speed && m.features.belts[i].speed === b.speed), tag + 'a belt keeps the way it moves: it runs against you when the road is driven the other way');
  ok(r.features.pinches.length === f.features.pinches.length && r.features.kerbs.length === f.features.kerbs.length && r.features.counters.length === f.features.counters.length && r.features.jumps.length <= f.features.jumps.length && Math.abs(r.features.pickups.length - f.features.pickups.length) <= 2, tag + 'everything else on the road is still on it, turned round (a jump may have gone if no stretch had room for it: ' + r.features.jumps.length + ' of ' + f.features.jumps.length + ' kept)');
}
S.done();
