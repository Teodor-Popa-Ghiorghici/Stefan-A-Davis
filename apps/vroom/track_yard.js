/* THE STUNT YARD'S BUILDER (track_build.js hands it the road and the sink when a track's data has `yard`). It lays the flat infield inside the ring road, stands the pieces of yard_pieces.js on it, hangs the twenty stars,
   and works out what the rest of the build needs to know: the places a car can be put back (a grid over the infield, clear of every piece), the gap that takes the ring's inside wall away, and a footprint for every piece so the
   checks can ask what is where. Every face goes through the one sink, so what is drawn is what is hit. Pure. */
import { ramp, trough, bowl, frame } from './yard_pieces.js';
import { material } from './track_geo.js';
import { starDecor } from './track_star.js';

/* a star in the air is a hard thing to put the middle of a car through: the yard's are caught inside a metre across and eight tenths up, and drawn twice the size */
export const CATCH = { r: 0.9, dy: 0.8, k: 2 };
const SKIN = { ramp: ['planks', 'wood'], trough: ['concrete', 'asphalt'], bowl: ['concrete', 'asphalt'] };

export function buildYard(ctx) {
  const { def, line, out, decor, L } = ctx, Y = def.yard, I = Y.infield, TILE = 8, mid = {}, stars = [], pieces = [];
  const sNear = (x, z) => line.samples[line.nearest(x, z)].s;
  const mat = n => mid[n] || (mid[n] = material(n));
  /* the infield: the ring's own floor, carried across, and a metre under the ring's inner edge so no seam can open */
  const x0 = I.x0 - 1, x1 = I.x1 + 1, z0 = I.z0 - 1, z1 = I.z1 + 1, nx = Math.ceil((x1 - x0) / TILE), nz = Math.ceil((z1 - z0) / TILE), fm = mat('asphalt');
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = x0 + (x1 - x0) * i / nx, b = x0 + (x1 - x0) * (i + 1) / nx, c = z0 + (z1 - z0) * j / nz, d = z0 + (z1 - z0) * (j + 1) / nz, k = 2.4;
    out.quad(sNear((a + b) / 2, (c + d) / 2), [a, 0, c], [a, 0, d], [b, 0, d], [b, 0, c], [0, 1, 0], [[a / k, c / k], [a / k, d / k], [b / k, d / k], [b / k, c / k]], fm, 'asphalt');
  }
  /* the pieces */
  for (const p of Y.pieces) {
    const s = sNear(p.x, p.z), skin = SKIN[p.k];
    const put = (a, b, c, d, n, uv, kind) => out.quad(s, a, b, c, d, n, uv, mat(skin[0]), kind === 'side' ? skin[1] : skin[1]);
    let test;
    if (p.k === 'ramp') { ramp(put, p); const F = frame(p.x, p.z, p.yaw); test = (x, z, m) => inRect(F, x, z, -m, p.len + m, p.w / 2 + m); }
    else if (p.k === 'trough') {
      const t = trough(put, p), F = frame(p.x, p.z, p.yaw);
      const lo = p.side === 'one' ? -p.flat / 2 : -t.reach, hi = t.reach;
      test = (x, z, m) => { const q = local(F, x, z); return q.a > -m && q.a < p.len + m && q.l > lo - m && q.l < hi + m; };
    } else if (p.k === 'bowl') { bowl(put, p); const R = p.r1 + p.deck; test = (x, z, m) => Math.hypot(x - p.x, z - p.z) < R + m; }
    else if (p.k === 'block') {
      out.box(s, p.x, p.h / 2, p.z, p.sx, p.h, p.sz, mat(p.tex), p.tex === 'planks' ? 'wood' : 'cardboard');
      test = (x, z, m) => Math.abs(x - p.x) < p.sx / 2 + m && Math.abs(z - p.z) < p.sz / 2 + m;
    }
    pieces.push({ name: p.name, kind: p.k, test });
  }
  /* the stars */
  for (const st of Y.stars) {
    const star = { id: st.id, name: st.name, x: st.x, y: st.y, z: st.z, s: sNear(st.x, st.z), gaps: [], samples: [], w: 0.5, r2: CATCH.r * CATCH.r, dy: CATCH.dy, k: CATCH.k };
    decor.push(starDecor(star)); stars.push(star);
  }
  const free = (x, z, m) => !pieces.some(p => p.test(x, z, m));
  /* where a car is put back: every 12 m over the infield, clear of every piece by three metres */
  const nodes = [];
  for (let x = I.x0 + 5; x < I.x1; x += 12) for (let z = I.z0 + 4; z < I.z1; z += 12) if (free(x, z, 3)) nodes.push({ x, y: 0, z, yaw: Math.PI / 2, s: sNear(x, z) });
  /* the inside wall of the ring is not there: the whole lap of the left side is a gap */
  const fence = { gaps: [{ s0: -1, s1: L + 1, side: 1 }], samples: [], w: 0 };
  return { stars, nodes, fence, pieces, free };
}
/* a point in a piece's own terms (metres along its heading and to its left) */
function local(F, x, z) { const o = F.at(0, 0, 0), dx = x - o[0], dz = z - o[2], f = F.dir(1, 0, 0), l = F.dir(0, 1, 0); return { a: dx * f[0] + dz * f[2], l: dx * l[0] + dz * l[2] }; }
function inRect(F, x, z, a0, a1, hw) { const q = local(F, x, z); return q.a > a0 && q.a < a1 && Math.abs(q.l) < hw; }
