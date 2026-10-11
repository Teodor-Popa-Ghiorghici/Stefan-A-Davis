/* CAR AGAINST CAR: each car is three spheres down its length (sim_spec.js), and two cars that touch trade an impulse that is weighted by their masses and carries a restitution of about 0.3 and a little
   friction: a heavy car shoves a light one, which is half of Re-Volt's chaos (docs/vroom/plan.md section 6). A car that has just been put back on the road is a ghost and is passed through. Pure. */
import { impulseAt } from './sim_body.js';
import { CARS } from './tune.js';

/* the world positions of a car's three spheres into car.sw */
export function sphereWorld(car) {
  const R = car.R, P = car.p, sp = car.spec.spheres;
  for (let i = 0; i < 3; i++) {
    const s = sp[i];
    car.sw[i * 3] = P[0] + R[0] * s[0] + R[1] * s[1] + R[2] * s[2]; car.sw[i * 3 + 1] = P[1] + R[3] * s[0] + R[4] * s[1] + R[5] * s[2]; car.sw[i * 3 + 2] = P[2] + R[6] * s[0] + R[7] * s[1] + R[8] * s[2];
  }
}
/* 1/m + n . ((I^-1 (r x n)) x r) for a car, the same as the body's */
function inv(car, rx, ry, rz, nx, ny, nz) {
  const R = car.R, iv = car.spec.invI, cx = ry * nz - rz * ny, cy = rz * nx - rx * nz, cz = rx * ny - ry * nx;
  const bx = (R[0] * cx + R[3] * cy + R[6] * cz) * iv[0], by = (R[1] * cx + R[4] * cy + R[7] * cz) * iv[1], bz = (R[2] * cx + R[5] * cy + R[8] * cz) * iv[2];
  const ax = R[0] * bx + R[1] * by + R[2] * bz, ay = R[3] * bx + R[4] * by + R[5] * bz, az = R[6] * bx + R[7] * by + R[8] * bz;
  return 1 / car.spec.mass + nx * (ay * rz - az * ry) + ny * (az * rx - ax * rz) + nz * (ax * ry - ay * rx);
}

export function carCollisions(world, events) {
  const cars = world.cars, n = cars.length;
  for (let i = 0; i < n; i++) sphereWorld(cars[i]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = cars[i], b = cars[j];
    if (a.ghost > 0 || b.ghost > 0) continue;
    const dx = a.p[0] - b.p[0], dy = a.p[1] - b.p[1], dz = a.p[2] - b.p[2], reach = (a.spec.L + b.spec.L) * 0.5 + 0.1;
    if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
    for (let s = 0; s < 3; s++) for (let t = 0; t < 3; t++) {
      const ra = a.spec.spheres[s][3], rb = b.spec.spheres[t][3];
      const px = a.sw[s * 3], py = a.sw[s * 3 + 1], pz = a.sw[s * 3 + 2], qx = b.sw[t * 3], qy = b.sw[t * 3 + 1], qz = b.sw[t * 3 + 2];
      let nx = px - qx, ny = py - qy, nz = pz - qz; const d2 = nx * nx + ny * ny + nz * nz, rr = ra + rb;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2);
      if (d > 1e-9) { nx /= d; ny /= d; nz /= d; } else { nx = 0; ny = 1; nz = 0; }
      const depth = rr - d, cx = qx + nx * (rb - depth * 0.5), cy = qy + ny * (rb - depth * 0.5), cz = qz + nz * (rb - depth * 0.5);
      const arx = cx - a.p[0], ary = cy - a.p[1], arz = cz - a.p[2], brx = cx - b.p[0], bry = cy - b.p[1], brz = cz - b.p[2];
      let vx = a.v[0] + a.w[1] * arz - a.w[2] * ary - (b.v[0] + b.w[1] * brz - b.w[2] * bry), vy = a.v[1] + a.w[2] * arx - a.w[0] * arz - (b.v[1] + b.w[2] * brx - b.w[0] * brz), vz = a.v[2] + a.w[0] * ary - a.w[1] * arx - (b.v[2] + b.w[0] * bry - b.w[1] * brx);
      const vn = vx * nx + vy * ny + vz * nz;
      if (vn < 0) {
        const e = vn < -0.5 ? CARS.restitution : 0, jn = -(1 + e) * vn / (inv(a, arx, ary, arz, nx, ny, nz) + inv(b, brx, bry, brz, nx, ny, nz));
        impulseAt(a, arx, ary, arz, jn * nx, jn * ny, jn * nz); impulseAt(b, brx, bry, brz, -jn * nx, -jn * ny, -jn * nz);
        vx = a.v[0] + a.w[1] * arz - a.w[2] * ary - (b.v[0] + b.w[1] * brz - b.w[2] * bry); vy = a.v[1] + a.w[2] * arx - a.w[0] * arz - (b.v[1] + b.w[2] * brx - b.w[0] * brz); vz = a.v[2] + a.w[0] * ary - a.w[1] * arx - (b.v[2] + b.w[0] * bry - b.w[1] * brx);
        const vn2 = vx * nx + vy * ny + vz * nz, tx = vx - vn2 * nx, ty = vy - vn2 * ny, tz = vz - vn2 * nz, tl = Math.hypot(tx, ty, tz);
        if (tl > 1e-6) {
          let jt = tl / (inv(a, arx, ary, arz, tx / tl, ty / tl, tz / tl) + inv(b, brx, bry, brz, tx / tl, ty / tl, tz / tl)); const lim = CARS.mu * jn; if (jt > lim) jt = lim;
          impulseAt(a, arx, ary, arz, -jt * tx / tl, -jt * ty / tl, -jt * tz / tl); impulseAt(b, brx, bry, brz, jt * tx / tl, jt * ty / tl, jt * tz / tl);
        }
        const ma = a.spec.mass, mb = b.spec.mass, sp = -vn;
        if (sp > 0.35 && events && a.hitCool[b.id] !== world.frame && b.hitCool[a.id] !== world.frame) {
          a.hitCool[b.id] = world.frame; b.hitCool[a.id] = world.frame;
          events.push({ type: 'hit-car', a: a.id, b: b.id, speed: sp, ma, mb, dva: jn / ma, dvb: jn / mb });
        }
      }
      const corr = Math.max(0, depth - 0.001) * 0.8, ia = 1 / a.spec.mass, ib = 1 / b.spec.mass, k = 1 / (ia + ib);
      a.p[0] += nx * corr * ib * k; a.p[1] += ny * corr * ib * k; a.p[2] += nz * corr * ib * k;
      b.p[0] -= nx * corr * ia * k; b.p[1] -= ny * corr * ia * k; b.p[2] -= nz * corr * ia * k;
    }
  }
}
