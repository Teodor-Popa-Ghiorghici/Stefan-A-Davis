/* CARS CHECK (dev-only, not packaged): the roster (docs/vroom/plan.md section 5). Twenty-four cars: five ratings of four and four specials. For each:
     the table: every number is inside its rating's envelope (a top speed within a tenth of the cap and never over it, an engine no quicker than the rating's best, tyres no grippier than its maximum), and the rating
       caps what an event gives it (a PRO car in a ROOKIE race is held to ROOKIE numbers);
     the spread: a rating has a heavy car, a light one, a grippy one and a drifty one, and none of its four is the best at more than two of speed, acceleration, grip and weight;
     the look: the silhouette of every car from the side, from behind and from above, pairwise, is not the same car (the intersection over the union of two silhouettes is held below a bound), the pictures are whole
       (every car builds, wears a livery, fits a frame) and eight of them cost a frame what the budget allows;
     the drive: every car, driven by a CPU round SORTING ROOM, finishes its laps and is not put back all the time, and a trike's three wheels carry its weight.
   the rivals: eleven, each with a name, a number and a livery of its own, none of them the player's; a field of eight is mixed (cars, paints and tiers) and the CPU's habits are only its few numbers.      node apps/vroom/cars_check.js */
import { CARS, CAR_IDS, carsOf, SPECIALS, numbersFor, specOf } from './cars.js';
import { RATINGS, TOP_SPEED, ACCEL_BEST, GRIP_MAX } from './tune.js';
import { carModel } from './car_art.js';
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { suite } from './check_kit.js';
import { RIVALS, fieldFor } from './rivals.js';
import { liveryFor, liveryOf, liveryDiff, PLAYER } from './livery.js';
import { TIERS } from './ai_profiles.js';
import { createRaster, W, H } from './raster.js';
import { drawView } from './scene.js';

const S = suite('cars_check'), { ok } = S;
const T = buildTrack(TRACKS.sorting);

/* ---- the roster ---- */
ok(CAR_IDS.length === 24, 'there are 24 cars (' + CAR_IDS.length + ')');
for (let r = 0; r < 5; r++) ok(carsOf(r).length === 4, RATINGS[r] + ' has four cars (' + carsOf(r).map(id => CARS[id].name).join(', ') + ')');
ok(SPECIALS.length === 4 && SPECIALS.join() === 'phonebox,snowman,curlingstone,thecat', 'and four specials: ' + SPECIALS.map(id => CARS[id].name).join(', '));
ok(new Set(CAR_IDS.map(id => CARS[id].name)).size === 24 && CAR_IDS.every(id => /^[A-Z ]+$/.test(CARS[id].name) && CARS[id].name.length <= 14), 'every name is its own, in capitals, and fits a label');
ok(carsOf(0).includes('courier') && CARS.courier.rating === 0, 'the KEI COURIER is the player\'s first car, in the ROOKIE four');
ok(CAR_IDS.every(id => CARS[id].blurb && CARS[id].blurb === CARS[id].blurb.toLowerCase() && CARS[id].blurb.length < 90), 'each has a line about it, lower case, one breath');
ok(CAR_IDS.every(id => ['electric', 'glow'].includes(CARS[id].look.engine)) && CAR_IDS.some(id => CARS[id].look.engine === 'glow') && CAR_IDS.some(id => CARS[id].look.engine === 'electric'), 'every car is electric or glow (its sound is its class)');
ok(CAR_IDS.filter(id => specOf(id).wheels.length === 3).join() === 'paperboy', 'one car has three wheels: the PAPERBOY');

/* ---- the table against the envelope ---- */
for (const id of CAR_IDS) {
  const c = CARS[id], n = c.num, r = c.rating, nm = c.name + ': ';
  ok(n.vtop <= TOP_SPEED[r] + 1e-9 && n.vtop >= TOP_SPEED[r] * 0.9 - 1e-9, nm + 'the top speed is within a tenth of the ' + RATINGS[r] + ' cap (' + n.vtop + ' of ' + TOP_SPEED[r] + ')');
  ok(n.accel >= ACCEL_BEST[r] - 1e-9 && n.accel <= ACCEL_BEST[r] + 1.5, nm + 'the engine is no quicker than the rating\'s best and not a crawl (' + n.accel + ' s to 95 %, best ' + ACCEL_BEST[r] + ')');
  ok((n.gripLat || 1) <= GRIP_MAX[r] + 1e-9, nm + 'the tyres are no grippier than the rating allows (' + (n.gripLat || 1) + ' of ' + GRIP_MAX[r] + ')');
  const own = numbersFor(id, r);
  ok(own.vtop === n.vtop && own.accel === n.accel && own.gripLat === (n.gripLat || 1), nm + 'in its own rating nothing is clamped');
  const low = numbersFor(id, 0);
  ok(low.vtop <= TOP_SPEED[0] && low.accel >= ACCEL_BEST[0] && low.gripLat <= GRIP_MAX[0], nm + 'in a ROOKIE race it is held to ROOKIE numbers (' + low.vtop + ', ' + low.accel + ', ' + low.gripLat + ')');
  const sp = specOf(id);
  ok(n.mass >= 1.0 && n.mass <= 3.2 && n.length >= 0.26 && n.length <= 0.66 && sp.W >= 0.14 && sp.W <= 0.3, nm + 'a toy: ' + n.mass + ' kg, ' + (n.length * 100).toFixed(0) + ' cm long');
}
/* the ratings cap what an event gives */
{
  const pro = numbersFor('hornet', 0), own = numbersFor('hornet', 4);
  ok(pro.vtop === TOP_SPEED[0] && own.vtop === TOP_SPEED[4], 'a PRO car is the PRO speed in a PRO race and the ROOKIE cap in a ROOKIE one (' + own.vtop + ', ' + pro.vtop + ')');
  ok(specOf('hornet', 0) !== specOf('hornet', 4) && specOf('hornet', 0).vtop < specOf('hornet', 4).vtop, 'and it is a different chassis for each');
}

/* ---- the spread inside a rating ---- */
for (let r = 0; r < 5; r++) {
  const ids = carsOf(r), N = ids.map(id => numbersFor(id, r)), tag = RATINGS[r] + ': ';
  const mass = N.map(n => n.mass), grip = N.map(n => n.gripLat), accel = N.map(n => n.accel), vtop = N.map(n => n.vtop), bias = N.map((n, i) => n.latBias == null ? 1.12 : n.latBias);
  ok(Math.max(...mass) / Math.min(...mass) >= 1.5, tag + 'a heavy car and a light one (' + Math.min(...mass) + ' to ' + Math.max(...mass) + ' kg)');
  ok(Math.max(...grip) - Math.min(...grip) >= 0.08, tag + 'a grippy car and a loose one (' + Math.min(...grip) + ' to ' + Math.max(...grip) + ')');
  const drifty = ids.filter((id, i) => bias[i] <= 1.0 && grip[i] <= Math.max(...grip) - 0.05);
  ok(drifty.length >= 1, tag + 'a drifty one: the tail steps out first and the tyres are not the best (' + drifty.map(id => CARS[id].name).join(', ') + ')');
  const best = ids.map(() => 0);
  [[vtop, 1], [accel, -1], [grip, 1], [mass, 1]].forEach(([a, sgn]) => { const top = Math.max(...a.map(x => x * sgn)); a.forEach((x, i) => { if (Math.abs(x * sgn - top) < 1e-9) best[i]++; }); });
  ok(best.every(b => b <= 2), tag + 'no car is the best at more than two of speed, acceleration, grip and weight (' + ids.map((id, i) => CARS[id].name + ' ' + best[i]).join(', ') + ')');
  ok(Math.max(...vtop) >= TOP_SPEED[r] * 0.99, tag + 'one of the four reaches the cap (' + Math.max(...vtop) + ' of ' + TOP_SPEED[r] + ')');
}
/* the ratings climb: the average of a rating's cars is quicker than the one below */
{
  const avg = r => carsOf(r).reduce((a, id) => a + CARS[id].num.vtop, 0) / 4;
  ok([1, 2, 3, 4].every(r => avg(r) > avg(r - 1)), 'each rating is quicker than the one below it (' + [0, 1, 2, 3, 4].map(r => avg(r).toFixed(1)).join(' < ') + ' m/s)');
  const best = r => Math.min(...carsOf(r).map(id => CARS[id].num.accel));
  ok([1, 2, 3, 4].every(r => best(r) < best(r - 1)), 'and each has a quicker engine at the top');
}

/* ---- the silhouettes ---- */
const CELL = 0.005, NX = 90, NY = 90, NZ = 170;
function silhouettes(id) {
  const sp = specOf(id), m = carModel(id), g = sp.comY;           /* heights are above the ground the car stands on */
  const side = new Uint8Array(NZ * NY), rear = new Uint8Array(NX * NY), top = new Uint8Array(NX * NZ);
  const tri = (P, Q, Rr, ua, ub, buf, w, h, off) => {          /* fill the triangle (a, b, c) in cells of a w x h grid; a, b, c are [u, v] in metres */
    const [a, b, c] = [P, Q, Rr], x0 = Math.floor(Math.min(a[0], b[0], c[0]) / CELL), x1 = Math.ceil(Math.max(a[0], b[0], c[0]) / CELL), y0 = Math.floor(Math.min(a[1], b[1], c[1]) / CELL), y1 = Math.ceil(Math.max(a[1], b[1], c[1]) / CELL);
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-12) return;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const px = (i + 0.5) * CELL, py = (j + 0.5) * CELL, l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      const ci = i + off[0], cj = j + off[1];
      if (ci >= 0 && ci < w && cj >= 0 && cj < h) buf[cj * w + ci] = 1;
    }
    void ua; void ub;
  };
  const addMesh = (mesh, dx, dy, dz) => {
    const P = mesh.pos;
    for (let t = 0; t < mesh.idx.length; t += 3) {
      const v = [0, 1, 2].map(k => { const i = mesh.idx[t + k]; return [P[i * 3] + dx, P[i * 3 + 1] + dy + g, P[i * 3 + 2] + dz]; });      /* y above the ground */
      tri([v[0][2], v[0][1]], [v[1][2], v[1][1]], [v[2][2], v[2][1]], 0, 0, side, NZ, NY, [NZ / 2, 0]);
      tri([v[0][0], v[0][1]], [v[1][0], v[1][1]], [v[2][0], v[2][1]], 0, 0, rear, NX, NY, [NX / 2, 0]);
      tri([v[0][0], v[0][2]], [v[1][0], v[1][2]], [v[2][0], v[2][2]], 0, 0, top, NX, NZ, [NX / 2, NZ / 2]);
    }
  };
  addMesh(m.body, 0, 0, 0);
  sp.wheels.forEach(w => addMesh(m.wheelF && w.front ? m.wheelF : m.wheel, w.x, w.y - w.rest + w.load / w.k, w.z));
  return { side, rear, top };
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 1; };
const SIL = {}; CAR_IDS.forEach(id => { SIL[id] = silhouettes(id); });
{
  const worst = [], all = [];
  for (let i = 0; i < CAR_IDS.length; i++) for (let j = i + 1; j < CAR_IDS.length; j++) {
    const A = SIL[CAR_IDS[i]], B = SIL[CAR_IDS[j]], s = iou(A.side, B.side), r = iou(A.rear, B.rear), t = iou(A.top, B.top), mean = (s + r + t) / 3;
    all.push(mean); worst.push({ a: CARS[CAR_IDS[i]].name, b: CARS[CAR_IDS[j]].name, s, r, t, mean });
  }
  worst.sort((p, q) => q.mean - p.mean);
  console.log('  most alike: ' + worst.slice(0, +(process.env.TOP || 4)).map(w => w.a + ' / ' + w.b + ' ' + w.mean.toFixed(2) + ' (side ' + w.s.toFixed(2) + ', rear ' + w.r.toFixed(2) + ', top ' + w.t.toFixed(2) + ')').join('   '));
  ok(worst[0].mean < 0.82, 'no two cars are alike: the most alike pair\'s silhouettes overlap ' + (worst[0].mean * 100).toFixed(0) + ' % (side, rear and top averaged; bound 82 %)');
  ok(worst.every(w => (w.s + w.r) / 2 < 0.84), 'and from the side and from behind, where a driver sees a car, no pair overlaps more than 84 % (' + (Math.max(...worst.map(w => (w.s + w.r) / 2)) * 100).toFixed(0) + ' %)');
  ok(worst.every(w => Math.max(w.s, w.r) < 0.92), 'and no pair has the same side or the same rear (the most alike: ' + Math.max(...worst.map(w => Math.max(w.s, w.r))).toFixed(2) + ' of 0.92)');
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  ok(mean < 0.6, 'on average two cars share well under two thirds of their outline (' + (mean * 100).toFixed(0) + ' %)');
  for (const id of CAR_IDS) { const s = SIL[id]; ok(s.side.reduce((a, b) => a + b, 0) > 150 && s.top.reduce((a, b) => a + b, 0) > 150, CARS[id].name + ' draws something (' + s.side.reduce((a, b) => a + b, 0) + ' cells of side)'); }
}

/* ---- every car builds, and what it costs ---- */
{
  let worstTris = 0, worstId = '';
  for (const id of CAR_IDS) { const m = carModel(id), tris = m.body.tris + m.wheel.tris * specOf(id).wheels.length + m.shadow.tris; if (tris > worstTris) { worstTris = tris; worstId = id; } ok(tris < 900, CARS[id].name + ' is low-poly (' + tris + ' triangles with its wheels)'); }
  console.log('  the heaviest car: ' + CARS[worstId].name + ' at ' + worstTris + ' triangles');
}

/* ---- the drive: every car round SORTING ROOM ---- */
{
  const rows = [];
  for (const id of CAR_IDS) {
    const r = CARS[id].rating, entries = [{ id: 'a', name: 'A', car: id, tier: Math.min(4, r) }];
    const race = createRace({ track: T, entries, laps: 2, seed: 3 + CAR_IDS.indexOf(id), rating: r, pickups: false });
    let repos = 0, flips = 0, vmax = 0;
    for (let i = 0; i < 60 * 150 && race.state !== 'done'; i++) { race.step(); for (const e of race.events) { if (e.type === 'repo') repos++; if (e.type === 'flip') flips++; } const c = race.field[0].car; vmax = Math.max(vmax, Math.hypot(c.v[0], c.v[2])); }
    const f = race.field[0], spec = f.spec;
    rows.push(CARS[id].name + ' ' + (f.best || 0).toFixed(1));
    ok(f.finished, CARS[id].name + ' drives two laps (' + (f.finished ? f.finishT.toFixed(1) + ' s' : 'did not finish: ' + f.lap + ' laps') + ')');
    ok(repos <= (CARS[id].special ? 8 : 2), CARS[id].name + ' is not put back all the time (' + repos + ' times, ' + flips + ' flips)');
    ok(vmax <= spec.vtop * 1.04 + 0.2, CARS[id].name + ' never goes faster than its numbers (' + vmax.toFixed(2) + ' of ' + spec.vtop + ' m/s)');
    ok(vmax >= spec.vtop * 0.55, CARS[id].name + ' gets up to speed (' + vmax.toFixed(1) + ' m/s)');
  }
  console.log('  best laps (a CPU of its own tier): ' + rows.join('   '));
}
/* the trike's weight sits on three wheels */
{
  const sp = specOf('paperboy'), total = sp.wheels.reduce((a, w) => a + w.load, 0);
  ok(sp.wheels.length === 3 && Math.abs(total - sp.mass * 15.696) < 0.01 && sp.wheels[0].front && !sp.wheels[1].front && sp.wheels[0].x === 0, 'a trike carries its whole weight on three wheels, the one in front in the middle (' + total.toFixed(2) + ' N)');
  ok(sp.ssf > 0.8 && sp.ssf < 1.5, 'and it is stable enough to be driven, not enough to be careless (stability factor ' + sp.ssf.toFixed(2) + ')');
  ok(CAR_IDS.filter(id => specOf(id).ssf < 0.9).every(id => specOf(id).aLat < 0.72 * 15.696 * 0.99), 'a car that tips at less than 0.9 g is asked for less than that in a bend (cars: ' + CAR_IDS.filter(id => specOf(id).ssf < 0.9).map(id => CARS[id].name + ' ' + specOf(id).ssf.toFixed(2)).join(', ') + ')');
}

/* ---- the rivals, and what they wear ---- */
{
  ok(RIVALS.length === 11, 'there are eleven rivals');
  ok(new Set(RIVALS.map(r => r.name)).size === 11 && RIVALS.every(r => /^[A-Z]{2,7}$/.test(r.name)) && new Set(RIVALS.map(r => r.num)).size === 11 && RIVALS.every(r => /^\d\d$/.test(r.num)), 'each has a name of its own and a number of its own');
  ok(new Set(RIVALS.map(r => r.paint)).size === 11 && new Set(RIVALS.map(r => r.logo)).size >= 10, 'each has a paint of its own, and (all but two) a logo of its own');
  let least = 1, pair = '';
  for (let i = 0; i < 11; i++) for (let j = i + 1; j < 11; j++) { const d = liveryDiff(RIVALS[i], RIVALS[j]); if (d < least) { least = d; pair = RIVALS[i].name + ' / ' + RIVALS[j].name; } }
  ok(least > 0.25, 'no two rivals dress alike: the two nearest (' + pair + ') differ in ' + (least * 100).toFixed(0) + ' % of their flank and roof');
  let near = 1, nearWho = '';
  for (const r of RIVALS) { const d = liveryDiff(PLAYER, r); if (d < near) { near = d; nearWho = r.name; } }
  ok(near > 0.3 && RIVALS.every(r => r.paint !== PLAYER.paint && r.num !== PLAYER.num && r.logo !== PLAYER.logo), 'the player\'s livery is not any rival\'s: the nearest (' + nearWho + ') differs in ' + (near * 100).toFixed(0) + ' %, and none shares its paint, number or logo');
  const lv = liveryFor(RIVALS[0]), seen = new Set(lv.side.d), clear = lv.side.d.filter(v => v === 255).length;
  ok(lv.side.w === 32 && lv.side.h === 16 && lv.top.w === 16 && lv.top.h === 16 && clear > 100 && seen.size >= 3 && liveryOf(RIVALS[0]) === liveryOf(RIVALS[0]), 'a livery is a 32 x 16 flank and a 16 x 16 roof with the paint left showing, made once');
  for (const rating of [0, 1, 2, 3, 4]) {
    const f = fieldFor(rating, 7, 11 + rating), tiers = f.map(e => e.tier);
    ok(new Set(f.map(e => e.name)).size === 7 && new Set(f.map(e => e.car)).size >= 4 && new Set(f.map(e => e.paint)).size === 7 && f.every(e => carsOf(rating).includes(e.car)), RATINGS[rating] + ': a field of seven rivals, in the rating\'s four cars, no two in the same paint (' + f.map(e => e.name + ' ' + CARS[e.car].name).join(', ') + ')');
    ok(tiers.every(t => t >= Math.max(0, rating - 1) && t <= Math.min(4, rating + 1)) && Math.max(...tiers) > Math.min(...tiers), RATINGS[rating] + ': the drivers are within a tier of the event and not all the same (' + tiers.map(t => TIERS[t].name).join(', ') + ')');
  }
  ok(fieldFor(0, 7, 1).map(e => e.name).join() !== fieldFor(0, 7, 5).map(e => e.name).join(), 'the seed moves the block of rivals on, so two cups do not meet the same seven');
  /* a style is a few of the driver's numbers and nothing that is speed, grip or mass */
  const allowed = new Set(['aggression', 'pickups', 'mistake', 'lineError']);
  ok(RIVALS.every(r => Object.keys(r.style).every(k => allowed.has(k))), 'a rival\'s style touches only aggression, pickups, mistakes and line error: never a speed, a grip or a mass');
}
/* ---- eight cars in a frame ---- */
{
  const R = createRaster(), T2 = T, field = [], f8 = fieldFor(0, 7, 3).concat([{ car: 'courier', paint: PLAYER.paint, livery: liveryFor(PLAYER), num: PLAYER.num }]);
  f8.forEach((e, i) => { const g = T2.grid[i], spec = specOf(e.car, 0), car = { p: new Float64Array([g.x, g.y + spec.comY, g.z]), q: new Float64Array([Math.cos(g.yaw / 2), 0, Math.sin(g.yaw / 2), 0]), R: new Float64Array([Math.cos(g.yaw), 0, Math.sin(g.yaw), 0, 1, 0, -Math.sin(g.yaw), 0, Math.cos(g.yaw)]), spec, wheels: spec.wheels.map(w => ({ comp: w.load / w.k, spin: 0 })), steer: 0, v: new Float64Array(3), ghost: 0 }; field.push({ car, model: carModel(e.car, e.paint, e.livery) }); });
  const g = T2.grid[0], cam = { x: g.x - Math.sin(g.yaw) * 2.2, y: g.y + 0.9, z: g.z - Math.cos(g.yaw) * 2.2, yaw: g.yaw, pitch: -0.25, fov: 1.0, near: 0.05, far: 130 };
  const times = [];
  for (let k = 0; k < 30; k++) { const t0 = process.hrtime.bigint(); drawView(R, { x: 0, y: 0, w: W, h: H }, T2, field, cam); times.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  times.sort((a, b) => a - b);
  console.log('  eight cars on the grid, the road and the hall: ' + times[15].toFixed(2) + ' ms a frame (median of 30; budget 6 ms)');
  ok(times[15] < 6, 'eight cars on the grid cost a frame ' + times[15].toFixed(2) + ' ms (a budget of 6)');
}
S.done();
