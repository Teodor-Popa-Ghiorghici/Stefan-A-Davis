/* MORE OF THE TOWN (docs/vroom/plan.md section 15): the things a street has besides its houses -- a market stall, a picket fence, a church with a spire and a lit clock, a playground, a gazebo, a fire in a drum, a flag, the
   reflector posts that stand along a kerb. Each is `(g, o)` like dress_props.js: `g` at its foot, +z toward the road. Pure. */
import { box, cylinder, gable, pole, bars, torus, lathe, ellip, cable } from './dress_prims.js'; import { faceZ, faceX } from './dress_props.js'; import { col, lit, tx, two, ix, GREY, BROWN, RED, GREEN, CYAN, BLUE, MAGENTA, COOL } from './dress_mats.js';
import { sign } from './raster_tex.js'; import { mat } from './raster_mesh.js';

const board = (text, fg, bg, e) => mat(sign(text, ix(GREY, fg == null ? 15 : fg), ix(bg == null ? RED : bg, 6), 64, 16), { emit: e == null ? 0.7 : e });
/* a reflector post: white, a red band and a lamp at the top that shows a driver where the kerb goes */
export const delineator = (g, o) => { cylinder(g, 0, 0, 0, 0.045, 0.035, 0.95, 5, col(GREY, 14), 1); box(g, 0, 0.8, 0, 0.1, 0.14, 0.1, col(RED, 8)); box(g, 0, 0.93, 0, 0.09, 0.07, 0.09, lit(o && o.ramp != null ? o.ramp : RED, 14)); };
/* a market stall: four posts, a striped roof, a counter with goods on it and a string of lamps */
export function stall(g, o) { const w = o.w || 2.6, ramp = o.ramp == null ? RED : o.ramp, wd = tx('planks'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) pole(g, [sx * (w / 2 - 0.08), 0, sz * 0.7], [sx * (w / 2 - 0.08), 2.3, sz * 0.7], 0.04, 4, wd);
  g.use(two('stripes')).quad([-w / 2 - 0.1, 2.5, -0.95], [w / 2 + 0.1, 2.5, -0.95], [w / 2 + 0.1, 2.25, 0.95], [-w / 2 - 0.1, 2.25, 0.95], [0, 0.4, 1], [[0, 0], [w * 1.2, 0], [w * 1.2, 1], [0, 1]]);
  box(g, 0, 0.5, 0.4, w - 0.2, 0.9, 0.5, wd, 1); box(g, 0, 0.97, 0.4, w - 0.1, 0.06, 0.6, tx('snow'));
  for (let i = 0; i < 5; i++) box(g, -w / 2 + 0.35 + i * (w - 0.7) / 4, 1.12, 0.4, 0.22, 0.22 + (i % 3) * 0.08, 0.22, lit([RED, GREEN, BROWN, CYAN, MAGENTA][(i + ramp) % 5], 9, 0.5));
  box(g, 0, 2.12, 0.5, 0.2, 0.2, 0.2, lit(BROWN, 15)); faceZ(g, 0, 1.55, 0.75, w * 0.6, 0.38, board(o.text || 'HOT COCOA', 15, ramp), 1); }
/* a picket fence of `w` metres with a snow cap, standing along x */
export function fence(g, o) { const w = o.w || 4; bars(g, [-w / 2, 0, 0], [w / 2, 0, 0], 0.8, 0.22, 0.03, tx('planks')); box(g, 0, 0.84, 0, w, 0.05, 0.12, tx('snow')); }
export function hedge(g, o) { const w = o.w || 3; box(g, 0, 0.4, 0, w, 0.8, 0.8, { top: tx('snow'), side: tx('hedge'), bottom: null }, 1); }
export const planter = (g, o) => { box(g, 0, 0.25, 0, o && o.w || 1.2, 0.5, 0.5, tx('planks'), 1); box(g, 0, 0.55, 0, (o && o.w || 1.2) - 0.1, 0.12, 0.4, tx('snow')); };
/* a church: a nave with a steep roof, a tower with a lit clock and a spire, tall lit windows. o.w the nave's width */
export function church(g, o) { const w = o.w || 7, d = o.d || 11, wall = tx(o.wall || 'brick'), sn = tx('snow'), win = tx('window', { emit: 0.95 });
  box(g, 0, 2.6, 0, w, 5.2, d, { top: wall, side: wall, bottom: null }, 3); gable(g, 0, 5.2, 0, w + 0.5, d + 0.4, 8.2, tx('shingle'), wall, 1.5); box(g, 0, 5.2 + 1.7, 0, 0.1, 3.4, d + 0.5, tx('snow'));
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) faceX(g, sx * (w / 2 + 0.03), 1.6, -d / 2 + 2.6 + i * 3, 0.9, 2.4, win, sx); box(g, 0, 4.4, d / 2 - 0.9, 3.0, 8.8, 3.0, wall, 3); box(g, 0, 9.0, d / 2 - 0.9, 3.3, 0.3, 3.3, sn);
  cylinder(g, 0, 9.1, d / 2 - 0.9, 1.7, 0.04, 4.6, 4, tx('shingle'), 2); box(g, 0, 13.8, d / 2 - 0.9, 0.06, 1.0, 0.06, col(GREY, 10));
  faceZ(g, 0, 6.2, d / 2 + 0.64, 1.6, 1.6, mat(sign('12', ix(GREY, 15), ix(COOL, 4), 32, 16), { emit: 0.9 }), 1); faceZ(g, 0, 2.2, d / 2 + 0.64, 1.4, 2.0, win, 1);
  box(g, 0, 0.9, d / 2 + 0.65, 1.2, 1.8, 0.12, col(BROWN, 3)); box(g, 0, 0.1, d / 2 + 1.3, 3, 0.2, 1.4, tx('concrete'), 1); }
/* a playground: a swing frame with two seats, and a slide */
export function swings(g) { for (const sx of [-1.2, 1.2]) { pole(g, [sx, 2.2, 0], [sx - 0.4, 0, 0.8], 0.04, 4, col(GREY, 6)); pole(g, [sx, 2.2, 0], [sx - 0.4, 0, -0.8], 0.04, 4, col(GREY, 6)); } pole(g, [-1.2, 2.2, 0], [1.2, 2.2, 0], 0.05, 4, col(GREY, 8)); for (const sx of [-0.5, 0.5]) { pole(g, [sx, 2.2, 0], [sx, 0.5, 0], 0.012, 3, col(GREY, 4)); box(g, sx, 0.45, 0, 0.4, 0.05, 0.2, col(RED, 7)); } }
export function slide(g) { pole(g, [-0.5, 1.6, -0.4], [-0.5, 0, -0.4], 0.04, 4, col(GREY, 6)); pole(g, [0.5, 1.6, -0.4], [0.5, 0, -0.4], 0.04, 4, col(GREY, 6)); box(g, 0, 1.6, -0.4, 1.2, 0.06, 0.5, tx('planks')); g.use(tx('tin')).quad([-0.35, 1.62, -0.15], [0.35, 1.62, -0.15], [0.35, 0.1, 1.9], [-0.35, 0.1, 1.9], [0, 0.8, 0.5], [[0, 0], [1, 0], [1, 3], [0, 3]]); }
/* a gazebo: six posts, a ring of benches and a pointed roof with a lamp under it */
export function gazebo(g, o) { const r = o.r || 1.8; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; pole(g, [Math.cos(a) * r, 0, Math.sin(a) * r], [Math.cos(a) * r, 2.4, Math.sin(a) * r], 0.06, 4, col(GREY, 13)); }
  cylinder(g, 0, 2.4, 0, r * 1.25, 0.05, 1.0, 6, tx('shingle'), 2); cylinder(g, 0, 2.7, 0, r * 0.6, 0.04, 0.4, 6, tx('snow'), 2); box(g, 0, 2.3, 0, 0.18, 0.18, 0.18, lit(BROWN, 15)); cylinder(g, 0, 0, 0, r * 1.05, r * 1.05, 0.14, 6, tx('planks'), 1); }
/* a fire in a drum: the drum and its grate (the flame is a flasher: dress_ext.js) */
export const fireDrum = (g) => { cylinder(g, 0, 0, 0, 0.32, 0.3, 0.8, 8, tx('drum'), 1); box(g, 0, 0.82, 0, 0.5, 0.05, 0.5, col(GREY, 3)); };
export const flame = (g, o) => { box(g, 0, 0.9, 0, 0.28, 0.3, 0.28, lit(BROWN, o ? 14 : 12, 0.95)); box(g, 0, 1.12, 0, 0.14, 0.26, 0.14, lit(RED, o ? 12 : 10, 0.95)); };
/* a flag on a tall pole */
export function flag(g, o) { const h = o.h || 6; cylinder(g, 0, 0, 0, 0.06, 0.04, h, 5, col(GREY, 12), 1); box(g, 0, h + 0.05, 0, 0.14, 0.14, 0.14, col(BROWN, 14)); g.use(mat(sign(o.text || 'SALE', ix(GREY, 15), ix(o.ramp == null ? RED : o.ramp, 6), 64, 16), { emit: 0.4, double: true })).quad([0.04, h - 0.9, 0], [1.4, h - 0.9, 0.2], [1.4, h - 0.1, 0.2], [0.04, h - 0.1, 0], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]); }
/* a sandwich board on the pavement */
export const boardA = (g, o) => { for (const sx of [-1, 1]) pole(g, [sx * 0.28, 0, -0.18], [sx * 0.2, 0.9, 0], 0.025, 3, col(GREY, 5)); faceZ(g, 0, 0.25, 0.06, 0.62, 0.62, board(o && o.text || 'OPEN', 15, o && o.ramp != null ? o.ramp : GREEN, 0.5), 1); };
/* a Christmas wreath on a door and a string of lights along an eave (lights are lit boxes: `n` of them) */
export const lights = (g, o) => { const w = o.w || 6, n = Math.round(w / 0.5); for (let i = 0; i < n; i++) box(g, -w / 2 + (i + 0.5) * w / n, (o.y || 3.1) - 0.06 * (i % 2), 0.05, 0.1, 0.1, 0.1, lit([RED, GREEN, BROWN, CYAN, MAGENTA][(i + (o.seed || 0)) % 5], 13, 0.95)); };
/* a drift of snow piled against a wall: a long low hill (a stretched lathe) */
export const drift = (g, o) => ellip(g, 0, 0.1, 0, o && o.w || 2.4, o && o.h || 0.5, 1.0, 9, tx('snow'), 3);
/* a skating pond: a flat sheet of ice with a rim of snow, with a lamp at each end. o.w x o.d */
export function pond(g, o) { const w = o.w || 10, d = o.d || 7; g.use(tx('ice')).quad([-w / 2, 0.03, -d / 2], [-w / 2, 0.03, d / 2], [w / 2, 0.03, d / 2], [w / 2, 0.03, -d / 2], [0, 1, 0], [[0, 0], [0, d / 4], [w / 4, d / 4], [w / 4, 0]]); for (const sz of [-1, 1]) box(g, 0, 0.12, sz * (d / 2 + 0.2), w + 0.8, 0.25, 0.5, tx('snow'), 2); for (const sx of [-1, 1]) box(g, sx * (w / 2 + 0.2), 0.12, 0, 0.5, 0.25, d, tx('snow'), 2); }
/* a leafy tree (summer): a trunk and three round crowns */
export function tree(g, o) { const h = o.h || 4, lf = tx('hedge'); cylinder(g, 0, 0, 0, h * 0.05, h * 0.04, h * 0.55, 6, col(BROWN, 4), 1); ellip(g, 0, h * 0.72, 0, h * 0.34, h * 0.27, h * 0.34, 8, lf, 2); ellip(g, h * 0.14, h * 0.92, h * 0.06, h * 0.22, h * 0.2, h * 0.22, 7, lf, 2); ellip(g, -h * 0.16, h * 0.84, -h * 0.06, h * 0.2, h * 0.18, h * 0.2, 7, lf, 2); }
export const shrub = g => ellip(g, 0, 0.32, 0, 0.7, 0.36, 0.7, 7, tx('hedge'), 1);
/* a bed of flowers: a low brick-brown box with a dozen bright heads on it */
export function flowerbed(g, o, r) { const w = o.w || 2, d = o.d || 1; box(g, 0, 0.15, 0, w, 0.3, d, col(BROWN, 4), 1); box(g, 0, 0.32, 0, w - 0.1, 0.06, d - 0.1, col(GREEN, 4)); for (let i = 0; i < 14; i++) box(g, (r() - 0.5) * (w - 0.3), 0.45, (r() - 0.5) * (d - 0.3), 0.12, 0.14, 0.12, lit([RED, MAGENTA, BROWN, CYAN, BLUE][i % 5], 11, 0.4)); }
/* a blimp with a lit sign on its flank, and a hot air balloon with its basket: things that go over (movers: built round their own middle) */
export const blimp = (b, text) => { ellip(b, 0, 0, 0, 3.6, 1.2, 1.2, 9, col(COOL, 12), 1); box(b, 0, -1.3, 0, 1.2, 0.5, 0.7, col(GREY, 5)); for (const sy of [-1, 1]) box(b, -3.2, sy * 0.9, 0, 0.8, 0.12, 0.9, col(COOL, 8)); box(b, -3.2, 0, 0.9 * 0, 0.8, 1.8, 0.1, col(COOL, 8)); b.use(mat(sign(text || 'FAIR', ix(GREY, 15), ix(RED, 6), 64, 16), { emit: 0.9, double: true })).quad([-1.9, -0.5, 1.12], [1.9, -0.5, 1.12], [1.9, 0.5, 1.12], [-1.9, 0.5, 1.12], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]); box(b, 3.4, 0, 0, 0.2, 0.2, 0.2, lit(RED, 14, 1)); };
export const balloon = b => { ellip(b, 0, 0, 0, 3.2, 3.6, 3.2, 10, tx('stripes'), 2); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pole(b, [x * 1.4, -3.0, z * 1.4], [x * 0.4, -5.2, z * 0.4], 0.04, 3, col(BROWN, 5)); box(b, 0, -5.6, 0, 1.2, 0.8, 1.2, tx('planks'), 1); box(b, 0, -3.9, 0, 0.4, 0.2, 0.4, lit(BROWN, 15, 1)); };
void gable; void torus; void lathe; void cable; void MAGENTA; void BLUE;
