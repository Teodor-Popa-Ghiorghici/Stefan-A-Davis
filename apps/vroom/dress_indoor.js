/* THE INDOOR ROADS' SCENERY (dress_kit.js): THE FORECOURT (a canopy, the pumps, a car wash, then the shop), THE DINER (stools, menus, a jukebox, a ceiling) and THE FACTORY (machines, pipes, welders that throw sparks). */
import { box, cylinder, mat } from './raster_mesh.js';
import { material } from './track_geo.js';
import { P, GROUND_Y } from './dress_kit.js';
import { ix, GREY, RED, BROWN, COOL, CYAN } from './palette.js';

/* is the road at distance s made of this floor? */
const floorAt = (K, s) => K.def.controls[Math.floor(K.line.at(s).u) % K.def.controls.length].floor;

/* THE FORECOURT: a canopy over the counter on four pillars, pumps at the pinch, an arch over the car wash, the shop's walls and ceiling over the lino, a big sign */
export function forecourt(K) {
  K.ground('concrete', 50, 5);
  const tin = material('tin'), pump = mat(ix(RED, 6)), glass = material('glass', { emit: 0.5 }), under = material('under'), brick = material('brick');
  K.F.counters.forEach(c => {
    const a = K.line.at(c.s0), z = K.line.at(c.s1), mid = K.line.at((c.s0 + c.s1) / 2), w = K.width[Math.round(mid.s / K.line.step)] / 2 + 1.6, b = K.b(mid.x, mid.z);
    for (const p of [a, z]) for (const side of [1, -1]) box(b, p.x + p.nx * side * w, 1.4, p.z + p.nz * side * w, 0.3, 2.8, 0.3, tin, 2);
    box(b, mid.x, 2.9, mid.z, Math.abs(mid.nx) * (2 * w) + Math.abs(mid.tx) * (c.s1 - c.s0 + 0.6) + 0.1, 0.3, Math.abs(mid.nz) * (2 * w) + Math.abs(mid.tz) * (c.s1 - c.s0 + 0.6) + 0.1, tin, 2);
  });
  K.F.pinches.forEach(p => { const s = (p.s0 + p.s1) / 2; if (floorAt(K, s) !== 'asphalt') return; for (const side of [1, -1]) { const q = K.beside(s, side, 0.5); const b = K.b(q.x, q.z); box(b, q.x, 0.75, q.z, 0.6, 1.5, 0.6, pump, 1); box(b, q.x, 1.2, q.z, 0.5, 0.4, 0.5, glass, 1); } });
  K.F.belts.forEach(bl => { const a = K.line.at(bl.s0), z = K.line.at(bl.s1), w = K.width[Math.round(a.s / K.line.step)] / 2 + 0.9; for (const p of [a, z]) { const b = K.b(p.x, p.z); for (const side of [1, -1]) box(b, p.x + p.nx * side * w, 1.2, p.z + p.nz * side * w, 0.4, 2.4, 0.4, tin, 2); } });
  /* the shop: its outer wall and its ceiling over every stretch of the lino */
  for (let s = 0; s < K.line.length; s += 5) {
    if (floorAt(K, s) !== 'lino') continue;
    const p = K.line.at(s), q = K.beside(s, -1, 1.4), t = K.b(p.x, p.z);
    if (K.clear(q.x, q.z, 0.2)) box(K.b(q.x, q.z), q.x, 1.6, q.z, Math.abs(p.nz) * 5.2 + Math.abs(p.nx) * 0.6, 3.2, Math.abs(p.nx) * 5.2 + Math.abs(p.nz) * 0.6, brick, 2);
    box(t, p.x, 3.3, p.z, 9, 0.2, 9, under, 2);
  }
  K.banner(K.startS + 3, 4.8, 2.7, 'THE FORECOURT', ix(COOL, 15), ix(RED, 5));
}

/* THE DINER: a ceiling and walls round it all, stools along the counter-tops, menus on stands, a jukebox by the door */
export function diner(K) {
  K.ground('tilefloor', 50, 3);
  K.room(6.2, 'brick', 'under');
  const stool = mat(ix(RED, 6)), chrome = mat(ix(COOL, 12)), jb = material('vending', { emit: 0.8 });
  for (let s = 0; s < K.line.length; s += 2.4) {
    if (floorAt(K, s) !== 'counter') continue;
    const q = K.beside(s, -1, 1.2); if (!K.clear(q.x, q.z, 0.4)) continue;
    const b = K.b(q.x, q.z); cylinder(b, q.x, GROUND_Y, q.z, 0.07, 0.07, 0.9 - GROUND_Y, 6, chrome, 1); cylinder(b, q.x, 0.9, q.z, 0.34, 0.3, 0.2, 8, stool, 1);
  }
  K.along(26, [1, -1], 3, 6, 1.4, (b, x, z) => { box(b, x, GROUND_Y + 1.1, z, 1.2, 2.2 - GROUND_Y, 0.15, material('board'), 1); });
  { const q = K.beside(K.startS - 8, 1, 1.2); box(K.b(q.x, q.z), q.x, 1.1, q.z, 1, 2.2, 0.7, jb, 1); }
  K.banner(K.startS + 3, 4.8, 2.6, 'THE DINER', ix(COOL, 15), ix(BROWN, 4));
  K.banner(K.line.length * 0.5, 4.2, 2.6, 'PIE', ix(COOL, 15), ix(CYAN, 4));
}

/* THE FACTORY: a high ceiling and walls, machines with hazard stripes standing back from the aisles, pipes along them, welders by the presses (they throw sparks), a sign before each press */
export function factory(K) {
  K.ground('plate', 50, 3);
  K.room(7.5, 'tin', 'under');
  const plate = material('plate'), haz = material('hazard'), pipe = mat(ix(COOL, 8)), welder = mat(ix(BROWN, 9));
  K.along(13, [1, -1], 3.4, 4, 3.2, (b, x, z, p) => { const w = 3 + K.rnd() * 3, h = 2.2 + K.rnd() * 2; box(b, x, GROUND_Y + (h - GROUND_Y) / 2, z, w, h - GROUND_Y, 3 + K.rnd() * 2, plate, 2); box(b, x, GROUND_Y + 0.25, z, w + 0.1, 0.5, 3.1, haz, 1); });
  K.along(22, [1, -1], 1.6, 0.4, 0.4, (b, x, z, p) => box(b, x, 3.4, z, Math.abs(p.tz) * 20 + 0.3, 0.3, Math.abs(p.tx) * 20 + 0.3, pipe, 1));
  const sparks = [];
  K.F.presses.forEach(pr => {
    for (const side of [1, -1]) { const q = K.beside((pr.s0 + pr.s1) / 2 + 2, side, 0.7); box(K.b(q.x, q.z), q.x, 0.45, q.z, 0.5, 0.9, 0.5, welder, 1); sparks.push({ x: q.x, y: 0.95, z: q.z, phase: side * 0.31, seed: 11 + side }); }
    K.banner(pr.s0 - 6, 4.4, 2.7, 'PRESS', ix(COOL, 15), ix(RED, 5));
  });
  K.banner(K.startS + 3, 4.8, 2.7, 'THE FACTORY', ix(COOL, 15), ix(BROWN, 4));
  K.sparks = sparks;
}
void GREY;
