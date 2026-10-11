/* PROCEDURAL TEXTURES. Nothing here is a photograph or a picture of one: every texel of every surface in the town is made by a few lines of arithmetic from a seed, in the way Magen's scene tiles are, so
   the same name gives the same bytes on every machine (raster_check.js hashes them). A texture is { w, h, d }: a power of two each way (8 to 64) and one palette byte (palette.js) a texel, ramp * 16 + level, or
   CLEAR (255) for a hole you can see through (a fence, a wire, a leaf). Light moves a texel along its own ramp afterwards, so a texture carries its colours and a surface is lit at the pixel.
   `tex.snow()` and the rest are made once, on first use. Pure. */
import { ix, GREY, BLUE, GREEN, CYAN, RED, BROWN, COOL, CLEAR } from './palette.js';
import { F3, drawText, widthOf } from '../pixtext.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* a tileable value noise: a g x g grid of random values, smooth-stepped between, wrapping at the edges. x and y in 0..1 */
function grid(seed, g) { const r = rng(seed), a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = r(); return a; }
function at(a, g, x, y) {
  const fx = x * g, fy = y * g, x0 = Math.floor(fx), y0 = Math.floor(fy);
  let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const X0 = ((x0 % g) + g) % g, Y0 = ((y0 % g) + g) % g, X1 = (X0 + 1) % g, Y1 = (Y0 + 1) % g;
  const top = a[Y0 * g + X0] * (1 - tx) + a[Y0 * g + X1] * tx, bot = a[Y1 * g + X0] * (1 - tx) + a[Y1 * g + X1] * tx;
  return top * (1 - ty) + bot * ty;
}
/* three octaves of it, 0..1 */
function fbm(seed) {
  const g1 = grid(seed, 4), g2 = grid(seed + 1, 8), g3 = grid(seed + 2, 16);
  return (x, y) => at(g1, 4, x, y) * 0.5 + at(g2, 8, x, y) * 0.3 + at(g3, 16, x, y) * 0.2;
}
/* build a texture: fn(x, y, u, v, n) -> palette byte, u and v in 0..1, n a noise of that seed in 0..1 */
function make(w, h, seed, fn) {
  const d = new Uint8Array(w * h), n = fbm(seed), r = rng(seed * 7 + 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = fn(x, y, x / w, y / h, n(x / w, y / h), r);
  return { w, h, ws: Math.log2(w), d };
}
const L = (ramp, level) => ix(ramp, level);

const GEN = {
  /* new snow: a cool white with blue pockets and a glitter */
  snow: () => make(32, 32, 11, (x, y, u, v, n, r) => { const s = r(); return s < 0.02 ? L(COOL, 15) : n < 0.3 ? L(COOL, 10 + (s < 0.5 ? 0 : 1)) : L(COOL, 12 + n * 3.4 + (s - 0.5) * 0.8); }),
  /* old snow on a road: grey, a little brown where the wheels have been */
  slush: () => make(32, 32, 12, (x, y, u, v, n, r) => (n > 0.62 ? L(BROWN, 3 + (r() < 0.5 ? 0 : 1)) : L(GREY, 6 + n * 5 + (r() - 0.5) * 1.2))),
  /* deep, unbroken snow: whiter, with lines drifted across it */
  drift: () => make(32, 32, 13, (x, y, u, v, n, r) => L(COOL, 12.5 + Math.sin((v + n * 0.6) * Math.PI * 4) * 1.2 + (r() - 0.5) * 0.7)),
  /* asphalt with two worn tracks down it (u is across the road) */
  asphalt: () => make(32, 32, 14, (x, y, u, v, n, r) => {
    const track = Math.max(Math.exp(-((u - 0.3) ** 2) / 0.004), Math.exp(-((u - 0.7) ** 2) / 0.004));
    return r() < 0.03 ? L(GREY, 8) : L(GREY, 3.2 + n * 1.6 - track * 1.4 + (r() - 0.5) * 0.9);
  }),
  /* a yellow centre dash on nothing (a decal: lay it over asphalt) */
  dash: () => make(32, 32, 15, (x, y) => (x >= 14 && x <= 17 && y < 20 ? L(BROWN, 11 - (x === 14 || x === 17 ? 1 : 0)) : CLEAR)),
  /* a white kerb line on nothing */
  edge: () => make(32, 32, 16, (x) => (x <= 2 ? L(GREY, 13) : CLEAR)),
  concrete: () => make(32, 32, 17, (x, y, u, v, n, r) => L(GREY, 5.5 + n * 2.2 + (r() - 0.5) * 0.8)),
  /* the sorting-room floor: lino tiles, green-grey, with a dark seam */
  lino: () => make(32, 32, 18, (x, y, u, v, n, r) => {
    if (x % 16 === 0 || y % 16 === 0) return L(GREY, 3);
    const alt = ((x >> 4) + (y >> 4)) & 1;
    return L(alt ? GREEN : CYAN, (alt ? 5.6 : 4.8) + n * 1.4 + (r() - 0.5) * 0.7);
  }),
  /* a cardboard box: tan, fluted across, with a stripe of tape down it */
  cardboard: () => make(32, 32, 19, (x, y, u, v, n, r) => {
    if (x >= 14 && x <= 17) return L(BROWN, 11 + (x === 15 ? 1 : 0) - (y % 8 === 0 ? 1 : 0));
    return L(BROWN, 6.6 + Math.sin(y * Math.PI / 2) * 0.55 + n * 1.1 + (r() - 0.5) * 0.5);
  }),
  /* corrugated iron: ribs that catch the light, a speck of rust */
  tin: () => make(32, 32, 20, (x, y, u, v, n, r) => (r() < 0.015 ? L(RED, 5) : L(COOL, 9.4 + Math.sin(x * Math.PI / 2) * 2.2 + n * 1.2 + (r() - 0.5) * 0.5))),
  brick: () => make(32, 32, 21, (x, y, u, v, n, r) => {
    const row = y >> 2, off = (row & 1) * 4, bx = (x + off) & 31, mortar = (y & 3) === 3 || (bx & 7) === 7;
    if (mortar) return L(COOL, 8 + (r() < 0.2 ? 2 : 0));
    const k = ((((x + off) >> 3) * 7 + row * 13) % 5) - 2;
    return L(RED, 4.2 + k * 0.5 + n * 1.2 + (r() - 0.5) * 0.6);
  }),
  planks: () => make(32, 32, 22, (x, y, u, v, n, r) => {
    const row = y >> 3, edge = (y & 7) === 7, base = 4 + ((row * 5 + 3) % 4) * 0.5;
    return edge ? L(BROWN, 2) : L(BROWN, base + Math.sin((x + row * 9) * 0.5) * 0.4 + n * 1.2 + (r() - 0.5) * 0.5);
  }),
  /* dark painted board, for doors and the diner's cupboards */
  board: () => make(32, 32, 23, (x, y, u, v, n, r) => L(COOL, 3.5 + n * 1.5 + ((x & 7) === 0 ? -1 : 0) + (r() - 0.5) * 0.4)),
  /* a lit window: warm glass in a cross of frame */
  window: () => make(16, 16, 24, (x, y, u, v, n) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8 ? L(COOL, 4) : L(BROWN, 11.5 + n * 2.5))),
  /* a dark window with a glint */
  glass: () => make(16, 16, 25, (x, y, u, v, n) => (x === 0 || y === 0 || x === 15 || y === 15 ? L(COOL, 5) : L(COOL, 3 + n * 2 + (x + y > 9 && x + y < 13 ? 4 : 0)))),
  /* a conveyor belt: dark rubber with chevrons, yellow rails */
  belt: () => make(32, 32, 26, (x, y, u, v, n, r) => {
    if (x < 3 || x > 28) return L(BROWN, x === 0 || x === 31 ? 8 : 10);
    const chev = ((Math.abs(x - 15.5) + y) & 15) < 2;
    return L(GREY, (chev ? 5 : 2.4) + n * 0.8 + (r() - 0.5) * 0.4);
  }),
  /* a steel floor plate with rivets */
  plate: () => make(32, 32, 27, (x, y, u, v, n, r) => ((x & 15) === 2 && (y & 15) === 2 ? L(GREY, 12) : (x & 15) === 0 || (y & 15) === 0 ? L(COOL, 4) : L(COOL, 7.5 + n * 2 + (r() - 0.5) * 0.5))),
  /* checker tile: the diner's counter and floor */
  checker: () => make(32, 32, 28, (x, y, u, v, n, r) => (((x >> 3) + (y >> 3)) & 1 ? L(RED, 7 + (r() - 0.5) * 0.6) : L(GREY, 13.5 + (r() - 0.5) * 0.6))),
  /* carpet */
  carpet: () => make(32, 32, 29, (x, y, u, v, n, r) => L(BLUE, 4.2 + n * 1.2 + (r() - 0.5) * 1.1)),
  /* a fence of pickets (see-through) */
  fence: () => make(32, 32, 30, (x, y, u, v, n, r) => {
    const rail = (y >= 6 && y <= 8) || (y >= 22 && y <= 24), picket = (x & 7) >= 1 && (x & 7) <= 5;
    if (!rail && !picket) return CLEAR;
    if (picket && y < 3 && (x & 7) !== 3) return CLEAR;
    return L(BROWN, 5 + n * 2 + (rail ? -1 : 0) + (r() - 0.5) * 0.5);
  }),
  /* pine needles for a tree: dark green with snow caught in it */
  pine: () => make(32, 32, 31, (x, y, u, v, n, r) => (r() < 0.12 + n * 0.12 ? L(COOL, 13) : L(GREEN, 2.6 + n * 2 + (r() - 0.5) * 0.8))),
  /* black rubber, for tyres and the underside of things */
  rubber: () => make(16, 16, 32, (x, y, u, v, n) => L(GREY, 1.4 + n * 1.2)),
  /* the dark underside of a counter, a shelf, a lorry */
  under: () => make(16, 16, 33, (x, y, u, v, n) => L(COOL, 2 + n * 1.5))
};

const made = {};
export const tex = new Proxy({}, { get: (_, name) => () => (made[name] || (made[name] = GEN[name]())) });
export const TEXTURE_NAMES = Object.keys(GEN);

/* a plain colour as a texture, one texel, made once per colour */
const flats = {};
export const flat = idx => flats[idx] || (flats[idx] = { w: 8, h: 8, ws: 3, d: new Uint8Array(64).fill(idx) });

/* a sign: pixel type on a coloured board, `w` x `h` texels (powers of two). The text is cut to what fits. */
export function sign(text, fg, bg, w, h) {
  w = w || 64; h = h || 16;
  const d = new Uint8Array(w * h).fill(bg);
  const R = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const px = x + i, py = y + j; if (px >= 0 && py >= 0 && px < w && py < h) d[py * w + px] = c; } };
  for (let i = 0; i < w; i++) { d[i] = fg; d[(h - 1) * w + i] = fg; }
  for (let j = 0; j < h; j++) { d[j * w] = fg; d[j * w + w - 1] = fg; }
  let s = String(text).toUpperCase(); while (s.length > 1 && widthOf(s, F3) > w - 4) s = s.slice(0, -1);
  drawText(R, s, w / 2, Math.floor((h - 5) / 2), fg, F3);
  return { w, h, ws: Math.log2(w), d };
}
