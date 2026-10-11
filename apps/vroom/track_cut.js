/* A SHORTCUT (docs/vroom/plan.md section 8: route parts open roads). A cut is a second, shorter road between two places on the track: it leaves the main road through a gap in its wall, runs through the yard, the
   kitchen or over the lake, and comes back through another. It is authored as a side, two places along the main road (`u0`, `u1`, in control units like every feature) and the points it passes through;
   what it is made of and whether anything stops you at its mouth is what makes it a route part's road:
     a cut across DEEP SNOW is a shortcut only for a car with SNOW TYRES (the others sink: tune.js SURF.deep), a cut over ICE only with ICE CHAINS, and a cut with a GATE only for a car with a BUMPER BAR, which breaks
     the fence and keeps most of its speed (sim.js `gate`); a car without one meets a fence.
   Everything a cut is made of is built here from that data: the corridor's road and walls (into the same sink as the main road, so the picture and the collision are one set of faces), the gap in the main road's
   walls at each end, the gate (a tagged box in the collision soup and a fence in the picture that is not drawn once it is broken), and the line a CPU follows through it. A car that is in the corridor is a car
   that has gone the short way: the race counts its progress by how far along the corridor it is (track.cutAt), so a shortcut skips distance and never a lap. Pure. */
import { builder, mat, box } from './raster_mesh.js';
import { material, across } from './track_geo.js';
import { FLOORS, WALLS } from './track_def.js';
import { SURF } from './tune.js';
import { place } from './raster_math.js';
import { ix, BROWN, GREY } from './palette.js';

const ID = place(0, 0, 0);

/* a smooth open path through points [[x, z], ...], cut every `step` metres: { x, z, tx, tz, nx, nz, s, k }[] and its length. The curve is a centripetal Catmull-Rom (the knots are spaced by the square root of the
   distance between the points), which does not loop or overshoot when the points are very unevenly spaced, as a lane's lead-in and its first turn are. */
export function openPath(pts, step) {
  const m = pts.length, ext = i => (i < 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : i >= m ? [2 * pts[m - 1][0] - pts[m - 2][0], 2 * pts[m - 1][1] - pts[m - 2][1]] : pts[i]), fine = [], SUB = 24;
  const kd = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-3, mix = (a, b, ta, tb, t) => { const w = (t - ta) / ((tb - ta) || 1e-6); return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; };
  for (let i = 0; i + 1 < m; i++) {
    const P0 = ext(i - 1), P1 = pts[i], P2 = pts[i + 1], P3 = ext(i + 2), t0 = 0, t1 = kd(P0, P1), t2 = t1 + kd(P1, P2), t3 = t2 + kd(P2, P3);
    for (let k = 0; k < SUB; k++) {
      const t = t1 + (t2 - t1) * (k / SUB), A1 = mix(P0, P1, t0, t1, t), A2 = mix(P1, P2, t1, t2, t), A3 = mix(P2, P3, t2, t3, t), B1 = mix(A1, A2, t0, t2, t), B2 = mix(A2, A3, t1, t3, t);
      fine.push(mix(B1, B2, t1, t2, t));
    }
  }
  fine.push([pts[m - 1][0], pts[m - 1][1]]);
  const cum = [0]; for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const total = cum[cum.length - 1], n = Math.max(3, Math.round(total / step)), ds = total / n, out = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = i * ds; while (j < fine.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push({ x: fine[j][0] + (fine[j + 1][0] - fine[j][0]) * f, z: fine[j][1] + (fine[j + 1][1] - fine[j][1]) * f, s });
  }
  for (let i = 0; i <= n; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(n, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    out[i].tx = tx; out[i].tz = tz; out[i].nx = -tz; out[i].nz = tx;
  }
  for (let i = 0; i <= n; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(n, i + 1)]; let d = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    out[i].k = d / ((b.s - a.s) || 1);
  }
  return { samples: out, length: total, step: ds };
}

/* the fence of a gate, in the picture: two posts and a field of pickets, `w` wide, turned along the corridor; drawn unless the gate is broken */
function gateMesh(g) {
  const b = builder(), post = mat(ix(BROWN, 9)), fence = material('fence', { double: true });
  const hw = g.w / 2, h = 0.5;
  for (const sx of [-1, 1]) box(b, sx * (hw + 0.03), h / 2, 0, 0.07, h + 0.08, 0.07, post);
  b.use(fence).quad([-hw, 0.02, 0], [hw, 0.02, 0], [hw, h, 0], [-hw, h, 0], [0, 0, 1], [[0, 1], [g.w / 0.45, 1], [g.w / 0.45, 0], [0, 0]]);
  return b.build();
}

/* build every cut of a track: `ctx` is what the road builder knows (the line, the widths, the sink, the places). A shortcut's line begins on the main road, `CUT_LEAD` metres before its mouth, in the middle of it, and leans
   to the side it leaves from, so a car comes into it the way it would leave a road for a slip lane, never at an angle to the way it was going; it ends the same way. The floor and walls of the corridor are only made
   where they are outside the main road. */
export const CUT_LEAD = 9, CUT_TAIL = 9;
export function buildCuts(ctx) {
  const { def, line, widthAt, sOfU, out, decor } = ctx, cuts = [];
  const inside = (x, z, m) => { const near = line.nearest(x, z), q = line.samples[near]; return Math.abs((x - q.x) * q.nx + (z - q.z) * q.nz) < widthAt(q.s) / 2 + m; };
  (def.features || []).filter(f => f.type === 'cut').forEach((cut, k) => {
    const sa = sOfU(cut.u0), sb = sOfU(cut.u1), side = cut.side === 'left' ? 1 : -1, xs = cut.exitSide === 'left' ? 1 : cut.exitSide === 'right' ? -1 : side, w = cut.w || 1.6, fl = FLOORS[cut.floor || 'asphalt'], wl = WALLS[cut.wall || 'parcels'];
    const pa = line.at(sa), pb = line.at(sb), wa = widthAt(sa), wb = widthAt(sb), L = line.length;
    const wrap = s => ((s % L) + L) % L, P = (s, lat) => across(line.at(wrap(s)), lat);
    /* between the two mouths: the points the author gave, or a smooth curve that leaves the road a little toward its side and comes back to it a little from its side (`hk` how far the handles reach, `ang` how far
       they lean): the easy way to write a shortcut across the inside of a long bend */
    const A = across(pa, side * wa / 2), B = across(pb, xs * wb / 2);
    let mid = (cut.via || []).map(v => ({ x: v[0], z: v[1] }));
    if (!cut.via) {
      const ang = cut.lean == null ? 0.3 : cut.lean, hk = (cut.reach == null ? 0.38 : cut.reach) * Math.hypot(B.x - A.x, B.z - A.z), rot = (tx, tz, a) => [tx * Math.cos(a) - tz * Math.sin(a), tx * Math.sin(a) + tz * Math.cos(a)];
      const dA = rot(pa.tx, pa.tz, side * ang), dB = rot(pb.tx, pb.tz, -xs * ang), c1 = [A.x + dA[0] * hk, A.z + dA[1] * hk], c2 = [B.x - dB[0] * hk, B.z - dB[1] * hk];
      for (let i = 1; i < 8; i++) { const t = i / 8, u = 1 - t; mid.push({ x: u * u * u * A.x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * B.x, z: u * u * u * A.z + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * B.z }); }
    }
    const pts = [[P(sa - CUT_LEAD, 0)], [P(sa - CUT_LEAD * 0.45, side * wa * 0.26)], [A], ...mid.map(v => [v]), [B], [P(sb + CUT_TAIL * 0.45, xs * wb * 0.26)], [P(sb + CUT_TAIL, 0)]].map(q => [q[0].x, q[0].z]);
    const path = openPath(pts, 1), S = path.samples, n = S.length, y0 = line.at(wrap(sa - CUT_LEAD)).y, y1 = line.at(wrap(sb + CUT_TAIL)).y, surf = fl.surf;
    S.forEach((p, i) => { p.y = y0 + (y1 - y0) * (i / (n - 1)); });
    /* the first sample outside the main road and the last one: the corridor proper, which is where a car is "in the shortcut" */
    let enter = 0, leave = n - 1; while (enter < n - 1 && inside(S[enter].x, S[enter].z, -0.02)) enter++; while (leave > 0 && inside(S[leave].x, S[leave].z, -0.02)) leave--;
    const rm = material(fl.tex, { zbias: 0.004 }), wm = wl ? material(wl.tex) : null;
    /* the road of the corridor, but not where the main road is already under it: a corner of the strip that is inside the main road is moved out to its edge (on the side the end of the shortcut is on), so the two floors meet and
       never lie one on the other, and a quad that is all inside has no area left and is not made */
    const clampOut = (q, sd) => {
      const near = line.nearest(q.x, q.z), p = line.samples[near], lat = (q.x - p.x) * p.nx + (q.z - p.z) * p.nz, lim = widthAt(p.s) / 2;
      return lat * sd < lim ? { x: p.x + p.nx * lim * sd, z: p.z + p.nz * lim * sd } : q;
    };
    for (let i = 0; i + 1 < n; i++) {
      const a = S[i], b = S[i + 1], sd = i < n / 2 ? side : xs;
      const A0 = clampOut(across(a, w / 2), sd), A1 = clampOut(across(a, -w / 2), sd), B0 = clampOut(across(b, w / 2), sd), B1 = clampOut(across(b, -w / 2), sd);
      const area = Math.abs((A0.x - B1.x) * (A1.z - B0.z) - (A0.z - B1.z) * (A1.x - B0.x)) / 2;
      if (area < 0.01) continue;
      out.quad(sa, [A0.x, a.y, A0.z], [A1.x, a.y, A1.z], [B1.x, b.y, B1.z], [B0.x, b.y, B0.z], [0, 1, 0], [[0, a.s / fl.k], [w / fl.k, a.s / fl.k], [w / fl.k, b.s / fl.k], [0, b.s / fl.k]], rm, surf);
    }
    /* its walls, except where they would stand in the main road */
    if (wl) for (let i = 0; i + 1 < n; i++) {
      const a = S[i], b = S[i + 1];
      for (const sd of [1, -1]) {
        const A = across(a, sd * w / 2), B = across(b, sd * w / 2);
        if (inside(A.x, A.z, 0.2) || inside(B.x, B.z, 0.2) || inside((A.x + B.x) / 2, (A.z + B.z) / 2, 0.2)) continue;
        out.quad(sa, [A.x, a.y, A.z], [B.x, b.y, B.z], [B.x, b.y + wl.h, B.z], [A.x, a.y + wl.h, A.z], [-sd * a.nx, 0, -sd * a.nz], [[a.s / wl.k, 0], [b.s / wl.k, 0], [b.s / wl.k, wl.h / wl.k], [a.s / wl.k, wl.h / wl.k]], wm, 'wood');
      }
    }
    /* the gaps in the main road's walls: the stretch of the main road's edge that the corridor's strip lies across, at either end */
    const gap = (from, to, sd, wd) => {
      let lo = 1e9, hi = -1e9;
      for (let i = from; i !== to + Math.sign(to - from); i += Math.sign(to - from)) {
        const p = S[i], near = line.nearest(p.x, p.z), q = line.samples[near], lat = ((p.x - q.x) * q.nx + (p.z - q.z) * q.nz) * sd;
        if (lat > wd / 2 - w / 2 - 0.5 && lat < wd / 2 + w / 2 + 0.3) { lo = Math.min(lo, q.s); hi = Math.max(hi, q.s); }
      }
      return lo > hi ? null : { s0: lo - 0.4, s1: hi + 0.4, side: sd };
    };
    const g0 = gap(0, Math.min(n - 1, enter + 3), side, wa) || { s0: sa - 2, s1: sa + 2, side }, g1 = gap(n - 1, Math.max(0, leave - 3), xs, wb) || { s0: sb - 2, s1: sb + 2, side: xs };
    const cutObj = { id: k, sa, sb, side, w, floor: cut.floor || 'asphalt', surf: SURF[surf].id, samples: S, len: path.length, step: path.step, enter, leave, gaps: [g0, g1], gate: null, needs: [] };
    /* the gate: a fence across the corridor, a tagged box in the soup, and a mesh that goes when it is broken */
    if (cut.gate) {
      const want = cut.gateAt == null ? 8 : cut.gateAt, gi = cut.gateEnd ? Math.max(1, leave - Math.round(want)) : Math.min(n - 2, enter + Math.round(want)), q = S[gi], tag = k + 1, gw = w + 0.1;
      out.col.box(q.x, q.y + 0.27, q.z, gw, 0.54, 0.1, SURF.wood.id, tag);
      decor.push({ mesh: gateMesh({ w: gw }), m: place(q.x, q.y, q.z, Math.atan2(q.tx, q.tz), 0, 0, 1), x: q.x, z: q.z, r: gw + 2, gate: tag });
      cutObj.gate = { tag, x: q.x, y: q.y, z: q.z, tx: q.tx, tz: q.tz, w: gw };
      cutObj.needs.push('bumperBar');
    }
    if (cut.floor === 'deep' || cut.floor === 'packed') cutObj.needs.push('snowTyres'); if (cut.floor === 'ice') cutObj.needs.push('iceChains');
    cuts.push(cutObj);
  });
  return cuts;
}
/* which cut (if any) a point is in, and how far along it (0..1): inside the corridor's strip and between where it leaves the main road and where it comes back to it (until then the car is on the main road, whose own
   progress it keeps) */
export function cutAt(cuts, x, z, hint) {
  for (const c of cuts) {
    const S = c.samples, n = S.length;
    let best = -1, bd = 1e9; const near = hint != null && hint.cut === c.id, lo = near ? Math.max(0, hint.j - 8) : 0, hi = near ? Math.min(n - 1, hint.j + 8) : n - 1;
    for (let j = lo; j <= hi; j++) { const d = (S[j].x - x) ** 2 + (S[j].z - z) ** 2; if (d < bd) { bd = d; best = j; } }
    if (best < 0 || bd > (c.w / 2 + 0.25) ** 2) continue;
    const q = S[best], lat = (x - q.x) * q.nx + (z - q.z) * q.nz;
    if (Math.abs(lat) > c.w / 2 + 0.25) continue;
    if (best < c.enter + 1 || best > c.leave - 1) continue;
    return { cut: c.id, j: best, u: (best - c.enter - 1) / Math.max(1, c.leave - c.enter - 2) };
  }
  return null;
}
void GREY;
