/* THE PICKUPS IN A RACE (docs/vroom/plan.md section 7). `createPickups(race, rnd)` is the part of a race that has parcels lying on the road, cars holding what they took, and the things that were thrown. A race calls
     P.fire(f, pressed)   once a step for each car, before the world steps: a car's FIRE key (a person's, or the CPU's) is an edge, and a press uses what the car holds
     P.post(worldEvents)  once a step after it: the timers, the things on the road, the hot parcel passing on a touch, the parcels being taken and coming back
   and reads what it needs from the race (the field, the world, the track, the clock). Everything it does to a car is a knock, a power cut or a grip cut (pickups_fx.js); everything it says goes in the race's events:
     { type: 'pick', i, id, count }   { type: 'use', i, id }   { type: 'hit', i, by, id }   { type: 'pass', from, to }   { type: 'boom', i }   { type: 'fuse', i }
   `rnd` is the race's seeded dice, taken in a fixed order, so a race with the same inputs is the same race. Pure. */
import { ray } from './col_grid.js';
import { deal, PICKUPS } from './pickups_deal.js';
import { U, touchable, hit, flip, groundY } from './pickups_fx.js';
import { stepObjects } from './pickups_objs.js';
import { STEP } from './tune.js';

/* two cars touch when any sphere of one overlaps any sphere of the other (sim_cars.js: three to a car) */
function touching(a, b) {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const dx = a.sw[i * 3] - b.sw[j * 3], dy = a.sw[i * 3 + 1] - b.sw[j * 3 + 1], dz = a.sw[i * 3 + 2] - b.sw[j * 3 + 2], rr = a.spec.spheres[i][3] + b.spec.spheres[j][3] + 0.012;
    if (dx * dx + dy * dy + dz * dz < rr * rr) return true;
  }
  return false;
}

export function createPickups(R, rnd) {
  const T = R.track, W = R.world, L = T.length;
  const P = { spots: T.spots.map(s => ({ i: s.i, x: s.x, y: s.y, z: s.z, s: s.s, lat: s.lat, alive: true, until: 0 })), objs: [], fx: [], stats: { picks: 0, uses: 0, hits: 0, passes: 0, booms: 0, by: {} }, nextId: 1 };
  const C = { R, W, T, P, rnd };
  const stat = id => P.stats.by[id] || (P.stats.by[id] = { picked: 0, used: 0, hit: 0 });
  const spawn = (kind, owner, o) => { const ob = Object.assign({ id: P.nextId++, kind, owner, t: 0, seen: {} }, o); P.objs.push(ob); return ob; };
  const bombLive = () => R.field.some(f => f.bomb);
  const place = f => f.place;
  /* a car has company when another is within 14 m of it along the road: a hot parcel is only dealt to one that has someone to give it to */
  const company = f => R.field.some(g => g !== f && Math.abs(g.dist - f.dist) < 14);
  /* the car's heading on the ground, and the road under it */
  const aim = f => { const c = f.car, l = Math.hypot(c.R[2], c.R[8]) || 1; return { dx: c.R[2] / l, dz: c.R[8] / l, gy: groundY(T.col, ray, c.p[0], c.p[1], c.p[2]) }; };

  P.stateOf = f => f.hold;
  P.bombLive = bombLive;

  /* THE FIRE KEY: an edge. Uses the first thing a car holds. */
  P.fire = (f, pressed) => {
    const edge = pressed && !f.fireWas; f.fireWas = !!pressed;
    if (!edge || R.state !== 'racing' || !touchable(R, f) || !f.hold.length) return false;
    const it = f.hold[0], a = aim(f), c = f.car, x = c.p[0], z = c.p[2], gy = a.gy == null ? c.p[1] - c.spec.comY : a.gy;
    switch (it.id) {
      case 'ball': spawn('ball', f.i, { d: f.dist + 0.4, d0: f.dist + 0.4, lat: f.lat, v: U.ball.v, y: gy, x, z, hits: new Set() }); break;
      case 'rocket': { const v = Math.max(U.rocket.min, Math.hypot(c.v[0], c.v[2]) + U.rocket.extra); spawn('rocket', f.i, { x: x + a.dx * 0.3, y: gy + 0.09, z: z + a.dz * 0.3, dx: a.dx, dz: a.dz, v }); break; }
      case 'leads': f.leads = U.leads.time; break;
      case 'freeze': spawn('freeze', f.i, { x: x - a.dx * 0.34, y: gy, z: z - a.dz * 0.34 }); break;
      case 'snow': spawn('snow', f.i, { x: x + a.dx * 0.3, y: gy + 0.14, z: z + a.dz * 0.3, vx: c.v[0] + a.dx * U.snow.v, vy: c.v[1] + U.snow.up, vz: c.v[2] + a.dz * U.snow.v }); break;
      case 'stone': spawn('stone', f.i, { x: x - a.dx * 0.34, y: gy + U.stone.r, z: z - a.dz * 0.34, vx: -a.dx * 0.8, vz: -a.dz * 0.8 }); break;
      case 'fake': spawn('fake', f.i, { x: x - a.dx * 0.34, y: gy + 0.06, z: z - a.dz * 0.34 }); break;
      case 'coffee': c.tTurbo = U.coffee.time; break;
      case 'cut': for (const g of R.field) if (g !== f && g.prog > f.prog && touchable(R, g)) { g.car.tPower = U.cut.time; hit(C, g, f.i, 'cut'); } break;
      default: return false;
    }
    it.count--; if (it.count <= 0) f.hold.shift();
    R.events.push({ type: 'use', i: f.i, id: it.id }); P.stats.uses++; stat(it.id).used++;
    return true;
  };

  /* after the world's step */
  P.post = (worldEvents) => {
    const t = R.t;
    stepObjects(C, STEP);
    for (const f of R.field) {
      /* JUMP LEADS: a car that comes close to one that has them loses its power for a moment */
      if (f.leads > 0) {
        f.leads -= STEP;
        for (const g of R.field) {
          if (g === f || !touchable(R, g) || !touchable(R, f)) continue;
          const dx = g.car.p[0] - f.car.p[0], dz = g.car.p[2] - f.car.p[2];
          if (dx * dx + dz * dz < U.leads.r * U.leads.r && Math.abs(g.car.p[1] - f.car.p[1]) < 0.3) {
            g.car.tPower = Math.max(g.car.tPower, U.leads.cut);
            if (f.zapped[g.i] == null || t - f.zapped[g.i] > U.leads.cool) hit(C, g, f.i, 'leads');
            f.zapped[g.i] = t;
          }
        }
      }
      /* THE HOT PARCEL: a fuse that burns down on whoever has it, and blows them up at the end */
      if (f.bomb) {
        f.bomb.fuse -= STEP;
        if (f.finished) f.bomb = null;
        else if (f.bomb.fuse <= 0) {
          flip(C, f, U.parcel); hit(C, f, f.bomb.from < 0 ? f.i : f.bomb.from, 'parcel');
          for (const g of R.field) { if (g === f || !touchable(R, g)) continue; const dx = g.car.p[0] - f.car.p[0], dz = g.car.p[2] - f.car.p[2], d = Math.hypot(dx, dz); if (d < U.parcel.splash) { W.knock(g.car, { up: 1.2, push: [dx / (d || 1) * 2, dz / (d || 1) * 2], tumble: 0.2 }); } }
          P.fx.push({ kind: 'boom', x: f.car.p[0], y: f.car.p[1], z: f.car.p[2], age: 0, life: 0.6, r: 0.5 });
          R.events.push({ type: 'boom', i: f.i }); P.stats.booms++; f.bomb = null;
        }
      }
    }
    /* a car that touches the one with the parcel is handed it (touching is any overlap of their spheres, hard or soft; not back to the one that just passed it on) */
    for (const f of R.field) {
      if (!f.bomb || !touchable(R, f)) continue;
      if (f.bomb.lock >= 0 && !touching(f.car, R.field[f.bomb.lock].car)) f.bomb.lock = -1;       /* two cars that stay in contact do not trade it back and forth: they must come apart first */
      for (const g of R.field) {
        if (g === f || g.bomb || !touchable(R, g) || f.bomb.lock === g.i) continue;
        if (f.bomb.from === g.i && t - f.bomb.at < U.parcel.immune) continue;
        if (!touching(f.car, g.car)) continue;
        g.bomb = { fuse: f.bomb.fuse, from: f.i, at: t, lock: f.i }; f.bomb = null;
        R.events.push({ type: 'pass', from: f.i, to: g.i }); P.stats.passes++;
        break;
      }
    }
    /* the parcels on the road: taken by a car that has room for what is in it, and back after a few seconds */
    for (const s of P.spots) {
      if (!s.alive) { if (t >= s.until) s.alive = true; continue; }
      for (const f of R.field) {
        if (!touchable(R, f) || f.hold.length >= f.cap) continue;
        const c = f.car.p;
        if (Math.hypot(c[0] - s.x, c[2] - s.z) > U.takeR || Math.abs((c[1] - f.spec.comY) - s.y) > U.takeDY) continue;
        const got = deal(place(f), R.field.length, rnd, bombLive() || !company(f) ? ['parcel'] : null);
        s.alive = false; s.until = t + U.respawn; P.stats.picks++; stat(got.id).picked++;
        if (got.id === 'parcel') { if (!f.bomb) { f.bomb = { fuse: U.parcel.fuse, from: -1, at: t, lock: -1 }; R.events.push({ type: 'fuse', i: f.i }); } }
        else f.hold.push({ id: got.id, count: got.count });
        R.events.push({ type: 'pick', i: f.i, id: got.id, count: got.count });
        break;
      }
    }
  };
  return P;
}
export { PICKUPS };
