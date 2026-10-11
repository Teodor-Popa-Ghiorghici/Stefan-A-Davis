/* THE LAST TWO ROADS (docs/vroom/plan.md section 9): FROZEN HARBOUR and THE FACTORY, the SEMI-PRO and PRO cups. Drawn the way the first roads are (tracks_a.js). */
import { rounded } from './track_path.js';

const C = (x, z, r, w, floor, wall) => ({ x, z, r, w, floor, wall });

/* FROZEN HARBOUR: counter-clockwise, round a quay where the harbour has frozen and the boats are stuck fast in it. The whole road is ice (a car without ICE CHAINS can hardly steer on it), between stacks of containers and
   along the quay's edge. A gangway to jump, two containers to squeeze between, and a gap in the container yard's fence that a BUMPER BAR goes through. */
const ice = 'ice';
const HARBOUR_R = rounded([
  C(0, 0, 10, 3.4, ice, 'container'),                  /* 0  the quay's west end, and the start */
  C(130, 0, 10, 3.2, ice, 'rail'),                     /* 1  the end of the pier */
  C(130, 50, 8, 3.0, ice, 'container'),                /* 2 */
  C(95, 50, 6, 2.6, ice, 'container'),                 /* 3  into the container yard */
  C(95, 90, 6, 2.6, ice, 'container'),                 /* 4 */
  C(15, 90, 8, 2.6, ice, 'container'),                 /* 5  the yard's far side */
  C(15, 48, 6, 2.6, ice, 'rail'),                      /* 6  down past the frozen trawler */
  C(-20, 48, 7, 2.8, ice, 'container'),                /* 7 */
  C(-20, 10, 8, 3.0, ice, 'container')                 /* 8  back to the quay */
], { step: 2.5 });
export const HARBOUR = {
  id: 'harbour', name: 'FROZEN HARBOUR', laps: 3, rating: 3, light: 'night', dress: 'harbour',
  controls: HARBOUR_R.controls, edges: HARBOUR_R.edges,
  features: [
    { type: 'jump', u: HARBOUR_R.u(0, 0.6), rise: 0.2, run: 1.0, gap: 1.8 },                                 /* the gangway of a boat that has been left on the quay */
    { type: 'pinch', u0: HARBOUR_R.u(4, 0.3), u1: HARBOUR_R.u(4, 0.36), gap: 1.4 },                          /* two containers that were not stacked straight */
    { type: 'kerb', u0: HARBOUR_R.u(7, 0) - 1.5, u1: HARBOUR_R.u(7, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'cut', u0: HARBOUR_R.u(3, 0.2), u1: HARBOUR_R.u(4, 0.9), side: 'left', reach: 0.3, lean: 0.5, w: 1.9, floor: 'ice', wall: 'container', gate: true },    /* the yard's fence */
    { type: 'pickups', auto: 8 }
  ],
  start: { u: HARBOUR_R.u(0, 0.3), rows: 4, gap: 1.5, side: 0.55 }
};

/* THE FACTORY: counter-clockwise, three aisles of a factory floor on steel plate. Two conveyors to ride (and one that runs against you the other way round), a press that slams down on a beat across the road,
   a low pipe, a gap between two machines, and a fenced-off corner that a BUMPER BAR goes across. The sparks fly from the welders by the press. */
const FACTORY_R = rounded([
  C(0, 0, 8, 3.4, 'plate', 'tin'),                     /* 0  the start, on the first aisle */
  C(100, 0, 8, 3.4, 'plate', 'tin'),                   /* 1  the east wall */
  C(100, 36, 7, 3.2, 'plate', 'container'),            /* 2 */
  C(50, 36, 6, 2.6, 'grate', 'container'),             /* 3  round the middle block */
  C(50, 66, 6, 2.6, 'grate', 'container'),             /* 4 */
  C(100, 66, 7, 2.8, 'plate', 'tin'),                  /* 5 */
  C(100, 96, 8, 3.0, 'plate', 'tin'),                  /* 6  the third aisle, west */
  C(-15, 96, 8, 3.0, 'plate', 'tin'),                  /* 7  the press is on the way down */
  C(-15, 0, 8, 3.4, 'plate', 'tin')                    /* 8 */
], { step: 2.5 });
export const FACTORY = {
  id: 'factory', name: 'THE FACTORY', laps: 3, rating: 4, light: 'hall', dress: 'factory',
  controls: FACTORY_R.controls, edges: FACTORY_R.edges,
  features: [
    { type: 'belt', u0: FACTORY_R.u(0, 0.25), u1: FACTORY_R.u(0, 0.65), lane: [-0.6, 0.6], speed: 2.0, rise: 0.04 },             /* the first conveyor */
    { type: 'counter', u0: FACTORY_R.u(2, 0.35), u1: FACTORY_R.u(2, 0.7), h: 0.62 },                                           /* a low pipe */
    { type: 'jump', u: FACTORY_R.u(6, 0.8), rise: 0.2, run: 1.0, gap: 1.8 },                                                    /* between two machines */
    { type: 'belt', u0: FACTORY_R.u(6, 0.06), u1: FACTORY_R.u(6, 0.25), lane: [-0.6, 0.6], speed: 2.0, rise: 0.04 },              /* the second conveyor */
    { type: 'kerb', u0: FACTORY_R.u(7, 0) - 1.5, u1: FACTORY_R.u(7, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'cut', u0: FACTORY_R.u(6, 0.4), u1: FACTORY_R.u(7, 0.85), side: 'left', reach: 0.25, lean: 0.5, w: 1.9, floor: 'plate', wall: 'container', gate: true },
    { type: 'pickups', auto: 8 }
  ],
  start: { u: FACTORY_R.u(0, 0.8), rows: 4, gap: 1.5, side: 0.55 }
};
