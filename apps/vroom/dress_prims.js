/* THE SHAPES THE DRESSING IS MADE OF (docs/vroom/plan.md sections 9 and 15), on top of raster_mesh.js's box, cylinder and gable. `local(b, x, y, z, yaw, s)` is a builder that draws what it is told in the frame of a
   thing standing at (x, y, z), turned `yaw` about the vertical and `s` times as big, so a prop is written once, round the origin, facing +z, and set down anywhere by one call; every shape here (and box, cylinder, gable)
   takes such a builder as readily as the real one. Everything is a handful of triangles: a toy town seen at 320 x 180 wants chunky shapes, not smooth ones. Pure. */
import { box as boxMesh, cylinder, gable } from './raster_mesh.js';

export function local(b, ox, oy, oz, yaw, s) { const c = Math.cos(yaw || 0), n = Math.sin(yaw || 0), k = s == null ? 1 : s;
  const P = p => [ox + (p[0] * c + p[2] * n) * k, oy + p[1] * k, oz + (-p[0] * n + p[2] * c) * k], N = v => (v ? [v[0] * c + v[2] * n, v[1], -v[0] * n + v[2] * c] : v); const L = { use(m) { b.use(m); return L; },
    quad(a, bb, cc, d, nr, uv) { b.quad(P(a), P(bb), P(cc), P(d), N(nr), uv); return L; },
    tri(a, bb, cc, nr, ua, ub, uc) { b.tri(P(a), P(bb), P(cc), N(nr), ua, ub, uc); return L; },
    triSmooth(a, bb, cc, na, nb, nc, ua, ub, uc) { b.triSmooth(P(a), P(bb), P(cc), N(na), N(nb), N(nc), ua, ub, uc); return L; } }; return L; } const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const area2 = (a, b, c) => { const x = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]); return x[0] * x[0] + x[1] * x[1] + x[2] * x[2]; };
const smooth = (b, a, bb, c, na, nb, nc, ua, ub, uc) => { if (area2(a, bb, c) > 1e-10) b.triSmooth(a, bb, c, na, nb, nc, ua, ub, uc); };

/* a body of revolution about the vertical through (cx, y0, cz): the profile is [[radius, height], ...] from the bottom up (a bottle, a can, a hydrant, a lamp, a vase, a cap). A radius of 0 at an end closes it. */
export function lathe(b, cx, y0, cz, prof, seg, m, k) { seg = Math.max(3, seg || 8); k = k || 1; b.use(m); for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1); for (let j = 0; j + 1 < prof.length; j++) {
      const [r0, h0] = prof[j], [r1, h1] = prof[j + 1], dr = r1 - r0, dh = h1 - h0, n0 = nrm([c0 * dh, -dr, s0 * dh]), n1 = nrm([c1 * dh, -dr, s1 * dh]);
      const p0 = [cx + c0 * r0, y0 + h0, cz + s0 * r0], p1 = [cx + c1 * r0, y0 + h0, cz + s1 * r0], q0 = [cx + c0 * r1, y0 + h1, cz + s0 * r1], q1 = [cx + c1 * r1, y0 + h1, cz + s1 * r1];
      const u0 = i / seg * Math.max(r0, 0.02) * 6.28 / k, u1 = (i + 1) / seg * Math.max(r0, 0.02) * 6.28 / k, v0 = h0 / k, v1 = h1 / k;
      smooth(b, p0, p1, q1, n0, n1, n1, [u0, v0], [u1, v0], [u1, v1]); smooth(b, p0, q1, q0, n0, n1, n0, [u0, v0], [u1, v1], [u0, v1]); } } return b; }
/* a ball, or an egg: rx, ry, rz the radii, `seg` slices round it */
export function ellip(b, cx, cy, cz, rx, ry, rz, seg, m, k) { seg = Math.max(4, seg || 8); const st = Math.max(2, seg >> 1); k = k || 1; b.use(m);
  const at = (i, j) => { const th = i / seg * Math.PI * 2, ph = j / st * Math.PI, s = Math.sin(ph); return { p: [cx + Math.cos(th) * s * rx, cy + Math.cos(ph) * ry, cz + Math.sin(th) * s * rz], n: nrm([Math.cos(th) * s / (rx || 1), Math.cos(ph) / (ry || 1), Math.sin(th) * s / (rz || 1)]), u: i / seg * 2 / k * (rx + rz), v: j / st * 2 * ry / k }; };
  for (let j = 0; j < st; j++) for (let i = 0; i < seg; i++) { const a = at(i, j), bq = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    smooth(b, a.p, bq.p, c.p, a.n, bq.n, c.n, [a.u, a.v], [bq.u, bq.v], [c.u, c.v]); smooth(b, a.p, c.p, d.p, a.n, c.n, d.n, [a.u, a.v], [c.u, c.v], [d.u, d.v]); } return b; }
export const sphere = (b, cx, cy, cz, r, seg, m, k) => ellip(b, cx, cy, cz, r, r, r, seg, m, k);
/* a ring (a tyre, a lifebuoy, a hoop): R from the centre to the middle of the tube, r the tube; flat on the ground by default, or standing with its hole along x ('x') or z ('z') */
export function torus(b, cx, cy, cz, R, r, seg, seg2, m, axis) { seg = seg || 10; seg2 = seg2 || 6; b.use(m);
  const at = (i, j) => { const th = i / seg * Math.PI * 2, ph = j / seg2 * Math.PI * 2, rr = R + Math.cos(ph) * r, q = [Math.cos(th) * rr, Math.sin(ph) * r, Math.sin(th) * rr], nn = nrm([Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)]);
    const f = v => (axis === 'x' ? [v[1], v[0], v[2]] : axis === 'z' ? [v[0], v[2], v[1]] : v); const o = f(q); return { p: [cx + o[0], cy + o[1], cz + o[2]], n: f(nn), u: i / seg * 4, v: j / seg2 }; };
  for (let i = 0; i < seg; i++) for (let j = 0; j < seg2; j++) { const a = at(i, j), bq = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    smooth(b, a.p, bq.p, c.p, a.n, bq.n, c.n, [a.u, a.v], [bq.u, bq.v], [c.u, c.v]); smooth(b, a.p, c.p, d.p, a.n, c.n, d.n, [a.u, a.v], [c.u, c.v], [d.u, d.v]); } return b; }
/* a rod between two points: a pipe, a strut, a rail, a cable, a ladder's side */
export function pole(b, p0, p1, r, seg, m, k) { const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], len = Math.hypot(d[0], d[1], d[2]); if (len < 1e-6) return b; seg = seg || 5; k = k || 1; b.use(m);
  const f = [d[0] / len, d[1] / len, d[2] / len], u = nrm(Math.abs(f[1]) < 0.9 ? cross([0, 1, 0], f) : cross([1, 0, 0], f)), v = cross(f, u); for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, n0 = [u[0] * Math.cos(a0) + v[0] * Math.sin(a0), u[1] * Math.cos(a0) + v[1] * Math.sin(a0), u[2] * Math.cos(a0) + v[2] * Math.sin(a0)], n1 = [u[0] * Math.cos(a1) + v[0] * Math.sin(a1), u[1] * Math.cos(a1) + v[1] * Math.sin(a1), u[2] * Math.cos(a1) + v[2] * Math.sin(a1)];
    const at = (p, n) => [p[0] + n[0] * r, p[1] + n[1] * r, p[2] + n[2] * r]; const A = at(p0, n0), B = at(p0, n1), C = at(p1, n1), D = at(p1, n0), uu0 = i / seg * r * 6.28 / k, uu1 = (i + 1) / seg * r * 6.28 / k, vv = len / k;
    b.triSmooth(A, B, C, n0, n1, n1, [uu0, 0], [uu1, 0], [uu1, vv]); b.triSmooth(A, C, D, n0, n1, n0, [uu0, 0], [uu1, vv], [uu0, vv]); } return b; }
/* a cable hung between two points with a sag (metres at the middle) in `n` rods; `bulb` (a material, usually lit) puts a little lamp at every joint: a string of lights */
export function cable(b, p0, p1, sag, n, r, m, bulb) { n = n || 8; let prev = p0; for (let i = 1; i <= n; i++) { const t = i / n, q = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - sag * 4 * t * (1 - t), p0[2] + (p1[2] - p0[2]) * t];
    pole(b, prev, q, r, 3, m); if (bulb && i < n) box(b, q[0], q[1] - 0.07, q[2], 0.07, 0.09, 0.07, bulb); prev = q; } return b; }
/* a ramp: a wedge rising along +z from nothing at the front to h at the back, w wide and d deep, on the ground at y0 */
export function wedge(b, cx, y0, cz, w, h, d, m, k) { k = k || 1; const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, sl = nrm([0, d, -h]); b.use(m);
  b.quad([x0, y0, z0], [x1, y0, z0], [x1, y0 + h, z1], [x0, y0 + h, z1], sl, [[0, 0], [w / k, 0], [w / k, Math.hypot(d, h) / k], [0, Math.hypot(d, h) / k]]);
  b.quad([x0, y0, z1], [x1, y0, z1], [x1, y0 + h, z1], [x0, y0 + h, z1], [0, 0, 1], [[0, 0], [w / k, 0], [w / k, h / k], [0, h / k]]); b.tri([x0, y0, z0], [x0, y0, z1], [x0, y0 + h, z1], [-1, 0, 0], [0, 0], [d / k, 0], [d / k, h / k]);
  b.tri([x1, y0, z1], [x1, y0, z0], [x1, y0 + h, z1], [1, 0, 0], [0, 0], [d / k, 0], [d / k, h / k]); return b; }
/* a vertical sheet w wide and h tall, its bottom middle at (x, y, z), facing +z (and -z too if the material is double-sided): a sign, a window, a poster, a leaf */
export function sheetV(b, x, y, z, w, h, m, uv) { b.use(m).quad([x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z], [0, 0, 1], uv || [[0, 1], [1, 1], [1, 0], [0, 0]]); return b; }
/* an arch: a half ellipse of rods, span wide and rise high, standing on the ground at (cx, y0, cz) in the plane of x (so it spans a road that runs along z), t thick */
export function arch(b, cx, y0, cz, span, rise, t, seg, m) { let prev = null; for (let i = 0; i <= seg; i++) { const a = Math.PI * i / seg, p = [cx + Math.cos(a) * span / 2, y0 + Math.sin(a) * rise, cz]; if (prev) pole(b, prev, p, t, 4, m); prev = p; }
  return b; }
/* a run of vertical bars between two points (a fence, a railing, a cage): `gap` apart, h tall, with a top rail and a foot rail */
export function bars(b, p0, p1, h, gap, r, m) { const len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), n = Math.max(1, Math.round(len / gap));
  for (let i = 0; i <= n; i++) { const t = i / n, x = p0[0] + (p1[0] - p0[0]) * t, z = p0[2] + (p1[2] - p0[2]) * t; pole(b, [x, p0[1], z], [x, p0[1] + h, z], r, 3, m); }
  pole(b, [p0[0], p0[1] + h, p0[2]], [p1[0], p1[1] + h, p1[2]], r * 1.2, 3, m); pole(b, [p0[0], p0[1] + h * 0.4, p0[2]], [p1[0], p1[1] + h * 0.4, p1[2]], r, 3, m); return b; }
/* a box; one that stands on the ground (its foot at 0 or below) is never seen from underneath, so it has no bottom: a sixth of a prop's triangles and nobody to miss them */
export const box = (b, cx, cy, cz, sx, sy, sz, m, k) => boxMesh(b, cx, cy, cz, sx, sy, sz, cy - sy / 2 < 0.05 && m.tex ? { top: m, side: m, bottom: null } : m, k); export { cylinder, gable };
