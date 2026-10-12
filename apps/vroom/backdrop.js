/* THE HORIZON (docs/vroom/plan.md section 15): what stands round the whole world and never gets nearer. A road with sky over it has a panorama (raster.js `panorama`): ridges of mountains with snow on them, a skyline
   with its windows lit, a moon and stars, an aurora over the harbour, clouds. Each is 1024 columns (all the way round, so it joins itself) and 40 to 96 rows, made once from seeded arithmetic like the textures
   (nothing is a picture of anything) and kept. Far things are pale and hazy, near ones dark: the same trick as the fog, painted. Pure. */
import { ix, GREY, COOL, BROWN, GREEN, CYAN, BLUE, MAGENTA, RED, CLEAR } from './palette.js';

const W = 1024; const hash = (i, s) => { let h = Math.imul(i * 374761393 + s * 668265263, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/* a height that is 0..1 and comes round to where it started: waves of whole numbers of cycles over the width */
const waves = (s, f) => { const ph = f.map((_, i) => hash(i, s) * 6.283); return x => { let v = 0, t = 0; f.forEach((q, i) => { const a = 1 / (1 + i * 0.8); v += Math.sin(x / W * 6.283 * q + ph[i]) * a; t += a; }); return (v / t + 1) / 2; }; };
const canvas = h => { const d = new Uint8Array(W * h).fill(CLEAR); return { w: W, h, d, set(x, y, c) { x = ((x % W) + W) % W; if (y >= 0 && y < h) d[y * W + x] = c; }, rect(x, y, w, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); } }; };
const dith = (x, y) => ((x * 3 + y * 5) & 3) / 4 + ((x + y) & 1) * 0.06;

/* a ridge of mountains: from `base` rows up to `amp` more, the rock `ramp`/`lv` (lighter toward the top by `grad` levels), with snow above the line at `cap` (0..1 of the way up) */
function ridge(c, o) { const f = waves(o.seed, o.freq || [2, 3, 5, 9, 17, 31]); for (let x = 0; x < W; x++) { const hh = o.base + Math.pow(f(x), o.pow || 1.5) * o.amp + (hash(x >> 1, o.seed) - 0.5) * (o.jag || 3), top = c.h - 1 - Math.round(hh);
    for (let y = top; y < c.h; y++) { const k = (y - top) / Math.max(1, hh), snow = o.cap != null && (hh - o.base) / o.amp > o.cap && k < 0.22 + hash(x, 7) * 0.12;
      c.set(x, y, snow ? ix(COOL, o.snow || 14) : ix(o.ramp, Math.round(o.lv + k * (o.grad || 0) + (dith(x, y) < k ? 0 : 0.0)))); } } }
/* a skyline: buildings of a width and a height at random, their windows lit one in `lit`, antennas and water towers on some; `ramp`/`lv` the wall, `win` the lamp colour */
function skyline(c, o) { for (let x = 0, i = 0; x < W; i++) { const w = o.w[0] + Math.floor(hash(i, o.seed) * (o.w[1] - o.w[0])), h = o.h[0] + Math.floor(Math.pow(hash(i, o.seed + 1), 1.6) * (o.h[1] - o.h[0])), top = c.h - h;
    c.rect(x, top, w, h, ix(o.ramp, o.lv + Math.floor(hash(i, 5) * 2)));
    for (let wy = top + 3; wy < c.h - 2; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (hash(wx * 31 + wy, o.seed) < o.lit) c.set(wx, wy, ix(BROWN, 12 + Math.floor(hash(wx, wy) * 3)));
    if (hash(i, 9) < 0.28) for (let a = 1; a < 5; a++) c.set(x + (w >> 1), top - a, ix(o.ramp, o.lv + 2)); if (hash(i, 11) < 0.12) c.rect(x + 1, top - 3, 4, 3, ix(o.ramp, o.lv - 1)); x += w + (hash(i, 13) < 0.2 ? 3 : 0); } }
const moon = (c, x, y, r) => { for (let j = -r - 3; j <= r + 3; j++) for (let i = -r - 3; i <= r + 3; i++) { const d = Math.hypot(i, j); if (d <= r) c.set(x + i, y + j, ix(COOL, 15)); else if (d <= r + 3 && (i + j) & 1) c.set(x + i, y + j, ix(COOL, 11)); } };
const stars = (c, n, seed, ramp) => { for (let i = 0; i < n; i++) c.set(Math.floor(hash(i, seed) * W), Math.floor(hash(i, seed + 1) * (c.h - 36)), ix(ramp || COOL, 11 + Math.floor(hash(i, seed + 2) * 5))); };
/* curtains of light high in the sky: each column a streak, brightest in its middle, dithered to nothing at its edges */
function aurora(c, seed) { const f = waves(seed, [2, 3, 7]), g = waves(seed + 1, [1, 4]); for (let x = 0; x < W; x++) { const yc = 12 + f(x) * 26, len = 6 + g(x) * 22, ramp = [GREEN, CYAN, GREEN, MAGENTA][Math.floor(x / W * 4 + g(x)) & 3];
    for (let y = Math.floor(yc - len); y <= yc + len * 0.4; y++) { const a = 1 - Math.abs(y - yc) / (len + 1); if (a > 0 && hash(x * 131 + y, seed) < a * 0.8) c.set(x, y, ix(ramp, 6 + Math.round(a * 6))); } } } function clouds(c, n, seed, lv) {
  for (let i = 0; i < n; i++) { const cx = Math.floor(hash(i, seed) * W), cy = 6 + Math.floor(hash(i, seed + 1) * (c.h - 30)), rx = 14 + Math.floor(hash(i, seed + 2) * 24); for (let b = 0; b < 4; b++) { const bx = cx + (b - 1.5) * rx * 0.5, r = rx * (0.4 + hash(i + b, seed + 3) * 0.3); for (let j = -r * 0.5; j <= 0; j++) for (let k = -r; k <= r; k++) if ((k / r) ** 2 + (j / (r * 0.5)) ** 2 <= 1) c.set(Math.round(bx + k), Math.round(cy + j), ix(COOL, lv + ((j > -r * 0.2) ? -2 : 0))); } }
}

const MAKE = {
  /* the town at night: a pale far ridge, two skylines (the near one dark with a few lit windows), a moon and stars */
  street() { const c = canvas(88); stars(c, 160, 3); moon(c, 170, 22, 7); ridge(c, { seed: 21, ramp: BLUE, lv: 3, base: 6, amp: 22, grad: 1, cap: 0.55, snow: 8 }); skyline(c, { seed: 4, ramp: BLUE, lv: 2, w: [9, 22], h: [14, 40], lit: 0.14 }); skyline(c, { seed: 8, ramp: COOL, lv: 1, w: [10, 26], h: [8, 26], lit: 0.2 }); return c; },
  /* the mountains of the pass: four ridges, far to near, in the colour of the fog, the nearest with trees on it */
  pass() { const c = canvas(72); clouds(c, 14, 5, 12); ridge(c, { seed: 11, ramp: COOL, lv: 10, base: 18, amp: 40, grad: -2, cap: 0.4 }); ridge(c, { seed: 12, ramp: COOL, lv: 9, base: 10, amp: 32, grad: -2, cap: 0.45 }); ridge(c, { seed: 13, ramp: COOL, lv: 7, base: 5, amp: 22, grad: -2, cap: 0.5, jag: 5 }); ridge(c, { seed: 14, ramp: GREEN, lv: 2, base: 2, amp: 8, grad: 1, pow: 1, jag: 8 }); return c; },
  /* the dam's valley: bare ridges and a long pale dam wall far off with a line of pylons on it */
  dam() { const c = canvas(64); clouds(c, 10, 6, 13); ridge(c, { seed: 31, ramp: COOL, lv: 9, base: 14, amp: 30, grad: -2, cap: 0.5 }); ridge(c, { seed: 32, ramp: COOL, lv: 6, base: 6, amp: 22, grad: -1, cap: 0.7, jag: 5 }); c.rect(0, 52, W, 7, ix(GREY, 6)); for (let x = 20; x < W; x += 64) { c.rect(x, 40, 2, 14, ix(GREY, 4)); c.rect(x - 4, 42, 10, 1, ix(GREY, 4)); } return c; },
  /* the harbour at night: stars, an aurora, a city across the bay with cranes among it, a moon */
  harbour() { const c = canvas(96); stars(c, 220, 9); aurora(c, 5); moon(c, 760, 30, 6); skyline(c, { seed: 17, ramp: BLUE, lv: 2, w: [8, 20], h: [10, 34], lit: 0.16 }); for (let x = 90; x < W; x += 230) { c.rect(x, 52, 2, 36, ix(RED, 3)); c.rect(x - 2, 50, 26, 2, ix(RED, 3)); c.rect(x + 18, 52, 1, 8, ix(RED, 3)); } return c; },
  /* a day with clouds over low hills and rooftops (the forecourt, the yard) */
  day() { const c = canvas(64); clouds(c, 18, 7, 14); ridge(c, { seed: 41, ramp: COOL, lv: 9, base: 6, amp: 14, grad: -1, pow: 1.2 }); skyline(c, { seed: 42, ramp: COOL, lv: 7, w: [12, 28], h: [6, 16], lit: 0 }); return c; } }; const made = {};
export const backdrop = id => (id && MAKE[id] ? made[id] || (made[id] = MAKE[id]()) : null); export const BACKDROPS = Object.keys(MAKE); const OF = { street: 'street', pass: 'pass', dam: 'dam', harbour: 'harbour', forecourt: 'day', yard: 'day' };
/* the panorama a road has: its own (`def.backdrop`), or the one of its kit */
export const backdropOf = def => (def.backdrop !== undefined ? def.backdrop : OF[def.dress] || null);
