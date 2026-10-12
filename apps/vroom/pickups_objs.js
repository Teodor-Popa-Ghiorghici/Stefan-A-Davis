/* THE THINGS A PICKUP LEAVES ON THE ROAD (docs/vroom/plan.md section 7): the STATIC BALL that rolls down the line, the BOTTLE ROCKET that flies and bends a little toward a car, the SNOWBALL that is thrown in an arc and
   splashes, the ANTIFREEZE puddle, the CURLING STONE that is dropped behind and knocks aside what it meets, and the FAKE PARCEL. Each is a small record in `P.objs` with a `kind`, and each kind has one function
   that moves it a step and says whether it is finished. Nothing here is a rigid body but the stone, which is a sphere with a mass and trades an impulse with a car's three spheres like any other. Pure. */
import { ray } from './col_grid.js';
import { impulseAt } from './sim_body.js';
import { GRAVITY, SPILL_TIME } from './tune.js';
import { U, touchable, hit, flip, blast, groundY } from './pickups_fx.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

const KINDS = {
  /* the STATIC BALL runs along the line at a fixed lateral place, flipping every car it meets once; a car that is in the air over it is not touched (it can be jumped) */
  ball(C, o, dt) {
    const B = U.ball, p = C.T.line.at(o.d + o.v * dt);
    o.d += o.v * dt;
    o.x = p.x + p.nx * o.lat; o.z = p.z + p.nz * o.lat;
    const g = groundY(C.T.col, ray, o.x, o.y, o.z); if (g != null) o.y = g;
    for (const f of C.R.field) {
      if (!touchable(C.R, f) || o.hits.has(f.i) || (f.i === o.owner && o.t < B.grace)) continue;
      const c = f.car.p;
      if (Math.hypot(c[0] - o.x, c[2] - o.z) < B.r && Math.abs(c[1] - (o.y + 0.1)) < B.dy) { o.hits.add(f.i); flip(C, f, B); hit(C, f, o.owner, 'ball'); }
    }
    return o.d - o.d0 > B.range || o.t > 8;
  },
  /* the BOTTLE ROCKET flies straight at a speed the firer's own plus a little, bends toward the nearest car in front of it (limited: it cannot follow a corner), and bursts on a car or on the first wall */
  rocket(C, o, dt) {
    const R = U.rocket;
    if (o.t > R.delay) {
      let best = null, bd = 1e9;
      for (const f of C.R.field) {
        if (f.i === o.owner || !touchable(C.R, f)) continue;
        const dx = f.car.p[0] - o.x, dz = f.car.p[2] - o.z, d = Math.hypot(dx, dz);
        if (d > R.sense || d < 0.05 || (dx * o.dx + dz * o.dz) / d < Math.cos(R.cone)) continue;
        if (d < bd) { bd = d; best = f; }
      }
      if (best) {
        const cur = Math.atan2(o.dx, o.dz), want = Math.atan2(best.car.p[0] - o.x, best.car.p[2] - o.z), a = cur + clamp(angDiff(cur, want), -R.turn * dt, R.turn * dt);
        o.dx = Math.sin(a); o.dz = Math.cos(a);
      }
    }
    const step = o.v * dt, wall = ray(C.T.col, o.x, o.y + 0.02, o.z, o.dx, 0, o.dz, step + 0.08);
    if (wall >= 0) { blast(C, o.x + o.dx * wall, o.y, o.z + o.dz * wall, o.owner, 'rocket', R, null); return true; }
    o.x += o.dx * step; o.z += o.dz * step;
    const g = groundY(C.T.col, ray, o.x, o.y, o.z); if (g != null) o.y += (g + 0.09 - o.y) * Math.min(1, dt * 12);
    for (const f of C.R.field) {
      if (f.i === o.owner || !touchable(C.R, f)) continue;
      const c = f.car.p;
      if (Math.hypot(c[0] - o.x, c[2] - o.z) < R.r && Math.abs(c[1] - o.y) < 0.2) { blast(C, o.x, o.y, o.z, o.owner, 'rocket', R, f); return true; }
    }
    return o.t > R.life;
  },
  /* a SNOWBALL is thrown in an arc and splashes where it lands or on a car: every car near the splash has no grip for two seconds */
  snow(C, o, dt) {
    o.vy -= GRAVITY * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
    let at = null;
    for (const f of C.R.field) { if (!touchable(C.R, f) || (f.i === o.owner && o.t < 0.3)) continue; const c = f.car.p; if (Math.hypot(c[0] - o.x, c[2] - o.z) < U.snow.r + 0.1 && Math.abs(c[1] - o.y) < 0.2) { at = f; break; } }
    const g = groundY(C.T.col, ray, o.x, o.y, o.z);
    if (!at && !(g != null && o.y <= g + 0.03 && o.vy < 0) && o.t < 2) return false;
    const y = g == null ? o.y : g;
    for (const f of C.R.field) {
      if (!touchable(C.R, f)) continue;
      const c = f.car.p;
      if (Math.hypot(c[0] - o.x, c[2] - o.z) < U.snow.splash && Math.abs(c[1] - y) < 0.3) { f.car.tSpill = SPILL_TIME; hit(C, f, o.owner, 'snow'); }
    }
    C.P.fx.push({ kind: 'splash', x: o.x, y, z: o.z, age: 0, life: 0.4, r: U.snow.splash });
    return true;
  },
  /* the ANTIFREEZE puddle lies where it fell: each tyre in it has no grip for two seconds after it leaves */
  freeze(C, o) {
    for (const f of C.R.field) {
      if (!touchable(C.R, f) || Math.abs(f.car.p[1] - o.y) > 0.3) continue;
      const car = f.car, R = car.R, p = car.p, sp = car.spec;
      let any = false;
      sp.wheels.forEach((w, k) => {
        const x = p[0] + R[0] * w.x + R[1] * w.y + R[2] * w.z, z = p[2] + R[6] * w.x + R[7] * w.y + R[8] * w.z;
        if (Math.hypot(x - o.x, z - o.z) < U.freeze.r) { car.wheels[k].spill = SPILL_TIME; any = true; }
      });
      if (any && (o.seen[f.i] == null || C.R.t - o.seen[f.i] > U.freeze.cool)) { hit(C, f, o.owner, 'freeze'); }
      if (any) o.seen[f.i] = C.R.t;
    }
    return o.t > U.freeze.life;
  },
  /* the CURLING STONE is a sphere with a mass of its own: it slides to a stop, and a car that meets it trades an impulse with it and is knocked aside (or back) */
  stone(C, o, dt) {
    const S = U.stone, sp = Math.hypot(o.vx, o.vz);
    if (sp > 0) { const k = Math.max(0, sp - S.fric * dt) / sp; o.vx *= k; o.vz *= k; }
    o.x += o.vx * dt; o.z += o.vz * dt;
    const g = groundY(C.T.col, ray, o.x, o.y, o.z); if (g != null) o.y = g + S.r;
    for (const f of C.R.field) {
      if (!touchable(C.R, f)) continue;
      const car = f.car;
      for (let i = 0; i < 3; i++) {
        const sx = car.sw[i * 3], sy = car.sw[i * 3 + 1], sz = car.sw[i * 3 + 2], rr = car.spec.spheres[i][3] + S.r;
        let nx = sx - o.x, ny = sy - o.y, nz = sz - o.z; const d = Math.hypot(nx, ny, nz);
        if (d >= rr || d < 1e-6) continue;
        nx /= d; ny /= d; nz /= d;
        const rx = sx - nx * car.spec.spheres[i][3] - car.p[0], ry = sy - ny * car.spec.spheres[i][3] - car.p[1], rz = sz - nz * car.spec.spheres[i][3] - car.p[2];
        const vcx = car.v[0] + car.w[1] * rz - car.w[2] * ry, vcy = car.v[1] + car.w[2] * rx - car.w[0] * rz, vcz = car.v[2] + car.w[0] * ry - car.w[1] * rx;
        const vn = (vcx - o.vx) * nx + (vcy) * ny + (vcz - o.vz) * nz;
        if (vn < 0) {
          const j = -(1 + S.e) * vn / (1 / car.spec.mass + 1 / S.m);
          impulseAt(car, rx, ry, rz, j * nx, j * ny, j * nz); o.vx -= j * nx / S.m; o.vz -= j * nz / S.m;
          if (-vn > 1.2 && (o.seen[f.i] == null || C.R.t - o.seen[f.i] > S.cool)) { hit(C, f, o.owner, 'stone'); o.seen[f.i] = C.R.t; }
        }
        const push = rr - d; o.x -= nx * push * 0.5; o.z -= nz * push * 0.5;
      }
    }
    return o.t > S.life;
  },
  /* the FAKE PARCEL bursts on whoever takes it (the one who dropped it is let off for a second) */
  fake(C, o) {
    for (const f of C.R.field) {
      if (!touchable(C.R, f) || (f.i === o.owner && o.t < U.fake.immune)) continue;
      const c = f.car.p;
      if (Math.hypot(c[0] - o.x, c[2] - o.z) < U.fake.r && Math.abs(c[1] - o.y) < U.takeDY + 0.1) { flip(C, f, U.fake); hit(C, f, o.owner, 'fake'); C.P.fx.push({ kind: 'boom', x: o.x, y: o.y, z: o.z, age: 0, life: 0.45, r: 0.3 }); return true; }
    }
    return o.t > 60;
  }
};

export function stepObjects(C, dt) {
  const list = C.P.objs.slice(), dead = new Set();
  for (const o of list) { o.t += dt; if (KINDS[o.kind](C, o, dt)) dead.add(o); }
  if (dead.size) C.P.objs = C.P.objs.filter(o => !dead.has(o));
  const fx = C.P.fx; for (const e of fx) e.age += dt;
  C.P.fx = fx.filter(e => e.age < e.life);
}
