/* THE HUD (docs/vroom/plan.md sections 9 and 15): what a driver reads off the glass. Position and lap, the time, the speed, the countdown, the wrong-way warning, the fade of being put back, the finish board and the
   pause. Everything that is a NUMBER stands on a small solid plate (a black ground and a one-pixel frame) and is set big -- the 5 x 7 face, the position and the speed at twice that -- because a figure laid straight on a
   picture of white snow or a dark street is a figure that is lost; what is the scene's (the countdown, which is meant to fill the glass) is set huge with a shadow. Laid out from the view's own rectangle, so each
   half of a split screen has its own. Pure but for the raster it is given: Node draws it too, for the checks and the screenshots. */
import { ix, GREY, RED, BROWN, GREEN, COOL } from './palette.js';
import { widthOf, F5 } from '../pixtext.js';
import { BAYER } from './raster_shade.js';
import { drawIcon } from './pickups_icons.js';
import { PICKUPS } from './pickups_deal.js';
import { C, panel, chip, left, right, mid, bigText, menu, textW } from './ui.js';

const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
const WHITE = ix(GREY, 15), YEL = ix(BROWN, 14), DIM = ix(GREY, 12), BLACK = ix(GREY, 0);
export const fmtTime = t => { if (t == null) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
/* a plate for a figure: solid, framed, drawn in the HUD's own frame colour */
const plate = (R, x, y, w, h, edge) => panel(R, x, y, w, h, { edge: edge || C.rule });

/* one view's HUD. `f` is the field entry whose car this is; o: { rect, calm, fps, count, mode } */
export function drawHud(R, race, f, o) {
  o = o || {};
  const r = o.rect || { x: 0, y: 0, w: R.w, h: R.h }, cx = r.x + r.w / 2, tall = r.h >= 120;
  const n = race.field.length, car = f.car, sp = Math.hypot(car.v[0], car.v[2]);
  /* a run on your own has no place to be in, and practice, the stunt yard and LAST MILE (a race of 99 laps that is never run) no lap to be on */
  const alone = o.mode === 'tt' || o.mode === 'practice' || o.mode === 'yard', free = o.mode === 'practice' || o.mode === 'yard' || o.mode === 'lastmile';
  /* position, top left: set at twice the size */
  if (!alone) {
    const ord = ORD[f.place - 1] || f.place + 'TH', w = ord.length * 12 + 26;
    plate(R, r.x + 3, r.y + 3, w, 20);
    bigText(R, ord, r.x + 3 + 6 + (ord.length * 12 - 2) / 2, r.y + 6, 2, WHITE, BLACK);
    left(R, '/' + n, r.x + 3 + 8 + ord.length * 12, r.y + 11, DIM);
  }
  /* lap and time, top right */
  const lap = Math.min(race.laps, f.lap + 1), bestLine = f.best != null && !free, w2 = 88, h2 = (free ? 0 : 10) + 15 + (bestLine ? 9 : 0) + 3;
  plate(R, r.x + r.w - 3 - w2, r.y + 3, w2, h2);
  let y = r.y + 6;
  if (!free) { right(R, 'LAP ' + lap + '/' + race.laps, r.x + r.w - 8, y, WHITE); y += 10; }
  right(R, fmtTime(Math.max(0, race.t)), r.x + r.w - 8, y, YEL, { heavy: true }); y += 9;
  if (bestLine) right(R, 'BEST ' + fmtTime(f.best), r.x + r.w - 8, y, DIM, { small: true });
  /* speed, bottom right: the figure at twice the size, a bar under it (km/h of a toy, 3.6 x metres a second) */
  const kph = Math.round(sp * 3.6), top = f.spec.vtop * 1.12, px = r.x + r.w - 3 - 78, py = r.y + r.h - 33, digits = String(kph), dw = digits.length * 12 - 2;
  plate(R, px, py, 78, 30);
  bigText(R, digits, px + 42 - dw / 2, py + 3, 2, WHITE, BLACK);
  left(R, 'KPH', px + 48, py + 11, DIM, { small: true });
  R.rect(px + 5, py + 21, 68, 7, BLACK); R.rect(px + 6, py + 22, 66, 5, ix(GREY, 4));
  R.rect(px + 6, py + 22, Math.round(Math.min(1, sp / top) * 66), 5, sp / top > 0.92 ? ix(RED, 10) : ix(GREEN, 10));
  /* what the car holds: a slot at the bottom left with the pickup's picture, its name on a plate above it and how many are left; the HOT PARCEL has no slot of its own: its fuse is a bar that shrinks, a red frame
     that flashes faster as it burns, and the antenna on the car itself */
  { const sx = r.x + 6, sy = r.y + r.h - 33, hold = f.hold || [];
    R.rect(sx - 1, sy - 1, 28, 28, BLACK); R.rect(sx, sy, 26, 26, ix(COOL, 2));
    if (hold.length) {
      drawIcon(R, hold[0].id, sx + 2, sy + 2, 2);
      const nm = PICKUPS[hold[0].id].name; plate(R, sx - 1, sy - 12, textW(nm) + 8, 11); left(R, nm, sx + 3, sy - 10, WHITE);
      if (hold[0].count > 1) chip(R, sx + 12, sy + 16, 'X' + hold[0].count, BLACK, YEL, { heavy: true });
      if (hold[1]) drawIcon(R, hold[1].id, sx + 28, sy + 8, 1);
    } else R.rect(sx + 9, sy + 11, 8, 4, ix(GREY, 4));
    if (f.bomb) {
      const k = Math.max(0, f.bomb.fuse) / 6, blink = Math.floor(race.t * (3 + (1 - k) * 9)) & 1;
      R.rect(sx - 1, sy - 1, 28, 1, blink ? ix(RED, 12) : BLACK); R.rect(sx - 1, sy + 26, 28, 1, blink ? ix(RED, 12) : BLACK);
      drawIcon(R, 'parcel', sx + 2, sy + 2, 2);
      const nm = 'HOT PARCEL'; plate(R, sx - 1, sy - 12, textW(nm) + 8, 11, blink ? ix(RED, 12) : C.rule); left(R, nm, sx + 3, sy - 10, blink ? ix(RED, 14) : YEL);
      R.rect(sx, sy + 28, 26, 3, BLACK); R.rect(sx + 1, sy + 29, Math.round(24 * k), 1, blink ? ix(RED, 12) : ix(BROWN, 14));
    }
  }
  /* the countdown: huge, in the middle of the glass, with a shadow */
  const kz = tall ? 6 : 4, topY = r.y + Math.round(r.h * (tall ? 0.2 : 0.14));
  if (race.state === 'count') {
    const t = -race.t, k = Math.ceil(t), shown = t > 0.05 && k >= 1 && k <= 3 ? String(k) : null;
    if (shown) bigText(R, shown, cx, topY, kz, ix(RED, k === 1 ? 13 : 11), BLACK, 'scene');
  } else if (race.t < 1.2) bigText(R, 'GO!', cx, topY, kz - 1, ix(GREEN, 14), BLACK, 'scene');
  /* wrong way, and the fade of being put back */
  if (f.wrong > 0.8 && !f.finished && o.mode !== 'yard' && (Math.floor(race.t * 3) & 1)) { const tw = textW('WRONG WAY', { heavy: true }) + 14; plate(R, cx - tw / 2, r.y + r.h * 0.36, tw, 13, ix(RED, 12)); mid(R, 'WRONG WAY', cx, r.y + r.h * 0.36 + 3, ix(RED, 13), { heavy: true }); }
  if (car.repoT > 0) dither(R, r, 1 - car.repoT / 0.6);
  if (f.finished && race.state !== 'count') { const tx = 'FINISHED ' + ORD[f.place - 1], tw = tx.length * 12 + 12; plate(R, cx - tw / 2, r.y + r.h * 0.2 - 3, tw, 20, YEL); bigText(R, tx, cx, r.y + r.h * 0.2, 2, YEL, BLACK); }
  if (o.fps != null) { plate(R, cx - 22, r.y + r.h - 12, 44, 10); mid(R, o.fps + ' FPS', cx, r.y + r.h - 9, DIM, { small: true }); }
}

/* the screen fading to black through the Bayer dither (a fade that does not leave the palette) */
export function dither(R, r, k) {
  const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(R.w, r.x + r.w), y1 = Math.min(R.h, r.y + r.h), buf = R.buf, lim = Math.max(0, Math.min(1, k));
  for (let y = y0; y < y1; y++) { const row = (y & 3) << 2; for (let x = x0; x < x1; x++) if (BAYER[row | (x & 3)] < lim) buf[y * R.w + x] = BLACK; }
}

/* the finish board: the field in order, with times, and what to press */
export function drawResults(R, race, o) {
  o = o || {};
  const res = race.results(), w = 190, x0 = Math.round((R.w - w) / 2), y0 = 24, rows = res.length, h = 20 + rows * 10 + 16;
  panel(R, x0, y0, w, h);
  mid(R, 'RESULTS', R.w / 2, y0 + 5, YEL, { heavy: true });
  res.forEach((r, k) => {
    const y = y0 + 18 + k * 10, c = r.human ? YEL : WHITE;
    left(R, String(r.place), x0 + 8, y, DIM); left(R, r.name, x0 + 22, y, c);
    right(R, r.time ? fmtTime(r.time) : r.laps + ' LAPS', x0 + w - 8, y, c);
  });
  mid(R, o.prompt || 'ENTER TO CONTINUE', R.w / 2, y0 + h - 12, DIM, { small: true });
}
/* the pause: the picture behind goes dim and the choices are a menu */
export function drawPause(R, o) {
  o = o || {};
  dither(R, { x: 0, y: 0, w: R.w, h: R.h }, 0.55);
  const items = o.items || ['RESUME', 'RESTART', 'QUIT'], w = 170, x0 = Math.round((R.w - w) / 2), y0 = 52, h = 28 + items.length * 14;
  panel(R, x0, y0, w, h);
  mid(R, 'PAUSED', R.w / 2, y0 + 6, YEL, { heavy: true });
  menu(R, items.map(label => ({ label })), o.sel == null ? -1 : o.sel, x0 + 6, y0 + 20, w - 12, { rowH: 14 });
}
void widthOf; void F5;
