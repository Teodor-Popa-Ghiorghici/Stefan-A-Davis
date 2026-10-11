/* THE HUD (docs/vroom/plan.md section 9): what a driver reads off the glass. Position and lap, the time, the speed, the countdown, the wrong-way warning, the fade of being put back, the finish board and the
   pause. Everything is pixel type with an outline (the machine's rule for text on a canvas: R.text) laid straight over the 3D view, in a rectangle so each half of a split screen has its own.
   Pure but for the raster it is given: Node draws it too, for the checks and the screenshots. */
import { ix, GREY, RED, BROWN, CYAN, GREEN, COOL } from './palette.js';
import { widthOf, F3, F5 } from '../pixtext.js';
import { BAYER } from './raster_shade.js';
import { drawIcon } from './pickups_icons.js';
import { PICKUPS } from './pickups_deal.js';

const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
const WHITE = ix(GREY, 15), YEL = ix(BROWN, 14), DIM = ix(GREY, 11), BLACK = ix(GREY, 0);
export const fmtTime = t => { if (t == null) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
const right = (R, str, rx, y, c, o) => R.text(str, rx - widthOf(str, o && o.big ? F5 : F3) / 2, y, c, o);
const left = (R, str, lx, y, c, o) => R.text(str, lx + widthOf(str, o && o.big ? F5 : F3) / 2, y, c, o);

/* one view's HUD. `f` is the field entry whose car this is; o: { rect, calm, fps, count } */
export function drawHud(R, race, f, o) {
  o = o || {};
  const r = o.rect || { x: 0, y: 0, w: R.w, h: R.h }, cx = r.x + r.w / 2;
  const n = race.field.length, car = f.car, sp = Math.hypot(car.v[0], car.v[2]);
  /* position, big, top left */
  left(R, ORD[f.place - 1] || f.place + 'TH', r.x + 5, r.y + 4, WHITE, { big: true, heavy: true, outline: BLACK });
  left(R, '/' + n, r.x + 5 + widthOf(ORD[f.place - 1] || f.place + 'TH', F5, true) + 3, r.y + 8, DIM, { outline: BLACK });
  /* lap and time, top right */
  const lap = Math.min(race.laps, f.lap + 1);
  right(R, 'LAP ' + lap + '/' + race.laps, r.x + r.w - 5, r.y + 4, WHITE, { outline: BLACK });
  right(R, fmtTime(Math.max(0, race.t)), r.x + r.w - 5, r.y + 11, YEL, { outline: BLACK });
  if (f.best != null) right(R, 'BEST ' + fmtTime(f.best), r.x + r.w - 5, r.y + 18, DIM, { outline: BLACK });
  /* speed, bottom right: a bar and a number (km/h of a toy, 3.6 x metres a second) */
  const kph = Math.round(sp * 3.6), top = f.spec.vtop * 1.12, bw = 44, bx = r.x + r.w - 5 - bw, by = r.y + r.h - 12;
  R.rect(bx - 1, by - 1, bw + 2, 6, BLACK); R.rect(bx, by, bw, 4, ix(GREY, 3));
  const fill = Math.min(1, sp / top) * bw; R.rect(bx, by, fill, 4, sp / top > 0.92 ? ix(RED, 10) : ix(GREEN, 10));
  right(R, kph + ' KPH', r.x + r.w - 5, by - 8, WHITE, { outline: BLACK });
  /* what the car holds: a slot at the bottom middle with the pickup's picture, its name and how many are left; the HOT PARCEL has no slot of its own: its fuse is a bar that shrinks, a red frame that flashes
     faster as it burns, and the antenna on the car itself */
  { const sx = r.x + 6, sy = r.y + r.h - 33, hold = f.hold || [];
    R.rect(sx - 1, sy - 1, 28, 28, BLACK); R.rect(sx, sy, 26, 26, ix(COOL, 2));
    if (hold.length) {
      drawIcon(R, hold[0].id, sx + 2, sy + 2, 2);
      left(R, PICKUPS[hold[0].id].name, sx, sy - 7, WHITE, { outline: BLACK });
      if (hold[0].count > 1) left(R, 'X' + hold[0].count, sx + 21, sy + 19, YEL, { outline: BLACK });
      if (hold[1]) drawIcon(R, hold[1].id, sx + 28, sy + 8, 1);
    } else R.rect(sx + 9, sy + 11, 8, 4, ix(GREY, 4));
    if (f.bomb) {
      const k = Math.max(0, f.bomb.fuse) / 6, blink = Math.floor(race.t * (3 + (1 - k) * 9)) & 1;
      R.rect(sx - 1, sy - 1, 28, 1, blink ? ix(RED, 12) : BLACK); R.rect(sx - 1, sy + 26, 28, 1, blink ? ix(RED, 12) : BLACK);
      drawIcon(R, 'parcel', sx + 2, sy + 2, 2);
      left(R, 'HOT PARCEL', sx, sy - 7, blink ? ix(RED, 12) : YEL, { outline: BLACK });
      R.rect(sx, sy + 28, 26, 3, BLACK); R.rect(sx + 1, sy + 29, Math.round(24 * k), 1, blink ? ix(RED, 12) : ix(BROWN, 14));
    }
  }
  /* the countdown */
  if (race.state === 'count') {
    const t = -race.t, k = Math.ceil(t), shown = t > 0.05 && k >= 1 && k <= 3 ? String(k) : null;
    if (shown) R.text(shown, cx, r.y + r.h * 0.3, ix(RED, k === 1 ? 12 : 10), { big: true, heavy: true, outline: BLACK });
  } else if (race.t < 1.2) R.text('GO!', cx, r.y + r.h * 0.3, ix(GREEN, 14), { big: true, heavy: true, outline: BLACK });
  /* wrong way, and the fade of being put back */
  if (f.wrong > 0.8 && !f.finished && (Math.floor(race.t * 3) & 1)) R.text('WRONG WAY', cx, r.y + r.h * 0.22, ix(RED, 12), { big: true, outline: BLACK });
  if (car.repoT > 0) dither(R, r, 1 - car.repoT / 0.6);
  if (f.finished && race.state !== 'count') R.text('FINISHED ' + ORD[f.place - 1], cx, r.y + 24, YEL, { big: true, heavy: true, outline: BLACK });
  if (o.fps != null) left(R, o.fps + ' FPS', r.x + 3, r.y + r.h - 8, DIM, { outline: BLACK });
}

/* the screen fading to black through the Bayer dither (a fade that does not leave the palette) */
export function dither(R, r, k) {
  const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(R.w, r.x + r.w), y1 = Math.min(R.h, r.y + r.h), buf = R.buf, lim = Math.max(0, Math.min(1, k));
  for (let y = y0; y < y1; y++) { const row = (y & 3) << 2; for (let x = x0; x < x1; x++) if (BAYER[row | (x & 3)] < lim) buf[y * R.w + x] = BLACK; }
}

/* the finish board: the field in order, with times, and what to press */
export function drawResults(R, race, o) {
  o = o || {};
  const res = race.results(), x0 = 70, w = R.w - 140, y0 = 30, rows = res.length, h = 14 + rows * 9 + 14;
  R.rect(x0 - 1, y0 - 1, w + 2, h + 2, ix(GREY, 12)); R.rect(x0, y0, w, h, ix(COOL, 2));
  R.text('RESULTS', R.w / 2, y0 + 3, YEL, { outline: BLACK });
  res.forEach((r, k) => {
    const y = y0 + 12 + k * 9, c = r.human ? YEL : WHITE;
    left(R, String(r.place), x0 + 6, y, DIM, { outline: -1 }); left(R, r.name, x0 + 18, y, c, { outline: -1 });
    right(R, r.time ? fmtTime(r.time) : r.laps + ' LAPS', x0 + w - 6, y, c, { outline: -1 });
  });
  R.text(o.prompt || 'ENTER TO CONTINUE', R.w / 2, y0 + h - 9, DIM, { outline: -1 });
}
export function drawPause(R, o) {
  o = o || {};
  dither(R, { x: 0, y: 0, w: R.w, h: R.h }, 0.55);
  const x0 = 100, w = R.w - 200, y0 = 50, items = o.items || ['RESUME', 'RESTART', 'QUIT'], h = 20 + items.length * 11;
  R.rect(x0 - 1, y0 - 1, w + 2, h + 2, ix(GREY, 12)); R.rect(x0, y0, w, h, ix(COOL, 2));
  R.text('PAUSED', R.w / 2, y0 + 4, YEL, { outline: BLACK });
  items.forEach((it, k) => R.text((k === o.sel ? '> ' : '  ') + it, R.w / 2, y0 + 16 + k * 11, k === o.sel ? WHITE : DIM, { outline: -1 }));
}
void CYAN;
