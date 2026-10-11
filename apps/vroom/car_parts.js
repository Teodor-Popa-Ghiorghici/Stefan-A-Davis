/* THE PARTS A CAR IS DRAWN FROM (docs/vroom/plan.md section 5: every car is a stack of parts, like the bottles). `kit(spec, look, paint)` hands a shell a builder and the few ways to put a part on a car, all in
   FRACTIONS of the car so a shape does not depend on its size: x is a share of the half-width (-1 left, 1 right), y a share of the body's height measured up from its underside (1 is the top of the box the
   physics hits; a crane may go higher), z a share of the half-length (-1 the tail, 1 the nose). The body's box is the sim's (sim_spec.js), so what you see is what you hit.
     K.lf(secs, segs)           a body lofted through cross-sections [z, top, halfWidthAtTop, halfWidthAtBottom, bottom?], back to front; segs[i] = { top, side } for the piece after section i, and .front/.back the caps
     K.bx(x0, x1, y0, y1, z0, z1, mat)   a box between two corners        K.ell(cx, cy, cz, rx, ry, rz, mat)   an ellipsoid        K.bar(p0, p1, thick, mat)   a bar between two points ([x, y, z] each)
   Wheel meshes come from `wheelMesh`. Eight sides a wheel, a few dozen triangles: a car is 30 to 60 pixels wide on the glass. Pure. */
import { builder, mat, box } from './raster_mesh.js';
import { tex } from './raster_tex.js';
import { ix, GREY, RED, BROWN, COOL, BLUE } from './palette.js';

export const M = {
  glass: mat(ix(COOL, 3)), tyre: mat(tex.rubber()), hubA: mat(ix(GREY, 12)), hubB: mat(ix(GREY, 4)), dark: mat(ix(GREY, 2)), chrome: mat(ix(GREY, 12)), steel: mat(ix(COOL, 8)),
  head: mat(ix(BROWN, 14), { emit: 1 }), tail: mat(ix(RED, 9), { emit: 0.9 }), card: mat(tex.cardboard()), tape: mat(ix(BROWN, 11)), rubber: mat(ix(GREY, 1)),
  shadow: mat(tex.rubber(), { mode: 'darken', steps: 6, zbias: 0.0005 }), face: mat(ix(BROWN, 12)), white: mat(ix(GREY, 15)), black: mat(ix(GREY, 0)),
  lit: mat(ix(BROWN, 13), { emit: 0.8 }), pane: mat(tex.window(), { emit: 0.55 }), wood: mat(tex.planks()), blue: mat(ix(BLUE, 8))
};
export const flat = c => mat(c);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* a body from cross-sections (metres): { z, hw (half the width at the top), hb (at the bottom), y1 (the top), y0 (the bottom) }, closed at both ends */
function loft(b, secs, segs, M2) {
  for (let i = 0; i + 1 < secs.length; i++) {
    const a = secs[i], c = secs[i + 1], m = segs && segs[i] || {}, top = m.top || M2.def, side = m.side || M2.def;
    const dz = Math.max(0.0001, c.z - a.z), ones = [[0, 0], [1, 0], [1, 1], [0, 1]], tn = [0, Math.max(0.2, dz), -(c.y1 - a.y1)];
    b.use(top).quad([-a.hw, a.y1, a.z], [a.hw, a.y1, a.z], [c.hw, c.y1, c.z], [-c.hw, c.y1, c.z], tn, ones);
    b.use(side).quad([a.hw, a.y1, a.z], [a.hb, a.y0, a.z], [c.hb, c.y0, c.z], [c.hw, c.y1, c.z], [1, 0, 0], ones);
    b.use(side).quad([-a.hb, a.y0, a.z], [-a.hw, a.y1, a.z], [-c.hw, c.y1, c.z], [-c.hb, c.y0, c.z], [-1, 0, 0], ones);
    b.use(M.dark).quad([-a.hb, a.y0, a.z], [-c.hb, c.y0, c.z], [c.hb, c.y0, c.z], [a.hb, a.y0, a.z], [0, -1, 0], ones);
  }
  const f = secs[secs.length - 1], r = secs[0], fm = segs && segs.front || {}, rm = segs && segs.back || {};
  b.use(fm.side || M2.def).quad([-f.hb, f.y0, f.z], [f.hb, f.y0, f.z], [f.hw, f.y1, f.z], [-f.hw, f.y1, f.z], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  b.use(rm.side || M2.def).quad([r.hb, r.y0, r.z], [-r.hb, r.y0, r.z], [-r.hw, r.y1, r.z], [r.hw, r.y1, r.z], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

/* the kit a shell is drawn with */
export function kit(sp, look, paint) {
  const bx0 = sp.box, L = sp.L, W = sp.W, H = sp.H, hl = L / 2, hw = W / 2 * 0.9, y0 = bx0.cy - bx0.y, zc = bx0.cz;      /* (the body is a tenth narrower than the box the physics hits, so the wheels stand out of it) */
  const b = builder(), P = flat(paint == null ? look.paint : paint), T = flat(look.trim), D = M.dark, G = M.glass;
  const K = { b, P, T, D, G, M, sp, look, hl, hw, H, y0, zc, L, W, ix, c: flat };
  K.lf = (secs, segs, caps) => {
    const s = secs.map(q => ({ z: zc + q[0] * hl, y1: y0 + q[1] * H, y0: q[4] == null ? y0 + 0.02 : y0 + q[4] * H, hw: hw * q[2], hb: hw * q[3] }));
    loft(b, s, Object.assign((segs || []).slice(), caps || {}), { def: P });
  };
  /* a box in metres in body space (centre, size), for the odd part that has a size of its own */
  K.raw = (cx, cy, cz, sx, sy, sz, m, k) => box(b, cx, cy, cz, sx, sy, sz, m || P, k || 0.1);
  K.bx = (xa, xb, ya, yb, za, zb, m, k) => { box(b, hw * (xa + xb) / 2, y0 + H * (ya + yb) / 2, zc + hl * (za + zb) / 2, hw * Math.abs(xb - xa), H * Math.abs(yb - ya), hl * Math.abs(zb - za), m || P, k || 0.1); };
  /* a lat-long ellipsoid, smooth-shaded; `seg` round, `rings` pole to pole */
  K.ell = (cx, cy, cz, rx, ry, rz, m, seg, rings) => {
    seg = seg || 8; rings = rings || 4; b.use(m || P);
    const X = hw * cx, Y = y0 + H * cy, Z = zc + hl * cz, RX = hw * rx, RY = H * ry, RZ = hl * rz;
    const pt = (i, j) => { const th = Math.PI * i / rings, ph = Math.PI * 2 * j / seg, s = Math.sin(th); return { p: [X + RX * s * Math.cos(ph), Y + RY * Math.cos(th), Z + RZ * s * Math.sin(ph)], n: unit([s * Math.cos(ph) / (RX || 1), Math.cos(th) / (RY || 1), s * Math.sin(ph) / (RZ || 1)]) }; };
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
      const a = pt(i, j), c = pt(i, j + 1), d = pt(i + 1, j + 1), e = pt(i + 1, j), uv = [[j / seg, i / rings], [(j + 1) / seg, i / rings], [(j + 1) / seg, (i + 1) / rings], [j / seg, (i + 1) / rings]];
      if (i > 0) b.triSmooth(a.p, c.p, d.p, a.n, c.n, d.n, uv[0], uv[1], uv[2]);
      if (i < rings - 1) b.triSmooth(a.p, d.p, e.p, a.n, d.n, e.n, uv[0], uv[2], uv[3]);
    }
  };
  /* a bar of square section between two points (fractions), `th` metres thick */
  K.bar = (p0, p1, th, m) => {
    const A = [hw * p0[0], y0 + H * p0[1], zc + hl * p0[2]], B = [hw * p1[0], y0 + H * p1[1], zc + hl * p1[2]], d = unit(sub(B, A));
    let u = Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const s = unit(cross(d, u)), v = unit(cross(s, d)), h = th / 2;
    const corner = (P0, i, j) => [P0[0] + s[0] * h * i + v[0] * h * j, P0[1] + s[1] * h * i + v[1] * h * j, P0[2] + s[2] * h * i + v[2] * h * j];
    const faces = [[[-1, -1], [1, -1], [1, 1], [-1, 1]]];
    void faces; b.use(m || T);
    const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      const [i0, j0] = q[k], [i1, j1] = q[(k + 1) % 4], n = unit([s[0] * (i0 + i1) + v[0] * (j0 + j1), s[1] * (i0 + i1) + v[1] * (j0 + j1), s[2] * (i0 + i1) + v[2] * (j0 + j1)]);
      b.quad(corner(A, i0, j0), corner(A, i1, j1), corner(B, i1, j1), corner(B, i0, j0), n, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    b.tri(corner(A, -1, -1), corner(A, 1, -1), corner(A, 1, 1), d.map(x => -x), [0, 0], [1, 0], [1, 1]); b.tri(corner(A, -1, -1), corner(A, 1, 1), corner(A, -1, 1), d.map(x => -x), [0, 0], [1, 1], [0, 1]);
    b.tri(corner(B, -1, -1), corner(B, 1, -1), corner(B, 1, 1), d, [0, 0], [1, 0], [1, 1]); b.tri(corner(B, -1, -1), corner(B, 1, 1), corner(B, -1, 1), d, [0, 0], [1, 1], [0, 1]);
  };
  return K;
}

/* a wheel, axis along x: eight sides, a tread, and on each face a fan of triangles in two greys so a spin shows. kind 'knob' alternates the tread's height (a buggy's tyre); 'ski' is a flat runner */
export function wheelMesh(r, w, kind) {
  const wb = builder();
  if (kind === 'ski') {
    const len = r * 2.6, th = 0.008, tip = r * 0.9;
    const q = (x0, x1, y0, y1, z0, z1, m) => box(wb, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, m, 0.1);
    q(-w / 2, w / 2, -r * 0.5, -r * 0.5 + th, -len * 0.3, len * 0.55, M.hubA);
    q(-w / 2, w / 2, -r * 0.5 + th, -r * 0.5 + th * 3, len * 0.55, len * 0.8, M.hubA);                       /* the curled tip */
    q(-w / 4, w / 4, -r * 0.5 + th, r * 0.1, -len * 0.05, len * 0.05, M.dark);                                /* the post */
    void tip;
    return wb.build();
  }
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, rr0 = r * (kind === 'knob' && i % 2 ? 1.12 : 1), rr1 = r * (kind === 'knob' && (i + 1) % 2 ? 1.12 : 1), am = (a0 + a1) / 2;
    const y0w = Math.cos(a0) * rr0, z0w = Math.sin(a0) * rr0, y1w = Math.cos(a1) * rr1, z1w = Math.sin(a1) * rr1;
    wb.use(M.tyre).quad([-w / 2, y0w, z0w], [w / 2, y0w, z0w], [w / 2, y1w, z1w], [-w / 2, y1w, z1w], [0, Math.cos(am), Math.sin(am)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    for (const sx of [-1, 1]) wb.use(i % 2 ? M.hubA : M.hubB).tri([sx * w / 2, 0, 0], [sx * w / 2, y0w * 0.8, z0w * 0.8], [sx * w / 2, y1w * 0.8, z1w * 0.8], [sx, 0, 0], [0.5, 0.5], [0, 0], [1, 0]);
    for (const sx of [-1, 1]) wb.use(M.tyre).quad([sx * w / 2, y0w * 0.8, z0w * 0.8], [sx * w / 2, y0w, z0w], [sx * w / 2, y1w, z1w], [sx * w / 2, y1w * 0.8, z1w * 0.8], [sx, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  return wb.build();
}
