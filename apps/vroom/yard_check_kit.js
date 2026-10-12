/* THE STUNT YARD'S DEV KIT (dev-only, not packaged): a way to drive a car the way a patient person would, from a standstill, along a line of waypoints, so that a check can say which cars reach which star. A recipe
   is { way: [[x, z], ...], secs, from? } and the car starts on the first waypoint facing the second, full throttle all the way, steering for a point `LOOK` metres ahead on the line. Nothing here is the game's: a person
   drives better, and worse. `runRecipe` returns the ids of the stars the car passed through (by the same rule the race uses, race.js) and how it went. */
import { createWorld } from './sim.js';
import { specOf, CARS } from './cars.js';
import { CATCH } from './track_yard.js';

const LOOK = 3.0;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/* the point `LOOK` metres further along the waypoints than the one nearest the car, from segment k on */
function aim(way, k, x, z) {
  let best = k, bd = 1e9;
  for (let i = k; i < Math.min(way.length - 1, k + 6); i++) {
    const a = way[i], b = way[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
    if (d < bd - 1e-6) { bd = d; best = i; }
  }
  let i = best, a = way[i], b = way[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), rem = LOOK, px = a[0] + dx * t, pz = a[1] + dz * t;
  for (;;) {
    const ex = b[0] - px, ez = b[1] - pz, d = Math.hypot(ex, ez);
    if (d >= rem || i + 2 >= way.length) { const f = d > 0 ? Math.min(1, rem / d) : 0; return { x: px + ex * f, z: pz + ez * f, k: best }; }
    rem -= d; px = b[0]; pz = b[1]; i++; a = way[i]; b = way[i + 1];
  }
}

export function runRecipe(T, carId, rec, o) {
  o = o || {};
  const w = createWorld({ col: T.col, nodes: T.nodes }), spec = specOf(carId, CARS[carId].rating, o.kit), way = rec.way, y0 = rec.y0 || 0;
  const yaw0 = Math.atan2(way[1][0] - way[0][0], way[1][1] - way[0][1]);
  const car = w.addCar(spec, { x: way[0][0], y: y0, z: way[0][1], yaw: yaw0 }, { id: 0, parts: o.parts || {} });
  const got = new Set(), steps = Math.round((rec.secs || 12) * 60), trace = [];
  let k = 0, flips = 0, topY = 0, vMax = 0;
  for (let i = 0; i < steps; i++) {
    const a = aim(way, k, car.p[0], car.p[2]); k = a.k;
    const yaw = Math.atan2(car.R[2], car.R[8]), e = wrap(Math.atan2(a.x - car.p[0], a.z - car.p[2]) - yaw);
    car.input = { throttle: rec.cap && Math.hypot(car.v[0], car.v[2]) > rec.cap ? 0 : 1, brake: 0, steer: Math.max(-1, Math.min(1, e * 1.8)), repo: false };
    w.step();
    for (const ev of w.events) if (ev.type === 'flip') flips++;
    for (const st of T.stars) {
      if (got.has(st.id)) continue;
      const dx = car.p[0] - st.x, dz = car.p[2] - st.z;
      if (dx * dx + dz * dz < (st.r2 || 0.2) && Math.abs(car.p[1] - st.y) < (st.dy || CATCH.dy)) got.add(st.id);
    }
    topY = Math.max(topY, car.p[1]); vMax = Math.max(vMax, Math.hypot(car.v[0], car.v[2]));
    if (o.trace && i % o.trace === 0) trace.push([car.p[0], car.p[1], car.p[2], Math.hypot(car.v[0], car.v[2])]);
  }
  return { got, flips, topY, vMax, end: [car.p[0], car.p[1], car.p[2]], trace };
}
