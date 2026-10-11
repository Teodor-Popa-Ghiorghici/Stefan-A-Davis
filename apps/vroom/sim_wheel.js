/* A CAR'S FOUR WHEELS: a ray down from each, a spring and a damper, and a tyre at the end of it (docs/vroom/plan.md section 6). Per substep, for each wheel:
     the ray (the suspension's rest length and the wheel's radius) against the track; compression is how much of it is used; the spring and damper make the weight on the wheel, N
     the point on the road moves at the car's velocity there (less the belt, on a conveyor); in the wheel's own frame that is v_forward and v_side
     forward: the engine (a thrust that falls to nothing at the car's top speed, split between the driven wheels), the brake (never more than stops the wheel in this step), a little rolling resistance
     side: -mu N tanh(k v_side / (|v_forward| + v0)), a slip angle that saturates, never more than stops the sliding in this step
     the two together can ask for no more than mu * N (a friction circle, the sideways limit scaled by the car's own grip): push the engine past it and the side force shrinks too, which is a slide.
   The forces are added to the car's force and torque (car.F, car.T); the body integrates them (sim_body.js). Pure: no window, no clock. */
import { ray, HIT } from './col_grid.js';
import { SURF_BY_ID, surfaceGrip, LAT_K, LAT_V0, ROLL_RES, ROLL_SMOOTH, BELT_CARRY, SPILL_GRIP, TRACTION } from './tune.js';

const tanh = x => { if (x > 8) return 1; if (x < -8) return -1; const e = Math.exp(2 * x); return (e - 1) / (e + 1); };

/* returns how many wheels touch the ground */
export function wheelForces(world, car, h) {
  const R = car.R, sp = car.spec, p = car.p, v = car.v, om = car.w, g = world.col, inp = car.input;
  const fwx = R[2], fwy = R[5], fwz = R[8];                                      /* the car's forward axis */
  const vFwd = v[0] * fwx + v[1] * fwy + v[2] * fwz;
  const turbo = car.tTurbo > 0 ? 1.1 : 1, powered = car.tPower > 0 || car.tStun > 0 ? 0 : 1;
  const throttle = inp.throttle * powered, brake = inp.brake;
  const reversing = brake > 0 && throttle === 0 && vFwd < 0.4;
  const vt = sp.vtop * turbo, f1 = vFwd / vt;
  let thrust = 0;
  if (reversing) { const rv = vFwd / (-0.4 * sp.vtop); thrust = -sp.fmax * sp.reverse * brake * (vFwd < 0 ? Math.max(0, 1 - rv * rv) : 1) * powered; }
  else if (throttle > 0) thrust = sp.fmax * (turbo > 1 ? 1.2 : 1) * throttle * Math.max(0, 1 - f1 * f1);
  const mEff = sp.mass / 4, spill = car.tSpill, parts = car.parts;
  let touching = 0;
  for (let i = 0; i < sp.wheels.length; i++) {
    const W = sp.wheels[i], S = car.wheels[i];
    const mx = p[0] + R[0] * W.x + R[1] * W.y + R[2] * W.z, my = p[1] + R[3] * W.x + R[4] * W.y + R[5] * W.z, mz = p[2] + R[6] * W.x + R[7] * W.y + R[8] * W.z;
    const dx = -R[1], dy = -R[4], dz = -R[7], len = W.rest + W.r;
    const t = ray(g, mx, my, mz, dx, dy, dz, len);
    if (t < 0) { S.ground = false; S.N = 0; S.prevX = 0; S.comp = 0; S.spin += (S.vf / W.r) * h; continue; }
    const tri = HIT.tri;
    let nx = g.nrm[tri * 3], ny = g.nrm[tri * 3 + 1], nz = g.nrm[tri * 3 + 2];
    if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }      /* face the car */
    if (-(nx * dx + ny * dy + nz * dz) < 0.3) { S.ground = false; S.N = 0; S.prevX = 0; S.comp = 0; continue; }   /* a steep wall: the body probes deal with it */
    let x = len - t; if (x > W.travel + W.rest) x = W.travel + W.rest;
    const xd = (x - S.prevX) / h; S.prevX = x;
    let N = W.k * x + W.c * xd;
    const over = x - W.travel; if (over > 0) N += 6000 * over;                  /* the stop at the end of the travel */
    if (N < 0) N = 0;
    S.ground = true; S.N = N; S.comp = x; S.tri = tri; S.surf = g.surf[tri]; touching++;
    const cx = mx + dx * t, cy = my + dy * t, cz = mz + dz * t, rx = cx - p[0], ry = cy - p[1], rz = cz - p[2];
    let vx = v[0] + om[1] * rz - om[2] * ry, vy = v[1] + om[2] * rx - om[0] * rz, vz = v[2] + om[0] * ry - om[1] * rx;
    const SF = SURF_BY_ID[S.surf] || SURF_BY_ID[0];
    let carryX = 0, carryZ = 0;
    if (SF.belt && g.belt) {
      const bx = g.belt[tri * 2], bz = g.belt[tri * 2 + 1], bl = Math.hypot(bx, bz);
      /* a belt carries what is slower than itself up to its own speed, along its own direction (a car at rest is moved off at BELT_CARRY g; one already going faster than the belt is not touched: its wheels just roll) */
      if (bl > 1e-6) { const along = (vx * bx + vz * bz) / bl, k = Math.max(0, Math.min(1.5, (bl - along) / bl)) * BELT_CARRY * N; carryX = bx / bl * k; carryZ = bz / bl * k; }
      vx -= bx; vz -= bz;
    }
    /* the wheel's forward and side on the road */
    const sa = Math.sin(car.steer * W.steer), ca = Math.cos(car.steer * W.steer);
    let ax = R[0] * sa + R[2] * ca, ay = R[3] * sa + R[5] * ca, az = R[6] * sa + R[8] * ca;
    const dn = ax * nx + ay * ny + az * nz; ax -= nx * dn; ay -= ny * dn; az -= nz * dn;
    const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
    const sx = ny * az - nz * ay, sy = nz * ax - nx * az, sz = nx * ay - ny * ax;
    const vf = vx * ax + vy * ay + vz * az, vs = vx * sx + vy * sy + vz * sz;
    S.vf = vf; S.vs = vs;
    let mu = surfaceGrip(SF, parts, spill > 0 || S.spill > 0 ? 1 : 0);
    if (sp.iceMu && SF.chains) mu = Math.max(mu, sp.iceMu * (spill > 0 || S.spill > 0 ? SPILL_GRIP : 1));        /* a sled's runners bite ice a little without chains */
    mu *= car.grip * sp.gripLong;
    const limit = mu * N;
    /* forward */
    let Fl = thrust * W.drive;
    const tcap = TRACTION * limit; if (Fl > tcap) Fl = tcap; else if (Fl < -tcap) Fl = -tcap;                    /* the motor controller: never more thrust than the tyre can hold */
    if (brake > 0 && !reversing) { const bw = sp.brakeF * brake * W.brake; Fl += -Math.max(-bw, Math.min(bw, vf * mEff / h)); }
    Fl += -ROLL_RES * N * tanh(vf / ROLL_SMOOTH) - SF.drag * vf + carryX * ax + carryZ * az;
    /* sideways */
    const lat = sp.gripLat / sp.gripLong * (W.front ? 1 : sp.latBias);
    let Fs = -limit * lat * tanh(LAT_K * vs / (Math.abs(vf) + LAT_V0)) + carryX * sx + carryZ * sz;
    const cap = mEff * Math.abs(vs) / h; if (Math.abs(Fs) > cap) Fs = Fs < 0 ? -cap : cap;
    const ll = limit, ls = limit * lat;
    const q = (ll > 1e-9 ? (Fl / ll) * (Fl / ll) : 0) + (ls > 1e-9 ? (Fs / ls) * (Fs / ls) : 0);
    let sat = 1; if (q > 1) { sat = 1 / Math.sqrt(q); Fl *= sat; Fs *= sat; }
    S.slide = sat < 1 ? 1 - sat : 0;
    S.spin += ((vf + (S.slide > 0 && W.drive > 0 && throttle > 0 ? throttle * 4 * S.slide : 0)) / W.r) * h;
    const fx = ax * Fl + sx * Fs + nx * N, fy = ay * Fl + sy * Fs + ny * N, fz = az * Fl + sz * Fs + nz * N;
    car.F[0] += fx; car.F[1] += fy; car.F[2] += fz;
    car.T[0] += ry * fz - rz * fy; car.T[1] += rz * fx - rx * fz; car.T[2] += rx * fy - ry * fx;
  }
  return touching;
}
