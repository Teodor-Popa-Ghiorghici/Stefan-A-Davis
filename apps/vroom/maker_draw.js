/* THE TRACK MAKER'S PICTURE (docs/vroom/plan.md section 9): the grid of tiles at 16 pixels a tile, the road drawn as a strip joining the centres of its tiles with a dash down the middle and an arrow on every tile of a ring pointing
   the way the cars go, the module on each tile as its letter, the start line as a flag, the tile that is a problem in a dashed red box and the cursor in a yellow one (green while the pen is painting). Everything is whole pixels in the palette and pixel type with an outline. Pure but for the raster it is given. */
import { ix, GREY, CYAN, BROWN, COOL } from './palette.js';
import { C, dashed } from './ui.js';
import { GRID_W, GRID_H, cellKey, MODULES } from './maker_trk.js';

export const TILE_PX = 16, GX = 8, GY = 17;
/* what each theme's road looks like on the grid: the colour of its floor */
const FLOOR = { hall: ix(GREY, 8), street: ix(GREY, 6), forecourt: ix(GREY, 9), diner: ix(COOL, 12), snow: ix(COOL, 14), ice: ix(CYAN, 12), factory: ix(BROWN, 6) };
const TILE_A = ix(COOL, 3), TILE_B = ix(COOL, 4), DASH = ix(BROWN, 13), ARROW = ix(GREY, 15);

/* an arrow of five pixels in the direction (dx, dy): a shaft and two pixels of head */
export function arrow(R, cx, cy, dx, dy, col) {
  for (let k = -2; k <= 2; k++) R.rect(cx + dx * k, cy + dy * k, 1, 1, col);
  const px = -dy, py = dx;
  R.rect(cx + dx + px, cy + dy + py, 1, 1, col); R.rect(cx + dx - px, cy + dy - py, 1, 1, col);
}
/* a flag of four squares: the start line */
function flag(R, x, y) { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) R.rect(x + i, y + j, 1, 1, (i + j) & 1 ? C.white : C.black); }

export const tileAt = (x, y) => ({ x: GX + x * TILE_PX, y: GY + y * TILE_PX });
/* S: { t (the road), cx, cy (the cursor), pen ('paint' or null), blink }, an: analyse() of the road */
export function drawGrid(R, S, an) {
  const t = S.t, floor = FLOOR[t.theme] || FLOOR.hall, has = (x, y) => !!t.road[cellKey(x, y)];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) { const p = tileAt(x, y); R.rect(p.x, p.y, TILE_PX, TILE_PX, (x + y) & 1 ? TILE_A : TILE_B); }
  /* the road: a strip from the centre of each road tile to the centre of its neighbour to the right and below, and a square at every centre */
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (!has(x, y)) continue;
    const p = tileAt(x, y), cx = p.x + 8, cy = p.y + 8;
    R.rect(cx - 3, cy - 3, 6, 6, floor);
    if (has(x + 1, y)) { R.rect(cx, cy - 3, TILE_PX, 6, floor); for (let k = 0; k < TILE_PX; k += 4) R.rect(cx + k, cy, 2, 1, DASH); }
    if (has(x, y + 1)) { R.rect(cx - 3, cy, 6, TILE_PX, floor); for (let k = 0; k < TILE_PX; k += 4) R.rect(cx, cy + k, 1, 2, DASH); }
  }
  /* the way round */
  if (an.lp && an.lp.ok) {
    const o = an.lp.order, n = o.length;
    o.forEach((c, i) => { const nx = o[(i + 1) % n], p = tileAt(c[0], c[1]); arrow(R, p.x + 8, p.y + 8, nx[0] - c[0], nx[1] - c[1], ARROW); });
  }
  /* what stands on the road */
  for (const k of Object.keys(t.mods)) {
    const [x, y] = k.split(',').map(Number), p = tileAt(x, y), m = MODULES[t.mods[k]];
    if (m) R.text(m.letter, p.x + 8, p.y + 2, C.yellow, { outline: C.black });
  }
  if (t.start) { const [x, y] = t.start.split(',').map(Number), p = tileAt(x, y); flag(R, p.x + 10, p.y + 10); R.text('S', p.x + 4, p.y + 9, C.green, { outline: C.black }); }
  /* the problem, and the cursor */
  for (const pr of an.problems || []) if (pr.at) { const p = tileAt(pr.at[0], pr.at[1]); dashed(R, p.x, p.y, TILE_PX, TILE_PX, C.red); }
  const q = tileAt(S.cx, S.cy), col = S.pen ? C.green : C.yellow;
  if (!S.blink || S.pen) { R.rect(q.x, q.y, TILE_PX, 1, col); R.rect(q.x, q.y + TILE_PX - 1, TILE_PX, 1, col); R.rect(q.x, q.y, 1, TILE_PX, col); R.rect(q.x + TILE_PX - 1, q.y, 1, TILE_PX, col); }
  else { for (const [dx, dy] of [[0, 0], [TILE_PX - 3, 0], [0, TILE_PX - 3], [TILE_PX - 3, TILE_PX - 3]]) R.rect(q.x + dx, q.y + dy, 3, 3, col); }
}
