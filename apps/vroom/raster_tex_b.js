/* THE DRESSING'S TEXTURES (docs/vroom/plan.md section 15): what the props round the roads wear, made in code like the town's own (raster_tex.js, whose kit they share). Painted marks for the road (a zebra crossing, an arrow,
   a hatching, a stop line, oil, tyre marks, a patch), the faces of things (a cereal box, a can, a book, a crate, a drum, a pipe), roofs and walls (shingles, clapboard, a shop window, a factory window, a hedge, a
   brick-and-snow), and light (neon, a lamp's glow). A texture is { w, h, d }: palette bytes, CLEAR for a hole. Pure. */
import { GREY, BLUE, GREEN, CYAN, RED, BROWN, COOL, MAGENTA, CLEAR } from './palette.js'; import { make, L } from './raster_tex_kit.js';

/* a shipping container's corrugated side in some colour: ribs every fourth column, a rim top and bottom */
const ctr = (seed, ramp, lv) => () => make(32, 32, seed, (x, y, u, v, n, r) => ((x & 3) === 0 ? L(ramp, lv - 1.8) : y < 2 || y > 29 ? L(ramp, lv - 3) : L(ramp, lv + n * 1.6 + (r() - 0.5) * 0.5))); export const GEN_B = {
  container2: ctr(88, BLUE, 6.5), container3: ctr(89, GREEN, 5.5), container4: ctr(90, BROWN, 8), container5: ctr(91, CYAN, 6),
  /* painted on the road, over it: white on nothing */
  zebra: () => make(32, 32, 61, (x, y) => ((y & 7) < 4 ? L(GREY, 14) : CLEAR)),
  arrow: () => make(32, 32, 62, (x, y) => { const sh = x >= 13 && x <= 18 && y >= 14, hd = y < 14 && Math.abs(x - 15.5) < y * 0.9 + 1; return sh || hd ? L(GREY, 14) : CLEAR; }),
  hatch: () => make(32, 32, 63, (x, y) => ((((x + y) >> 2) & 1) && x > 1 && x < 30 ? L(BROWN, 12) : CLEAR)),
  stopline: () => make(32, 32, 64, (x, y) => (y >= 12 && y <= 19 ? L(GREY, 14) : CLEAR)),
  oil: () => make(32, 32, 65, (x, y, u, v, n) => { const d = Math.hypot(u - 0.5, v - 0.5) * 2 + (n - 0.5) * 0.7; return d < 0.8 ? L(GREY, d < 0.5 ? 0.5 : 1.5) : CLEAR; }),
  skid: () => make(32, 32, 66, (x, y, u, v, n, r) => (((x >= 9 && x <= 11) || (x >= 20 && x <= 22)) && r() < 0.7 + n * 0.3 ? L(GREY, 1) : CLEAR)),
  patch: () => make(32, 32, 67, (x, y, u, v, n, r) => (x < 2 || y < 2 || x > 29 || y > 29 ? L(GREY, 7) : L(GREY, 2.4 + n * 1.4 + (r() - 0.5) * 0.6))),
  /* the faces of things */
  cereal: () => make(32, 32, 68, (x, y, u, v, n, r) => (y < 6 ? L(RED, 8) : y > 25 ? L(BROWN, 10) : Math.hypot(x - 16, y - 15) < 7 ? L(BROWN, 13 - (y > 15 ? 1 : 0)) : x < 2 || x > 29 ? L(BLUE, 8) : L(CYAN, 9 + n * 2 + (r() - 0.5)))),
  can: () => make(16, 16, 69, (x, y, u, v, n) => (y < 3 || y > 12 ? L(COOL, 12) : (x >> 2) & 1 ? L(RED, 8.5 + n) : y > 5 && y < 10 && x > 4 && x < 11 ? L(GREY, 14) : L(RED, 6 + n))),
  books: () => make(32, 32, 70, (x, y, u, v, n, r) => { const b = (x / 4) | 0, h = 18 + (b * 7 % 9); return y < 32 - h ? L(COOL, 3) : x % 4 === 0 ? L(COOL, 2) : L([RED, BLUE, GREEN, BROWN][b % 4], 5 + (b * 3 % 4) + n * 1.5); }),
  crate: () => make(32, 32, 71, (x, y, u, v, n, r) => (x < 3 || y < 3 || x > 28 || y > 28 || Math.abs(x - y) < 2 || Math.abs(x + y - 31) < 2 ? L(BROWN, 4.5 + n) : L(BROWN, 7.5 + n * 1.5 + (r() - 0.5) * 0.6))),
  drum: () => make(16, 16, 72, (x, y, u, v, n) => (y === 3 || y === 12 ? L(RED, 3) : (x & 7) === 0 ? L(RED, 5) : L(RED, 7 + n * 1.5))),
  pipe: () => make(16, 16, 73, (x, y, u, v, n, r) => (y === 0 || y === 15 ? L(COOL, 12) : L(COOL, 5 + Math.sin(y * 0.4) * 2.5 + n + (r() - 0.5) * 0.4))),
  /* roofs and walls */
  shingle: () => make(32, 32, 74, (x, y, u, v, n, r) => { const row = y >> 2, off = (row & 1) * 4; return (y & 3) === 3 || ((x + off) & 7) === 7 ? L(COOL, 2) : L(RED, 3.5 + (((x + off) >> 3) * 5 + row * 3) % 4 * 0.4 + n); }),
  clapboard: () => make(32, 32, 75, (x, y, u, v, n, r) => ((y & 3) === 3 ? L(BROWN, 3) : L(BROWN, 8 + n * 1.5 + (r() - 0.5) * 0.5))),
  /* a lit shop window: a dark frame, a valance across the top, a warm room with two shelves of coloured goods on it, a floor */
  shopwin: () => make(64, 32, 76, (x, y, u, v, n) => { if (x < 2 || x > 61 || y < 2 || y > 29 || x === 31 || x === 32) return L(COOL, 3); if (y < 6) return L([RED, BLUE, GREEN][(x >> 4) % 3], 6 + ((x >> 1) & 1)); if (y > 26) return L(BROWN, 6);
    const sh = y === 15 || y === 23; if (sh) return L(BROWN, 5); const row = y < 15 ? 0 : y < 23 ? 1 : 2, k = (x >> 2) + row * 9, h = 2 + (k * 5 % 5); if (row < 2 && ((x >> 2) + row) % 3 !== 2 && y > (row ? 23 : 15) - h - 1) return L([RED, BLUE, GREEN, MAGENTA, CYAN, BROWN][k % 6], 7 + (k * 3 % 4));
    return L(BROWN, 10 + n * 2 - (y - 6) * 0.07); }),
  facwin: () => make(32, 32, 77, (x, y, u, v, n) => (x % 8 === 0 || y % 8 === 0 ? L(COOL, 3) : L(CYAN, 6 + n * 3 + (y < 12 ? 2 : 0)))),
  hedge: () => make(32, 32, 78, (x, y, u, v, n, r) => (r() < 0.12 + n * 0.12 ? L(GREEN, 9) : L(GREEN, 3 + n * 3 + (r() - 0.5) * 1.5))),
  /* the bank a plough has pushed to the kerb: grey slush at its foot, clean snow above it, a crust of ice on the top edge, and the odd stone and twig in it (u along, v up) */
  bank: () => make(32, 32, 82, (x, y, u, v, n, r) => { const h = y / 31, grime = Math.max(0, 0.45 - h) * 2.2 + (n - 0.5) * 0.7; if (h > 0.9) return L(COOL, 15); if (h > 0.84) return L(CYAN, 10 + (r() < 0.5 ? 1 : 0)); if (r() < 0.012 && h < 0.7) return L(GREY, 4); return grime > 0.5 ? L(GREY, 5 + grime * 4 + (r() - 0.5)) : L(COOL, 11 + n * 3.4 + (r() - 0.5) * 0.8 - (h < 0.5 ? 1 : 0)); }),
  /* an air mail envelope seen from above: the red and blue border, a stamp, a postmark and the lines of an address (u across the long way) */
  envelope: () => make(64, 32, 83, (x, y, u, v, n) => { if (x < 4 || x > 59 || y < 4 || y > 27) return ((x + y) >> 2) & 1 ? L(RED, 8) : L(BLUE, 7); if (x > 46 && x < 57 && y > 5 && y < 15) return (x + y) & 1 ? L(RED, 9) : L(BROWN, 12); if (Math.hypot(x - 40, y - 10) < 6 && Math.hypot(x - 40, y - 10) > 4.5) return L(GREY, 4); if (y >= 17 && y <= 24 && x > 14 && x < 40 && (y & 3) === 1) return L(COOL, 3); return L(COOL, 13.5 + n * 1.2); }),
  /* lawn: two greens, the lighter in blades */
  grass: () => make(32, 32, 84, (x, y, u, v, n, r) => (r() < 0.1 ? L(GREEN, 9) : L(GREEN, 4.2 + n * 4 + (r() - 0.5) * 1.3))),
  /* a road barrier of concrete: a grimy foot, light slabs with a joint every so often, a band of yellow and black chevrons along the top (u along, v up) */
  barrier: () => make(32, 32, 85, (x, y, u, v, n, r) => { const h = y / 31; if (h > 0.66 && h < 0.8) return (((x + (y >> 1)) >> 2) & 1) ? L(BROWN, 12) : L(GREY, 1.5); if (x === 0 || x === 16) return L(GREY, 5); if (h < 0.14) return L(GREY, 4 + n * 2); return L(GREY, 9 + n * 2.4 + (r() - 0.5) * 0.8); }),
  /* a parking bay's lines: left, right and back, white, on nothing */
  bay: () => make(32, 32, 86, (x, y) => (x < 2 || x > 29 || y > 29 ? L(GREY, 14) : CLEAR)),
  /* a ceiling of white acoustic tiles with a thin grid between them */
  ceiltile: () => make(32, 32, 87, (x, y, u, v, n, r) => (x % 16 === 0 || y % 16 === 0 ? L(GREY, 8) : L(GREY, 12.5 + n * 1.6 + (r() - 0.5) * 0.5))),
  /* a crowd seen from the front: rows of heads and shoulders in every colour, dark gaps between them (u along a row, eight to a repeat) */
  crowd: () => make(32, 16, 92, (x, y, u, v, n, r) => { const c = x >> 2, lx = x & 3, hue = (c * 5 + (y > 7 ? 3 : 0)) % 6; if (y >= 2 && y <= 5 && lx >= 1 && lx <= 2) return (c * 7) % 5 === 0 && y < 4 ? L([RED, BLUE, GREEN, MAGENTA, CYAN][c % 5], 9) : L(BROWN, 8 + ((c * 3) % 4)); if (y >= 6 && y <= 13) return lx === 3 && y < 8 ? L(COOL, 2) : L([RED, BLUE, GREEN, MAGENTA, CYAN, BROWN][hue], 5 + ((c * 3 + y) % 5)); return L(COOL, 2); }),
  /* a rock face in strata: bands of dark and lighter stone every few rows, a ledge of snow lying along some of them, dark cracks running down (u along, v up) */
  cliff: () => make(32, 32, 93, (x, y, u, v, n, r) => { const band = (y + Math.floor(n * 5)) >> 2, ledge = (y & 3) === 3 && ((band * 7 + (x >> 3) * 3) % 5) < 3; if (ledge) return L(COOL, 13 + (r() < 0.3 ? 1 : 0)); if (((x * 5 + (band >> 1) * 11) % 23) === 0 && y % 7 < 6) return L(GREY, 1.5); return L(GREY, 3.2 + (band % 3) * 1.1 + n * 2.4 + (r() - 0.5) * 0.8); }),
  /* light */
  neon: () => make(16, 16, 79, (x, y, u, v, n) => (Math.abs(y - 7.5) < 2 ? L(MAGENTA, 13) : Math.abs(y - 7.5) < 4 ? L(MAGENTA, 8) : L(COOL, 1))),
  glow: () => make(16, 16, 80, (x, y) => L(BROWN, 14)),
  stripes: () => make(16, 16, 81, (x, y) => (((x >> 2) & 1) ? L(RED, 9) : L(GREY, 14)))
};
