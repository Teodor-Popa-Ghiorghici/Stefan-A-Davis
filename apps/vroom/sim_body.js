/* A CAR'S BODY: one rigid body (a position, a quaternion, a velocity, a spin) pushed by what the wheels did (sim_wheel.js), by gravity and by the air, turned a little in the air by the player, and
   collided with the track by a handful of probes: the eight corners and twelve edge midpoints of its box (tiny spheres, plus a swept test so a corner cannot pass through a sheet between two steps)
   and four wheel-sized spheres (a kerb or a wall catches a wheel, below the centre of mass, which is what rolls a tall car over). A contact is an impulse with restitution and friction, solved a few
   times over, and a push out of the surface that never adds up to more than the deepest. Pure: the same numbers in, the same numbers out. */
import { gather, closest, onSeam, region, CP, rayTri, facing, ray, HIT, N as FN } from './col_grid.js';
import { GRAVITY, BODY, AIR } from './tune.js';

const QB = new Int32Array(96);
const CAP = 80;
const C = { rx: new Float64Array(CAP), ry: new Float64Array(CAP), rz: new Float64Array(CAP), nx: new Float64Array(CAP), ny: new Float64Array(CAP), nz: new Float64Array(CAP), depth: new Float64Array(CAP), jn: new Float64Array(CAP), fx: new Float64Array(CAP), fy: new Float64Array(CAP), fz: new Float64Array(CAP), n: 0 };

export function rotFromQuat(q, R) {
  const w = q[0], x = q[1], y = q[2], z = q[3];
  R[0] = 1 - 2 * (y * y + z * z); R[1] = 2 * (x * y - w * z); R[2] = 2 * (x * z + w * y);
  R[3] = 2 * (x * y + w * z); R[4] = 1 - 2 * (x * x + z * z); R[5] = 2 * (y * z - w * x);
  R[6] = 2 * (x * z - w * y); R[7] = 2 * (y * z + w * x); R[8] = 1 - 2 * (x * x + y * y);
}
export function quatYaw(yaw, q) { q[0] = Math.cos(yaw / 2); q[1] = 0; q[2] = Math.sin(yaw / 2); q[3] = 0; }

/* I^-1 * (x y z) in the world, into out */
function invIApply(car, x, y, z, out) {
  const R = car.R, iv = car.spec.invI;
  const bx = R[0] * x + R[3] * y + R[6] * z, by = R[1] * x + R[4] * y + R[7] * z, bz = R[2] * x + R[5] * y + R[8] * z;
  const cx = bx * iv[0], cy = by * iv[1], cz = bz * iv[2];
  out[0] = R[0] * cx + R[1] * cy + R[2] * cz; out[1] = R[3] * cx + R[4] * cy + R[5] * cz; out[2] = R[6] * cx + R[7] * cy + R[8] * cz;
}
const TMP = new Float64Array(3), TMP2 = new Float64Array(3);
/* 1/m + n . ((I^-1 (r x n)) x r): how much a unit impulse along n at r changes the velocity there */
function effMass(car, rx, ry, rz, nx, ny, nz) {
  const cx = ry * nz - rz * ny, cy = rz * nx - rx * nz, cz = rx * ny - ry * nx;
  invIApply(car, cx, cy, cz, TMP);
  const ex = TMP[1] * rz - TMP[2] * ry, ey = TMP[2] * rx - TMP[0] * rz, ez = TMP[0] * ry - TMP[1] * rx;
  return 1 / car.spec.mass + nx * ex + ny * ey + nz * ez;
}
export function impulseAt(car, rx, ry, rz, jx, jy, jz) {
  const m = car.spec.mass; car.v[0] += jx / m; car.v[1] += jy / m; car.v[2] += jz / m;
  invIApply(car, ry * jz - rz * jy, rz * jx - rx * jz, rx * jy - ry * jx, TMP2);
  car.w[0] += TMP2[0]; car.w[1] += TMP2[1]; car.w[2] += TMP2[2];
}

/* gravity, the air, a little control in the air, and one substep of motion */
export function integrate(car, h, touching, col) {
  const sp = car.spec, m = sp.mass, v = car.v, w = car.w, R = car.R, F = car.F, T = car.T;
  F[1] -= m * GRAVITY;
  const speed = Math.hypot(v[0], v[1], v[2]);
  const dr = BODY.linDrag * sp.dragK * speed; F[0] -= dr * v[0]; F[1] -= dr * v[1]; F[2] -= dr * v[2];
  const df = BODY.downforce * sp.downforce * speed * speed * (touching > 0 ? 1 : 0.3); F[0] -= df * R[1]; F[1] -= df * R[4]; F[2] -= df * R[7];
  /* in the air: the air itself keeps the car's nose along the way it is travelling and lets its spin die away (so a jump is an arc, not a tumble), and the player has a little control on top:
     pitch with the throttle and brake, roll with the steering, only while no wheel has touched for a moment */
  if (touching === 0 && car.airtime > AIR.delay && !(car.tumble > 0)) {
    const k = 1 - AIR.damp * h; w[0] *= k; w[1] *= k; w[2] *= k;
    const hs = Math.hypot(v[0], v[2]);
    let tx = 0, tz = 0;
    /* near the ground the car comes level with it (a nose-first landing is how a toy car ends up standing on its bumper), more the closer it is; higher up it keeps to the way it is travelling */
    let lvl = 0;
    if (col && col.n && R[4] > 0.2 && car.airtime > AIR.levelAfter) {
      const d = ray(col, car.p[0], car.p[1], car.p[2], 0, -1, 0, AIR.seek);
      if (d >= 0) {
        const t = HIT.tri * 3, gn = col.nrm, sg = gn[t + 1] < 0 ? -1 : 1, nx = gn[t] * sg, ny = gn[t + 1] * sg, nz = gn[t + 2] * sg;
        if (ny > 0.5) {
          lvl = Math.min(1, 1 - d / AIR.seek);
          const ux = R[1], uy = R[4], uz = R[7], ax = uy * nz - uz * ny, ay = uz * nx - ux * nz, az = ux * ny - uy * nx;
          tx += AIR.level * lvl * (ax * R[0] + ay * R[3] + az * R[6]) * sp.inertia[0]; tz += AIR.level * lvl * (ax * R[2] + ay * R[5] + az * R[8]) * sp.inertia[2];
        }
      }
    }
    if (hs > 1.5 && R[4] > 0) { const err = Math.asin(Math.max(-1, Math.min(1, R[5]))) - Math.atan2(v[1], hs); tx += AIR.align * err * sp.inertia[0] * (1 - lvl); }
    const pi = car.input.throttle - car.input.brake, ro = car.input.steer, A = AIR.torque * sp.airTorque;
    const wbx = R[0] * w[0] + R[3] * w[1] + R[6] * w[2], wbz = R[2] * w[0] + R[5] * w[1] + R[8] * w[2];
    if (pi !== 0 && wbx * pi < AIR.maxRate) tx += pi * A * sp.inertia[0];
    if (ro !== 0 && -wbz * ro < AIR.maxRate) tz += -ro * A * sp.inertia[2];
    T[0] += R[0] * tx + R[2] * tz; T[1] += R[3] * tx + R[5] * tz; T[2] += R[6] * tx + R[8] * tz;
  }
  v[0] += F[0] / m * h; v[1] += F[1] / m * h; v[2] += F[2] / m * h;
  invIApply(car, T[0], T[1], T[2], TMP);
  w[0] += TMP[0] * h; w[1] += TMP[1] * h; w[2] += TMP[2] * h;
  const damp = 1 - BODY.angDamp * 10 * h; w[0] *= damp; w[1] *= damp; w[2] *= damp;
  car.p[0] += v[0] * h; car.p[1] += v[1] * h; car.p[2] += v[2] * h;
  const q = car.q, hx = w[0] * h * 0.5, hy = w[1] * h * 0.5, hz = w[2] * h * 0.5;
  const qw = q[0], qx = q[1], qy = q[2], qz = q[3];
  q[0] = qw + (-hx * qx - hy * qy - hz * qz); q[1] = qx + (hx * qw + hy * qz - hz * qy); q[2] = qy + (hy * qw + hz * qx - hx * qz); q[3] = qz + (hz * qw + hx * qy - hy * qx);
  const l = 1 / Math.hypot(q[0], q[1], q[2], q[3]); q[0] *= l; q[1] *= l; q[2] *= l; q[3] *= l;
  rotFromQuat(q, R);
}

/* the probes against the track: find the contacts, solve their impulses, push the body out. Returns the hardest hit (a change of speed, m/s) */
export function collide(world, car, h) {
  const g = world.col, sp = car.spec, R = car.R, P = car.p, pr = sp.probes, pw = car.pw, pp = car.pprev;
  C.n = 0;
  for (let k = 0; k < pr.length; k++) {
    const b = pr[k], lx = b[0], ly = b[1], lz = b[2], rad = b[3] || BODY.probe, kind = b[4], wheel = kind === 1;
    const x = P[0] + R[0] * lx + R[1] * ly + R[2] * lz, y = P[1] + R[3] * lx + R[4] * ly + R[5] * lz, z = P[2] + R[6] * lx + R[7] * ly + R[8] * lz;
    const px = pp[k * 3], py = pp[k * 3 + 1], pz = pp[k * 3 + 2];
    pw[k * 3] = x; pw[k * 3 + 1] = y; pw[k * 3 + 2] = z;
    const m = gather(g, Math.min(x, px) - rad, Math.min(y, py) - rad, Math.min(z, pz) - rad, Math.max(x, px) + rad, Math.max(y, py) + rad, Math.max(z, pz) + rad, QB);
    const sx = x - px, sy = y - py, sz = z - pz, sl = Math.hypot(sx, sy, sz);
    for (let i = 0; i < m && C.n < CAP; i++) {
      const t = QB[i];
      const d2 = closest(g, t, x, y, z);
      if (d2 < rad * rad) {
        if (onSeam(g, t)) continue;
        if (g.off !== null && g.tag[t] !== 0 && world.gate(car, g.tag[t])) continue;             /* a gate that gave way */
        const d = Math.sqrt(d2), face = region() === 0;
        let nx, ny, nz, depth = rad - d;
        if (face) {
          /* over the face: the side it is on is the side it CAME from, so a sheet that was crossed pushes back out and not through (the road is a sheet: both sides are solid, and neither is a trap) */
          facing(g, t, px, py, pz);
          nx = FN[0]; ny = FN[1]; nz = FN[2];
          const cd = (x - g.tris[t * 9]) * nx + (y - g.tris[t * 9 + 1]) * ny + (z - g.tris[t * 9 + 2]) * nz;
          depth = rad - cd;
        } else if (d > 1e-9) { nx = (x - CP[0]) / d; ny = (y - CP[1]) / d; nz = (z - CP[2]) / d; }
        else { facing(g, t, px, py, pz); nx = FN[0]; ny = FN[1]; nz = FN[2]; }
        if (wheel && Math.abs(ny) > 0.7) continue;                                /* the ground is the suspension's: in either direction (a landing can press the ride-height sphere below the floor, and a sphere whose last place was under it would be pulled down into it) */
        const c = C.n++;
        C.rx[c] = x - P[0]; C.ry[c] = y - P[1]; C.rz[c] = z - P[2]; C.nx[c] = nx; C.ny[c] = ny; C.nz[c] = nz; C.depth[c] = depth; C.jn[c] = 0; C.fx[c] = C.fy[c] = C.fz[c] = 0;
      } else if (!wheel && sl > rad * 0.5) {                                          /* (a wheel at ride height is not swept: the ground is not its to catch) */
        /* a corner that went through a sheet between two substeps */
        const s = rayTri(g, t, px, py, pz, sx / sl, sy / sl, sz / sl, sl);
        if (s >= 0 && !(g.off !== null && g.tag[t] !== 0 && world.gate(car, g.tag[t]))) {          /* (a gate that gives way is no sheet to be caught on, however fast the corner crossed it) */
          facing(g, t, px, py, pz);
          const c = C.n++;
          C.rx[c] = x - P[0]; C.ry[c] = y - P[1]; C.rz[c] = z - P[2]; C.nx[c] = FN[0]; C.ny[c] = FN[1]; C.nz[c] = FN[2];
          C.depth[c] = Math.max(0, (sl - s) * Math.abs(sx / sl * FN[0] + sy / sl * FN[1] + sz / sl * FN[2])) + rad; C.jn[c] = 0; C.fx[c] = C.fy[c] = C.fz[c] = 0;
        }
      }
    }
    pp[k * 3] = x; pp[k * 3 + 1] = y; pp[k * 3 + 2] = z;
  }
  if (!C.n) return 0;
  const v = car.v, w = car.w, m = sp.mass; let hardest = 0;
  for (let it = 0; it < 4; it++) {
    for (let c = 0; c < C.n; c++) {
      const rx = C.rx[c], ry = C.ry[c], rz = C.rz[c], nx = C.nx[c], ny = C.ny[c], nz = C.nz[c];
      let vx = v[0] + w[1] * rz - w[2] * ry, vy = v[1] + w[2] * rx - w[0] * rz, vz = v[2] + w[0] * ry - w[1] * rx;
      const vn = vx * nx + vy * ny + vz * nz;
      if (vn < 0) {
        const e = it === 0 && vn < -BODY.restSpeed ? BODY.restitution : 0, jn = -(1 + e) * vn / effMass(car, rx, ry, rz, nx, ny, nz);
        impulseAt(car, rx, ry, rz, jn * nx, jn * ny, jn * nz); C.jn[c] += jn;
        if (jn / m > hardest) hardest = jn / m;
      }
      /* friction: the impulse that would stop the sliding, added to what this contact has already given and held to mu times its normal impulse -- the total, not each time round */
      vx = v[0] + w[1] * rz - w[2] * ry; vy = v[1] + w[2] * rx - w[0] * rz; vz = v[2] + w[0] * ry - w[1] * rx;
      const vn2 = vx * nx + vy * ny + vz * nz, tx = vx - vn2 * nx, ty = vy - vn2 * ny, tz = vz - vn2 * nz, tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-6 && C.jn[c] > 0) {
        const ux = tx / tl, uy = ty / tl, uz = tz / tl, jt = tl / effMass(car, rx, ry, rz, ux, uy, uz);
        let ax = C.fx[c] - jt * ux, ay = C.fy[c] - jt * uy, az = C.fz[c] - jt * uz;
        const al = Math.hypot(ax, ay, az), lim = BODY.mu * C.jn[c];
        if (al > lim) { ax *= lim / al; ay *= lim / al; az *= lim / al; }
        impulseAt(car, rx, ry, rz, ax - C.fx[c], ay - C.fy[c], az - C.fz[c]);
        C.fx[c] = ax; C.fy[c] = ay; C.fz[c] = az;
      }
    }
  }
  /* out of the surface by the deepest, along each normal, never the sum */
  let cx = 0, cy = 0, cz = 0;
  for (let c = 0; c < C.n; c++) {
    const need = C.depth[c] - BODY.slop - (cx * C.nx[c] + cy * C.ny[c] + cz * C.nz[c]);
    if (need > 0) { cx += C.nx[c] * need; cy += C.ny[c] * need; cz += C.nz[c] * need; }
  }
  P[0] += cx * BODY.correct; P[1] += cy * BODY.correct; P[2] += cz * BODY.correct;
  car.contacts = C.n;
  return hardest;
}
