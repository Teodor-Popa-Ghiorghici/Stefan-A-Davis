/* THE TRACK MAKER'S ROAD, as a file and as a value (docs/vroom/plan.md section 9). A road of the player's own is tiles: a grid of GRID_W x GRID_H squares of TILE metres, a set of them painted as road, and on some
   of the road tiles a MODULE (a jump, a belt, a kerb, a pinch, a counter to drive under, a cluster of pickups). The painted tiles must be one ring with no tile touching a tile of the ring that is not its neighbour in it
   (maker_loop.js); everything else a track is -- the corners and their bends, the width and floor and walls, where the cars start, the pickups, the checkpoints -- is worked out from that (maker_def.js), which is why a road
   made here is raced by the same code as the town's own and driven by the same CPU. A road is saved as text, `::/Home/Vroom/<NAME>.TRK`, one fact to a line:
       VROOM ROAD 1
       NAME MY FIRST ROAD        THEME HALL        LAPS 3
       ROAD 3,2 4,2 5,2 ...      (the painted tiles, column and row, in reading order)
       JUMP 5,2                  BELT 6,2   KERB 7,3   PINCH 4,2   COUNTER 8,2   PICKUPS 9,2   START 4,2
   `fromText` never throws and never trusts: a tile outside the grid, an unknown word, a name that is too long or a file that is far too big is cut down to what is safe. Pure. */

export const GRID_W = 12, GRID_H = 8, TILE = 24, MAX_CELLS = 64, MAX_TEXT = 8000;
export const BEND = 7;                                                   /* the radius, in metres, of the bend at a tile where the road turns: two of them fit in the 24 m between neighbouring corners with 10 m of road to spare */
export const WIDTH = 3.0;                                                /* the road is 3 m wide: a car is 0.22 */
/* the themes: what the road is made of and the light and the room it is in (the town's own kits, track_dress.js). A road of snow or ice wants the car to wear the tyres or the chains, as the town's does (track_def.js needsOfDef). */
export const THEMES = {
  hall: { name: 'POST OFFICE', floor: 'lino', wall: 'parcels', light: 'hall', dress: null },
  street: { name: 'MAIN STREET', floor: 'asphalt', wall: 'concrete', light: 'night', dress: 'street' },
  forecourt: { name: 'FORECOURT', floor: 'asphalt', wall: 'concrete', light: 'day', dress: 'forecourt' },
  diner: { name: 'DINER', floor: 'tile', wall: 'formica', light: 'day', dress: 'diner' },
  snow: { name: 'SNOWY PASS', floor: 'packed', wall: 'snowbank', light: 'day', dress: 'pass' },
  ice: { name: 'FROZEN HARBOUR', floor: 'ice', wall: 'container', light: 'night', dress: 'harbour' },
  factory: { name: 'FACTORY', floor: 'plate', wall: 'container', light: 'hall', dress: 'factory' }
};
export const THEME_IDS = Object.keys(THEMES);
/* the modules, in the order the palette shows them; `on` says where each can stand: a tile where the road runs straight on or the tile of a corner */
export const MODULES = {
  jump: { name: 'JUMP', on: 'straight', letter: 'J' }, belt: { name: 'BELT', on: 'straight', letter: 'B' }, pinch: { name: 'PINCH', on: 'straight', letter: 'P' }, counter: { name: 'COUNTER', on: 'straight', letter: 'C' },
  pickups: { name: 'PICKUPS', on: 'straight', letter: '?' }, kerb: { name: 'KERB', on: 'corner', letter: 'K' }
};
export const MODULE_IDS = Object.keys(MODULES);
export const WORDS = Object.keys(MODULES).map(k => k.toUpperCase());

export const cellKey = (x, y) => x + ',' + y;
export const inGrid = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
/* the cells of a set, in reading order (a row at a time) */
export const cellsOf = set => Object.keys(set).map(k => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);

export function blank(name) { return { v: 1, name: name || 'MY ROAD', theme: 'hall', laps: 3, road: {}, mods: {}, start: null }; }
export const clone = t => JSON.parse(JSON.stringify(t));

/* a name for a file and a title: capitals, digits, spaces and a few marks, no longer than twenty characters */
export const cleanName = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
export const fileOf = name => (cleanName(name).replace(/ /g, '_') || 'ROAD') + '.TRK';

export function toText(t) {
  const out = ['VROOM ROAD 1', 'NAME ' + cleanName(t.name), 'THEME ' + (THEMES[t.theme] ? t.theme : 'hall').toUpperCase(), 'LAPS ' + (t.laps | 0)];
  const cells = cellsOf(t.road);
  if (cells.length) out.push('ROAD ' + cells.map(c => c.join(',')).join(' '));
  for (const id of MODULE_IDS) {
    const at = Object.keys(t.mods).filter(k => t.mods[k] === id).sort((a, b) => { const p = a.split(',').map(Number), q = b.split(',').map(Number); return p[1] - q[1] || p[0] - q[0]; });
    at.forEach(k => out.push(id.toUpperCase() + ' ' + k));
  }
  if (t.start) out.push('START ' + t.start);
  return out.join('\n') + '\n';
}

/* anything -> a road that is safe to use. A line that is not understood is ignored; so is a tile outside the grid, a module on a tile that is not road, and every tile past MAX_CELLS. */
export function fromText(text) {
  const t = blank('MY ROAD'); t.name = 'MY ROAD';
  const src = String(text == null ? '' : text).slice(0, MAX_TEXT);
  let n = 0;
  const tile = w => { const m = /^(\d{1,2}),(\d{1,2})$/.exec(w); if (!m) return null; const x = +m[1], y = +m[2]; return inGrid(x, y) ? [x, y] : null; };
  src.split(/\r?\n/).forEach(line => {
    const words = line.trim().split(/\s+/), head = (words[0] || '').toUpperCase(), rest = words.slice(1);
    if (head === 'NAME') t.name = cleanName(rest.join(' ')) || t.name;
    else if (head === 'THEME') { const id = (rest[0] || '').toLowerCase(); if (THEMES[id]) t.theme = id; }
    else if (head === 'LAPS') { const v = parseInt(rest[0], 10); if (v >= 1 && v <= 9) t.laps = v; }
    else if (head === 'ROAD') rest.forEach(w => { const c = tile(w); if (c && n < MAX_CELLS) { if (!t.road[cellKey(c[0], c[1])]) n++; t.road[cellKey(c[0], c[1])] = 1; } });
    else if (head === 'START') { const c = tile(rest[0] || ''); if (c) t.start = cellKey(c[0], c[1]); }
    else if (WORDS.indexOf(head) >= 0) { const c = tile(rest[0] || ''); if (c) t.mods[cellKey(c[0], c[1])] = head.toLowerCase(); }
  });
  for (const k of Object.keys(t.mods)) if (!t.road[k]) delete t.mods[k];
  if (t.start && !t.road[t.start]) t.start = null;
  return t;
}
