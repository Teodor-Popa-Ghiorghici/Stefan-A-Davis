/* THE MENUS' PEN (docs/vroom/plan.md section 9): what the screens before and after a race are drawn with. Everything is the machine's pixel type with an outline (the rule for text on a canvas), laid on
   panels that are the picture dimmed through the 4 x 4 Bayer dither (a panel that never leaves the palette), and pictures built of rectangles. A menu is a list: the row under the cursor is bright and has a
   marker, a row that cannot be used is hollow and dashed (the machine's rule for a disabled button), and a line of key hints stands at the foot of every screen. Pure but for the raster it is given. */
import { ix, GREY, BROWN, RED, GREEN, COOL, CYAN } from './palette.js';
import { widthOf, F3, F5, glyphs } from '../pixtext.js';
import { BAYER } from './raster_shade.js';

export const C = { white: ix(GREY, 15), dim: ix(GREY, 11), mute: ix(GREY, 8), black: ix(GREY, 0), yellow: ix(BROWN, 14), gold: ix(BROWN, 12), red: ix(RED, 11), green: ix(GREEN, 12), cyan: ix(CYAN, 13), panel: ix(COOL, 2), ground: ix(COOL, 1), edge: ix(GREY, 12) };

/* the picture dimmed: every pixel of the rectangle whose dither threshold is under k becomes black */
export function shade(R, x, y, w, h, k) {
  const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(R.w, (x + w) | 0), y1 = Math.min(R.h, (y + h) | 0), buf = R.buf;
  for (let j = y0; j < y1; j++) { const row = (j & 3) << 2; for (let i = x0; i < x1; i++) if (BAYER[row | (i & 3)] < k) buf[j * R.w + i] = C.black; }
}
/* a panel: a solid dark ground (small type is read on it) or, with a `k` under 1, the picture dimmed through the dither; and a one-pixel edge */
export function panel(R, x, y, w, h, o) {
  o = o || {};
  if (o.k == null || o.k >= 1) R.rect(x, y, w, h, C.ground); else shade(R, x, y, w, h, o.k);
  R.rect(x, y, w, 1, o.edge || C.edge); R.rect(x, y + h - 1, w, 1, o.edge || C.edge); R.rect(x, y, 1, h, o.edge || C.edge); R.rect(x + w - 1, y, 1, h, o.edge || C.edge);
}
/* left-aligned, right-aligned and centred pixel type */
export const left = (R, s, x, y, c, o) => R.text(s, x + widthOf(s, o && o.big ? F5 : F3, o && o.heavy) / 2, y, c == null ? C.white : c, o);
export const right = (R, s, x, y, c, o) => R.text(s, x - widthOf(s, o && o.big ? F5 : F3, o && o.heavy) / 2, y, c == null ? C.white : c, o);
export const mid = (R, s, cx, y, c, o) => R.text(s, cx, y, c == null ? C.white : c, o);
export { widthOf, F3, F5 };

/* a word set big: each pixel of the 5 x 7 face is a k x k square (a logo), with a shadow */
export function bigText(R, str, cx, top, k, color, shadow) {
  const gl = glyphs(str), adv = 6 * k, total = gl.length * adv - k;
  let x = Math.round(cx - total / 2);
  for (const g of gl) {
    const rows = F5.g[g.ch].split(',');
    rows.forEach((line, yy) => { for (let xx = 0; xx < 5; xx++) if (line[xx] === '1') { if (shadow != null) R.rect(x + xx * k + k, top + yy * k + k, k, k, shadow); R.rect(x + xx * k, top + yy * k, k, k, color); } });
    x += adv;
  }
}
/* a dashed hollow box: what a thing that cannot be used looks like */
export function dashed(R, x, y, w, h, c) {
  for (let i = 0; i < w; i += 4) { R.rect(x + i, y, 2, 1, c); R.rect(x + i, y + h - 1, 2, 1, c); }
  for (let j = 0; j < h; j += 4) { R.rect(x, y + j, 1, 2, c); R.rect(x + w - 1, y + j, 1, 2, c); }
}
/* a list: rows [{ label, note?, off? (cannot be used), tag? (right-hand text), tagColor? }]; the cursor row has a marker and a bar. Returns the row height. */
export function menu(R, rows, sel, x, y, w, o) {
  o = o || {};
  const rh = o.rowH || 11;
  rows.forEach((r, k) => {
    const yy = y + k * rh, on = k === sel;
    if (on) { R.rect(x, yy - 1, w, rh - 1, ix(COOL, on ? 5 : 2)); R.rect(x, yy - 1, 2, rh - 1, C.yellow); }
    const ty = yy + (o.big ? 1 : 2);
    if (r.off) { dashed(R, x + 3, yy, w - 6, rh - 3, C.mute); left(R, r.label, x + 7, ty, on ? C.dim : C.mute, { outline: -1, big: o.big }); }
    else left(R, r.label, x + 6, ty, on ? C.white : C.dim, { outline: -1, big: o.big });
    if (r.tag != null) right(R, r.tag, x + w - 4, yy + 2, r.tagColor == null ? (on ? C.yellow : C.dim) : r.tagColor, { outline: -1 });
  });
  return rh;
}
/* a bar of cells, filled to v of max */
export function meter(R, x, y, w, v, max, c) {
  R.rect(x - 1, y - 1, w + 2, 5, C.black); R.rect(x, y, w, 3, ix(GREY, 3));
  R.rect(x, y, Math.max(0, Math.min(w, Math.round(w * v / max))), 3, c == null ? C.green : c);
}
/* the line of key hints at the foot of a screen */
export function hint(R, text) {
  shade(R, 0, R.h - 10, R.w, 10, 0.85);
  mid(R, text, R.w / 2, R.h - 8, C.dim, { outline: -1 });
}
/* a title across the top */
export function head(R, text, sub) {
  shade(R, 0, 0, R.w, 17, 0.85);
  mid(R, text, R.w / 2, 3, C.yellow, { big: true, outline: C.black });
  if (sub) mid(R, sub, R.w / 2, 11, C.dim, { outline: -1 });
}
/* text cut into lines no wider than w pixels (F3), at spaces */
export function wrap(str, w) {
  const out = []; let line = '';
  for (const word of String(str).split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (widthOf(t, F3) > w && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
export const tips = n => n.toLocaleString('en-US') + ' TIPS';
