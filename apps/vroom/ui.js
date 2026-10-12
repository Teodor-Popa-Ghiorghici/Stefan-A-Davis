/* THE MENUS' PEN (docs/vroom/plan.md sections 9 and 15): what the screens before and after a race are drawn with. Everything is the machine's pixel type on SOLID plates, never on a picture and never on
   dither: type at 320 x 180 is only read if it stands on something flat, so a panel is a flat ground with a frame, a heading and a line of key hints are bars, and the cursor is the row turned over (black on
   yellow). Two sizes only: the 5 x 7 face for everything that is read (a label, a name, a price, a line of help) and the 3 x 5 for the small print beside it (a unit, a rating, a count), each in a colour
   that holds 7:1 on the ground it is on (ui_check.js measures every pair and every screen). The picture dimmed through the 4 x 4 Bayer dither is still here (`shade`) for what is BEHIND a panel, never under type.
   Pure but for the raster it is given. */
import { ix, GREY, BROWN, RED, GREEN, COOL, CYAN } from './palette.js';
import { widthOf, F3, F5, glyphs } from '../pixtext.js';
import { BAYER } from './raster_shade.js';

export const C = {
  white: ix(GREY, 15), dim: ix(GREY, 12), mute: ix(GREY, 10), black: ix(GREY, 0), yellow: ix(BROWN, 14), gold: ix(BROWN, 12), red: ix(RED, 12), green: ix(GREEN, 12), cyan: ix(CYAN, 13),
  panel: ix(COOL, 2), ground: ix(COOL, 1), edge: ix(GREY, 13), rule: ix(COOL, 6), hi: ix(BROWN, 14), key: ix(GREY, 14)
};
/* the debugging view of a frame: with `trace.on` every panel and every piece of type is written down, so ui_check.js can ask where it all is */
export const trace = { on: false, texts: [], panels: [] };

/* the picture dimmed: every pixel of the rectangle whose dither threshold is under k becomes black (for a scene behind a panel) */
export function shade(R, x, y, w, h, k) {
  const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(R.w, (x + w) | 0), y1 = Math.min(R.h, (y + h) | 0), buf = R.buf;
  for (let j = y0; j < y1; j++) { const row = (j & 3) << 2; for (let i = x0; i < x1; i++) if (BAYER[row | (i & 3)] < k) buf[j * R.w + i] = C.black; }
}
/* a plate laid over what is already on the glass hides it: the type it covers is no longer there to be read (a question put up over a menu) */
function cover(x, y, w, h, solid) {
  trace.panels.push({ x, y, w, h, solid });
  if (solid) for (let i = trace.texts.length - 1; i >= 0; i--) { const t = trace.texts[i]; if (t.x >= x && t.x + t.w <= x + w && t.y >= y && t.y + t.h <= y + h) trace.texts.splice(i, 1); }
}
/* a flat bar across or down the picture with no frame (the logo's band, the bar of a heading): a ground for type */
export function band(R, x, y, w, h, c) {
  if (trace.on) cover(x, y, w, h, true);
  R.rect(x, y, w, h, c == null ? C.black : c);
}
const frame = (R, x, y, w, h, c) => { R.rect(x, y, w, 1, c); R.rect(x, y + h - 1, w, 1, c); R.rect(x, y, 1, h, c); R.rect(x + w - 1, y, 1, h, c); };
/* a panel: a flat ground, a bright one-pixel frame and a dark one inside it. `o.edge` the frame's colour; `o.k` (under 1) dims the picture instead of covering it (only for a plate with no type on it) */
export function panel(R, x, y, w, h, o) {
  o = o || {};
  if (trace.on) cover(x, y, w, h, o.k == null || o.k >= 1);
  if (o.k == null || o.k >= 1) R.rect(x, y, w, h, o.ground == null ? C.ground : o.ground); else shade(R, x, y, w, h, o.k);
  frame(R, x, y, w, h, o.edge || C.edge); if (w > 6 && h > 6) frame(R, x + 1, y + 1, w - 2, h - 2, C.black);
}

const fontOf = o => (o && o.small ? F3 : F5);
/* how wide a piece of type is */
export const textW = (s, o) => widthOf(s, fontOf(o), o && o.heavy);
const put = (R, s, cx, y, c, o) => {
  o = o || {};
  if (trace.on) { const w = textW(s, o), f = fontOf(o); trace.texts.push({ s: String(s), x: cx - w / 2, y, w, h: f.h, c, small: !!o.small, outline: o.outline != null && o.outline >= 0, kind: o.kind || 'ui' }); }
  return R.text(s, cx, y, c == null ? C.white : c, { big: !o.small, heavy: o.heavy, outline: o.outline == null ? -1 : o.outline });
};
/* left-aligned (x is the left edge), right-aligned (x the right edge) and centred (x the middle) pixel type; y is the top. The 5 x 7 face unless `small`; `heavy` makes every stroke a pixel wider. */
export const left = (R, s, x, y, c, o) => put(R, s, x + textW(s, o) / 2, y, c, o);
export const right = (R, s, x, y, c, o) => put(R, s, x - textW(s, o) / 2, y, c, o);
export const mid = (R, s, cx, y, c, o) => put(R, s, cx, y, c, o);
export { widthOf, F3, F5 };
/* a string cut (with a full stop) to what fits in w pixels */
export function fit(s, w, o) {
  s = String(s); const f = fontOf(o);
  if (widthOf(s, f, o && o.heavy) <= w) return s;
  while (s.length > 1 && widthOf(s + '.', f, o && o.heavy) > w) s = s.slice(0, -1);
  return s.trimEnd() + '.';
}

/* a word set big: each pixel of the 5 x 7 face is a k x k square (a logo, a heading), with a shadow */
export function bigText(R, str, cx, top, k, color, shadow, kind) {
  const gl = glyphs(str), adv = 6 * k, total = gl.length * adv - k;
  let x = Math.round(cx - total / 2);
  if (trace.on) trace.texts.push({ s: String(str), x, y: top, w: total, h: 7 * k, c: color, small: false, outline: false, kind: kind || 'big' });
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
/* a little label on its own colour: a key, a count, a state */
export function chip(R, x, y, s, bg, fg, o) {
  const w = textW(s, o) + 6, h = (o && o.small ? 5 : 7) + 4;
  band(R, x, y, w, h, bg); left(R, s, x + 3, y + 2, fg, o);
  return w;
}
/* a solid triangle 4 pixels wide and 7 tall pointing left or right (the font has no < or >) */
export function tri(R, x, cy, dir, c) {
  for (let i = 0; i < 4; i++) R.rect(dir > 0 ? x + i : x + 3 - i, cy - 3 + i, 1, 7 - 2 * i, c);
}
/* a list: rows [{ label, tag? (right-hand text), tagColor?, off? (cannot be used), tagSmall? (the tag in the small face), val? (a value that LEFT and RIGHT change: set between two arrows at the right) }]. The row under the cursor is turned over (black on yellow, a marker at its left); a row that
   cannot be used is hollow and dashed. `o.rowH` is the pitch (13 for the 5 x 7 face), `o.heavy` the weight of the labels (on by default). Returns the pitch. */
export function menu(R, rows, sel, x, y, w, o) {
  o = o || {};
  const rh = o.rowH || 13, heavy = o.heavy !== false, pad = Math.floor((rh - 1 - 7) / 2);
  rows.forEach((r, k) => {
    const yy = y + k * rh, on = k === sel, ty = yy + pad;
    if (on) R.rect(x, yy, w, rh - 1, r.off ? C.rule : C.hi); else if (r.off) dashed(R, x + 1, yy, w - 2, rh - 1, C.mute);
    const ink = on ? (r.off ? C.white : C.black) : r.off ? C.mute : C.white;
    if (on) { R.rect(x + 2, ty + 1, 1, 5, ink); R.rect(x + 3, ty + 2, 1, 3, ink); R.rect(x + 4, ty + 3, 1, 1, ink); }
    left(R, r.label, x + 8, ty, ink, { heavy });
    if (r.tag != null && r.tag !== '') right(R, r.tag, x + w - 4, ty + (r.tagSmall ? 1 : 0), on ? ink : r.tagColor == null ? C.yellow : r.tagColor, { small: r.tagSmall });
    if (r.val != null) {
      const vc = on ? ink : r.valColor == null ? C.yellow : r.valColor, v = String(r.val), vw = textW(v);
      right(R, v, x + w - 14, ty, vc); tri(R, x + w - 10, ty + 3, 1, vc); tri(R, x + w - 14 - vw - 8, ty + 3, -1, vc);
    }
  });
  return rh;
}
/* a little triangle (dir -1 up, 1 down), 7 pixels wide, for a list that goes on */
export function arrow(R, cx, y, dir, c) {
  for (let i = 0; i < 4; i++) R.rect(cx - 3 + (dir > 0 ? i : 3 - i), y + (dir > 0 ? i : i), 7 - 2 * (dir > 0 ? i : 3 - i), 1, c == null ? C.yellow : c);
}
/* a bar of cells, filled to v of max (five pixels tall, with a black frame, so it is seen over any ground) */
export function meter(R, x, y, w, v, max, c) {
  R.rect(x - 1, y - 1, w + 2, 7, C.black); R.rect(x, y, w, 5, ix(GREY, 4));
  R.rect(x, y, Math.max(0, Math.min(w, Math.round(w * v / max))), 5, c == null ? C.green : c);
}
/* the line of key hints at the foot of a screen: a bar, and each key a cap. The text is `KEY  WHAT IT DOES` groups parted by wide gaps ("ARROWS  MOVE      ENTER  CHOOSE"); a group with no key is plain text */
export const FOOT_Y = 167;
export function hint(R, text) {
  const y = FOOT_Y;
  band(R, 0, y, R.w, R.h - y); R.rect(0, y, R.w, 1, C.rule);
  const groups = String(text).split(/\s{4,}/).map(g => { const i = g.indexOf('  '); return i < 0 ? { text: g.trim() } : { key: g.slice(0, i).trim(), text: g.slice(i).trim() }; });
  let small = false, total = 0;
  const measure = o => groups.reduce((a, g) => a + (g.key ? textW(g.key, o) + 6 + 4 : 0) + textW(g.text, o) + 14, -14);
  total = measure({}); if (total > R.w - 8) { small = true; total = measure({ small: true }); }
  const o = { small }, ty = y + 3 + (small ? 1 : 0);
  let x = Math.round((R.w - total) / 2);
  for (const g of groups) {
    if (g.key) { x += chip(R, x, y + 2, g.key, C.key, C.black, o) + 4; }
    left(R, g.text, x, ty, C.white, o); x += textW(g.text, o) + 14;
  }
}
/* the top of a screen: a bar with the title set big and a line under it, and a rule. The picture starts at y = HEAD_H */
export const HEAD_H = 28;
export function head(R, text, sub) {
  band(R, 0, 0, R.w, HEAD_H); R.rect(0, HEAD_H - 1, R.w, 1, C.rule);
  bigText(R, text, R.w / 2, sub ? 2 : 6, 2, C.yellow, ix(BROWN, 5));
  if (sub) mid(R, fit(sub, R.w - 12), R.w / 2, 19, C.dim);
}
/* text cut into lines no wider than w pixels, at spaces (the 5 x 7 face unless `o.small`) */
export function wrap(str, w, o) {
  const out = []; let line = '';
  for (const word of String(str).split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (textW(t, o) > w && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
export const tips = n => n.toLocaleString('en-US') + ' TIPS';
