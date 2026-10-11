/* THE STUNT YARD AS DATA (docs/vroom/plan.md section 9: a snowy skate park behind the depot, twenty stars, some of them only a better car can reach). It is a road like any other as far as the builder is concerned
   (track_build.js): a wide ring of concrete round a flat infield, with the pieces of yard_pieces.js stood on the infield, and the stars hung over them. The ring's inside wall is left out (the infield is the same floor),
   so the yard is one open place with a snowbank all round it. A star is { id, x, y, z, name }: where the middle of a car must pass (within 45 cm across and 60 cm up). Which car reaches which is NOT written here -- it
   is a property of the pieces and the cars, and yard_check.js drives a recipe for every star with every car to prove it. Pure data. */
import { rounded } from './track_path.js';

const E = Math.PI / 2, N = 0, S = Math.PI, Wst = -Math.PI / 2;
const ring = { floor: 'asphalt', wall: 'snowbank' };
const RING = rounded([
  { x: -52, z: -32, r: 14, w: 10, ...ring }, { x: 52, z: -32, r: 14, w: 10, ...ring },
  { x: 52, z: 32, r: 14, w: 10, ...ring }, { x: -52, z: 32, r: 14, w: 10, ...ring }
], { step: 2.5 });
/* the infield, inside the ring's inner edge (a metre of overlap is laid under the ring so no seam shows) */
export const INFIELD = { x0: -47, x1: 47, z0: -27, z1: 27 };

export const PIECES = [
  /* the south row: a ski jump, and after it a gap jump to land the other side of */
  { k: 'ramp', name: 'SKI JUMP', x: -32, z: -23, yaw: E, len: 14, h: 2.6, w: 2.6, curve: 0.65 },
  { k: 'ramp', name: 'SKI LANDING', x: -11, z: -23, yaw: E, len: 18, h: 1.5, w: 3.6, curve: 0.2, down: true },
  { k: 'ramp', name: 'GAP JUMP', x: 40, z: 12, yaw: Wst, len: 6, h: 1.0, w: 2.4, curve: 0.5 },
  { k: 'ramp', name: 'GAP LANDING', x: 27, z: 12, yaw: Wst, len: 7, h: 1.0, w: 3.2, curve: 0.2, down: true },
  /* four kickers, each bigger than the one before */
  { k: 'ramp', name: 'KICKER 1', x: -30, z: -18, yaw: E, len: 4.5, h: 0.55, w: 2.2, curve: 0.4 },
  { k: 'ramp', name: 'KICKER 2', x: -30, z: -15, yaw: E, len: 5.5, h: 0.85, w: 2.2, curve: 0.5 },
  { k: 'ramp', name: 'KICKER 3', x: -30, z: -12, yaw: E, len: 6.0, h: 1.1, w: 2.2, curve: 0.55 },
  { k: 'ramp', name: 'KICKER 4', x: -30, z: -9, yaw: E, len: 7.0, h: 1.5, w: 2.2, curve: 0.6 },
  /* the half pipe, up the east side, with the slalom beside it */
  { k: 'trough', name: 'HALF PIPE', x: 30, z: -20, yaw: N, len: 24, R: 2.4, flat: 3, lift: 0.82, deck: 0.9 },
  /* two quarter pipes against the north edge, one steeper than the other */
  { k: 'trough', name: 'QUARTER PIPE 1', x: -20, z: 19, yaw: E, len: 18, R: 2.4, flat: 4, lift: 0.82, deck: 0.9, side: 'one' },
  { k: 'trough', name: 'QUARTER PIPE 2', x: 4, z: 19, yaw: E, len: 16, R: 1.8, flat: 4, lift: 0.7, deck: 0.9, side: 'one' },
  /* the bowl */
  { k: 'bowl', name: 'THE BOWL', x: -31, z: 6, r0: 2.5, r1: 8, H: 2.1, p: 2.3, deck: 0.9, gate: { a: Math.PI, open: 0.9, blend: 0.5 } },
  /* the depot's roof: a ramp up to a flat deck */
  { k: 'ramp', name: 'ROOF RAMP', x: -6, z: -4, yaw: E, len: 12, h: 1.8, w: 2.8, curve: 0 },
  { k: 'block', name: 'ROOF', x: 10, z: -4, sx: 8, sz: 6, h: 1.8, tex: 'planks' },
  /* the squeeze: two stacks of parcels a hand apart */
  { k: 'block', name: 'PARCELS 1', x: 10.7, z: 9, sx: 1.6, sz: 1.6, h: 1.0, tex: 'cardboard' },
  { k: 'block', name: 'PARCELS 2', x: 13.3, z: 9, sx: 1.6, sz: 1.6, h: 1.0, tex: 'cardboard' }
];
/* the slalom: posts a car goes between, alternate sides, up the east edge */
for (let i = 0; i < 7; i++) PIECES.push({ k: 'block', name: 'POST ' + (i + 1), x: 41 + (i % 2 ? 1.1 : -1.1), z: -18 + i * 4, sx: 0.3, sz: 0.3, h: 0.7, tex: 'hazard' });

/* the twenty stars. (x, y, z) is where the middle of the car must pass. Ids are the career's keys (career.js yard), so they never change order. */
export const STARS = [
  { id: 0, name: 'KICKER 1', x: -21.7, y: 0.5, z: -18 },
  { id: 1, name: 'KICKER 2', x: -22.5, y: 1.1, z: -15 },
  { id: 2, name: 'KICKER 3', x: -16.8, y: 1.4, z: -12 },
  { id: 3, name: 'KICKER 4', x: -13.1, y: 1.3, z: -9.1 },
  { id: 4, name: 'GAP JUMP', x: 33.0, y: 1.4, z: 12 },
  { id: 5, name: 'SKI JUMP', x: -14.5, y: 3.0, z: -23 },
  { id: 6, name: 'SKI JUMP LONG', x: -11.3, y: 2.6, z: -23 },
  { id: 7, name: 'SKI JUMP FAR', x: -8.9, y: 2.4, z: -23 },
  { id: 8, name: 'HALF PIPE LEFT', x: 26.4, y: 1.5, z: -2.4 },
  { id: 9, name: 'HALF PIPE RIGHT', x: 33.3, y: 1.0, z: -0.9 },
  { id: 10, name: 'HALF PIPE AIR', x: 25.3, y: 2.7, z: 7.8 },
  { id: 11, name: 'QUARTER PIPE 1', x: -9.6, y: 2.1, z: 23.8 },
  { id: 12, name: 'QUARTER PIPE 2', x: 20.5, y: 2.1, z: 24.9 },
  { id: 13, name: 'BOWL FOOT', x: -31, y: 0.75, z: 0.8 },
  { id: 14, name: 'BOWL BANK', x: -31, y: 1.4, z: 12.9 },
  { id: 15, name: 'BOWL RIM', x: -23.1, y: 2.15, z: 6 },
  { id: 16, name: 'ROOF', x: 12.5, y: 2.2, z: -4 },
  { id: 17, name: 'ROOF CORNER', x: 12.5, y: 2.2, z: -2.2 },
  { id: 18, name: 'SLALOM', x: 41, y: 0.35, z: 9.2 },
  { id: 19, name: 'SQUEEZE', x: 12, y: 0.35, z: 12 }
];

export const YARD = {
  id: 'yard', name: 'STUNT YARD', laps: 99, rating: 4, light: 'day', dress: 'yard',
  controls: RING.controls, edges: RING.edges,
  features: [],
  yard: { infield: INFIELD, pieces: PIECES, stars: STARS },
  start: { u: RING.u(0, 0.45), rows: 4, gap: 1.5, side: 0.55 }
};
