/* LIVERIES (docs/vroom/plan.md section 5): what a car wears over its paint. A livery is two small textures made in code with the machine's pixel type and a handful of pattern functions: a flank decal, 32 x 16
   texels, laid on both sides of the car (a stripe in a pattern, a plate with the car's number, a little logo), and a roof decal, 16 x 16, a number on a plate with two stripes down it, which is what the chase
   camera sees. A texel that is not painted is CLEAR, so the car's own paint shows through. Eleven rivals each have their own: a paint, a second colour, a pattern, a number and a logo (rivals.js), and the player's
   courier wears the courier's (a plate reading its number, a parcel, a band of white); `liveryDiff` says how different two are, so cars_check.js can hold that the player's is never a rival's. Pure. */
import { ix, GREY, CYAN, CLEAR } from './palette.js';
import { F3, F5, drawText } from '../pixtext.js';

/* 8 x 8 pictures, one bit a texel */
const LOGOS = {
  bolt: '00001100,00011000,00110000,01111110,00011000,00110000,01100000,01000000',
  star: '00011000,00011000,11111111,01111110,00111100,01111110,01100110,01000010',
  flame: '00010000,00011000,00111000,01111100,01111110,11111110,11111111,01111110',
  snow: '00011000,10011001,01011010,00111100,00111100,01011010,10011001,00011000',
  skull: '00111100,01111110,11011011,11011011,01111110,00111100,00111100,00100100',
  heart: '01100110,11111111,11111111,11111111,01111110,00111100,00011000,00000000',
  wheel: '00111100,01011010,10011001,11111111,11111111,10011001,01011010,00111100',
  paw: '00100100,01100110,00100100,00011000,00111100,01111110,01111110,00100100',
  crown: '10000001,10011001,11011011,11111111,11111111,11111111,01111110,00000000',
  anchor: '00011000,00011000,01111110,00011000,10011001,10011001,01111110,00011000',
  fish: '00000000,00100010,01110111,11111111,11111111,01110111,00100010,00000000',
  parcel: '11111111,11111111,11011011,11011011,11111111,11011011,11011011,11111111'
};
export const LOGO_NAMES = Object.keys(LOGOS);

function canvas(w, h) {
  const d = new Uint8Array(w * h).fill(CLEAR);
  const R = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const px = x + i, py = y + j; if (px >= 0 && py >= 0 && px < w && py < h) d[py * w + px] = c; } };
  return { w, h, ws: Math.log2(w), d, R };
}

/* the stripes, on a 32 x 16 flank: each paints with `c` (the livery's second colour) and, for some, `k` (a dark) */
const PATTERNS = {
  band: (R, w, h, c) => { R(0, 9, w, 3, c); },
  twin: (R, w, h, c) => { R(0, 8, w, 1, c); R(0, 11, w, 1, c); R(0, 14, w, 1, c); },
  chevron: (R, w, h, c) => { for (let x = 0; x < w; x++) { const y = 7 + Math.abs(((x % 12) - 6)) ; R(x, y, 1, 2, c); } },
  checks: (R, w, h, c) => { for (let x = 0; x < w; x += 2) for (let y = 12; y < h; y += 2) if (((x >> 1) + (y >> 1)) & 1) R(x, y, 2, 2, c); },
  diag: (R, w, h, c) => { for (let x = -h; x < w; x += 8) for (let y = 0; y < h; y++) R(x + y, y, 3, 1, c); },
  dots: (R, w, h, c) => { for (let x = 1; x < w; x += 5) for (let y = 1 + ((x / 5 | 0) & 1) * 2; y < h; y += 5) R(x, y, 2, 2, c); },
  wave: (R, w, h, c) => { for (let x = 0; x < w; x++) R(x, 10 + Math.round(Math.sin(x / 3) * 1.6), 1, 3, c); }
};
export const PATTERN_NAMES = Object.keys(PATTERNS);

const WHITE = ix(GREY, 15), BLACK = ix(GREY, 1);
function plate(R, x, y, w, h, c) { R(x, y, w, h, BLACK); R(x + 1, y + 1, w - 2, h - 2, c); }

/* the textures for a livery spec { num, stripe, pattern, logo, plate? }, cached by what it is made of */
const made = new Map();
export function liveryOf(L) {
  const key = [L.num, L.stripe, L.pattern, L.logo, L.plate || WHITE].join('|');
  if (made.has(key)) return made.get(key);
  const pl = L.plate == null ? WHITE : L.plate, num = String(L.num);
  const side = canvas(32, 16), { R } = side;
  (PATTERNS[L.pattern] || PATTERNS.band)(R, 32, 16, L.stripe);
  plate(R, 3, 2, 12, 9, pl); drawText(R, num, 3 + 6, 4, BLACK, F3, { heavy: false });
  const lg = LOGOS[L.logo] || LOGOS.star;
  R(20, 1, 10, 10, BLACK);
  lg.split(',').forEach((row, y) => { for (let x = 0; x < 8; x++) if (row[x] === '1') R(21 + x, 2 + y, 1, 1, L.stripe); });
  const top = canvas(16, 16), T = top.R;
  T(2, 0, 3, 16, L.stripe); T(11, 0, 3, 16, L.stripe);
  plate(T, 1, 3, 14, 10, pl); drawText(T, num, 8, 5, BLACK, F5, { heavy: false });
  const out = { side: strip(side), top: strip(top) };
  made.set(key, out);
  return out;
}
const strip = c => ({ w: c.w, h: c.h, ws: c.ws, d: c.d });

/* a rival's livery, and the player's (the courier's own: a band of white, a plate, a parcel. Its paint and plate are the player's to change in the depot, phase 5) */
export const liveryFor = r => liveryOf({ num: r.num, stripe: r.stripe, pattern: r.pattern, logo: r.logo, plate: r.plate });
export const PLAYER = { name: 'YOU', num: '01', paint: ix(CYAN, 8), stripe: WHITE, pattern: 'band', logo: 'parcel' };

/* how different two are, 0 (the same) to 1: the share of the flank and roof texels that come out a different colour, a texel with nothing painted on it counting as the paint under it */
export function liveryDiff(a, b) {
  const ta = liveryOf(a), tb = liveryOf(b);
  let diff = 0, n = 0;
  for (const part of ['side', 'top']) {
    const da = ta[part].d, db = tb[part].d;
    for (let i = 0; i < da.length; i++) { const ca = da[i] === CLEAR ? a.paint : da[i], cb = db[i] === CLEAR ? b.paint : db[i]; n++; if (ca !== cb) diff++; }
  }
  return diff / n;
}
