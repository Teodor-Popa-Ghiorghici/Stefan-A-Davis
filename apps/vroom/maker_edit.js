/* WHAT THE TRACK MAKER'S KEYS DO TO A ROAD (docs/vroom/plan.md section 9), apart from the screen: the tools, painting and erasing a tile, putting a module or the start line on one, and `analyse`, which says what the road
   as it stands is (a ring or not, the problem and the tile it is at, its length, the track data if it can be one). Pure, so maker_check.js can press every key in Node. */
import { cellKey, inGrid, MODULES } from './maker_trk.js';
import { loopOf } from './maker_loop.js';
import { defOf } from './maker_def.js';

/* the palette, in the order of the digits 1 to 9 */
export const TOOLS = [
  { id: 'road', name: 'ROAD' }, { id: 'jump', name: 'JUMP' }, { id: 'belt', name: 'BELT' }, { id: 'pinch', name: 'PINCH' }, { id: 'counter', name: 'COUNTER' },
  { id: 'pickups', name: 'PICKUPS' }, { id: 'kerb', name: 'KERB' }, { id: 'start', name: 'START LINE' }, { id: 'erase', name: 'ERASE' }
];
/* what each module is, in the words of the screen (the palette's help line) */
export const HELP = {
  road: 'PAINT THE ROAD: A SINGLE RING, ONE TILE WIDE, NO FORKS.', jump: 'A RAMP OVER A GAP. NEEDS A STRAIGHT TILE, AND A STRAIGHT ONE BEFORE IT.', belt: 'A CONVEYOR DOWN THE MIDDLE OF A STRAIGHT TILE.',
  pinch: 'TWO STACKS OF PARCELS: THE CARS BUNCH. A STRAIGHT TILE.', counter: 'A COUNTER TO DRIVE UNDER. A STRAIGHT TILE.', pickups: 'A CLUSTER OF PICKUPS. A STRAIGHT TILE. THE ROAD IS GIVEN MORE TILL IT HAS ENOUGH.',
  kerb: 'A KERB ON THE INSIDE OF A CORNER: IT ROLLS A TALL CAR.', start: 'WHERE THE CARS START: A STRAIGHT TILE. THE LONGEST STRAIGHT IF YOU PUT NONE.', erase: 'TAKE A MODULE OFF A TILE; ON A BARE TILE, THE ROAD ITSELF.'
};

const keyOf = (x, y) => cellKey(x, y);
/* a tile of road; a tile that is road already is left (false) */
export function paint(t, x, y) {
  if (!inGrid(x, y) || t.road[keyOf(x, y)]) return false;
  t.road[keyOf(x, y)] = 1; return true;
}
/* a tile of road taken away, and everything that stood on it */
export function removeRoad(t, x, y) {
  const k = keyOf(x, y);
  if (!t.road[k]) return false;
  delete t.road[k]; delete t.mods[k]; if (t.start === k) t.start = null;
  return true;
}
/* a module or the start line on a tile: the same one again takes it off. Returns the words to say if it cannot be done, or null. */
export function put(t, tool, x, y) {
  const k = keyOf(x, y);
  if (!inGrid(x, y) || !t.road[k]) return 'PAINT ROAD THERE FIRST';
  if (tool === 'start') { t.start = t.start === k ? null : k; if (t.start) delete t.mods[k]; return null; }
  if (!MODULES[tool]) return 'NO SUCH THING';
  if (t.mods[k] === tool) delete t.mods[k]; else { t.mods[k] = tool; if (t.start === k) t.start = null; }
  return null;
}
/* the eraser: a module or the start line if the tile has one, else the road */
export function clearTile(t, x, y) {
  const k = keyOf(x, y);
  if (t.mods[k]) { delete t.mods[k]; return true; }
  if (t.start === k) { t.start = null; return true; }
  return removeRoad(t, x, y);
}
/* what the road as it stands is: { ok, problems, lp, def, info, length } -- `def` is the track data when it is a road */
export function analyse(t, id) {
  const lp = loopOf(t.road);
  if (!lp.ok) return { ok: false, problems: lp.problems, lp, def: null, info: null };
  const r = defOf(t, id || 'user:ROAD');
  return { ok: !!r.def, problems: r.problems, lp, def: r.def, info: r.info };
}
