/* THE RING OF A ROAD MADE OF TILES (docs/vroom/plan.md section 9): the painted tiles are a road if, and only if, they are one ring -- every tile has exactly two painted neighbours (up, down, left, right), and walking from
   any tile to a neighbour and on never stops until it is back where it began, having been to every painted tile. `loopOf(road)` says whether they are, in what order a car goes round them, which of the tiles are
   corners, and, if they are not a ring, which tile is why and what is wrong with it (a tile alone, a dead end, a fork, a crossing, two rings). The order begins at the first painted tile in reading order, going right
   (that tile has nothing above or to its left, so it can only go right and down), and so is always the same for the same road. Pure. */
import { cellKey, cellsOf, MAX_CELLS } from './maker_trk.js';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];          /* right, down, left, up (the picture's: row 0 is the top) */
export const WHY = ['A TILE ALONE', 'A DEAD END', null, 'A FORK', 'A CROSSING'];

export function loopOf(road) {
  const cells = cellsOf(road), problems = [];
  const has = (x, y) => !!road[cellKey(x, y)];
  const nbrs = c => DIRS.map(d => [c[0] + d[0], c[1] + d[1]]).filter(p => has(p[0], p[1]));
  if (!cells.length) return { ok: false, order: [], turns: [], problems: [{ at: null, text: 'PAINT SOME ROAD' }], cells: 0 };
  if (cells.length > MAX_CELLS) problems.push({ at: null, text: 'TOO LONG: ' + cells.length + ' TILES, THE MOST IS ' + MAX_CELLS });
  for (const c of cells) { const n = nbrs(c).length; if (n !== 2 && WHY[n]) problems.push({ at: c, text: WHY[n] }); }
  if (problems.length) return { ok: false, order: [], turns: [], problems, cells: cells.length };
  /* walk it */
  const order = [cells[0]];
  let prev = null, cur = cells[0];
  for (;;) {
    const next = nbrs(cur).filter(p => !prev || p[0] !== prev[0] || p[1] !== prev[1]);
    const to = !prev ? next[0] : next[0];
    prev = cur; cur = to;
    if (cur[0] === cells[0][0] && cur[1] === cells[0][1]) break;
    order.push(cur);
    if (order.length > cells.length) break;
  }
  if (order.length < cells.length) {
    const seen = new Set(order.map(c => cellKey(c[0], c[1])));
    return { ok: false, order: [], turns: [], problems: [{ at: cells.find(c => !seen.has(cellKey(c[0], c[1]))), text: 'TWO RINGS: A ROAD IS ONE RING' }], cells: cells.length };
  }
  const n = order.length, turns = order.map((c, i) => { const a = order[(i + n - 1) % n], b = order[(i + 1) % n]; return (c[0] - a[0]) !== (b[0] - c[0]) || (c[1] - a[1]) !== (b[1] - c[1]); });
  return { ok: true, order, turns, problems: [], cells: n };
}
