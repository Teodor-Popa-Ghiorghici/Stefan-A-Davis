/* PROCEDURAL TEXTURES. Nothing here is a photograph or a picture of one: every texel of every surface in the town is made by a few lines of arithmetic from a seed, in the way Magen's scene tiles are, so
   the same name gives the same bytes on every machine (raster_check.js hashes them). A texture is { w, h, d }: a power of two each way (8 to 64) and one palette byte (palette.js) a texel, ramp * 16 + level, or
   CLEAR (255) for a hole you can see through (a fence, a wire, a leaf). Light moves a texel along its own ramp afterwards, so a texture carries its colours and a surface is lit at the pixel.
   `tex.snow()` and the rest are made once, on first use. Pure. */
import { ix, GREY, BLUE, GREEN, CYAN, RED, BROWN, COOL, CLEAR } from './palette.js'; import { F3, F5, drawText, widthOf } from '../pixtext.js';

import { make, L } from './raster_tex_kit.js'; import { GEN_B } from './raster_tex_b.js';

const GEN = {
  /* new snow: a cool white with blue pockets and a glitter */
  snow: () => make(32, 32, 11, (x, y, u, v, n, r) => { const s = r(); return s < 0.02 ? L(COOL, 15) : n < 0.3 ? L(COOL, 10 + (s < 0.5 ? 0 : 1)) : L(COOL, 12 + n * 3.4 + (s - 0.5) * 0.8); }),
  /* old snow on a road: grey, a little brown where the wheels have been */
  slush: () => make(32, 32, 12, (x, y, u, v, n, r) => (n > 0.62 ? L(GREY, 2.6 + (r() < 0.5 ? 0 : 1)) : L(GREY, 6 + n * 5 + (r() - 0.5) * 1.2))),
  /* deep, unbroken snow: whiter, with lines drifted across it */
  drift: () => make(32, 32, 13, (x, y, u, v, n, r) => L(COOL, 12.5 + Math.sin((v + n * 0.6) * Math.PI * 4) * 1.2 + (r() - 0.5) * 0.7)),
  /* asphalt with two worn tracks down it (u is across the road) */
  asphalt: () => make(32, 32, 14, (x, y, u, v, n, r) => { const track = Math.max(Math.exp(-((u - 0.3) ** 2) / 0.004), Math.exp(-((u - 0.7) ** 2) / 0.004)); return r() < 0.03 ? L(GREY, 8) : L(GREY, 3.2 + n * 1.6 - track * 1.4 + (r() - 0.5) * 0.9); }),
  /* a yellow centre dash on nothing (a decal: lay it over asphalt) */
  dash: () => make(32, 32, 15, (x, y) => (x >= 14 && x <= 17 && y < 20 ? L(BROWN, 11 - (x === 14 || x === 17 ? 1 : 0)) : CLEAR)),
  /* a white kerb line on nothing */
  edge: () => make(32, 32, 16, (x) => (x <= 2 ? L(GREY, 13) : CLEAR)),
  concrete: () => make(32, 32, 17, (x, y, u, v, n, r) => L(GREY, 5.5 + n * 2.2 + (r() - 0.5) * 0.8)),
  /* the sorting-room floor: lino tiles, a pale blue-grey, with a darker seam (muted, so a car and the yellow edge lines stand out of it) */
  lino: () => make(32, 32, 18, (x, y, u, v, n, r) => { if (x % 16 === 0 || y % 16 === 0) return L(COOL, 4.6); const alt = ((x >> 4) + (y >> 4)) & 1; return L(COOL, (alt ? 8.4 : 7.3) + n * 1.2 + (r() - 0.5) * 0.6); }),
  /* a stack of parcels: four boxes in browns, taped across, one with a white label */
  parcels: () => make(32, 32, 34, (x, y, u, v, n, r) => { const bx = x & 15, by = y & 15, id = (x >> 4) + (y >> 4) * 2; if (bx === 0 || by === 0) return L(BROWN, 3); if (bx >= 7 && bx <= 9) return L(BROWN, 10.5 - (bx === 7 ? 1 : 0));
    if (id === 1 && bx >= 10 && bx <= 13 && by >= 9 && by <= 12) return L(GREY, 14); return L(BROWN, 5.4 + (id * 7 % 4) * 0.5 + Math.sin(by * Math.PI / 2) * 0.35 + n * 0.8 + (r() - 0.5) * 0.4); }),
  /* a shelf: a board with parcels standing on it, dark gaps between */
  shelf: () => make(32, 32, 35, (x, y, u, v, n, r) => { if (y >= 29) return L(BROWN, 3.5); if (y === 28) return L(BROWN, 7); const bay = (x + 4) % 12; if (bay === 0) return L(COOL, 2); const tall = 14 + ((x + 4) / 12 | 0) % 3 * 4;
    if (y < 28 - tall + 4 && y < 12) return L(COOL, 3.5 + n); return L(BROWN, 6 + (((x + 4) / 12 | 0) % 3) * 0.7 + (bay > 5 && bay < 7 ? 3.5 : 0) + n * 0.7 + (r() - 0.5) * 0.4); }),
  /* a cardboard box: tan, fluted across, with a stripe of tape down it */
  cardboard: () => make(32, 32, 19, (x, y, u, v, n, r) => { if (x >= 14 && x <= 17) return L(BROWN, 11 + (x === 15 ? 1 : 0) - (y % 8 === 0 ? 1 : 0)); return L(BROWN, 6.6 + Math.sin(y * Math.PI / 2) * 0.55 + n * 1.1 + (r() - 0.5) * 0.5); }),
  /* corrugated iron: ribs that catch the light, a speck of rust */
  tin: () => make(32, 32, 20, (x, y, u, v, n, r) => (r() < 0.015 ? L(RED, 5) : L(COOL, 9.4 + Math.sin(x * Math.PI / 2) * 2.2 + n * 1.2 + (r() - 0.5) * 0.5))),
  brick: () => make(32, 32, 21, (x, y, u, v, n, r) => { const row = y >> 2, off = (row & 1) * 4, bx = (x + off) & 31, mortar = (y & 3) === 3 || (bx & 7) === 7; if (mortar) return L(COOL, 8 + (r() < 0.2 ? 2 : 0));
    const k = ((((x + off) >> 3) * 7 + row * 13) % 5) - 2; return L(RED, 4.2 + k * 0.5 + n * 1.2 + (r() - 0.5) * 0.6); }),
  planks: () => make(32, 32, 22, (x, y, u, v, n, r) => { const row = y >> 3, edge = (y & 7) === 7, base = 4 + ((row * 5 + 3) % 4) * 0.5; return edge ? L(BROWN, 2) : L(BROWN, base + Math.sin((x + row * 9) * 0.5) * 0.4 + n * 1.2 + (r() - 0.5) * 0.5); }),
  /* dark painted board, for doors and the diner's cupboards */
  board: () => make(32, 32, 23, (x, y, u, v, n, r) => L(COOL, 3.5 + n * 1.5 + ((x & 7) === 0 ? -1 : 0) + (r() - 0.5) * 0.4)),
  /* a lit window: warm glass in a cross of frame */
  window: () => make(16, 16, 24, (x, y, u, v, n) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8 ? L(COOL, 4) : L(BROWN, 11.5 + n * 2.5))),
  /* a dark window with a glint */
  glass: () => make(16, 16, 25, (x, y, u, v, n) => (x === 0 || y === 0 || x === 15 || y === 15 ? L(COOL, 5) : L(COOL, 3 + n * 2 + (x + y > 9 && x + y < 13 ? 4 : 0)))),
  /* a conveyor belt: dark rubber with chevrons, yellow rails */
  belt: () => make(32, 32, 26, (x, y, u, v, n, r) => { if (x < 3 || x > 28) return L(BROWN, x === 0 || x === 31 ? 8 : 10); const chev = ((Math.abs(x - 15.5) + y) & 15) < 2; return L(GREY, (chev ? 5 : 2.4) + n * 0.8 + (r() - 0.5) * 0.4); }),
  /* a steel floor plate with rivets */
  plate: () => make(32, 32, 27, (x, y, u, v, n, r) => ((x & 15) === 2 && (y & 15) === 2 ? L(GREY, 12) : (x & 15) === 0 || (y & 15) === 0 ? L(COOL, 4) : L(COOL, 7.5 + n * 2 + (r() - 0.5) * 0.5))),
  /* checker tile: the diner's counter and floor */
  checker: () => make(32, 32, 28, (x, y, u, v, n, r) => (((x >> 3) + (y >> 3)) & 1 ? L(RED, 7 + (r() - 0.5) * 0.6) : L(GREY, 13.5 + (r() - 0.5) * 0.6))),
  /* carpet */
  carpet: () => make(32, 32, 29, (x, y, u, v, n, r) => L(BLUE, 4.2 + n * 1.2 + (r() - 0.5) * 1.1)),
  /* a fence of pickets (see-through) */
  fence: () => make(32, 32, 30, (x, y, u, v, n, r) => { const rail = (y >= 6 && y <= 8) || (y >= 22 && y <= 24), picket = (x & 7) >= 1 && (x & 7) <= 5; if (!rail && !picket) return CLEAR; if (picket && y < 3 && (x & 7) !== 3) return CLEAR;
    return L(BROWN, 5 + n * 2 + (rail ? -1 : 0) + (r() - 0.5) * 0.5); }),
  /* pine needles for a tree: dark green with snow caught in it */
  pine: () => make(32, 32, 31, (x, y, u, v, n, r) => (r() < 0.12 + n * 0.12 ? L(COOL, 13) : L(GREEN, 2.6 + n * 2 + (r() - 0.5) * 0.8))),
  /* black rubber, for tyres and the underside of things */
  rubber: () => make(16, 16, 32, (x, y, u, v, n) => L(GREY, 1.4 + n * 1.2)),
  /* black ice: pale and glassy, with a few cracks and glints */
  ice: () => make(32, 32, 41, (x, y, u, v, n, r) => { const crack = Math.abs(Math.sin((x * 0.7 + y * 0.35 + n * 5))) < 0.06 || Math.abs(Math.sin((x * 0.3 - y * 0.8 + n * 4))) < 0.045;
    return crack ? L(COOL, 8 + (r() < 0.3 ? 2 : 0)) : r() < 0.025 ? L(COOL, 15) : L(COOL, 12.2 + n * 2.4 + (r() - 0.5) * 0.5); }),
  /* steel grating: dark bars with the light coming up between them */
  grate: () => make(16, 16, 42, (x, y, u, v, n, r) => ((x & 3) === 0 || (y & 7) === 0 ? L(COOL, 8 + n) : L(GREY, 1.6 + n * 0.8))),
  /* formica: the diner's counter, pale, with a fleck and a worn edge */
  formica: () => make(32, 32, 43, (x, y, u, v, n, r) => (y < 2 ? L(COOL, 6) : r() < 0.06 ? L(COOL, 14) : L(CYAN, 11.4 + n * 1.5 + (r() - 0.5) * 0.4))),
  /* the kitchen floor: small white and grey tiles with dark grout */
  tilefloor: () => make(32, 32, 44, (x, y, u, v, n, r) => ((x & 7) === 0 || (y & 7) === 0 ? L(COOL, 5) : L(GREY, ((x >> 3) + (y >> 3)) & 1 ? 12.2 : 10.4) + (r() - 0.5) * 0.5)),
  /* rock: the cliff beside the pass and the face of the dam's valley */
  rock: () => make(32, 32, 45, (x, y, u, v, n, r) => (n > 0.6 ? L(COOL, 8 + (r() < 0.5 ? 0 : 1)) : L(GREY, 3.6 + n * 4 + (r() - 0.5) * 1.2))),
  /* a shipping container: ribbed steel, red */
  container: () => make(32, 32, 46, (x, y, u, v, n, r) => ((x & 3) === 0 ? L(RED, 3.6) : y < 2 || y > 29 ? L(RED, 2.4) : L(RED, 5.4 + n * 1.6 + (r() - 0.5) * 0.5))),
  /* hazard stripes, yellow and black, for presses, gates and the edge of the dam */
  hazard: () => make(16, 16, 47, (x, y) => ((((x + y) >> 2) & 1) ? L(BROWN, 12) : L(GREY, 1.5))),
  /* a vending machine: a dark front, a lit window of rows of cans in colours, a coin slot */
  vending: () => make(32, 32, 48, (x, y, u, v, n, r) => { if (x < 3 || x > 28 || y < 2 || y > 29) return L(RED, 4);
    if (x >= 5 && x <= 24 && y >= 4 && y <= 20) { const can = ((x - 5) >> 2) + ((y - 4) >> 2) * 5, c = [RED, BLUE, GREEN, BROWN][can % 4]; return (x - 5) % 4 === 3 || (y - 4) % 4 === 3 ? L(GREY, 2) : L(c, 9 + (can % 3)); }
    return x >= 26 && y > 6 && y < 10 ? L(BROWN, 13) : L(GREY, 2.6 + n); }),
  /* the dark underside of a counter, a shelf, a lorry */
  under: () => make(16, 16, 33, (x, y, u, v, n) => (x === 0 || y === 0 ? L(COOL, 6) : L(COOL, 9.4 + n * 1.2)))
};

Object.assign(GEN, GEN_B); const made = {}; export const tex = new Proxy({}, { get: (_, name) => () => (made[name] || (made[name] = GEN[name]())) }); export const TEXTURE_NAMES = Object.keys(GEN);

/* a plain colour as a texture, one texel, made once per colour */
const flats = {}; export const flat = idx => flats[idx] || (flats[idx] = { w: 8, h: 8, ws: 3, d: new Uint8Array(64).fill(idx) });

/* a sign: pixel type on a coloured board, `w` x `h` texels (powers of two). The text is cut to what fits. */
export function sign(text, fg, bg, w, h) { w = w || 64; h = h || 16; const d = new Uint8Array(w * h).fill(bg);
  const R = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const px = x + i, py = y + j; if (px >= 0 && py >= 0 && px < w && py < h) d[py * w + px] = c; } };
  for (let i = 0; i < w; i++) { d[i] = fg; d[(h - 1) * w + i] = fg; } for (let j = 0; j < h; j++) { d[j * w] = fg; d[j * w + w - 1] = fg; }
  /* the 5 x 7 face when the name fits in it (and the sign is tall enough for it), else the 3 x 5, cut to what fits */
  let s = String(text).toUpperCase(), f = F3; if (h >= 12 && widthOf(s, F5) <= w - 6) f = F5; else while (s.length > 1 && widthOf(s, F3) > w - 4) s = s.slice(0, -1); drawText(R, s, w / 2, Math.floor((h - f.h) / 2), fg, f); return { w, h, ws: Math.log2(w), d };
}
