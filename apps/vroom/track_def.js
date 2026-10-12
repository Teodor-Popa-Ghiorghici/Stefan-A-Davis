/* THE TRACKS AS DATA. A track is the points its centreline runs through (closed, in order, x east and z north, metres), the width and floor and the sort of wall at each, the things set on it (a belt, a jump, a
   kerb, a counter to drive under, a pinch) and where the cars start. `u` is a place along the line in units of control points (5.5 is half way from the sixth to the seventh), so a track can be re-shaped
   without every feature being moved. Everything else -- the road, the walls, the picture, the collision, the line a CPU follows, the checkpoints, the pickups, the hidden star -- is worked out from this
   (track_build.js), which is the point: a thing that is on the road and a thing the CPU knows about are the same thing. Pure data. */

import { rounded } from './track_path.js';

/* the floor: what each surface is called in tune.js SURF and what texture it wears in the picture (raster_tex.js) */
export const FLOORS = { lino: { surf: 'lino', tex: 'lino', k: 2.2 }, belt: { surf: 'belt', tex: 'belt', k: 2.4 }, cardboard: { surf: 'cardboard', tex: 'cardboard', k: 1.2 }, asphalt: { surf: 'asphalt', tex: 'asphalt', k: 2.4 },
  planks: { surf: 'wood', tex: 'planks', k: 1.6 }, concrete: { surf: 'asphalt', tex: 'concrete', k: 2.4 }, packed: { surf: 'packed', tex: 'slush', k: 2.4 }, deep: { surf: 'deep', tex: 'drift', k: 2.4 },
  plate: { surf: 'metal', tex: 'plate', k: 1.4 }, tile: { surf: 'tile', tex: 'checker', k: 1.4 }, carpet: { surf: 'carpet', tex: 'carpet', k: 1.6 },
  ice: { surf: 'ice', tex: 'ice', k: 2 }, grate: { surf: 'metal', tex: 'grate', k: 1 }, counter: { surf: 'tile', tex: 'formica', k: 1.6 }, kitchen: { surf: 'tile', tex: 'tilefloor', k: 1.6 }, snow: { surf: 'packed', tex: 'snow', k: 2.4 } };
/* what a car must wear to race a road at all, from the data alone: SNOW TYRES for snow underfoot, ICE CHAINS for ice, HEADLIGHTS for a blizzard. (A road with none of them is a road for anything.) The route parts are listed
   cheapest first, as the depot hangs them. */
export function needsOfDef(def) { const fl = new Set(def.controls.map(c => c.floor)), out = []; if (fl.has('packed') || fl.has('deep')) out.push('snowTyres');
  if (def.light === 'blizzard') out.push('headlights');          /* a night is raced without them (they see twice as far); a blizzard is not */
  if (fl.has('ice')) out.push('iceChains'); return out; }
/* the walls beside the road: a height (m) and a texture (and `k`, the metres a repeat of the texture covers). They are LOW on purpose (a chase camera's eye is 0.42 m up): a wall that is higher than the eye hides every thing the
   dressing puts beyond it, and a toy's road with a wall to its shoulder on both sides is a trench, not a place (docs/vroom/plan.md section 15). */
export const WALLS = { none: null, parcels: { h: 0.6, tex: 'parcels', k: 0.6 }, shelf: { h: 0.65, tex: 'shelf', k: 0.95 }, brick: { h: 0.9, tex: 'brick', k: 1.6 }, tin: { h: 0.8, tex: 'tin', k: 1.6 }, kerb: { h: 0.12, tex: 'concrete', k: 0.5 },
  snowbank: { h: 0.55, tex: 'bank', k: 0.55 }, rock: { h: 1.2, tex: 'cliff', k: 1.9 }, concrete: { h: 0.65, tex: 'barrier', k: 0.65 }, container: { h: 0.8, tex: 'container', k: 1.1 }, rail: { h: 0.35, tex: 'hazard', k: 0.35 }, formica: { h: 0.4, tex: 'formica', k: 0.4 }, fence: { h: 0.6, tex: 'planks', k: 0.6 }
};

/* SORTING ROOM: a lap of the post office's sorting floor, counter-clockwise (every bend is to the left but the two that make the chicane). Drawn as the corners of the route (track_path.js), then the things on it are
   put on a straight by its number and how far along it they sit. Corner numbers: 0 SW, 1 SE, 2-4 the belts' edge, 5-7 the chicane and the NW corner, 8-10 the west side. */
const lino = { floor: 'lino', wall: 'parcels' }, shelf = { floor: 'lino', wall: 'shelf' }; const SORT = rounded([
  { x: 0, z: 0, r: 9, w: 2.5, ...lino },             /* 0  SW: the loading dock begins here, and the start line is on the straight after it */
  { x: 96, z: 0, r: 10, w: 2.5, ...lino },           /* 1  SE */
  { x: 96, z: 26, r: 0, w: 3.7, ...shelf },          /* 2  the road opens out for the belts */
  { x: 96, z: 46, r: 0, w: 3.7, ...shelf },          /* 3 */
  { x: 96, z: 72, r: 8, w: 2.4, ...lino },           /* 4  NE */
  { x: 70, z: 72, r: 6, w: 2.3, ...lino },           /* 5  the chicane: right ... */
  { x: 60, z: 82, r: 6, w: 2.3, ...lino },           /* 6  ... and back left */
  { x: 4, z: 82, r: 6, w: 2.3, ...lino },            /* 7  NW: the tight corner, with the kerb */
  { x: 4, z: 58, r: 7, w: 2.2, ...shelf },           /* 8  the west side, between the shelves */
  { x: 16, z: 34, r: 7, w: 2.2, ...shelf },          /* 9 */
], { step: 2.5 }); export const SORTING = { id: 'sorting', name: 'SORTING ROOM', laps: 3, rating: 0, light: 'hall',
  controls: SORT.controls, edges: SORT.edges,
  features: [
    { type: 'belt', u0: SORT.u(2, 0.12), u1: SORT.u(2, 0.9), lane: [-0.65, 0.65], speed: 1.8, rise: 0.04 },  /* a belt down the middle of the wide part: faster, and narrow */
    { type: 'jump', u: SORT.u(6, 0.66), rise: 0.18, run: 0.9, gap: 1.4 },                                    /* the standard jump over the loading pit */
    { type: 'kerb', u0: SORT.u(7, 0.0) - 1.5, u1: SORT.u(7, 0.0) + 2.5, side: 'inner', h: 0.035 },            /* the corner that rolls a tall car */
    { type: 'pinch', u0: SORT.u(8, 0.35), u1: SORT.u(8, 0.55), gap: 1.2 },                                   /* two stacks of parcels, and the cars bunch */
    { type: 'counter', u0: SORT.u(8, 0.7), u1: SORT.u(8, 0.95), h: 0.62 },                                   /* the counter: a low roof to drive under */
    /* the pickups: a cluster of three across the road, on a straight, clear of the belt, the jump, the kerb, the pinch and the counter (track_check.js holds that) */
    { type: 'star', u: SORT.u(0, 0.75), side: 'right', rise: 0.5, floor: 'cardboard', wall: 'parcels' },                       /* the top shelf, behind the loading dock */
    { type: 'pickups', u: SORT.u(0, 0.66) }, { type: 'pickups', u: SORT.u(1, 0.5) }, { type: 'pickups', u: SORT.u(3, 0.43) }, { type: 'pickups', u: SORT.u(4, 0.5) },
    { type: 'pickups', u: SORT.u(6, 0.32) }, { type: 'pickups', u: SORT.u(7, 0.86) }, { type: 'pickups', u: SORT.u(9, 0.38) }
  ],
  start: { u: SORT.u(0, 0.45), rows: 4, gap: 1.5, side: 0.55 } }; import { STREET, FORECOURT, DINER } from './tracks_a.js'; import { PASS, DAM } from './tracks_b.js'; import { HARBOUR, FACTORY } from './tracks_c.js';
export const TRACKS = { sorting: SORTING, street: STREET, forecourt: FORECOURT, diner: DINER, pass: PASS, dam: DAM, harbour: HARBOUR, factory: FACTORY };
