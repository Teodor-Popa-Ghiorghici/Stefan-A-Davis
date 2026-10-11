/* THE MOUNTAIN ROADS (docs/vroom/plan.md section 9): SNOWY PASS and THE DAM, the ADVANCED cup. Drawn the way the first roads are (tracks_a.js). */
import { rounded } from './track_path.js';

const C = (x, z, r, w, floor, wall) => ({ x, z, r, w, floor, wall });

/* SNOWY PASS: clockwise, three switchbacks up a mountainside and the long road down the other side. It is snowed under (a packed road, and two drifts of deep snow that only SNOW TYRES will cross at speed) and it is raced in a
   blizzard: the fog closes in at a few metres and HEADLIGHTS double how far a driver can see. */
const pk = { floor: 'packed' }, dp = { floor: 'deep' };
const PASS_R = rounded([
  C(0, 0, 10, 3.2, pk.floor, 'snowbank'),              /* 0  the foot of the pass, and the start */
  C(120, 0, 8, 3.0, pk.floor, 'rock'),                 /* 1  first switchback */
  C(120, 30, 6.5, 2.6, pk.floor, 'rock'),              /* 2 */
  C(30, 30, 6.5, 2.6, dp.floor, 'rock'),               /* 3  the first drift is on the next stretch */
  C(30, 60, 6.5, 2.6, pk.floor, 'rock'),               /* 4 */
  C(120, 60, 6.5, 2.6, pk.floor, 'rock'),              /* 5 */
  C(120, 90, 6.5, 2.6, pk.floor, 'snowbank'),          /* 6  the top: a ridge road westward */
  C(-30, 90, 8, 3.0, dp.floor, 'snowbank'),            /* 7  the second drift, on the way down */
  C(-30, 0, 8, 3.2, pk.floor, 'snowbank')              /* 8  back to the foot */
], { step: 2.5 });
export const PASS = {
  id: 'pass', name: 'SNOWY PASS', laps: 2, rating: 2, light: 'blizzard', dress: 'pass',
  controls: PASS_R.controls, edges: PASS_R.edges,
  features: [
    { type: 'jump', u: PASS_R.u(0, 0.55), rise: 0.18, run: 0.9, gap: 1.4 },                                   /* a cornice that has fallen across the road */
    { type: 'pinch', u0: PASS_R.u(4, 0.4), u1: PASS_R.u(4, 0.47), gap: 1.4 },                                /* a rockfall */
    { type: 'kerb', u0: PASS_R.u(7, 0) - 1.5, u1: PASS_R.u(7, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'star', u: PASS_R.u(0, 0.3), side: 'right', rise: 0.5, floor: 'packed', wall: 'snowbank' },                          /* a ledge over the valley */
    { type: 'pickups', auto: 9 }
  ],
  start: { u: PASS_R.u(0, 0.3), rows: 4, gap: 1.5, side: 0.55 }
};

/* THE DAM: counter-clockwise, over the crest of a dam, down its service catwalks and back through the machine hall. A jump across the spillway, a gate in the fence of the service road (BUMPER BAR) and, from the crest,
   the lake road: a way across the frozen reservoir (ICE CHAINS). */
const crest = { floor: 'concrete', wall: 'concrete' }, walk = { floor: 'plate', wall: 'rail' }, hall = { floor: 'grate', wall: 'tin' };
const DAM_R = rounded([
  C(0, 0, 10, 3.4, crest.floor, crest.wall),           /* 0  the west end of the crest */
  C(150, 0, 10, 3.4, crest.floor, crest.wall),         /* 1  the east end */
  C(150, 50, 8, 2.8, walk.floor, walk.wall),           /* 2  down the east stairs */
  C(100, 50, 6, 2.2, walk.floor, walk.wall),           /* 3  along the catwalk */
  C(100, 92, 6, 2.2, hall.floor, hall.wall),           /* 4  into the machine hall */
  C(30, 92, 8, 2.6, hall.floor, hall.wall),            /* 5 */
  C(30, 50, 7, 2.6, walk.floor, walk.wall),            /* 6  up the west stairs */
  C(-12, 24, 8, 3.0, crest.floor, crest.wall)          /* 7  the service road, back to the crest */
], { step: 2.5 });
export const DAM = {
  id: 'dam', name: 'THE DAM', laps: 3, rating: 2, light: 'day', dress: 'dam',
  controls: DAM_R.controls, edges: DAM_R.edges,
  features: [
    { type: 'jump', u: DAM_R.u(0, 0.8), rise: 0.2, run: 1.0, gap: 1.8 },                                      /* the spillway */
    { type: 'pinch', u0: DAM_R.u(3, 0.4), u1: DAM_R.u(3, 0.47), gap: 1.4 },                                  /* a pump housing on the catwalk */
    { type: 'kerb', u0: DAM_R.u(5, 0) - 1.5, u1: DAM_R.u(5, 0) + 2.5, side: 'inner', h: 0.035 },
    { type: 'cut', u0: DAM_R.u(4, 0.4), u1: DAM_R.u(6, 0.35), side: 'left', reach: 0.3, lean: 0.5, w: 1.9, floor: 'concrete', wall: 'concrete', gate: true },   /* the service road's fence */
    { type: 'cut', u0: DAM_R.u(0, 0.3), u1: DAM_R.u(1, 0.65), side: 'left', reach: 0.3, lean: 0.5, w: 2.2, floor: 'ice', wall: 'snowbank' },                  /* the lake road */
    { type: 'star', u: DAM_R.u(0, 0.5), side: 'right', rise: 0.5, floor: 'concrete', wall: 'concrete' },                        /* a rafter of the control tower */
    { type: 'pickups', auto: 8 }
  ],
  start: { u: DAM_R.u(7, 0.4), rows: 4, gap: 1.5, side: 0.55 }
};
