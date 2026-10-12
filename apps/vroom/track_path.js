/* A TRACK DRAWN AS A POLYGON WITH ROUNDED CORNERS. The author puts down the corners of the route (a place, how wide the road is, what it is made of, and the radius of the bend that takes the corner), and this
   makes the dense run of control points the centreline is fitted through (spline.js): straight between the bends, a true arc in each. A route drawn this way is closed by construction (the last corner leads
   to the first), a bend can never be tighter than it was asked, and a thing set on the road is placed by *which straight* and *how far along it* rather than by a number that moves when a corner does.
   `rounded(verts, { step, merge })` returns { controls, u(edge, t), edges }: `u` turns "edge 3, 40 % of the way along its straight" into the control-point unit track_def.js features are addressed in. A corner with no bend
   (r 0) puts a control point of its own on the line, exactly where the straight that starts there puts its first: two points in one place, which the spline (spline.js) fits a stretched stretch of line through (a
   metre of road a half of its length, so a ramp set there is steeper than its data). `merge` leaves that second point out; the town's own roads were made without it and keep their numbers, the track maker's use it. Pure. */

const hyp = Math.hypot;
export function rounded(verts, opt) {
  const step = (opt && opt.step) || 2.5, n = verts.length, controls = [], edges = [];
  const V = i => verts[((i % n) + n) % n];
  /* for each corner: the unit directions in and out, the turn, and where the bend starts and ends along them */
  const C = verts.map((v, i) => {
    const a = V(i - 1), b = V(i + 1);
    let d0x = v.x - a.x, d0z = v.z - a.z, l0 = hyp(d0x, d0z); d0x /= l0; d0z /= l0;
    let d1x = b.x - v.x, d1z = b.z - v.z, l1 = hyp(d1x, d1z); d1x /= l1; d1z /= l1;
    const cross = d0x * d1z - d0z * d1x, dot = d0x * d1x + d0z * d1z, turn = Math.atan2(cross, dot), r = v.r || 0;
    const t = r > 0 ? r * Math.tan(Math.abs(turn) / 2) : 0;
    return { v, d0x, d0z, d1x, d1z, turn, r, t, l0, l1 };
  });
  C.forEach((c, i) => {
    const nx = C[(i + 1) % n];
    if (c.t + nx.t > c.l1 - 0.5) throw new Error('track_path: the bends at corners ' + i + ' and ' + ((i + 1) % n) + ' do not fit on the straight between them (' + (c.t + nx.t).toFixed(1) + ' m of bend on ' + c.l1.toFixed(1) + ' m)');
  });
  const put = (x, z, w, v, edge, et) => controls.push({ x, z, w, floor: v.floor, wall: v.wall, edge, et });
  const bend = (c, v) => {
    if (!(c.t > 0 && Math.abs(c.turn) > 1e-3)) { if (!(opt && opt.merge)) put(v.x, v.z, v.w, v, null, null); return; }
    const sx = v.x - c.d0x * c.t, sz = v.z - c.d0z * c.t, side = Math.sign(c.turn), cx = sx + (-c.d0z * side) * c.r, cz = sz + (c.d0x * side) * c.r;
    const a0 = Math.atan2(sz - cz, sx - cx), len = c.r * Math.abs(c.turn), m = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < m; k++) { const a = a0 + c.turn * k / m; put(cx + Math.cos(a) * c.r, cz + Math.sin(a) * c.r, v.w, v, null, null); }
  };
  for (let i = 0; i < n; i++) {
    const c = C[i], v = c.v, nx = C[(i + 1) % n], vn = nx.v;
    /* the bend at this corner (corner 0's is done last, so that control point 0 starts a straight); it begins where the last straight ended and stops short of where the next one starts */
    if (i > 0) bend(c, v);
    /* the straight from this corner's bend to the next one's */
    const x0 = v.x + c.d1x * c.t, z0 = v.z + c.d1z * c.t, x1 = vn.x - nx.d0x * nx.t, z1 = vn.z - nx.d0z * nx.t, L = hyp(x1 - x0, z1 - z0), m = Math.max(1, Math.round(L / step));
    edges.push({ from: i, to: (i + 1) % n, length: L });
    for (let k = 0; k < m; k++) { const f = k / m; put(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, v.w + (vn.w - v.w) * f, v, i, f); }
  }
  /* the bend of corner 0 closes the loop: it belongs at the end of the list, after the last straight */
  bend(C[0], C[0].v);
  const at = (edge, t) => {
    let lo = null, hi = null;
    for (let k = 0; k < controls.length; k++) {
      const c = controls[k];
      if (c.edge !== edge) continue;
      if (c.et <= t) lo = k;
      if (c.et >= t && hi === null) hi = k;
    }
    if (lo === null) return 0;
    if (hi === null || hi === lo) {
      /* past the last control of the edge: between it and the next control (the next bend's first point) */
      const a = controls[lo], span = (1 - a.et) || 1;
      return lo + Math.min(1, (t - a.et) / span);
    }
    const a = controls[lo], b = controls[hi];
    return lo + (t - a.et) / ((b.et - a.et) || 1);
  };
  return { controls, u: at, edges };
}
