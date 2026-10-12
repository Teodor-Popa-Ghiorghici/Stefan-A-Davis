/* THE PROPS OF THE OUTDOOR ROADS (docs/vroom/plan.md section 15): a building made of a few numbers, trees, a parked car, a lamp, the furniture of a street. Each is `(g, o)`: `g` a builder (dress_prims.js `local`) standing at
   the foot of the thing, turned so that its +z faces the road, `o` what is particular about this one. All of them are chunky and few-sided: a toy town seen at 320 x 180. Pure. */
import { box, cylinder, gable, lathe, ellip, pole, torus, wedge, sheetV, cable, bars } from './dress_prims.js'; import { col, lit, tx, two, ix, GREY, BROWN, RED, GREEN, CYAN, BLUE, MAGENTA, COOL } from './dress_mats.js'; import { sign } from './raster_tex.js';
import { mat } from './raster_mesh.js';

const hash = n => { let h = Math.imul(Math.floor(n) + 1, 0x9e3779b1) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
/* a vertical sheet in the plane z = z (facing dir along z) or x = x (facing dir along x), w wide (along the other axis), h tall from y */
/* (a viewer's right: along +x for a face that looks down -z... and the other way for the face that looks down +z, so type reads the right way round on each: u runs to the viewer's right) */
const UV = [[0, 1], [1, 1], [1, 0], [0, 0]], UVR = [[1, 1], [0, 1], [0, 0], [1, 0]];
export const faceZ = (g, x, y, z, w, h, m, dir) => { g.use(m).quad([x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z], [0, 0, dir || 1], (dir || 1) > 0 ? UVR : UV); return g; };
export const faceX = (g, x, y, z, w, h, m, dir) => { g.use(m).quad([x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2], [dir || 1, 0, 0], (dir || 1) > 0 ? UV : UVR); return g; };

/* a building w wide (x) and d deep (z), h tall: o { wall, roof ('flat' | 'gable'), lit (share of lit windows), rows, seed, door, awning (a colour ramp), sign (text), signColor, chimneys, snow, trim } */
export function building(g, o) { const w = o.w, d = o.d, h = o.h, wall = tx(o.wall || 'brick'), snow = tx('snow'), seed = o.seed || 1, k = o.k || 3; box(g, 0, h / 2, 0, w, h, d, { top: o.roof === 'gable' ? wall : snow, side: wall, bottom: null }, k);
  if (o.roof === 'gable') { const rh = Math.min(w, d) * 0.28; gable(g, 0, h, 0, w + 0.3, d + 0.3, h + rh, o.roofTex ? tx(o.roofTex) : tx('shingle'), wall, 1.5); box(g, 0, h + rh + 0.05, 0, w + 0.32, 0.1, 0.35, snow); }
  else box(g, 0, h + 0.1, 0, w + 0.2, 0.2, d + 0.2, snow, 2);
  const rows = o.rows || Math.max(1, Math.floor((h - 1.0) / 1.9)), cols = Math.max(1, Math.floor(w / 2.4)), wm = n => (hash(n * 7 + seed) < (o.lit == null ? 0.65 : o.lit) ? tx('window', { emit: 0.9 }) : tx('glass'));
  for (let r = o.shop ? 1 : 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = (c + 0.5) * w / cols - w / 2, y = 1.0 + r * (h - 1.2) / rows; if (r === 0 && o.door && c === (cols >> 1)) continue; faceZ(g, x, y, d / 2 + 0.03, 1.0, 1.15, wm(r * 31 + c), 1); if (r > 0 && o.sills !== false) box(g, x, y - 0.05, d / 2 + 0.1, 1.2, 0.08, 0.2, tx('concrete')); }
  /* a shop: a long lit display window and its door at one end, a plinth below and a ledge over it, a floor of the building's own above */
  if (o.shop) { const ww = w - 2.3, n = Math.max(1, Math.round(ww / 2.2)), x0 = -w / 2 + 2.0, fx = x => (o.flip ? -x : x);
    for (let i = 0; i < n; i++) faceZ(g, fx(x0 + (i + 0.5) * ww / n), 0.6, d / 2 + 0.04, ww / n - 0.1, 1.85, tx('shopwin', { emit: 0.95 }), 1);
    box(g, fx(-w / 2 + 1.0), 0.75, d / 2 + 0.05, 1.0, 1.5, 0.1, col(BROWN, 4)); box(g, 0, 0.3, d / 2 + 0.06, w, 0.6, 0.1, tx('concrete')); box(g, 0, 2.55, d / 2 + 0.12, w + 0.1, 0.18, 0.3, tx('concrete')); }
  if (o.stuff) for (let i = 0; i < 3; i++) { const x = (hash(seed * 3 + i) - 0.5) * (w - 1.5), z = (hash(seed * 5 + i) - 0.5) * (d - 1.5); if (i === 0) { cylinder(g, x, h + 0.2, z, 0.5, 0.5, 0.9, 7, tx('planks'), 1); box(g, x, h + 1.2, z, 0.1, 0.06, 0.1, col(GREY, 4)); } else if (i === 1) box(g, x, h + 0.7, z, 1.0, 0.7, 0.8, tx('tin'), 1); else pole(g, [x, h + 0.2, z], [x, h + 2.4, z], 0.03, 3, col(GREY, 7)); }
  if (o.sides !== false) for (const sx of [-1, 1]) { const n = Math.max(1, Math.floor(d / 3)); for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) faceX(g, sx * (w / 2 + 0.03), 1.0 + r * (h - 1.2) / rows, (c + 0.5) * d / n - d / 2, 1.0, 1.15, wm(r * 17 + c + (sx > 0 ? 5 : 9)), sx); }
  if (o.door) { const dx = ((cols >> 1) + 0.5) * w / cols - w / 2; box(g, dx, 0.75, d / 2 + 0.04, 1.0, 1.5, 0.1, col(BROWN, 3)); box(g, dx, 0.07, d / 2 + 0.5, 1.4, 0.14, 0.9, tx('concrete'), 1); }
  if (o.awning != null) { const a = o.awning, aw = Math.min(w - 0.4, 5); g.use(tx('stripes')).quad([-aw / 2, 2.5, d / 2 + 1.2], [aw / 2, 2.5, d / 2 + 1.2], [aw / 2, 3.0, d / 2], [-aw / 2, 3.0, d / 2], [0, 0.6, 1], [[0, 0], [aw / 1.2, 0], [aw / 1.2, 1], [0, 1]]); }
  if (o.sign) { const sm = mat(sign(o.sign, ix(GREY, 15), ix(o.signColor == null ? RED : o.signColor, 6), 64, 16), { emit: 0.8 }); faceZ(g, 0, 3.3, d / 2 + 0.06, Math.min(w - 0.6, 4.2), 1.05, sm, 1); }
  for (let i = 0; i < (o.chimneys || 0); i++) { const x = (i % 2 ? 1 : -1) * w * 0.28; box(g, x, h + 0.9, -d * 0.12, 0.7, 1.6, 0.7, tx('brick'), 1); box(g, x, h + 1.78, -d * 0.12, 0.85, 0.16, 0.85, snow); } }
/* a bare tree: a trunk, boughs, a little snow on them */
export function bareTree(g, o) { const h = o.h || 3, bark = col(BROWN, 3), sn = tx('snow'); cylinder(g, 0, 0, 0, h * 0.045, h * 0.03, h * 0.62, 5, bark, 1);
  for (let i = 0; i < 5; i++) { const a = i * 1.9 + (o.seed || 0), y = h * (0.35 + i * 0.1); pole(g, [0, y, 0], [Math.cos(a) * h * 0.3, y + h * 0.22, Math.sin(a) * h * 0.3], h * 0.018, 3, bark); box(g, Math.cos(a) * h * 0.2, y + h * 0.15, Math.sin(a) * h * 0.2, 0.16, 0.05, 0.16, sn); }
}
/* a pine: cones of needles with snow on the shoulders */
export function pine(g, o) { const h = o.h || 3, pn = tx('pine'), sn = tx('snow'); cylinder(g, 0, 0, 0, h * 0.05, h * 0.04, h * 0.3, 5, col(BROWN, 3), 1);
  for (let i = 0; i < 3; i++) { const r = h * (0.38 - i * 0.1), y = h * (0.18 + i * 0.26); cylinder(g, 0, y, 0, r, h * 0.03, h * 0.42, 6, pn, 2); cylinder(g, 0, y + h * 0.26, 0, r * 0.45, h * 0.02, h * 0.12, 6, sn, 2); } }
/* a car parked in the snow: a body, a cab with dark glass, four wheels, a hat of snow. o { ramp, len, truck } */
export function vehicle(g, o) { const L = o.len || 2.2, W = 1.0, c = col(o.ramp == null ? RED : o.ramp, o.lv || 6), sn = o.clean ? col(o.ramp == null ? RED : o.ramp, (o.lv || 6) + 2) : tx('snow'), glass = tx('glass'), rub = tx('rubber');
  box(g, 0, 0.42, 0, W, 0.5, L, c, 1); box(g, 0, 0.94, o.truck ? -L * 0.18 : -L * 0.06, W * 0.92, 0.5, o.truck ? L * 0.34 : L * 0.5, { top: sn, side: glass, bottom: null }, 1); if (o.truck) box(g, 0, 0.78, L * 0.2, W * 0.96, 0.2, L * 0.55, c, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * W * 0.5, 0.2, sz * L * 0.3, 0.16, 0.4, 0.42, rub, 1); box(g, 0, 0.7, 0, W * 0.98, 0.07, L * 0.98, sn, 1); box(g, 0, 0.3, L / 2 + 0.01, 0.8, 0.1, 0.04, lit(BROWN, 14, 0.5)); }
/* a street lamp: a pole, an arm, a lit head; o.h its height */
export function lamp(g, o) { const h = o.h || 3.2, pole0 = col(GREY, 4), head = lit(BROWN, 15), cold = lit(COOL, 15);
  cylinder(g, 0, 0, 0, 0.07, 0.05, h, 5, pole0, 1); pole(g, [0, h, 0], [0, h + 0.05, 0.5], 0.04, 4, pole0); box(g, 0, h + 0.02, 0.55, 0.36, 0.09, 0.3, o.cold ? cold : head); box(g, 0, 0.1, 0, 0.3, 0.2, 0.3, pole0, 1); }
export function hydrant(g) { lathe(g, 0, 0, 0, [[0.16, 0], [0.12, 0.05], [0.1, 0.45], [0.14, 0.5], [0.09, 0.62], [0, 0.66]], 6, col(RED, 6)); box(g, 0, 0.32, 0, 0.36, 0.08, 0.1, col(RED, 5)); }
export function bin(g) { cylinder(g, 0, 0, 0, 0.2, 0.17, 0.65, 7, col(GREEN, 4), 1); cylinder(g, 0, 0.65, 0, 0.22, 0.2, 0.06, 7, col(GREEN, 6), 1); }
export function bench(g, o) { const w = o && o.w || 1.8, wd = tx('planks'); box(g, 0, 0.42, 0, w, 0.08, 0.45, wd, 1); box(g, 0, 0.75, -0.2, w, 0.4, 0.06, wd, 1); for (const sx of [-1, 1]) box(g, sx * (w / 2 - 0.1), 0.2, 0, 0.08, 0.4, 0.4, col(GREY, 3), 1); box(g, 0, 0.47, 0, w, 0.05, 0.5, tx('snow'), 1); }
export function mailbox(g) { box(g, 0, 0.5, 0, 0.42, 0.7, 0.34, col(BLUE, 7), 1); cylinder(g, 0, 0.8, 0, 0.21, 0.21, 0.34, 7, col(BLUE, 8), 1); box(g, 0, 0.72, 0.18, 0.28, 0.04, 0.02, col(GREY, 2)); }
export function phonebox(g) { box(g, 0, 1.1, 0, 0.9, 2.2, 0.9, col(RED, 7), 1); for (const z of [0.46, -0.46]) faceZ(g, 0, 0.5, z, 0.62, 1.4, tx('window', { emit: 0.7 }), z > 0 ? 1 : -1); box(g, 0, 2.28, 0, 1.0, 0.1, 1.0, tx('snow')); }
export function busStop(g, o) { box(g, 0, 1.1, -0.5, 2.6, 2.2, 0.08, tx('glass'), 1); box(g, -1.3, 1.1, 0, 0.08, 2.2, 1.0, tx('glass'), 1); box(g, 0, 2.2, 0, 2.8, 0.1, 1.2, col(GREY, 5), 1); box(g, 0, 2.28, 0, 2.7, 0.08, 1.1, tx('snow')); faceZ(g, 0.5, 0.7, -0.44, 1.0, 1.4, mat(sign(o && o.ad || 'ADS', ix(GREY, 15), ix(MAGENTA, 6), 64, 16), { emit: 0.7 }), 1); box(g, -0.4, 0.45, -0.2, 1.4, 0.07, 0.4, tx('planks'), 1); }
/* a sign on a post: text on a coloured board. o { text, ramp, h } */
export function signpost(g, o) { const h = o.h || 2.2; cylinder(g, 0, 0, 0, 0.04, 0.04, h, 4, col(GREY, 4), 1); faceZ(g, 0, h - 0.5, 0.05, 0.9, 0.5, mat(sign(o.text, ix(GREY, 15), ix(o.ramp == null ? BLUE : o.ramp, 6), 64, 16), { emit: 0.3 }), 1); box(g, 0, h - 0.5, 0, 0.92, 0.52, 0.02, col(GREY, 3)); }
/* traffic light: a post and a box with three lamps; the lit one is `o.on` (0 red, 1 amber, 2 green) */
export function trafficLight(g, o) { cylinder(g, 0, 0, 0, 0.05, 0.05, 3, 5, col(GREY, 3), 1); box(g, 0, 3.2, 0, 0.3, 0.9, 0.3, col(GREY, 2), 1); [[RED, 12], [BROWN, 13], [GREEN, 12]].forEach(([r, l], i) => box(g, 0, 3.52 - i * 0.28, 0.16, 0.2, 0.2, 0.04, i === (o.on || 0) ? lit(r, l) : col(r, 2))); }
export function bollard(g, o) { cylinder(g, 0, 0, 0, 0.1, 0.1, 0.7, 6, col(o && o.ramp != null ? o.ramp : BROWN, 11), 1); box(g, 0, 0.62, 0, 0.22, 0.05, 0.22, col(GREY, 15)); }
export function cone(g) { cylinder(g, 0, 0, 0, 0.17, 0.03, 0.55, 6, col(RED, 10), 1); box(g, 0, 0.02, 0, 0.4, 0.04, 0.4, col(GREY, 3)); cylinder(g, 0, 0.26, 0, 0.1, 0.07, 0.1, 6, col(GREY, 15), 1); }
export function barrel(g, o) { cylinder(g, 0, 0, 0, 0.3, 0.3, 0.9, 8, tx('drum'), 1); box(g, 0, 0.9, 0, 0.5, 0.03, 0.5, o && o.snow ? tx('snow') : col(RED, 4)); }
export function snowman(g) { ellip(g, 0, 0.35, 0, 0.38, 0.35, 0.38, 8, tx('snow')); ellip(g, 0, 0.95, 0, 0.28, 0.27, 0.28, 8, tx('snow')); ellip(g, 0, 1.4, 0, 0.2, 0.2, 0.2, 7, tx('snow')); cylinder(g, 0.2, 1.38, 0.05, 0.03, 0.01, 0.22, 4, col(BROWN, 11), 1); cylinder(g, 0, 1.58, 0, 0.14, 0.14, 0.2, 6, col(GREY, 2), 1); for (let i = 0; i < 3; i++) box(g, 0.01, 0.8 + i * 0.16, 0.26, 0.05, 0.05, 0.03, col(GREY, 1)); }
/* a Christmas-ish fir with lights on it, for a park */
export function xmasTree(g, o) { pine(g, { h: o && o.h || 4 }); const h = o && o.h || 4; for (let i = 0; i < 12; i++) { const a = i * 2.4, y = h * (0.2 + (i % 6) * 0.1), r = h * (0.34 - (y / h - 0.2) * 0.6); box(g, Math.cos(a) * r, y, Math.sin(a) * r, 0.1, 0.1, 0.1, lit([RED, GREEN, BROWN, CYAN][i & 3], 13)); } box(g, 0, h + 0.05, 0, 0.3, 0.3, 0.3, lit(BROWN, 15)); }
/* a Ferris wheel: two A-frames, a ring of spokes and gondolas (o.r the radius). Its wheel is separate (the gondolas turn), see ferrisWheel's `wheel` */
export function ferrisBase(g, o) { const r = o.r || 3.2; for (const sx of [-0.5, 0.5]) { pole(g, [sx, r * 1.05, -0.4], [sx, 0, -1.8], 0.08, 4, col(GREY, 5)); pole(g, [sx, r * 1.05, -0.4], [sx, 0, 1.0], 0.08, 4, col(GREY, 5)); } box(g, 0, 0.2, -0.4, 1.6, 0.3, 3, tx('concrete'), 1); }
export function ferrisWheel(g, o) { const r = o.r || 3.2; for (const sx of [-0.35, 0.35]) torus(g, sx, 0, 0, r, 0.05, 20, 3, col(GREY, 12), 'x');
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pole(g, [0, 0, 0], [0, c * r, s * r], 0.03, 3, col(GREY, 9)); box(g, 0, c * r - 0.25, s * r, 0.7, 0.5, 0.55, lit([RED, GREEN, BROWN, CYAN, MAGENTA, BLUE, RED, GREEN][i], 10, 0.7), 1); }
}
