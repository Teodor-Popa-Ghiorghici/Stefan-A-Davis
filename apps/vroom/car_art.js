/* A CAR AS A PICTURE (docs/vroom/plan.md section 5): a body built from a few cross-sections along its length, four wheels that turn and spin, an antenna, lamps, and the odd extra, every part sized from
   the same numbers the physics was (sim_spec.js: the collision box, the wheels' places), so what you see is what you hit. Body space is the sim's: the origin is the centre of mass, x right, y up, z ahead.
   `carModel(id, paint)` builds the meshes once; `drawCar(R, model, car)` places them from where the sim has the car and its wheels. Low-poly on purpose: a car is 30 to 60 pixels wide on the glass. Pure. */
import { builder, mat, box } from './raster_mesh.js';
import { tex } from './raster_tex.js';
import { place, placeQuat, rotEuler } from './raster_math.js';
import { ix, GREY, RED, BROWN, COOL, CYAN } from './palette.js';
import { CARS, specOf } from './cars.js';

const M = {
  glass: mat(ix(COOL, 3)), tyre: mat(tex.rubber()), hubA: mat(ix(GREY, 12)), hubB: mat(ix(GREY, 4)), dark: mat(ix(GREY, 2)), chrome: mat(ix(GREY, 12)),
  head: mat(ix(BROWN, 14), { emit: 1 }), tail: mat(ix(RED, 9), { emit: 0.9 }), card: mat(tex.cardboard()), tape: mat(ix(BROWN, 11)), rubber: mat(ix(GREY, 1)),
  shadow: mat(tex.rubber(), { mode: 'darken', steps: 6, zbias: 0.0005 }), face: mat(ix(BROWN, 12))
};
const flat = c => mat(c);

/* a body from cross-sections, back to front: { z, hw (half the width at the top), hb (at the bottom), y1 (the top), y0 (the bottom) }, closed at both ends. segs[i] says what the top and the sides of the
   piece between section i and i + 1 are made of ({ top, side }). */
function loft(b, secs, segs) {
  for (let i = 0; i + 1 < secs.length; i++) {
    const a = secs[i], c = secs[i + 1], m = segs && segs[i] || {}, top = m.top, side = m.side;
    const uvq = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], dz = Math.max(0.0001, c.z - a.z), ones = uvq(1, 1);
    const tn = [0, Math.max(0.2, dz), -(c.y1 - a.y1)];
    b.use(top).quad([-a.hw, a.y1, a.z], [a.hw, a.y1, a.z], [c.hw, c.y1, c.z], [-c.hw, c.y1, c.z], tn, ones);
    b.use(side).quad([a.hw, a.y1, a.z], [a.hb, a.y0, a.z], [c.hb, c.y0, c.z], [c.hw, c.y1, c.z], [1, 0, 0], ones);
    b.use(side).quad([-a.hb, a.y0, a.z], [-a.hw, a.y1, a.z], [-c.hw, c.y1, c.z], [-c.hb, c.y0, c.z], [-1, 0, 0], ones);
    b.use(M.dark).quad([-a.hb, a.y0, a.z], [-c.hb, c.y0, c.z], [c.hb, c.y0, c.z], [a.hb, a.y0, a.z], [0, -1, 0], ones);
  }
  const f = secs[secs.length - 1], r = secs[0], fm = segs && segs.front || {}, rm = segs && segs.back || {};
  b.use(fm.side).quad([-f.hb, f.y0, f.z], [f.hb, f.y0, f.z], [f.hw, f.y1, f.z], [-f.hw, f.y1, f.z], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  b.use(rm.side).quad([f.hb * 0 + r.hb, r.y0, r.z], [-r.hb, r.y0, r.z], [-r.hw, r.y1, r.z], [r.hw, r.y1, r.z], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

/* the shells: each a list of lofts in units of the car (z from -1 at the tail to 1 at the nose of the box, y from 0 at its bottom to 1 at its top, widths as a share of the half-width) */
const SHELLS = {
  pickup: (d, P, T) => [
    { secs: [[-0.12, 1, 0.9, 0.98], [0.36, 1, 0.9, 0.98], [0.58, 0.58, 0.94, 1], [1, 0.46, 0.95, 1]], segs: [{ top: P, side: P }, { top: M.glass, side: P }, { top: P, side: P }], front: { side: P }, back: { side: P } }
  ],
  box: (d, P, T) => [
    { secs: [[-1, 1, 0.99, 1], [0.12, 1, 0.99, 1]], segs: [{ top: P, side: P }], front: { side: P }, back: { side: P } },
    { secs: [[0.12, 0.62, 0.94, 1], [0.5, 0.62, 0.94, 1], [0.7, 0.44, 0.96, 1], [1, 0.38, 0.96, 1]], segs: [{ top: P, side: P }, { top: M.glass, side: P }, { top: P, side: P }], front: { side: T }, back: { side: P } }
  ],
  bubble: (d, P, T) => [
    { secs: [[-1, 0.32, 0.55, 0.78], [-0.72, 0.8, 0.86, 0.94], [-0.2, 1, 0.92, 0.98], [0.3, 0.86, 0.9, 0.98], [0.72, 0.52, 0.84, 0.96], [1, 0.3, 0.6, 0.8]], segs: [{ top: P, side: P }, { top: M.glass, side: P }, { top: M.glass, side: P }, { top: P, side: P }, { top: P, side: P }], front: { side: P }, back: { side: P } }
  ],
  wedge: (d, P, T) => [
    { secs: [[-1, 0.46, 0.96, 1], [-0.25, 0.54, 0.96, 1], [0.12, 1, 0.9, 0.98], [0.46, 0.92, 0.9, 0.98], [0.62, 0.5, 0.94, 1], [1, 0.3, 0.84, 1]], segs: [{ top: P, side: P }, { top: M.glass, side: P }, { top: P, side: P }, { top: M.glass, side: P }, { top: P, side: P }], front: { side: P }, back: { side: P } }
  ]
};

/* the meshes for a car in a paint (a palette byte): { body, wheel, antenna, shadow, d } */
export function carModel(id, paint) {
  const c = CARS[id], sp = specOf(id), L = sp.L, W = sp.W, H = sp.H, bx = sp.box;
  const P = flat(paint == null ? c.look.paint : paint), T = flat(c.look.trim);
  const y0 = bx.cy - bx.y, zc = bx.cz, hw = W / 2, hl = L / 2;
  const b = builder();
  /* the chassis plate under the shell */
  box(b, 0, y0 + 0.012, zc, W * 0.92, 0.024, L * 0.98, M.dark);
  for (const part of SHELLS[c.look.shell](sp, P, T)) {
    const secs = part.secs.map(s => ({ z: zc + s[0] * hl, y1: y0 + s[1] * H, y0: y0 + 0.02, hw: hw * s[2], hb: hw * s[3] }));
    loft(b, secs, Object.assign(part.segs.map(s => s), { front: part.front, back: part.back }));
  }
  /* the pickup's open bed, the parcel in it; a milk float's crates; a wedge's wing */
  const ex = c.look.extra || [];
  if (c.look.shell === 'pickup') {
    const bz0 = zc - hl, bz1 = zc - 0.12 * hl, bl = bz1 - bz0, wh = H * 0.5;
    box(b, 0, y0 + 0.03, (bz0 + bz1) / 2, W * 0.96, 0.02, bl, M.rubber);
    box(b, -hw * 0.94, y0 + wh / 2 + 0.02, (bz0 + bz1) / 2, 0.014, wh, bl, P); box(b, hw * 0.94, y0 + wh / 2 + 0.02, (bz0 + bz1) / 2, 0.014, wh, bl, P);
    box(b, 0, y0 + wh / 2 + 0.02, bz0 + 0.007, W * 0.96, wh, 0.014, P);
    if (ex.includes('parcel')) { box(b, 0.015, y0 + 0.04 + 0.03, (bz0 + bz1) / 2 + 0.005, W * 0.5, 0.06, bl * 0.62, M.card, 0.1); box(b, 0.015, y0 + 0.073, (bz0 + bz1) / 2 + 0.005, W * 0.08, 0.004, bl * 0.62, M.tape); }
    if (ex.includes('bobble')) { box(b, 0, y0 + H * 0.74, zc + 0.02 * hl, 0.022, 0.012, 0.022, M.dark); box(b, 0, y0 + H * 0.74 + 0.02, zc + 0.02 * hl, 0.028, 0.028, 0.028, M.face); }
  }
  if (ex.includes('crates')) for (let i = 0; i < 3; i++) box(b, (i - 1) * W * 0.28, y0 + H + 0.012, zc - hl * 0.55, W * 0.24, 0.026, L * 0.2, M.card, 0.1);
  if (ex.includes('spoiler')) { box(b, 0, y0 + H * 0.46 + 0.045, zc - hl * 0.96, W * 0.9, 0.008, 0.045, T); box(b, -hw * 0.6, y0 + H * 0.46 + 0.022, zc - hl * 0.96, 0.008, 0.044, 0.02, T); box(b, hw * 0.6, y0 + H * 0.46 + 0.022, zc - hl * 0.96, 0.008, 0.044, 0.02, T); }
  /* lamps: two at the nose, two at the tail */
  const ly = y0 + H * 0.3;
  for (const sx of [-1, 1]) { box(b, sx * hw * 0.7, ly, zc + hl + 0.002, 0.036, 0.022, 0.008, M.head); box(b, sx * hw * 0.74, ly, zc - hl - 0.002, 0.034, 0.02, 0.008, M.tail); }
  box(b, 0, y0 + 0.022, zc + hl + 0.006, W * 0.88, 0.02, 0.016, T);                              /* the front bumper in the trim colour */
  const body = b.build();
  /* a wheel: axis along x, an octagon, tread on the round and a hub of alternating greys on each face so a spin shows */
  const r = sp.radius, ww = Math.min(0.04, W * 0.17), wb = builder(), seg = 10;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, y0w = Math.cos(a0) * r, z0w = Math.sin(a0) * r, y1w = Math.cos(a1) * r, z1w = Math.sin(a1) * r, am = (a0 + a1) / 2;
    wb.use(M.tyre).quad([-ww / 2, y0w, z0w], [ww / 2, y0w, z0w], [ww / 2, y1w, z1w], [-ww / 2, y1w, z1w], [0, Math.cos(am), Math.sin(am)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    for (const sx of [-1, 1]) wb.use(i % 2 ? M.hubA : M.hubB).tri([sx * ww / 2, 0, 0], [sx * ww / 2, y0w * 0.78, z0w * 0.78], [sx * ww / 2, y1w * 0.78, z1w * 0.78], [sx, 0, 0], [0.5, 0.5], [0, 0], [1, 0]);
    for (const sx of [-1, 1]) wb.use(M.tyre).quad([sx * ww / 2, y0w * 0.78, z0w * 0.78], [sx * ww / 2, y0w, z0w], [sx * ww / 2, y1w, z1w], [sx * ww / 2, y1w * 0.78, z1w * 0.78], [sx, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  const ab = builder(), top = y0 + H;
  box(ab, 0, 0.1, 0, 0.005, 0.2, 0.005, M.chrome); box(ab, 0, 0.205, 0, 0.012, 0.012, 0.012, M.tail);
  const sb = builder(); sb.use(M.shadow);
  { const rx = W * 0.62, rz = L * 0.62, n = 12; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; sb.triSmooth([0, 0, 0], [Math.cos(a0) * rx, 0, Math.sin(a0) * rz], [Math.cos(a1) * rx, 0, Math.sin(a1) * rz], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1], [0, 0], [0, 0]); } }
  return { id, body, wheel: wb.build(), antenna: ab.build(), shadow: sb.build(), antennaAt: [-hw * 0.6, top - 0.01, zc - hl * 0.75], zc, y0, top, L, W, H };
}

/* a 3 x 3 product, row-major */
function mul(a, b, o) {
  o[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6]; o[1] = a[0] * b[1] + a[1] * b[4] + a[2] * b[7]; o[2] = a[0] * b[2] + a[1] * b[5] + a[2] * b[8];
  o[3] = a[3] * b[0] + a[4] * b[3] + a[5] * b[6]; o[4] = a[3] * b[1] + a[4] * b[4] + a[5] * b[7]; o[5] = a[3] * b[2] + a[4] * b[5] + a[5] * b[8];
  o[6] = a[6] * b[0] + a[7] * b[3] + a[8] * b[6]; o[7] = a[6] * b[1] + a[7] * b[4] + a[8] * b[7]; o[8] = a[6] * b[2] + a[7] * b[5] + a[8] * b[8];
}
const MB = new Float64Array(12), MW = new Float64Array(12), ML = new Float64Array(9), MA = new Float64Array(12), MS = new Float64Array(12);
/* draw one car from the sim's state. `ground` is the road's height under it (for the shadow); `opt.ghost` flickers it (a car being put back), `opt.fuse` shortens the antenna (0..1 left) */
export function drawCar(R, model, car, ground, opt) {
  opt = opt || {};
  if (opt.ghost && (Math.floor(opt.ghost * 12) & 1)) return;
  const p = car.p, q = car.q, Rm = car.R, sp = car.spec;
  placeQuat(q[0], q[1], q[2], q[3], p[0], p[1], p[2], MB);
  R.draw(model.body, MB);
  for (let i = 0; i < 4; i++) {
    const W = sp.wheels[i], S = car.wheels[i], lx = W.x, ly = W.y - W.rest + S.comp, lz = W.z;
    rotEuler(W.steer ? car.steer : 0, -S.spin, 0, ML);
    mul(Rm, ML, MW);
    MW[9] = p[0] + Rm[0] * lx + Rm[1] * ly + Rm[2] * lz; MW[10] = p[1] + Rm[3] * lx + Rm[4] * ly + Rm[5] * lz; MW[11] = p[2] + Rm[6] * lx + Rm[7] * ly + Rm[8] * lz;
    R.draw(model.wheel, MW);
  }
  const a = model.antennaAt, f = opt.fuse == null ? 1 : opt.fuse;
  placeQuat(q[0], q[1], q[2], q[3], p[0] + Rm[0] * a[0] + Rm[1] * a[1] + Rm[2] * a[2], p[1] + Rm[3] * a[0] + Rm[4] * a[1] + Rm[5] * a[2], p[2] + Rm[6] * a[0] + Rm[7] * a[1] + Rm[8] * a[2], MA);
  if (f > 0.02) { for (let i = 0; i < 9; i++) if (i === 4) MA[i] *= f; R.draw(model.antenna, MA); }
  if (ground != null && !opt.noShadow) { place(p[0], ground + 0.004, p[2], Math.atan2(Rm[2], Rm[8]), 0, 0, 1, MS); R.draw(model.shadow, MS); }
}
void CYAN;
