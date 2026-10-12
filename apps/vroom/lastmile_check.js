/* LAST MILE CHECK (dev-only, not packaged): the parcel is a thing and the doors are places. Every road has six doors on straights clear of everything else, each with a pad on the road and a lit panel in the wall; a truck at
   a walking pace through a jump keeps the parcel in the bed and a fast one throws it; a truck on its roof, or in a hard hit, loses it; a loose parcel is picked up by stopping on it and not by driving over it; stopping on a lit
   door's pad delivers and lights the next; the tip falls with the time and with each drop; and a whole race of eight, the rivals stopping on the pads too, is delivered by everyone.   node apps/vroom/lastmile_check.js */
import { suite } from './check_kit.js';
import { fresh } from './career.js';
import { setup } from './events.js';
import { createRace } from './race.js';
import { createLastMile, N_DOORS, BASE_TIP, TIME_RATE, DROP_COST, MIN_TIP } from './lastmile.js';
import { trackFor, allTracks } from './tracks.js';
import { PAD } from './track_door.js';
import { VARIANTS } from './track_variant.js';

const S = suite('lastmile_check'), { ok } = S;
/* the doors of every road */
for (const [id, v] of allTracks()) {
  const T = trackFor(id, v), tag = id + (v === 'f' ? '' : ':' + v) + ': ', sm = T.line.samples;
  ok(T.doors.length === N_DOORS, tag + 'six doors (' + T.doors.length + ')');
  const bad = [];
  for (const d of T.doors) {
    const k = T.line.nearest(d.x, d.z), q = sm[k], lat = (d.x - q.x) * q.nx + (d.z - q.z) * q.nz, w = T.width[k] / 2, F = T.features;
    if (Math.abs(lat) > w - 0.3 || Math.abs(lat) < w - 1.6) bad.push('pad at ' + d.s.toFixed(0) + ' is ' + lat.toFixed(1) + ' m across a ' + (2 * w).toFixed(1) + ' m road');
    if ([...F.belts, ...F.jumps, ...F.kerbs, ...F.pinches, ...F.counters, ...F.presses].some(f => { const a = f.s0 != null ? f.s0 : f.a, b = f.s1 != null ? f.s1 : f.d; return d.s > a - 2 && d.s < b + 2; })) bad.push('door at ' + d.s.toFixed(0) + ' is on a feature');
    if (Math.abs(q.k) > 0.03) bad.push('door at ' + d.s.toFixed(0) + ' is on a bend');
  }
  ok(bad.length === 0, tag + 'every pad is on the road at its edge, on a straight, clear of its features', bad.join('; '));
}
/* a truck, a parcel, a lap */
const c = fresh();
function stage(track, v) {
  const s = setup(c, { kind: 'lastmile', track: track || 'sorting', v: v || 'f', rating: 0, n: 2, seed: 5 });
  const race = createRace({ track: s.track, entries: s.entries.slice(0, 1).map(e => Object.assign({}, e, { human: true })), laps: 99, rating: 0, seed: 1 }), lm = createLastMile(race, {});
  for (let i = 0; i < 260; i++) race.step();
  return { race, lm, f: race.field[0], T: s.track };
}
const putAt = (st, s, lat, v0) => { const p = st.T.line.at(s); st.race.world.place(st.f.car, { x: p.x + p.nx * lat, y: p.y, z: p.z + p.nz * lat, yaw: p.yaw }); st.f.car.v[0] = p.tx * v0; st.f.car.v[2] = p.tz * v0; st.lm.st[0].vprev = [st.f.car.v[0], st.f.car.v[1], st.f.car.v[2]]; };
const run = (st, secs, keys) => { for (let i = 0; i < secs * 60; i++) { const sp = Math.hypot(st.f.car.v[0], st.f.car.v[2]); st.race.step(keys ? keys(sp, i) : { throttle: 0, brake: 0, steer: 0, repo: false }); } };
{
  const keep = [], thrown = [];
  for (const v0 of [5, 12, 13]) {
    const st = stage(); const j = st.T.features.jumps[0]; putAt(st, j.a - 16, 0, v0); run(st, 5, sp => ({ throttle: sp < v0 ? 1 : 0, brake: 0, steer: 0, repo: false }));
    (v0 < 8 ? keep : thrown).push(st.lm.st[0].parcel.drops);
  }
  ok(keep.every(d => d === 0), 'at a walking pace over the jump (5 m/s) the parcel stays in the bed');
  ok(thrown.every(d => d >= 1), 'fast over the jump (12 and 13 m/s) it is thrown');
}
{
  const st = stage(); putAt(st, 60, 0, 0); st.f.car.q[0] = 0; st.f.car.q[1] = 1; st.f.car.q[2] = 0; st.f.car.q[3] = 0; st.race.world.place(st.f.car, { x: st.f.car.p[0], y: 0.3, z: st.f.car.p[2], yaw: 0.2, roll: Math.PI });
  run(st, 3);
  ok(st.lm.st[0].parcel.drops >= 1 || st.f.car.R[4] > 0, 'a truck on its roof drops it (or was put right by the sim)');
}
{
  /* a hard hit is a truck going AT a wall, 0.9 rad off the road at 12 m/s (the first blow is about 7 m/s; a truck steered into the wall at a shallow angle hits it at 3.8, under the 4 that costs the tip, and used to be
     counted as hit hard only because it then stuck to the wall and hit it again: sim_body.js no longer lets it) */
  const st = stage(); putAt(st, 40, 0, 12); const hits = [], c0 = st.f.car, a = st.T.line.at(40).yaw + 0.9;
  st.race.world.place(c0, { x: c0.p[0], y: st.T.line.at(40).y, z: c0.p[2], yaw: a }); c0.v[0] = Math.sin(a) * 12; c0.v[2] = Math.cos(a) * 12; st.lm.st[0].vprev = [c0.v[0], c0.v[1], c0.v[2]];
  run(st, 2, () => ({ throttle: 1, brake: 0, steer: 0, repo: false }));
  ok(st.lm.st[0].parcel.state === 'loose' || st.lm.st[0].parcel.drops >= 1 || st.lm.st[0].damage >= 1, 'a hard hit on the wall costs the parcel or the tip');
  void hits;
}
/* picking up: drive over a loose parcel fast and nothing; stop on it and it is back in the bed */
{
  const st = stage(); const P = st.lm.st[0].parcel, p = st.T.line.at(100); P.state = 'loose'; P.x = p.x; P.y = p.y + 0.06; P.z = p.z; P.vx = P.vy = P.vz = 0; P.t = 1; st.lm.st[0].parcel.drops = 1;
  putAt(st, 94, 0, 9); run(st, 1.2, sp => ({ throttle: sp < 9 ? 1 : 0, brake: 0, steer: 0, repo: false }));
  ok(P.state === 'loose', 'a truck that drives over a loose parcel at 9 m/s does not pick it up');
  putAt(st, 98, 0, 2.5); run(st, 1.5, sp => ({ throttle: 0, brake: sp > 1.5 ? 0.5 : 0, steer: 0, repo: false }));
  ok(P.state === 'bed', 'one that slows down and stops on it does');
}
/* a delivery */
{
  const st = stage(), d = st.T.doors[st.lm.order[0]], before = st.lm.st[0].k;
  st.race.world.place(st.f.car, { x: d.x, y: d.y, z: d.z, yaw: st.T.line.at(d.s).yaw }); st.f.car.v.fill(0); st.lm.st[0].vprev = [0, 0, 0];
  run(st, 2);
  ok(st.lm.st[0].k === before + 1 && st.lm.st[0].delivered === 1 && st.lm.target(0) === st.lm.order[1], 'a truck at rest on the lit door\'s pad with the parcel in the bed delivers it, and the next door is lit (tip ' + st.lm.st[0].tips + ')');
  const st2 = stage(), d2 = st2.T.doors[st2.lm.order[0]]; st2.lm.st[0].parcel.state = 'loose'; st2.lm.st[0].parcel.t = 0; st2.lm.st[0].parcel.x = d2.x + 3; st2.lm.st[0].parcel.z = d2.z; st2.lm.st[0].parcel.y = 100;
  st2.race.world.place(st2.f.car, { x: d2.x, y: d2.y, z: d2.z, yaw: 0 }); st2.f.car.v.fill(0); run(st2, 2);
  ok(st2.lm.st[0].delivered === 0, 'with no parcel in the bed there is nothing to deliver');
  const st3 = stage(); const d3 = st3.T.doors[st3.lm.order[0]]; st3.race.world.place(st3.f.car, { x: d3.x + 4, y: d3.y, z: d3.z, yaw: 0 }); st3.f.car.v.fill(0); run(st3, 2);
  ok(st3.lm.st[0].delivered === 0, 'and a stop four metres from the pad is not a delivery (the pad is ' + PAD + ' m)');
}
/* the tip */
{
  const st = stage(), s = st.lm.st[0]; s.carry = 0; s.parcel.drops = 0; s.damage = 0;
  ok(st.lm.tip(0) === BASE_TIP, 'a fresh parcel is worth ' + BASE_TIP);
  s.carry = 20; ok(st.lm.tip(0) === Math.round(BASE_TIP - TIME_RATE * 20), 'twenty seconds in the bed take ' + Math.round(TIME_RATE * 20) + ' off it');
  s.parcel.drops = 2; ok(st.lm.tip(0) === Math.round(BASE_TIP - TIME_RATE * 20 - 2 * DROP_COST), 'and a drop takes ' + DROP_COST + ' each');
  s.carry = 500; ok(st.lm.tip(0) === MIN_TIP, 'it never falls under ' + MIN_TIP);
}
/* a whole race: eight, the rivals stopping on the pads, the human a CPU in its place */
for (const [id, v] of [['sorting', 'f'], ['dam', 'r'], ['harbour', 'm']]) {
  const rating = trackFor(id, v).def.rating, s = setup(c, { kind: 'lastmile', track: id, v, rating, n: 8, seed: 5 }), race = createRace({ track: s.track, entries: s.entries, laps: 99, rating, seed: s.seed, noCuts: true }), lm = createLastMile(race, {});
  let t = 0; while (!lm.over && t < 60 * 260) { race.step(); t++; if (lm.st.filter(x => !x.f.human).every(x => x.done)) break; }
  const cpu = lm.st.filter(x => !x.f.human), done = cpu.filter(x => x.done), tips = cpu.map(x => x.tips);
  ok(done.length === cpu.length, id + ':' + v + ': the seven CPU cars deliver all six parcels, stopping on the pads (' + done.length + ' of ' + cpu.length + ' in ' + (t / 60).toFixed(0) + ' s)');
  /* (a rival that misses a pad goes round again, a lap of 40 s or so: over 168 CPU cars in 24 races the slowest takes 133 s and the mean is 68. Before the walls stopped holding cars, two of those races had a car that never finished at all.) */
  ok(done.every(x => x.finishT < 180), id + ':' + v + ': none takes more than three minutes (the slowest ' + Math.max(...done.map(x => x.finishT)).toFixed(0) + ' s)');
  ok(tips.every(x => x > 150), id + ':' + v + ': and the tips are earned, never nothing (' + Math.min(...tips) + ' to ' + Math.max(...tips) + ')');
}
void VARIANTS;
S.done();
