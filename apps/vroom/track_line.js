/* THE LINE A CPU DRIVES (docs/vroom/plan.md section 4): worked out from the track's own data, not drawn by hand. Start with the centreline and let it relax toward the shortest path that stays inside the
   road (every point is pulled to the middle of its neighbours and kept `margin` off the walls), which is what a racing line is: it cuts the inside of every bend and is wide at the entry and the exit.
   From that line comes the curvature, and from the curvature the speed a car can carry at each place: the corner speed the tyres allow, then a backward pass so the brakes are on in time. Pure.
     const L = racingLine(track);   L.x[i], L.z[i], L.off[i] (metres to the left of the centreline), L.k[i] (1 / radius, positive turning right), L.length
     const plan = speedPlan(L, spec, { grip, brake }) -> plan.v[i] the speed to be doing at sample i */
import { GRAVITY } from './tune.js';

const cache = new WeakMap();
export function racingLine(track) {
  if (cache.has(track)) return cache.get(track);
  const S = track.line.samples, n = S.length, LIM = track.limits;
  const off = new Float64Array(n), px = new Float64Array(n), pz = new Float64Array(n);
  for (let i = 0; i < n; i++) { px[i] = S[i].x; pz[i] = S[i].z; }
  /* a straight run of the road must not be cut across: a wall of 'none' is not special here, only the width is */
  for (let it = 0; it < 400; it++) {
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n, mx = (px[a] + px[b]) / 2, mz = (pz[a] + pz[b]) / 2;
      let o = (mx - S[i].x) * S[i].nx + (mz - S[i].z) * S[i].nz;
      if (o > LIM.hi[i]) o = LIM.hi[i]; else if (o < LIM.lo[i]) o = LIM.lo[i];
      off[i] = off[i] * 0.5 + o * 0.5;
      px[i] = S[i].x + S[i].nx * off[i]; pz[i] = S[i].z + S[i].nz * off[i];
    }
  }
  /* the curvature of that line over a few samples, signed like spline.js (positive turns right) */
  const k = new Float64Array(n), W = 3;
  for (let i = 0; i < n; i++) {
    const a = (i + n - W) % n, b = (i + W) % n, ax = px[i] - px[a], az = pz[i] - pz[a], bx = px[b] - px[i], bz = pz[b] - pz[i];
    const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1, cr = (ax * bz - az * bx) / (la * lb), dt = ax * bx + az * bz;
    k[i] = -Math.atan2(cr * la * lb, dt) / ((la + lb) / 2);
  }
  /* a little smoothing so one noisy sample does not set a corner speed */
  const ks = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = -2; j <= 2; j++) s += k[(i + j + n) % n]; ks[i] = s / 5; }
  const L = { x: px, z: pz, off, k: ks, n, length: track.length, step: track.line.step, S };
  /* where along the line is a point: the sample nearest, searched near a hint */
  L.nearest = (x, z, near, win) => track.line.nearest(x, z, near, win);
  cache.set(track, L);
  return L;
}

/* speeds for a car: the corner speed at each sample (sqrt(grip * g / curvature), never above the top speed), then a pass backward so that a car braking at `brake` m/s^2 gets down to it in time.
   `grip` is the share of what the tyres really give in a bend (spec.aLat) that a driver is willing to use, `brake` the deceleration they plan on. */
export function speedPlan(L, spec, o) {
  o = o || {};
  const n = L.n, ds = L.step, aLat = (o.grip == null ? 0.85 : o.grip) * (spec.aLat || 0.72 * GRAVITY), brake = o.brake == null ? 9 : o.brake, vt = Math.min(spec.vtop, o.vmax || 1e9);
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) { const kk = Math.abs(L.k[i]); v[i] = Math.min(vt, kk > 1e-4 ? Math.sqrt(aLat / kk) : vt, o.cap ? o.cap[i] : 1e9); }
  for (let pass = 0; pass < 2; pass++) for (let i = n * 2 - 1; i >= 0; i--) { const a = i % n, b = (i + 1) % n, lim = Math.sqrt(v[b] * v[b] + 2 * brake * ds); if (v[a] > lim) v[a] = lim; }
  return { v, n, ds };
}
