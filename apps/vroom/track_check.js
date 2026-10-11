/* TRACK CHECK (dev-only, not packaged): every track is data, and the data has to make a place a car can drive. For each track in track_def.js: the line closes; the road is wide enough and the walls are on its
   edges; the start grid is on the road and behind the line; the checkpoints stretch across it in order; the nodes a car is put back on are on the road, facing the right way, and none is in a pit; each thing
   set on the road (a belt, a jump, a kerb, a pinch, a counter) is where its data says and does what it is for; and a CPU car drives a whole lap of it without being put back, over every checkpoint, in a
   time that is a lap and not a crawl. The jump is held to the harder promise: whatever a player does with the keys in the air, a car that arrives at a speed a ROOKIE reaches clears it and lands on its wheels.
   The pickups are held to the same promise: every parcel is on the road, clear of the walls and of every belt, jump, kerb, pinch and counter, inside what the CPU may drive, and a car driven straight down its lane takes it.
   (Stars and gates join this check in the phases that add them.)   node apps/vroom/track_check.js */
import { buildTrack } from './track_build.js';
import { allTracks, defFor, TRACK_IDS } from './tracks.js';
import { createRace } from './race.js';
import { createWorld } from './sim.js';
import { specOf } from './cars.js';
import { ray } from './col_grid.js';
import { CUT_LEAD, CUT_TAIL } from './track_cut.js';
import { suite } from './check_kit.js';

const S = suite('track_check'), { ok } = S;
const deg = r => r * 180 / Math.PI;

const ONLY = (process.env.TRACK || '').split(',').filter(Boolean), ONLYV = (process.env.VARIANT || '').split(',').filter(Boolean);          /* TRACK=street,dam VARIANT=f node apps/vroom/track_check.js: while a road is being made */
for (const [tid, tv] of allTracks()) {
  if ((ONLY.length && !ONLY.includes(tid)) || (ONLYV.length && !ONLYV.includes(tv))) continue;
  const id = tid + (tv === 'f' ? '' : ':' + tv), T = buildTrack(defFor(tid, tv)), L = T.line, sm = L.samples, n = sm.length, tag = id + ': ';
  /* ---- the line ---- */
  const closing = Math.hypot(sm[0].x - sm[n - 1].x, sm[0].z - sm[n - 1].z);
  ok(closing < L.step * 1.6, tag + 'the line closes (the last sample is ' + closing.toFixed(2) + ' m from the first)');
  ok(T.length > 150 && T.length < 700, tag + 'a lap is a sensible length (' + T.length.toFixed(0) + ' m)');
  let turn = 0, maxK = 0; for (let i = 0; i < n; i++) { const a = sm[i], b = sm[(i + 1) % n]; let d = b.yaw - a.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; turn += d; maxK = Math.max(maxK, Math.abs(sm[i].k)); }
  ok(Math.abs(Math.abs(turn) - 2 * Math.PI) < 0.35, tag + 'it goes round once (' + deg(turn).toFixed(0) + ' degrees of turn)');
  ok(1 / maxK >= 3.5, tag + 'no bend tighter than 3.5 m radius (' + (1 / maxK).toFixed(1) + ' m)');
  const minW = Math.min(...T.width);
  ok(minW >= 1.6, tag + 'the road is never narrower than 1.6 m (' + minW.toFixed(2) + ' m): eight cars and a pinch of 1.0 m inside it');
  /* ---- the things on the road ---- */
  const F = T.features, all = [], wears = Object.fromEntries(T.needs.map(n => [n, true]));          /* what a car must wear to race this road at all (a car on a snow road is driven with its snow tyres on) */
  F.belts.forEach(b => all.push(['belt', b.s0, b.s1])); F.jumps.forEach(j => all.push(['jump', j.a - 4, j.d + 2])); F.kerbs.forEach(k => all.push(['kerb', k.s0, k.s1]));
  F.pinches.forEach(k => all.push(['pinch', k.s0, k.s1])); F.counters.forEach(k => all.push(['counter', k.s0, k.s1])); F.presses.forEach(k => all.push(['press', k.s0, k.s1]));
  const zone = (what, a, b) => { if (a < 0) { all.push([what, a + T.length, T.length]); all.push([what, 0, b]); } else if (b > T.length) { all.push([what, a, T.length]); all.push([what, 0, b - T.length]); } else all.push([what, a, b]); };
  const real = all.slice();
  T.stars.forEach(st => zone('the foot of a star spur', st.s - 7, st.s + 7));
  T.cuts.forEach(c => { zone('the mouth of a shortcut', c.sa - CUT_LEAD - 2, c.sa + 6); zone('the end of a shortcut', c.sb - 6, c.sb + CUT_TAIL + 2); });
  all.sort((a, b) => a[1] - b[1]);
  let clash = null; for (let i = 0; i + 1 < all.length; i++) if (all[i][2] > all[i + 1][1] - 3) clash = all[i][0] + ' runs into ' + all[i + 1][0];
  ok(!clash, tag + 'nothing on the road is on top of anything else (' + (clash || all.map(a => a[0]).join(', ')) + ')');
  ok(real.every(a => a[1] >= 0 && a[2] <= T.length), tag + 'every one of them is inside the lap');
  for (const b of F.belts) ok(b.s1 - b.s0 > 6 && T.widthAt((b.s0 + b.s1) / 2) >= 2 * Math.abs(b.lane[1]) + 1.2, tag + 'a belt is long enough to matter and leaves room beside it (' + (b.s1 - b.s0).toFixed(0) + ' m, road ' + T.widthAt((b.s0 + b.s1) / 2).toFixed(1) + ' m)');
  for (const j of F.jumps) {
    const run = F.jumps.length ? j.a - 20 : 0, straight = Math.max(...[0, 4, 8, 12, 16, 20].map(d => Math.abs(L.at(j.a - d).k))) < 0.03;
    ok(straight, tag + 'the road is straight for the 20 m before a jump (a run-up that is a bend is a wall)');
    void run;
  }
  /* ---- the pickups ---- */
  {
    const SP = T.spots, zones = [];
    F.belts.forEach(b => zones.push(['belt', b.s0 - 1, b.s1 + 1])); F.jumps.forEach(j => zones.push(['jump', j.a - 4, j.d + 2])); F.kerbs.forEach(k => zones.push(['kerb', k.s0 - 1, k.s1 + 1]));
    F.pinches.forEach(k => zones.push(['pinch', k.s0 - 2, k.s1 + 2])); F.counters.forEach(k => zones.push(['counter', k.s0 - 1, k.s1 + 1]));
    ok(SP.length >= 12 && SP.length % 3 === 0, tag + 'there are clusters of three parcels (' + SP.length + ' on a lap of ' + T.length.toFixed(0) + ' m)');
    const bad = [];
    SP.forEach(q => {
      const k = L.nearest(q.x, q.z), p = sm[k], lat = (q.x - p.x) * p.nx + (q.z - p.z) * p.nz;
      if (Math.abs(lat) > T.width[k] / 2 - 0.5) bad.push('wall ' + q.s.toFixed(0));
      if (ray(T.col, q.x, q.y + 0.3, q.z, 0, -1, 0, 0.6) < 0) bad.push('no floor ' + q.s.toFixed(0));
      const z = zones.find(zz => q.s >= zz[1] && q.s <= zz[2]); if (z) bad.push(z[0] + ' ' + q.s.toFixed(0));
      if (lat < T.limits.lo[k] - 0.1 || lat > T.limits.hi[k] + 0.1) bad.push('out of limits ' + q.s.toFixed(0));
    });
    ok(bad.length === 0, tag + 'every parcel is on the road with floor under it, inside the CPU\'s limits, and clear of every belt, jump, kerb, pinch and counter', bad.join(', '));
    const cl = [...new Set(SP.map(q => q.s))].sort((a, b) => a - b); let gap = 1e9; for (let i = 0; i < cl.length; i++) gap = Math.min(gap, ((cl[(i + 1) % cl.length] - cl[i]) + T.length) % T.length);
    ok(gap > 20, tag + 'clusters are at least 20 m apart (' + gap.toFixed(0) + ' m)');
    let missed = [];
    SP.forEach((q, i) => {
      const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 2 }], laps: 3, seed: 2 });
      for (let n = 0; n < 60 * 4; n++) race.step();
      race.pickups.spots.forEach((o, j) => { if (j !== i) { o.alive = false; o.until = 1e9; } });
      const f = race.field[0], p = L.at(q.s - 7), px = p.x + p.nx * q.lat, pz = p.z + p.nz * q.lat;
      f.driver = { drive: () => ({ throttle: 0.5, brake: 0, steer: 0, repo: false, fire: false }) };
      race.world.place(f.car, { x: px, y: p.y, z: pz, yaw: p.yaw }); f.car.v[0] = p.tx * 7; f.car.v[2] = p.tz * 7;
      for (let n = 0; n < 60 * 2.2; n++) race.step();
      if (race.pickups.spots[i].alive) missed.push(q.s.toFixed(0) + '/' + q.lat.toFixed(1));
    });
    ok(missed.length === 0, tag + 'a car driven straight down a parcel\'s lane takes it, every one of them (' + SP.length + ' tried)', missed.join(', '));
  }
  /* ---- the start ---- */
  ok(T.grid.length >= 8, tag + 'the grid has a place for eight cars (' + T.grid.length + ')');
  let offRoad = 0, ahead = 0, spacing = 9;
  T.grid.forEach((g, i) => {
    const near = L.nearest(g.x, g.z), p = sm[near], lat = (g.x - p.x) * p.nx + (g.z - p.z) * p.nz;
    if (Math.abs(lat) > T.width[near] / 2 - 0.25) offRoad++;
    if (p.s > T.startS) ahead++;
    if (ray(T.col, g.x, g.y + 0.3, g.z, 0, -1, 0, 1) < 0) offRoad++;
    for (let j = 0; j < i; j++) spacing = Math.min(spacing, Math.hypot(g.x - T.grid[j].x, g.z - T.grid[j].z));
  });
  ok(offRoad === 0, tag + 'every place on the grid is on the road, clear of the walls and with floor under it');
  ok(ahead === 0, tag + 'and behind the start line');
  ok(spacing > 0.55, tag + 'cars on the grid do not overlap (' + spacing.toFixed(2) + ' m between the nearest two)');
  /* ---- the checkpoints ---- */
  ok(T.checkpoints.length === 8, tag + 'eight checkpoints');
  let order = true, across = true; let prev = -1;
  T.checkpoints.forEach(c => {
    const d = ((c.s - T.startS + T.length * 2) % T.length); if (d < prev) order = false; prev = d;
    const mid = [(c.ax + c.bx) / 2, (c.az + c.bz) / 2], near = L.nearest(mid[0], mid[1]), w = Math.hypot(c.ax - c.bx, c.az - c.bz);
    if (w < T.width[near] + 0.5) across = false;
  });
  ok(order, tag + 'they come in order round the lap from the start line');
  ok(across, tag + 'and each one reaches past both walls: nothing can go round it');
  /* ---- the nodes ---- */
  let badNode = 0, wrongWay = 0, inPit = 0;
  T.nodes.forEach(nd => {
    const t = ray(T.col, nd.x, nd.y + 0.4, nd.z, 0, -1, 0, 1.2);
    if (t < 0) badNode++;
    const p = L.at(nd.s); let d = nd.yaw - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) > 0.2) wrongWay++;
    if (F.jumps.some(j => nd.s > j.b - 0.2 && nd.s < j.c + 0.2)) inPit++;
  });
  ok(badNode === 0, tag + 'every node a car is put back on has road under it (' + badNode + ' without)');
  ok(wrongWay === 0, tag + 'and faces along the line');
  ok(inPit === 0, tag + 'none is in a pit');
  ok(T.nodes.length > T.length / 8, tag + 'there is one every few metres (' + T.nodes.length + ')');
  /* ---- the soup ---- */
  let bad = 0; const g = T.col; for (let i = 0; i < g.tris.length; i++) if (!Number.isFinite(g.tris[i])) bad++;
  let maxSurf = 0; for (let i = 0; i < g.n; i++) maxSurf = Math.max(maxSurf, g.surf[i]);
  ok(bad === 0 && maxSurf < 12, tag + 'the collision soup is made of real numbers and real surfaces (' + g.n + ' triangles)');
  /* ---- a CPU drives a lap ---- */
  {
    const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 2, parts: wears }], laps: 2, seed: 4, pickups: false });
    let repos = 0, cp = 0, best = 0, flips = 0; const gates = new Set();
    for (let i = 0; i < 60 * 240 && race.state !== 'done'; i++) {
      race.step();
      for (const e of race.events) { if (e.type === 'repo') repos++; if (e.type === 'flip') flips++; }
      const f = race.field[0], idx = Math.floor(((((f.prog % T.length) + T.length) % T.length) / T.length) * 8);
      gates.add(idx); cp = f.lap; best = Math.max(best, f.prog);
    }
    const f = race.field[0], lt = f.lapTimes;
    ok(f.finished, tag + 'a CPU car finishes two laps (' + (f.finished ? f.finishT.toFixed(1) + ' s' : 'did not') + ')');
    ok(repos === 0 && flips === 0, tag + 'without being put back or turned over (' + repos + ' repositions, ' + flips + ' flips)');
    ok(gates.size === 8, tag + 'and passes every one of the eight stretches between checkpoints (' + gates.size + ')');
    ok(lt.length >= 1 && lt[lt.length - 1] > T.length / 14 && lt[lt.length - 1] < T.length / 6, tag + 'a lap takes a lap (' + (lt.length ? lt.map(x => x.toFixed(1)).join(', ') : 'none') + ' s over ' + T.length.toFixed(0) + ' m)');
    void cp; void best;
  }
  /* ---- the hidden stars ---- */
  for (const st of T.stars) {
    let near = 1e9; for (const q of sm) if (Math.abs(q.s - st.s) > 14 && Math.abs(q.s - st.s) < T.length - 14) near = Math.min(near, Math.hypot(q.x - st.x, q.z - st.z) - T.widthAt(q.s) / 2);
    ok(near > 4, tag + 'a star stands well away from the rest of the road (' + near.toFixed(1) + ' m from its edge)');
    const spec = specOf('courier', 0), w = createWorld({ col: T.col, nodes: T.nodes }), p0 = L.at(((st.s - 14) % T.length + T.length) % T.length), car = w.addCar(spec, { x: p0.x, y: p0.y, z: p0.z, yaw: p0.yaw }, { id: 0, parts: wears });
    for (let i = 0; i < 30; i++) w.step();
    const way = [{ x: L.at(st.s - 5).x + L.at(st.s - 5).nx * st.side * (T.widthAt(st.s) / 2 - 0.5), z: L.at(st.s - 5).z + L.at(st.s - 5).nz * st.side * (T.widthAt(st.s) / 2 - 0.5) }, ...st.samples.map(q => ({ x: q.x, z: q.z }))];
    let k = 0, got = false, best = 1e9, flipped = false;
    for (let i = 0; i < 60 * 12 && !got; i++) {
      while (k < way.length - 1 && Math.hypot(way[k].x - car.p[0], way[k].z - car.p[2]) < 2.2) k++;
      const dx = way[k].x - car.p[0], dz = way[k].z - car.p[2], yaw = Math.atan2(car.R[2], car.R[8]);
      let e = Math.atan2(dx, dz) - yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
      const sp = Math.hypot(car.v[0], car.v[2]);
      car.input = { throttle: sp < 4.5 ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, e * 1.6)), repo: false };
      w.step();
      for (const ev of w.events) if (ev.type === 'flip') flipped = true;
      const d = Math.hypot(car.p[0] - st.x, car.p[2] - st.z); best = Math.min(best, d);
      if (d < 0.4 && Math.abs(car.p[1] - st.y) < 0.6) got = true;
    }
    ok(got && !flipped, tag + 'a car that is driven to the star reaches it, up the ramp (' + (got ? 'got it' : 'closest ' + best.toFixed(2) + ' m') + (flipped ? ', turned over' : '') + ')');
  }
  /* ---- the press ---- */
  for (const pr of F.presses) {
    const spec = specOf('courier', 0), went = {};
    for (const down of [true, false]) {
      const w = createWorld({ col: T.col, nodes: T.nodes }), p = L.at(pr.s0 - 7), car = w.addCar(spec, { x: p.x, y: p.y, z: p.z, yaw: p.yaw }, { id: 0 });
      for (let i = 0; i < 30; i++) w.step();
      w.press(pr.tag, down);
      let past = false;
      for (let i = 0; i < 240; i++) { car.input = { throttle: 1, brake: 0, steer: 0, repo: false }; w.step(); if (sm[L.nearest(car.p[0], car.p[2])].s > pr.s1 + 1.5) past = true; }
      went[down] = past;
    }
    ok(went[true] === false && went[false] === true, tag + 'a press that is down is a wall and one that is up is not there (a car at full throttle: down ' + (went[true] ? 'went through' : 'stopped') + ', up ' + (went[false] ? 'went through' : 'stopped') + ')');
  }
  /* ---- the jump ---- */
  for (const j of F.jumps) {
    const spec = specOf('courier', 0), speeds = [9, 10, 11.5, 13], seqs = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, -1], [0, 0, -1], [1, 1, 1]];
    let fail = null, worst = 99, n = 0, worstWhat = '';
    for (const v0 of speeds) for (const q of seqs) for (const off of [0, -0.4, 0.4]) {
      const w = createWorld({ col: T.col, nodes: T.nodes }), p = L.at(j.a - 14), car = w.addCar(spec, { x: p.x + p.nx * off, y: p.y, z: p.z + p.nz * off, yaw: p.yaw }, { id: 0, parts: wears });
      for (let i = 0; i < 30; i++) w.step();
      let cleared = false, flipped = false, vend = 0;
      for (let i = 0; i < 360; i++) {
        const sp = Math.hypot(car.v[0], car.v[2]), nr = L.nearest(car.p[0], car.p[2]), s = sm[nr].s, air = car.touching === 0 && s > j.a - 1 && s < j.d + 1;           /* the keys are what is done in the AIR: on the road the car is driven to its speed */
        car.input = { throttle: air ? q[0] : (sp < v0 ? 1 : 0), brake: air ? q[1] : 0, steer: air ? q[2] * 0.6 : 0, repo: false };
        w.step();
        for (const e of w.events) if (e.type === 'flip') flipped = true;
        if (s > j.d + 3 && s < j.d + 10) { cleared = true; vend = sp; break; }
      }
      n++;
      if (!cleared || flipped) fail = fail || ('v ' + v0 + ', keys ' + q.join('') + ', off ' + off + (flipped ? ' flipped' : ' stuck'));
      else if (q[2] === 0 && vend < worst) { worst = vend; worstWhat = 'v ' + v0 + ', keys ' + q.join('') + ', off ' + off; }
    }
    ok(!fail, tag + 'a jump is cleared at every speed from 9 to 13 m/s with any of eight things done to the keys in the air, from three places across the road (' + n + ' tries)', fail);
    ok(worst > 6, tag + 'and a car that clears it with the wheel straight carries on (' + worst.toFixed(1) + ' m/s the slowest after the landing; one that held the wheel over in the air may find a wall)', worstWhat);
  }
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
