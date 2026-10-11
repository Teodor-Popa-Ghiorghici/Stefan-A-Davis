#!/usr/bin/env node
/* node apps/vroom/physics_check.js: the sim is a toy RC car (pure Node, no browser). Every number it holds is read from tune.js; the bands below are docs/vroom/plan.md section 6 made measurable.
   THE TYRE      mu by surface and by part (the grip function, and the stopping a car really makes), a car at rest sits on its springs, accelerates, brakes, turns and does not spin when the stick is held over
   THE AIR       a standard jump has its airtime, lands level, and the air control is small but real
   THE BODY      a tall car is rolled over by a kerb at speed and a low one is not; a light rear-heavy RWD wheelies and the others do not; a seam inside a ramp is not a wall
   THE OTHERS    a heavy car shoves a light one (momentum kept, restitution about 0.3), a conveyor moves what stands on it, cars do not pass through each other
   THE RESCUE    three seconds on its roof, then a 0.6 s fade, then the line, a ghost for a second; the R key asks for it too
   THE MOTOR     a wheel is never asked for more than 0.9 of what its tyre can hold, so a strong rear-drive car pulls away and can still steer; a knock tosses and turns a car over for a moment and the air does not right it;
                 a tyre that has been spilled on has 0.3 of its grip, one tyre at a time; a sled bites ice, a trike has three wheels that carry all of it
   THE RUN       ten minutes of four cars is bit for bit the same twice, and a step is cheap */
import { suite, carSpec, flatSoup, stage, drop, run, speed, settle, dice, deg } from './check_kit.js';
import { soup } from './col_build.js';
import { chassis } from './sim_spec.js';
import { createWorld } from './sim.js';
import { rotFromQuat } from './sim_body.js';
import { STEP, GRAVITY, SURF, SURF_BY_ID, surfaceGrip, SPILL_GRIP, COMPOUND, REPOS, TOP_SPEED, RATINGS, WHEELIE, TRACTION } from './tune.js';

const T = suite('physics_check');
const { ok } = T;
const g = GRAVITY;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ---- mu: the grip function ---- */
ok(near(surfaceGrip(SURF.asphalt), 1, 1e-9) && near(surfaceGrip(SURF.packed), 0.55, 1e-9) && near(surfaceGrip(SURF.deep), 0.45, 1e-9) && near(surfaceGrip(SURF.ice), 0.18, 1e-9) && near(surfaceGrip(SURF.carpet), 1.1, 1e-9) && near(surfaceGrip(SURF.cardboard), 0.9, 1e-9), 'mu by surface: asphalt 1.0, carpet 1.1, cardboard 0.9, packed snow 0.55, deep snow 0.45, ice 0.18');
ok(near(surfaceGrip(SURF.packed, { snowTyres: true }), 0.85, 1e-9) && near(surfaceGrip(SURF.deep, { snowTyres: true }), 0.75, 1e-9) && near(surfaceGrip(SURF.ice, { iceChains: true }), 0.6, 1e-9), 'SNOW TYRES: packed 0.85, deep 0.75; ICE CHAINS: ice 0.6');
ok(near(surfaceGrip(SURF.asphalt, { snowTyres: true }), 1, 1e-9) && near(surfaceGrip(SURF.ice, { snowTyres: true }), 0.18, 1e-9) && near(surfaceGrip(SURF.packed, { iceChains: true }), 0.55, 1e-9), 'a part helps only where it is for: snow tyres do nothing on ice, chains nothing on packed snow');
ok(near(surfaceGrip(SURF.asphalt, null, 1), SPILL_GRIP, 1e-9) && near(surfaceGrip(SURF.ice, { iceChains: true }, 1), 0.6 * SPILL_GRIP, 1e-9) && surfaceGrip(SURF.asphalt, null, 0) === 1, 'a spill takes mu to 0.3 of itself, and then no more');
ok(COMPOUND.length === 4 && COMPOUND[0] === 1 && COMPOUND.every((v, i) => i === 0 || v > COMPOUND[i - 1]) && near(surfaceGrip(SURF.asphalt, { compound: 3 }), COMPOUND[3], 1e-9) && surfaceGrip(SURF.asphalt, { compound: 9 }) === COMPOUND[3], 'TYRE COMPOUND: three levels over the stock tyre, each grippier');
ok(SURF_BY_ID.every((s, i) => s.id === i) && SURF_BY_ID.length === Object.keys(SURF).length, 'the surface ids are 0..n with none missing');
ok(RATINGS.length === 5 && TOP_SPEED.length === 5 && TOP_SPEED.every((v, i) => i === 0 || v > TOP_SPEED[i - 1]) && near(TOP_SPEED[4] / TOP_SPEED[0], 43 / 32, 0.05), 'five ratings, each faster than the last, in Re-Volt\'s ratio (32 to 43)');

/* ---- the car sits on its springs ---- */
{
  const spec = carSpec(), w = stage(flatSoup()), car = drop(w, spec); settle(w, 90);
  ok(near(car.p[1], spec.comY, 0.002) && Math.abs(car.v[1]) < 0.01, 'at rest the centre of mass is where the spec says (' + car.p[1].toFixed(4) + ' vs ' + spec.comY + ')');
  const loads = car.wheels.map(x => x.N), want = spec.wheels.map(x => x.load);
  ok(loads.every((n, i) => near(n, want[i], want[i] * 0.06)) && car.wheels.every(x => x.ground), 'each wheel carries its share of the weight (' + loads.map(n => n.toFixed(2)).join(' ') + ' N of ' + want.map(n => n.toFixed(2)).join(' ') + ')');
  ok(speed(car) < 0.01 && car.R[4] > 0.999, 'it stays put and level');
  const heavyNose = carSpec({ comZ: 0.04 }), w2 = stage(flatSoup()), c2 = drop(w2, heavyNose); settle(w2, 90);
  ok(c2.wheels[0].N + c2.wheels[1].N > c2.wheels[2].N + c2.wheels[3].N, 'a car whose weight is forward carries more on its front wheels');
}
/* ---- going: the engine, the brakes, by drivetrain and surface ---- */
const to95 = (o, surf) => { const w = stage(flatSoup(surf)), car = drop(w, carSpec(o)); settle(w); car.input.throttle = 1; let t = 0; const v90 = 0.9 * car.spec.vtop; while (speed(car) < v90 && t < 1500) { w.step(); t++; } return t < 1500 ? t / 60 : Infinity; };
{
  const f = to95({ drive: 'fwd' }), r = to95({ drive: 'rwd' }), a = to95({ drive: 'awd' });
  ok(f > 2.0 && f < 3.4 && r > 2.0 && r < 3.2 && a > 2.0 && a < 3.2, 'a ROOKIE courier is at 90 % of 13 m/s in 2 to 3.4 s on asphalt (fwd ' + f.toFixed(2) + ', rwd ' + r.toFixed(2) + ', awd ' + a.toFixed(2) + ')');
  ok(f > r && f > a - 0.05, 'a front-wheel drive launches slower than rear or all four (the weight goes back as it accelerates)');
  const ice = to95({ drive: 'awd' }, SURF.ice.id), packed = to95({ drive: 'awd' }, SURF.packed.id);
  ok(ice > packed * 1.5 && packed > a * 1.0, 'the same car takes longer on packed snow than asphalt, and far longer on ice (' + a.toFixed(1) + ' / ' + packed.toFixed(1) + ' / ' + (ice === Infinity ? 'never' : ice.toFixed(1)) + ' s)');
  ok(to95({ vtop: 17.5, accel: 2.0, drive: 'awd', mass: 1.5 }) < 3.4, 'a PRO car has a far higher top speed and is at 90 % of it in under 3.4 s');
}
/* the stopping a car really makes: v0 = 10, brakes full, on every surface; decel should be min(brake limit, mu) g */
function brake(surf, parts, spill) {
  const w = stage(flatSoup(surf)), car = drop(w, carSpec({ drive: 'awd' }), null, { parts }); settle(w);
  car.v[0] = 10; if (spill) car.tSpill = 10; car.input.brake = 1; const x0 = car.p[0]; let t = 0;
  while (speed(car) > 0.4 && t < 1200) { w.step(); t++; }
  const dist = car.p[0] - x0, v0 = 10, vEnd = speed(car);
  return { a: (v0 * v0 - vEnd * vEnd) / (2 * dist), t: t / 60, dist };
}
{
  const limit = 0.9;                                               /* the brakes: a bit under a g of the road, and the road's mu can hold them lower */
  for (const [name, surf, parts, spill] of [['asphalt', SURF.asphalt.id], ['lino', SURF.lino.id], ['wood', SURF.wood.id], ['metal', SURF.metal.id], ['tile', SURF.tile.id], ['packed snow', SURF.packed.id], ['packed snow, snow tyres', SURF.packed.id, { snowTyres: true }], ['ice', SURF.ice.id], ['ice, chains', SURF.ice.id, { iceChains: true }], ['asphalt, spilled on', SURF.asphalt.id, null, true]]) {
    const mu = surfaceGrip(SURF_BY_ID[surf], parts, spill ? 1 : 0), want = Math.min(limit, mu) * g, got = brake(surf, parts, spill);
    ok(near(got.a, want, want * 0.22), 'braking on ' + name + ': ' + got.a.toFixed(1) + ' m/s^2 against min(' + limit + ', mu ' + mu.toFixed(2) + ') g = ' + want.toFixed(1), got.dist.toFixed(1) + ' m');
  }
  const a = brake(SURF.asphalt.id), i = brake(SURF.ice.id);
  ok(i.dist > a.dist * 3.5, 'it takes more than three and a half times the road to stop on ice (' + a.dist.toFixed(1) + ' m against ' + i.dist.toFixed(1) + ' m)');
}
/* turning: the stick held over at every speed never rolls the car and never spins it, and the grip is used */
{
  let worst = 'none';
  for (const v0 of [4, 7, 10, 12.5]) {
    const w = stage(flatSoup()), car = drop(w, carSpec()); settle(w); car.input.throttle = 1; run(w, 240, () => { if (speed(car) < v0) car.input.throttle = 1; else car.input.throttle = 0.3; });
    car.input.steer = 1; let lat = 0, n = 0, minUp = 1, side = 0, flips = 0;
    run(w, 240, i => { car.input.throttle = speed(car) < v0 ? 1 : 0.3; });
    car.input.steer = 1;
    for (let i = 0; i < 180; i++) { car.input.throttle = speed(car) < v0 ? 1 : 0.3; w.step(); if (i > 30) { lat += speed(car) * Math.abs(car.w[1]); n++; } minUp = Math.min(minUp, car.R[4]); side = Math.max(side, Math.abs(car.v[0] * -car.R[8] + car.v[2] * car.R[2])); for (const e of w.events) if (e.type === 'flip') flips++; }
    const mean = lat / n;
    if (!(mean > 6 && mean < g * 1.05 && minUp > 0.97 && flips === 0 && side < 3)) worst = 'entry ' + v0 + ' m/s: lat ' + mean.toFixed(1) + ' up ' + minUp.toFixed(2) + ' side ' + side.toFixed(1);
  }
  ok(worst === 'none', 'full lock from 4 to 12.5 m/s: a steady turn that uses 6 m/s^2 or more of grip, never above one g, never rolls, never slides far sideways', worst);
}
/* ---- the air ---- */
function jump(rise, runLen, v0, o) {
  const S = flatSoup().incline(20, 0, 20 + runLen, 0, 3, 0, rise), w = stage(S), car = drop(w, carSpec(o && o.spec), { x: 0 }); settle(w);
  let air = 0, maxAir = 0, land = null, flips = 0, minUp = 1, atLand = 0, t = 0, maxNose = 0;
  while (car.p[0] < 19 && t < 900) { car.input.throttle = speed(car) < v0 ? 1 : 0.2; w.step(); t++; }
  for (let i = 0; i < 240 && !(land && car.airtime === 0); i++) {
    car.input.throttle = 0; car.input.brake = 0; car.input.steer = 0; if (o && o.pitch) car.input.throttle = o.pitch;
    w.step();
    for (const e of w.events) { if (e.type === 'land' && !land) { land = e; atLand = Math.asin(Math.max(-1, Math.min(1, car.R[5]))); } if (e.type === 'flip') flips++; }
    maxNose = Math.max(maxNose, car.R[5]); minUp = Math.min(minUp, car.R[4]); maxAir = Math.max(maxAir, car.airtime);
  }
  return { air: land ? land.airtime : maxAir, speed: land ? land.speed : 0, pitch: atLand, flips, minUp, v: speed(car) };
}
{
  const j = jump(0.18, 0.85, 12);
  ok(j.air >= 0.3 && j.air <= 0.55, 'the standard jump (a 0.18 m ramp over 0.85 m at 12 m/s) is in the air 0.30 to 0.55 s (' + j.air.toFixed(2) + ' s)');
  ok(j.flips === 0 && j.minUp > 0.7 && Math.abs(deg(j.pitch)) < 42, 'it lands the right way up, within 42 degrees of level (' + deg(j.pitch).toFixed(0) + ' degrees), without touching the controls');
  ok(j.v > 8, 'and keeps its speed (' + j.v.toFixed(1) + ' m/s from 12): a ramp is not a wall');
  const small = jump(0.1, 0.8, 10);
  ok(small.air > 0 && small.air < j.air && small.flips === 0, 'a smaller ramp is a smaller jump (' + small.air.toFixed(2) + ' s)');
  const nose = jump(0.18, 0.85, 12, { pitch: 1 }), still = jump(0.18, 0.85, 12);
  ok(deg(still.pitch) - deg(nose.pitch) > 3 && deg(still.pitch) - deg(nose.pitch) < 40, 'the air control is small but real: holding the nose down through the jump changes the landing by ' + (deg(still.pitch) - deg(nose.pitch)).toFixed(0) + ' degrees (3 to 40)');
}
/* ---- the body ---- */
function kerb(o, h, v, ang) {
  const S = flatSoup().box(27, h / 2, 2.5, 65, h, 0.3, 0), w = stage(S), car = drop(w, carSpec(o), { yaw: Math.PI / 2 - ang }); settle(w);
  car.v[0] = Math.cos(ang) * v; car.v[2] = Math.sin(ang) * v; let minUp = 1, flips = 0;
  for (let i = 0; i < 240 && car.p[0] < 60; i++) { car.input.throttle = 0.3; w.step(); minUp = Math.min(minUp, car.R[4]); for (const e of w.events) if (e.type === 'flip') flips++; }
  return { minUp, flips };
}
{
  /* a grid of kerbs, 3 and 5 cm, taken at four angles: how many of the eight roll the car (its up axis falls under 0.3, so it is on its side or its roof). The static stability factor is half the track over the height of
     the centre of mass: the courier's is 1.6, a van's 1.0 and a top-heavy crane truck's 0.8 */
  const crane = { comY: 0.12, height: 0.18, mass: 2.2, width: 0.22 }, van = { comY: 0.095, height: 0.17, mass: 2.2, width: 0.22 }, low = { comY: 0.04 }, courier = {};
  const grid = (o, v) => { let n = 0; for (const h of [0.03, 0.05]) for (const a of [0.25, 0.35, 0.44, 0.52]) if (kerb(o, h, v, a).minUp < 0.3) n++; return n; };
  const k4 = grid(crane, 4), k8 = grid(crane, 8), k11 = grid(crane, 11), c11 = grid(courier, 11), l11 = grid(low, 11), v11 = grid(van, 11);
  ok(k11 >= 6, 'a top-heavy car is rolled over by a low kerb at 11 m/s in most of the ways it can meet one (' + k11 + ' of 8)');
  ok(c11 === 0 && l11 === 0 && v11 === 0, 'the ordinary courier, a low car and a van of stability factor 1.0 take the same eight kerbs and stay up (' + c11 + ', ' + l11 + ' and ' + v11 + ' of 8)');
  ok(k4 <= k8 && k8 <= k11 && k4 < k11, 'it is speed that rolls it: ' + k4 + ' of 8 at 4 m/s, ' + k8 + ' at 8, ' + k11 + ' at 11');
}
{
  const wh = (o) => { const w = stage(flatSoup()), car = drop(w, carSpec(o)); settle(w); car.input.throttle = 1; let mx = 0, ev = 0; for (let i = 0; i < 150; i++) { w.step(); mx = Math.max(mx, Math.asin(Math.min(1, car.R[5]))); for (const e of w.events) if (e.type === 'wheelie') ev++; } return { pitch: mx, ev }; };
  const rear = wh({ drive: 'rwd', mass: 1.2, length: 0.38, comY: 0.085, comZ: -0.045, accel: 1.8 }), courier = wh({}), heavy = wh({ drive: 'awd', mass: 2.6, comY: 0.075 }), bal = wh({ drive: 'rwd', mass: 1.2, comY: 0.07, comZ: -0.02, accel: 1.8 });
  ok(rear.pitch > WHEELIE.pitch && rear.ev >= 1, 'a light rear-heavy rear-wheel drive stands on its back wheels from a standing start (' + deg(rear.pitch).toFixed(0) + ' degrees, ' + rear.ev + ' event)');
  ok(courier.pitch < 0.1 && heavy.pitch < 0.1 && bal.pitch < WHEELIE.pitch * 0.5 && courier.ev + heavy.ev + bal.ev === 0, 'the courier, a heavy all-wheel drive and a balanced light RWD do not');
}
{
  /* a seam inside a flat piece of track is not a wall: a car crosses a ramp's diagonal at speed and keeps most of it */
  const r = jump(0.1, 0.8, 10);
  ok(r.v > 7.5, 'driving up a ramp, over the seam that joins its two triangles, costs under a quarter of the speed (' + r.v.toFixed(1) + ' m/s from 10)');
  const w = stage(flatSoup().ground(40, -3, 60, 3, 0.002, 0, 2)), car = drop(w, carSpec(), { x: 30 }); settle(w); car.input.throttle = 1; run(w, 150);
  ok(speed(car) > 11 && car.R[4] > 0.99, 'a road made of many pieces is driven as one road (' + speed(car).toFixed(1) + ' m/s at the end of 2.5 s)');
}
{
  /* nothing goes through a sheet, however fast: a car dropped onto a thin sheet from two metres, upside down and the right way up */
  for (const flip of [false, true]) {
    const w = stage(soup().quad([-5, 0, -5], [5, 0, -5], [5, 0, 5], [-5, 0, 5], 0)), car = drop(w, carSpec(), { x: 0 }); car.p[1] = 2; if (flip) { car.q.set([0, 1, 0, 0]); rotFromQuat(car.q, car.R); }
    let lowest = 9; for (let i = 0; i < 240; i++) { w.step(); lowest = Math.min(lowest, car.p[1]); }
    ok(lowest > -0.001 && car.p[1] > 0.02, 'a car dropped from two metres' + (flip ? ' on its roof' : '') + ' lands on a single sheet and stays above it (lowest ' + lowest.toFixed(3) + ')');
  }
}
/* ---- the others ---- */
{
  const H = { name: 'H', mass: 3, length: 0.46, width: 0.24, height: 0.1, comY: 0.06, vtop: 13, accel: 2.4, drive: 'awd' }, L = { name: 'L', mass: 1.2, length: 0.38, width: 0.2, height: 0.1, comY: 0.06, vtop: 13, accel: 2.4, drive: 'fwd' };
  const hit = (a, b, v) => {
    const w = stage(flatSoup()), A = drop(w, chassis(a), { x: 0 }), B = drop(w, chassis(b), { x: 1.5 }); settle(w); A.v[0] = v;
    const p0 = A.spec.mass * A.v[0] + B.spec.mass * B.v[0]; let ev = null;
    for (let i = 0; i < 40; i++) { w.step(); for (const e of w.events) if (e.type === 'hit-car' && !ev) ev = e; }
    const p1 = A.spec.mass * A.v[0] + B.spec.mass * B.v[0];
    return { A, B, p0, p1, ev, vA: A.v[0], vB: B.v[0] };
  };
  const hl = hit(H, L, 8), lh = hit(L, H, 8);
  ok(hl.ev && hl.ev.speed > 6, 'two cars that meet make a hit-car event with the speed they met at (' + (hl.ev ? hl.ev.speed.toFixed(1) : 'none') + ' m/s)');
  ok(hl.vB > hl.vA && hl.vB > 5.5 && hl.vA > 3, 'a heavy car at 8 m/s shoves a light one that was standing still: it goes at ' + hl.vB.toFixed(1) + ', the heavy one keeps ' + hl.vA.toFixed(1));
  ok(Math.abs(hl.p1 - hl.p0) / hl.p0 < 0.12 && Math.abs(lh.p1 - lh.p0) / lh.p0 < 0.12, 'momentum is kept to within 12 % (' + ((hl.p1 / hl.p0 - 1) * 100).toFixed(1) + '%, ' + ((lh.p1 / lh.p0 - 1) * 100).toFixed(1) + '%)');
  ok(lh.vA < 1.2 && lh.vB > 1.5 && lh.vB < hl.vB, 'a light car hits a heavy one and is stopped by it, the heavy one moves much less (' + lh.vA.toFixed(1) + ' and ' + lh.vB.toFixed(1) + ')');
  { const e = (hl.vB - hl.vA) / 8; ok(e > 0.15 && e < 0.5, 'the restitution is about 0.3 (' + e.toFixed(2) + ')'); }
  /* head on at 10 m/s each: nobody passes through anybody */
  const w = stage(flatSoup()), A = drop(w, chassis(H), { x: 0 }), B = drop(w, chassis(L), { x: 2, yaw: -Math.PI / 2 }); settle(w); A.v[0] = 10; B.v[0] = -10;
  run(w, 90); ok(A.p[0] < B.p[0], 'cars driving at each other at 10 m/s each do not pass through one another');
  /* a ghost is passed through */
  const w2 = stage(flatSoup()), C = drop(w2, chassis(H), { x: 0 }), D = drop(w2, chassis(L), { x: 1.0 }); settle(w2); D.ghost = 2; C.v[0] = 6; run(w2, 60); ok(C.p[0] > D.p[0] - 0.05, 'a ghost (a car just put back on the road) is driven through');
}
{
  /* a conveyor moves what stands on it */
  const S = flatSoup().ground(8, -2, 14, 2, 0.001, SURF.belt.id, 6, [1.2, 0]), w = stage(S), car = drop(w, carSpec(), { x: 9 }); settle(w); const x0 = car.p[0]; run(w, 120);
  ok(car.p[0] - x0 > 1.6 && car.p[0] - x0 < 2.6, 'a conveyor at 1.2 m/s carries a car that stands on it about 2 m in two seconds (up to its own speed in under a second) (' + (car.p[0] - x0).toFixed(2) + ' m)');
}
/* ---- reverse, and the events that say what the car is doing ---- */
{
  const w = stage(flatSoup()), car = drop(w, carSpec()); settle(w); car.input.brake = 1; run(w, 120);
  const back = car.v[0] * car.R[2] + car.v[2] * car.R[8];
  ok(back < -2.5 && back > -0.45 * car.spec.vtop, 'from a standstill the brake is reverse: ' + back.toFixed(1) + ' m/s backwards after two seconds, never more than 0.45 of the top speed');
  const w2 = stage(flatSoup()), c2 = drop(w2, carSpec()); settle(w2); c2.input.brake = 1; c2.input.throttle = 1; run(w2, 120);
  ok(Math.abs(speed(c2)) < 0.3, 'gas and brake together is a car that stays where it is');
  const S = soup().ground(-20, -10, 20, 10, 0, SURF.asphalt.id, 4).ground(20, -10, 60, 10, 0, SURF.ice.id, 4), w3 = stage(S), c3 = drop(w3, carSpec({ drive: 'awd' }), { x: 10 }); settle(w3);
  const seen = []; c3.input.throttle = 1; run(w3, 200, () => { for (const e of w3.events) if (e.type === 'surface') seen.push(e.surf); });
  ok(seen.join() === String(SURF.ice.id), 'driving from asphalt onto ice says so once, and says nothing while the surface stays the same (' + seen.join() + ')');
}
/* ---- the rescue ---- */
{
  const nodes = [{ x: 5, y: 0, z: 0, yaw: Math.PI / 2 }], w = stage(flatSoup(), { nodes }), car = drop(w, carSpec(), { x: 5 }); settle(w);
  car.q.set([0, 1, 0, 0]); rotFromQuat(car.q, car.R); car.p[1] = 0.3; car.p[0] = 9; car.v.fill(0); car.w.fill(0);
  const log = []; let t = 0, atRepo = null;
  while (t < 420) { w.step(); t++; for (const e of w.events) { if (e.type === 'flip' || e.type === 'repo-start' || e.type === 'repo') log.push([e.type, t * STEP]); if (e.type === 'repo') atRepo = { up: car.R[4], x: car.p[0], ghost: car.ghost, v: speed(car) }; } }
  const rs = log.find(l => l[0] === 'repo-start'), rp = log.find(l => l[0] === 'repo');
  ok(rs && rs[1] > REPOS.upside - 0.1 && rs[1] < REPOS.upside + 0.4, 'a car on its roof asks to be put back after three seconds (' + (rs ? rs[1].toFixed(2) : 'never') + ' s)');
  ok(rp && rs && near(rp[1] - rs[1], REPOS.fade, 0.05), 'and is put back 0.6 s later (' + (rp && rs ? (rp[1] - rs[1]).toFixed(2) : '?') + ' s)');
  ok(atRepo && atRepo.up > 0.99 && near(atRepo.x, 5, 0.05) && near(atRepo.ghost, REPOS.ghost, 0.05) && atRepo.v < 0.5, 'on the nearest node of the line, level, at rest, and a ghost for a second', JSON.stringify(atRepo));
  ok(car.ghost === 0 && car.R[4] > 0.99, 'and the ghost is over a second later');
  ok(log.filter(l => l[0] === 'repo').length === 1, 'once');
  const w2 = stage(flatSoup(), { nodes }), c2 = drop(w2, carSpec(), { x: 5 }); settle(w2); c2.p[0] = 12; c2.input.repo = true; run(w2, 2); ok(w2.events.length >= 0 && c2.repoT > 0, 'R asks for it at once');
  run(w2, 60); ok(near(c2.p[0], 5, 0.1), 'and R puts the car back on the line');
  /* off the end of the world: a platform that stops, and a car that drives off it */
  const w3 = stage(soup().ground(-20, -10, 12, 10, 0, 0, 8), { nodes }), c3 = drop(w3, carSpec(), { x: 5 }); settle(w3); c3.input.throttle = 1; let back = false, deepest = 0;
  run(w3, 420, () => { deepest = Math.min(deepest, c3.p[1]); for (const e of w3.events) if (e.type === 'repo') back = true; });
  ok(back && deepest < REPOS.floor && c3.p[1] > -1, 'a car that drives off the edge of the world is put back on the line once it is ' + Math.abs(REPOS.floor) + ' m down (' + deepest.toFixed(1) + ')');
  const w4 = stage(flatSoup().box(8, 0.5, 0, 0.2, 1, 6, 0), { nodes }), c4 = drop(w4, carSpec(), { x: 6 }); settle(w4); c4.input.throttle = 1; let asked = 0; run(w4, 330, () => { for (const e of w4.events) if (e.type === 'repo-start') asked++; });
  ok(asked >= 1, 'a car pushing against a wall for three seconds is put back (' + asked + ' time(s))');
}
/* ---- the run ---- */
function longRun(seed) {
  const S = soup().ground(-100, -100, 300, 100, 0, 0, 40).incline(20, 0, 20.85, 0, 3, 0, 0.18).box(60, 0.05, 2, 20, 0.1, 0.4, 0).box(-30, 0.5, 0, 0.3, 1, 60, 0);
  const w = createWorld({ col: S.build(), nodes: [{ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }] }), rnd = dice(seed);
  const cars = [0, 1, 2, 3].map(i => w.addCar(carSpec({ name: 'X' + i, mass: 1.3 + i * 0.5, comY: 0.058 + i * 0.012, drive: ['fwd', 'rwd', 'awd', 'fwd'][i] }), { x: i * 0.5, y: 0, z: i * 0.5 - 1, yaw: Math.PI / 2 }));
  const t0 = performance.now();
  for (let i = 0; i < 36000; i++) { if (i % 20 === 0) for (const c of cars) { c.input.throttle = rnd() < 0.8 ? 1 : 0; c.input.brake = rnd() < 0.1 ? 1 : 0; c.input.steer = rnd() * 2 - 1; } w.step(); }
  return { h: w.hash(), ms: performance.now() - t0, finite: cars.every(c => [...c.p, ...c.v, ...c.q].every(Number.isFinite)) };
}
/* ---- the motor controller, the knock, the spill, the sled and the trike (phase 4) ---- */
{
  /* a PRO engine on two driven wheels asks the road for three times what it has: with the controller it takes 0.9 of it and is left some to steer with */
  const strong = carSpec({ drive: 'rwd', mass: 1.15, accel: 1.0, vtop: 17.5, comZ: -0.025, latBias: 0.97 }), w = stage(flatSoup()), car = drop(w, strong); settle(w); car.input.throttle = 1;
  run(w, 24); const a = speed(car) / (24 * STEP);
  ok(a < TRACTION * 1.0 * GRAVITY * 1.06 && a > 6, 'a strong rear-drive car off the line gets at most what the tyres can hold, and a good deal of it (' + a.toFixed(1) + ' m/s^2 of the ' + (TRACTION * GRAVITY).toFixed(1) + ' a wheel can give)');
  const w2 = stage(flatSoup()), c2 = drop(w2, strong); settle(w2); c2.v[0] = 6; c2.input.throttle = 1; run(w2, 30); c2.input.steer = 1; const h0 = Math.atan2(c2.R[2], c2.R[8]); run(w2, 60);
  const dh = Math.abs(((Math.atan2(c2.R[2], c2.R[8]) - h0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  ok(dh > 0.25 && c2.R[4] > 0.95, 'and it still steers with the throttle down: the heading comes round ' + deg(dh).toFixed(0) + ' degrees in a second and it stays on its wheels');
  /* the courier, whose engine the road could always hold, is held no worse */
  const w3 = stage(flatSoup()), c3 = drop(w3, carSpec()); settle(w3); c3.input.throttle = 1; run(w3, 150);
  ok(speed(c3) > 0.88 * 13, 'a courier is still at 88 % of its top speed in 2.5 s (' + speed(c3).toFixed(1) + ' m/s)');
}
{
  /* a knock: a toss up and a spin about the car's own nose, and for a moment the air does not straighten it */
  const w = stage(flatSoup()), car = drop(w, carSpec()); settle(w);
  w.knock(car, { up: 3, roll: 9, tumble: 0.9 });
  let minUp = 1, air = 0; run(w, 40, () => { minUp = Math.min(minUp, car.R[4]); if (car.touching === 0) air += STEP; });
  ok(minUp < 0.0 && air > 0.3, 'a knock (3 m/s up, 9 rad/s of roll) turns a car right over in the air (up vector ' + minUp.toFixed(2) + ', ' + air.toFixed(2) + ' s off the ground)');
  run(w, 90); ok(car.tumble <= 0, 'and the tumble ends by itself (' + car.tumble.toFixed(2) + ')');
  const w2 = stage(flatSoup()), c2 = drop(w2, carSpec()); settle(w2); c2.v[1] = 3; c2.w[0] = 0.0; let up2 = 1; run(w2, 40, () => { up2 = Math.min(up2, c2.R[4]); });
  ok(up2 > 0.9, 'the same toss with no spin and no knock stays level');
  const w3 = stage(flatSoup()), c3 = drop(w3, carSpec()); settle(w3); w3.knock(c3, { up: 1, stun: 1.2 }); run(w3, 6);
  ok(c3.tStun > 1.0, 'a stun is a timer on the car (' + c3.tStun.toFixed(2) + ' s left)');
}
{
  /* a spill is a third of the grip, and it is the tyre's: the braking is longer for each wheel that has it */
  const stop = f => { const w = stage(flatSoup()), car = drop(w, carSpec()); settle(w); car.v[0] = 8; f(car); car.input.brake = 1; const x0 = car.p[0]; run(w, 240); return car.p[0] - x0; };
  const clean = stop(() => {}), front = stop(c => { c.wheels[0].spill = 2; c.wheels[1].spill = 2; }), all = stop(c => { c.tSpill = 2; });
  ok(clean < front && front < all && all > clean * 1.8, 'a tyre that has been spilled on brakes a third as well, wheel by wheel: stops in ' + clean.toFixed(1) + ' m clean, ' + front.toFixed(1) + ' with the front pair spilled, ' + all.toFixed(1) + ' with all four');
  const onIce = o => { const w = stage(flatSoup(SURF.ice.id)), car = drop(w, carSpec(o)); settle(w); car.v[0] = 6; car.input.brake = 1; const x0 = car.p[0]; run(w, 300); return car.p[0] - x0; };
  const plain = onIce(), sled = onIce({ ice: 0.42 });
  ok(sled < plain * 0.6, 'a sled\'s runners bite ice a little: it stops in ' + sled.toFixed(1) + ' m where a plain car takes ' + plain.toFixed(1));
}
{
  /* a trike: three wheels carry all the weight, it sits level and drives straight and turns */
  const spec = carSpec({ wheels: 3, track: 0.2, wheelbase: 0.26, comY: 0.052, comZ: -0.03, drive: 'rwd' }), w = stage(flatSoup()), car = drop(w, spec); settle(w, 120);
  ok(spec.wheels.length === 3 && spec.wheels[0].front && spec.wheels[0].x === 0 && spec.wheels.slice(1).every(q => !q.front), 'a trike has one wheel in front in the middle and two behind');
  ok(car.wheels.every(x => x.ground) && Math.abs(car.wheels.reduce((t, x) => t + x.N, 0) - spec.mass * GRAVITY) < spec.mass * GRAVITY * 0.06 && car.R[4] > 0.999 && speed(car) < 0.02, 'at rest the three wheels carry the whole weight and it stays level and put (' + car.wheels.map(x => x.N.toFixed(2)).join(' ') + ' N)');
  car.input.throttle = 1; run(w, 120); const sp = speed(car), yaw0 = Math.atan2(car.R[2], car.R[8]);
  ok(sp > 5 && Math.abs(yaw0 - Math.PI / 2) < 0.15, 'it drives straight and gets up to speed (' + sp.toFixed(1) + ' m/s)');
  car.input.steer = 0.7; run(w, 60); ok(car.R[4] > 0.9 && Math.abs(Math.atan2(car.R[2], car.R[8]) - yaw0) > 0.15, 'and turns without going over');
  ok(spec.ssf > 0.8 && spec.aLat <= 0.7 * spec.ssf * GRAVITY + 1e-9 + 5, 'its stability factor (' + spec.ssf.toFixed(2) + ') is worked out from where its three wheels are');
}
{
  const a = longRun(12345), b = longRun(12345), c = longRun(777);
  ok(a.h === b.h, 'ten minutes (36,000 steps) of four cars on random inputs from a seed is bit for bit the same twice', a.h + ' / ' + b.h);
  ok(a.h !== c.h, 'and another seed is another ten minutes');
  ok(a.finite && c.finite, 'nothing in it ever goes to infinity or NaN');
  /* the hash of that run, fixed: a change to the sim, the tune or the maths changes it, on purpose (node apps/vroom/physics_check.js prints the new one) */
  /* (7efda053 until phase 4, when a wheel's thrust was held to 0.9 of what its tyre can hold: the sim was changed on purpose, docs/vroom/plan.md section 14) */
  const GOLD = '427b7c97';
  ok(a.h === GOLD || (console.log('  (the ten-minute hash is ' + a.h + '; set GOLD in physics_check.js when the sim is changed on purpose)'), false), 'the ten-minute hash is the one this sim makes');
  console.log('  ten minutes of four cars: ' + (a.ms / 1000).toFixed(1) + ' s (' + (a.ms / 36000).toFixed(3) + ' ms a step)');
  ok(a.ms / 36000 < 1.5, 'a step of four cars costs under 1.5 ms (' + (a.ms / 36000).toFixed(3) + ')');
}
T.done();
