/* THE PIECES OF THE STUNT YARD (docs/vroom/plan.md section 9): a ramp, a trough (a half pipe or a quarter pipe) and a bowl. Each is a function of a few numbers that hands its faces to `put`, one quad at a time,
       put(a, b, c, d, normal, uv, kind)         the four corners (x, y, z), the way it faces, a texture's uv per corner, and what it is: 'top' (something to drive on) or 'side' (a skirt or a rail)
   so the yard builder can send them to the picture and the collision at once and a check can send them to a bare collision soup. A piece stands at (x, z) on the ground facing `yaw` (forward is (sin yaw, cos yaw)); it
   is described in its own terms -- `a` metres along, `l` metres to the left, `y` up -- and `at` turns that into the yard's. Pure. */

export function frame(x, z, yaw, y0) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  return { at: (a, l, y) => [x + a * s - l * c, (y0 || 0) + y, z + a * c + l * s], dir: (a, l, y) => [a * s - l * c, y, a * c + l * s] };
}
/* a strip of quads along a path of cross-sections: section i is the two corners [left, right] of the strip at that point of the path */
function strip(put, secs, kind, k) {
  for (let i = 0; i + 1 < secs.length; i++) {
    const A = secs[i], B = secs[i + 1];
    const e1 = [B[0][0] - A[0][0], B[0][1] - A[0][1], B[0][2] - A[0][2]], e2 = [A[1][0] - A[0][0], A[1][1] - A[0][1], A[1][2] - A[0][2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const m = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / m, n[1] / m, n[2] / m];
    const u0 = i / k, u1 = (i + 1) / k;
    put(A[0], A[1], B[1], B[0], n, [[0, u0], [1, u0], [1, u1], [0, u1]], kind);
  }
}

/* A RAMP: the ground climbs `h` metres over `len`, a lip at the top and nothing behind it. `w` across. It starts at its foot, (x, z), and goes the way `yaw` points. The skirts down each side and the face behind the lip make it a
   closed wedge, so a car that lands on the side of one bounces off it and never goes through. `curve` rounds the surface into the lip (0 is a straight slope, 1 is a quarter circle that ends the slope climbing steeper).
   `down` turns it round: the high end is where it starts and the ground is where it ends (a landing). */
export function ramp(put, o) {
  const F = frame(o.x, o.z, o.yaw, o.y0), len = o.len, h = o.h, w = o.w, n = Math.max(2, Math.round(len / 1.0)), hw = w / 2, curve = o.curve || 0, down = !!o.down;
  const up = t => h * ((1 - curve) * t + curve * t * t), prof = t => (down ? up(1 - t) : up(t));
  const top = [];
  for (let i = 0; i <= n; i++) { const t = i / n; top.push([F.at(t * len, hw, prof(t)), F.at(t * len, -hw, prof(t))]); }
  strip(put, top, 'top', 2.4);
  for (const sd of [1, -1]) {                                   /* the skirts */
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, l = sd * hw, nn = F.dir(0, sd, 0);
      put(F.at(t0 * len, l, 0), F.at(t1 * len, l, 0), F.at(t1 * len, l, prof(t1)), F.at(t0 * len, l, prof(t0)), nn, [[0, 0], [1, 0], [1, 1], [0, 1]], 'side');
    }
  }
  const e = down ? 0 : len;                                      /* the face behind the lip */
  put(F.at(e, hw, 0), F.at(e, -hw, 0), F.at(e, -hw, h), F.at(e, hw, h), F.dir(down ? -1 : 1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], 'side');
  return { top: a => prof(Math.max(0, Math.min(1, a / len))) + (o.y0 || 0) };
}

/* A TROUGH: a channel `len` long whose floor is `flat` wide and whose two sides curve up as quarter circles of radius `R` (a half pipe), up to `lift` of a quarter (1 is vertical, 0.85 stops short of it), and a deck
   `deck` wide on each lip. The two ends are closed with a wall. With `side: 'one'` there is only the left wall (a quarter pipe against the arena's wall). */
export function trough(put, o) {
  const F = frame(o.x, o.z, o.yaw, o.y0), len = o.len, R = o.R, flat = o.flat, lift = o.lift == null ? 0.82 : o.lift, deck = o.deck == null ? 0.9 : o.deck, SEG = 7, hf = flat / 2;
  const wall = [];
  for (let i = 0; i <= SEG; i++) { const ph = (i / SEG) * lift * Math.PI / 2; wall.push([R * Math.sin(ph), R * (1 - Math.cos(ph))]); }
  const top = wall[SEG], prof = [[hf + top[0] + deck, top[1]]];     /* the cross-section from the left deck to the right: [lateral, height] */
  for (let i = SEG; i >= 0; i--) prof.push([hf + wall[i][0], wall[i][1]]);
  prof.push([-hf, 0]);
  if (o.side !== 'one') { for (let i = 1; i <= SEG; i++) prof.push([-hf - wall[i][0], wall[i][1]]); prof.push([-hf - top[0] - deck, top[1]]); }
  const secs = [];
  const m = Math.max(2, Math.round(len / 2));
  for (let i = 0; i <= m; i++) { const a = len * i / m; secs.push(prof.map(p => F.at(a, p[0], p[1]))); }
  for (let j = 0; j + 1 < prof.length; j++) {
    const row = secs.map(sc => [sc[j], sc[j + 1]]);
    strip(put, row, 'top', 2.4);
  }
  /* the ends are closed with a wall the height of the lip */
  for (const e of [0, len]) {
    const nn = F.dir(e ? 1 : -1, 0, 0);
    for (let j = 0; j + 1 < prof.length; j++) put(F.at(e, prof[j][0], prof[j][1]), F.at(e, prof[j + 1][0], prof[j + 1][1]), F.at(e, prof[j + 1][0], -0.2), F.at(e, prof[j][0], -0.2), nn, [[0, 0], [1, 0], [1, 1], [0, 1]], 'side');
  }
  return { lip: top[1], hf, R, reach: hf + top[0] + deck };
}

/* A BOWL: a banked ring round (x, z). Inside `r0` the ground is flat; from there to the rim at `r1` it climbs to `H` metres as the `p`th power of how far across the bank you are, so it is gentle at the foot and steep at the
   rim, and a car holds the higher ground only by going round fast enough (the banking asks v squared = g r tan(angle) of it). A flat deck `deck` wide runs round the rim. The rim is taken down to the ground at `gate`
   ({ a, open, blend }: the way it faces, how far either side of it is fully open, and how far further it takes to come up to height), so a car can drive in. */
export function bowl(put, o) {
  const r0 = o.r0, r1 = o.r1, H = o.H, p = o.p || 2.4, deck = o.deck == null ? 1.1 : o.deck, NA = 48, NR = 10, y0 = o.y0 || 0, G = o.gate;
  const rr = []; for (let j = 0; j <= NR; j++) rr.push(r0 + (r1 - r0) * j / NR);
  rr.push(r1 + deck);
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const gate = a => { if (!G) return 1; const t = Math.max(0, Math.min(1, (Math.abs(wrap(a - G.a)) - G.open) / G.blend)); return t * t * (3 - 2 * t); };
  const hy = (r, a) => gate(a) * (r <= r0 ? 0 : r >= r1 ? H : H * Math.pow((r - r0) / (r1 - r0), p));
  const pt = (r, k) => { const a = 2 * Math.PI * k / NA; return [o.x + r * Math.cos(a), y0 + hy(r, a), o.z + r * Math.sin(a)]; };
  for (let k = 0; k < NA; k++) for (let j = 0; j + 1 < rr.length; j++) {
    const a = pt(rr[j], k), b = pt(rr[j], k + 1), c = pt(rr[j + 1], k + 1), d = pt(rr[j + 1], k), am = 2 * Math.PI * (k + 0.5) / NA;
    put(a, b, c, d, [-Math.cos(am) * 0.4, 0.9, -Math.sin(am) * 0.4], [[k / 3, j], [(k + 1) / 3, j], [(k + 1) / 3, j + 1], [k / 3, j + 1]], 'top');
  }
  for (let k = 0; k < NA; k++) {                                /* the deck's outer edge */
    const a = pt(r1 + deck, k), b = pt(r1 + deck, k + 1), am = 2 * Math.PI * (k + 0.5) / NA;
    put(a, b, [b[0], y0 - 0.2, b[2]], [a[0], y0 - 0.2, a[2]], [Math.cos(am), 0, Math.sin(am)], [[k, 0], [k + 1, 0], [k + 1, 1], [k, 1]], 'side');
  }
  return { height: (r, a) => y0 + hy(r, a), slope: (r, a) => { const e = 0.05; return (hy(r + e, a) - hy(r - e, a)) / (2 * e); } };
}
