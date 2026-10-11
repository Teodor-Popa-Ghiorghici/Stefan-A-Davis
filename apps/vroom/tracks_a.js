/* THE FIRST ROADS OF THE TOWN (docs/vroom/plan.md section 9): MAIN STREET AT NIGHT, THE FORECOURT and THE DINER, drawn the way the sorting room is (track_def.js): the corners of the route and what the road is made of at each,
   then the things on it, by which straight and how far along it. `dress` names the kit of props that stands round the road (track_dress.js). Pure data. */
import { rounded } from './track_path.js';

const C = (x, z, r, w, floor, wall) => ({ x, z, r, w, floor, wall });

/* MAIN STREET, NIGHT: clockwise, an L of streets round two blocks. Snowbanks for walls, a parked kei truck to drive under, the vending machines' glow, a culvert to jump, and a snowed-in short cut across the park (deep snow: SNOW TYRES). */
const STREET_R = rounded([
  C(0, 0, 9, 3.2, 'asphalt', 'snowbank'),       /* 0  SW */
  C(0, 84, 10, 3.0, 'asphalt', 'snowbank'),     /* 1  NW */
  C(66, 84, 8, 2.8, 'asphalt', 'snowbank'),     /* 2  the north street ends */
  C(66, 56, 7, 2.4, 'asphalt', 'snowbank'),     /* 3  down the side lane */
  C(116, 56, 9, 2.4, 'asphalt', 'snowbank'),    /* 4  the inner lane east */
  C(116, 10, 8, 3.0, 'asphalt', 'snowbank'),    /* 5  the east side */
  C(98, 0, 7, 3.0, 'asphalt', 'snowbank')       /* 6  and back along the bottom */
], { step: 2.5 });
export const STREET = {
  id: 'street', name: 'MAIN STREET', laps: 3, rating: 0, light: 'night', dress: 'street',
  controls: STREET_R.controls, edges: STREET_R.edges,
  features: [
    { type: 'kerb', u0: STREET_R.u(1, 0.0) - 1.5, u1: STREET_R.u(1, 0.0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'counter', u0: STREET_R.u(1, 0.5), u1: STREET_R.u(1, 0.72), h: 0.62 },                           /* a parked kei truck, full size: a tunnel */
    { type: 'pinch', u0: STREET_R.u(3, 0.4), u1: STREET_R.u(3, 0.52), gap: 1.2 },                           /* two vending machines and a snowbank */
    { type: 'jump', u: STREET_R.u(6, 0.3), rise: 0.18, run: 0.9, gap: 1.4 },                                /* the culvert */
    { type: 'cut', u0: STREET_R.u(0, 0.1), u1: STREET_R.u(1, 0.95), side: 'right', reach: 0.25, lean: 0.45, w: 1.7, floor: 'deep', wall: 'snowbank' },
    { type: 'star', u: STREET_R.u(0, 0.62), side: 'left', rise: 0.5, floor: 'packed', wall: 'snowbank' },                       /* a drift against the wall of the bakery */
    { type: 'pickups', u: STREET_R.u(0, 0.2) }, { type: 'pickups', u: STREET_R.u(0, 0.7) }, { type: 'pickups', u: STREET_R.u(1, 0.18) }, { type: 'pickups', u: STREET_R.u(1, 0.9) },
    { type: 'pickups', u: STREET_R.u(3, 0.8) }, { type: 'pickups', u: STREET_R.u(4, 0.8) }, { type: 'pickups', u: STREET_R.u(6, 0.62) }, { type: 'pickups', u: STREET_R.u(6, 0.9) }
  ],
  start: { u: STREET_R.u(6, 0.82), rows: 4, gap: 1.5, side: 0.55 }
};

/* THE FORECOURT: counter-clockwise, round a petrol station and through its shop. Outside under the canopy (a counter to drive under, the pumps as a pinch, a car wash with a belt), then in at the shop's side door and down an
   aisle (a pinch between two shelves, a jump over the delivery pallet, a kerb at the end of it), out through the stockroom and back round. The stockroom's door is drifted shut with deep snow: a car with SNOW TYRES goes
   across the corner of the aisles on it. */
const lino = { floor: 'lino', wall: 'shelf' }, out = { floor: 'asphalt', wall: 'concrete' };
const FORE_R = rounded([
  C(0, 0, 8, 3.0, out.floor, out.wall),            /* 0  the forecourt's south-west corner; the start is on the straight after it */
  C(120, 0, 10, 3.4, out.floor, out.wall),         /* 1  the east end, where the car wash is */
  C(120, 40, 8, 3.4, out.floor, out.wall),         /* 2 */
  C(84, 70, 8, 2.6, lino.floor, lino.wall),        /* 3  the shop's side door */
  C(84, 104, 8, 2.4, lino.floor, lino.wall),       /* 4  the back of the shop */
  C(14, 104, 9, 2.4, lino.floor, lino.wall),       /* 5  the long aisle ends */
  C(14, 44, 8, 2.4, lino.floor, lino.wall),        /* 6  down the stockroom */
  C(-16, 30, 7, 2.6, out.floor, out.wall)          /* 7  out of the back door */
], { step: 2.5 });
export const FORECOURT = {
  id: 'forecourt', name: 'THE FORECOURT', laps: 3, rating: 1, light: 'day', dress: 'forecourt',
  controls: FORE_R.controls, edges: FORE_R.edges,
  features: [
    { type: 'counter', u0: FORE_R.u(0, 0.5), u1: FORE_R.u(0, 0.68), h: 0.62 },                                 /* under the canopy */
    { type: 'pinch', u0: FORE_R.u(0, 0.82), u1: FORE_R.u(0, 0.88), gap: 1.4 },                               /* between the pumps */
    { type: 'belt', u0: FORE_R.u(1, 0.2), u1: FORE_R.u(1, 0.8), lane: [-0.6, 0.6], speed: 1.8, rise: 0.04 },   /* the car wash */
    { type: 'pinch', u0: FORE_R.u(4, 0.2), u1: FORE_R.u(4, 0.27), gap: 1.4 },                                /* two shelves of bread */
    { type: 'jump', u: FORE_R.u(4, 0.75), rise: 0.18, run: 0.9, gap: 1.4 },                                  /* the delivery pallet */
    { type: 'kerb', u0: FORE_R.u(5, 0) - 1.5, u1: FORE_R.u(5, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'cut', u0: FORE_R.u(3, 0.5), u1: FORE_R.u(5, 0.5), side: 'left', reach: 0.3, lean: 0.5, w: 1.7, floor: 'deep', wall: 'snowbank' },
    { type: 'star', u: FORE_R.u(0, 0.15), side: 'right', rise: 0.5, floor: 'asphalt', wall: 'concrete' },                          /* the roof of the air pump's shed */
    { type: 'pickups', auto: 8 }
  ],
  start: { u: FORE_R.u(0, 0.4), rows: 4, gap: 1.5, side: 0.55 }
};

/* THE DINER: counter-clockwise, on a diner's own floor. The dining room's black and white tiles, the kitchen (a dish belt on the pass, steel walls), the counter-tops (a jump from one to the next) and the booths' carpet at
   the back. The kitchen's swing door is a gate across a short cut: a BUMPER BAR goes through it, anything else meets the door. */
const tile = { floor: 'tile', wall: 'formica' }, kit = { floor: 'kitchen', wall: 'tin' }, ctr = { floor: 'counter', wall: 'formica' }, booth = { floor: 'carpet', wall: 'shelf' };
const DINER_R = rounded([
  C(0, 0, 8, 3.0, tile.floor, tile.wall),          /* 0  the door */
  C(96, 0, 10, 3.0, tile.floor, tile.wall),        /* 1  the far end of the room */
  C(96, 40, 7, 3.0, tile.floor, tile.wall),        /* 2  to the pass */
  C(66, 40, 5, 2.6, kit.floor, kit.wall),          /* 3  into the kitchen */
  C(66, 66, 5, 2.6, kit.floor, kit.wall),          /* 4  the dish belt runs along the next straight */
  C(110, 66, 7, 2.8, kit.floor, kit.wall),         /* 5  the back door */
  C(110, 100, 7, 2.6, ctr.floor, ctr.wall),        /* 6  up onto the counter */
  C(20, 100, 8, 2.6, ctr.floor, ctr.wall),         /* 7  the end of the counter, down the stools */
  C(20, 52, 6, 2.6, booth.floor, booth.wall),      /* 8  the booths */
  C(-10, 52, 6, 2.6, booth.floor, booth.wall),     /* 9 */
  C(-10, 22, 8, 2.8, tile.floor, tile.wall)        /* 10 back to the door */
], { step: 2.5 });
export const DINER = {
  id: 'diner', name: 'THE DINER', laps: 3, rating: 1, light: 'day', dress: 'diner',
  controls: DINER_R.controls, edges: DINER_R.edges,
  features: [
    { type: 'pinch', u0: DINER_R.u(1, 0.45), u1: DINER_R.u(1, 0.52), gap: 1.4 },                               /* two ketchup bottles and the stand of menus */
    { type: 'belt', u0: DINER_R.u(4, 0.15), u1: DINER_R.u(4, 0.85), lane: [-0.6, 0.6], speed: 1.8, rise: 0.04 }, /* the dish belt */
    { type: 'jump', u: DINER_R.u(6, 0.8), rise: 0.18, run: 0.9, gap: 1.4 },                                   /* from one counter to the next, over the gap between them */
    { type: 'counter', u0: DINER_R.u(8, 0.3), u1: DINER_R.u(8, 0.7), h: 0.62 },                               /* under a booth's table */
    { type: 'kerb', u0: DINER_R.u(7, 0) - 1.5, u1: DINER_R.u(7, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'cut', u0: DINER_R.u(6, 0.3), u1: DINER_R.u(7, 0.8), side: 'left', reach: 0.25, lean: 0.5, w: 1.9, floor: 'tile', wall: 'tin', gate: true },
    { type: 'star', u: DINER_R.u(2, 0.4), side: 'right', rise: 0.5, floor: 'tile', wall: 'formica' },                              /* on top of the pie case */
    { type: 'pickups', auto: 8 }
  ],
  start: { u: DINER_R.u(0, 0.45), rows: 4, gap: 1.5, side: 0.55 }
};
