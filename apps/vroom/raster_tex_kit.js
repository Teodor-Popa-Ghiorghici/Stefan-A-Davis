/* THE TEXTURE MAKER'S TOOLS, shared by raster_tex.js (the town's own textures) and raster_tex_b.js (the dressing's): a seeded dice, a tileable noise, and `make`, which builds a texture texel by texel from a function.
   Pure. */
import { ix } from './palette.js';

export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* a tileable value noise: a g x g grid of random values, smooth-stepped between, wrapping at the edges. x and y in 0..1 */
function grid(seed, g) { const r = rng(seed), a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = r(); return a; } function at(a, g, x, y) { const fx = x * g, fy = y * g, x0 = Math.floor(fx), y0 = Math.floor(fy);
  let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty); const X0 = ((x0 % g) + g) % g, Y0 = ((y0 % g) + g) % g, X1 = (X0 + 1) % g, Y1 = (Y0 + 1) % g;
  const top = a[Y0 * g + X0] * (1 - tx) + a[Y0 * g + X1] * tx, bot = a[Y1 * g + X0] * (1 - tx) + a[Y1 * g + X1] * tx; return top * (1 - ty) + bot * ty; }
/* three octaves of it, 0..1 */
function fbm(seed) { const g1 = grid(seed, 4), g2 = grid(seed + 1, 8), g3 = grid(seed + 2, 16); return (x, y) => at(g1, 4, x, y) * 0.5 + at(g2, 8, x, y) * 0.3 + at(g3, 16, x, y) * 0.2; }
/* build a texture: fn(x, y, u, v, n) -> palette byte, u and v in 0..1, n a noise of that seed in 0..1 */
export function make(w, h, seed, fn) { const d = new Uint8Array(w * h), n = fbm(seed), r = rng(seed * 7 + 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = fn(x, y, x / w, y / h, n(x / w, y / h), r);
  return { w, h, ws: Math.log2(w), d }; } export const L = (ramp, level) => ix(ramp, level);

