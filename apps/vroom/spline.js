/* THE CENTRELINE OF A TRACK: a closed Catmull-Rom curve through the control points the track is authored with (docs/vroom/plan.md section 4: tracks are data that build their own mesh), cut into samples a
   fixed distance apart so everything that follows -- the road, the walls, the line a CPU follows, the checkpoints, a car's place in the race -- speaks in metres along the line (`s`).
   A sample is { s, x, y, z, tx, tz, nx, nz, yaw, k } : its place, the unit tangent, the unit normal to the LEFT of the way the line runs (so the road's left edge is the point plus the normal times half the
   width), the heading (yaw, as in raster_math: 0 looks along +z), and the curvature (1 / the radius, positive turning right). Pure. */
export const STEP = 1;                             /* metres between samples */

/* control points: [{ x, y, z, ... }] in order, closed (the last joins the first). Returns { samples, length, at(s), nearest(x, z, near) }. */
export function loop(pts, step) {
  const n = pts.length, h = step || STEP;
  const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const P = i => pts[((i % n) + n) % n];
  /* a fine polyline first, with the cumulative length, then it is resampled at equal distances */
  const fine = [], SUB = 40;
  for (let i = 0; i < n; i++) for (let k = 0; k < SUB; k++) {
    const t = k / SUB, a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    fine.push({ x: cr(a.x, b.x, c.x, d.x, t), y: cr(a.y || 0, b.y || 0, c.y || 0, d.y || 0, t), z: cr(a.z, b.z, c.z, d.z, t), u: i + t });
  }
  fine.push({ x: pts[0].x, y: pts[0].y || 0, z: pts[0].z, u: n });
  const cum = [0];
  for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].z - fine[i - 1].z, fine[i].y - fine[i - 1].y));
  const total = cum[cum.length - 1], count = Math.max(8, Math.round(total / h)), ds = total / count, samples = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = i * ds;
    while (j < fine.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1), A = fine[j], B = fine[j + 1];
    samples.push({ s, x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z: A.z + (B.z - A.z) * f, u: A.u + (B.u - A.u) * f });
  }
  const m = samples.length;
  for (let i = 0; i < m; i++) {
    const a = samples[(i - 1 + m) % m], b = samples[(i + 1) % m], p = samples[i];
    let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    p.tx = tx; p.tz = tz; p.nx = -tz; p.nz = tx;                                   /* left of the way it runs: rotate the tangent a quarter turn */
    p.yaw = Math.atan2(tx, tz);
  }
  /* the left normal as written is (-tz, tx): with x right and z ahead that points to the LEFT of travel only if the tangent is (0, 1) -> (-1, 0): check it */
  for (let i = 0; i < m; i++) {
    const a = samples[(i - 1 + m) % m], b = samples[(i + 1) % m];
    let d = b.yaw - a.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    samples[i].k = d / (2 * ds);                                                   /* positive: the heading grows, which is a turn to the right (yaw runs from +z toward +x) */
  }
  const L = { samples, length: total, step: ds, count: m, controls: n };
  const wrap = s => ((s % total) + total) % total;
  L.wrap = wrap;
  /* the line at distance s, between samples */
  L.at = s => {
    s = wrap(s); const i = Math.floor(s / ds) % m, f = s / ds - Math.floor(s / ds), a = samples[i], b = samples[(i + 1) % m];
    const yawD = ((b.yaw - a.yaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return { s, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, tx: a.tx + (b.tx - a.tx) * f, tz: a.tz + (b.tz - a.tz) * f, nx: a.nx + (b.nx - a.nx) * f, nz: a.nz + (b.nz - a.nz) * f, yaw: a.yaw + yawD * f, k: a.k + (b.k - a.k) * f, u: a.u };
  };
  /* the sample index nearest (x, z), searching `win` samples either side of `near` (an index) if given, else everywhere */
  L.nearest = (x, z, near, win) => {
    let best = 0, bd = Infinity;
    if (near == null) { for (let i = 0; i < m; i++) { const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
    for (let k = -win; k <= win; k++) { const i = ((near + k) % m + m) % m, d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  return L;
}
