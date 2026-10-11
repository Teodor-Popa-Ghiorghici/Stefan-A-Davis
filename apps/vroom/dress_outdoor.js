/* THE OUTDOOR ROADS' SCENERY (dress_kit.js): MAIN STREET at night, SNOWY PASS in the blizzard, THE DAM and FROZEN HARBOUR. Each is a function of the kit; what it makes is in the picture only. */
import { box, cylinder, mat } from './raster_mesh.js';
import { material } from './track_geo.js';
import { P, GROUND_Y } from './dress_kit.js';
import { ix, GREY, RED, BROWN, COOL } from './palette.js';

/* MAIN STREET: snow on the ground, blocks of flats with their windows lit, a lamp every 20 m, the park inside the L (pines, a snowman), the vending machines at the pinch and a truck on the counter */
export function street(K) {
  K.ground('snow', 60, 4);
  K.along(17, [1, -1], 7, 10, 6, (b, x, z) => P.block(b, x, z, 6 + K.rnd() * 7, 6 + K.rnd() * 7, 4 + K.rnd() * 6, K.rnd() < 0.6 ? 'brick' : 'concrete', true));
  K.along(20, [1, -1], 1.4, 0.3, 0.4, (b, x, z) => P.lamp(b, x, z, 3.1));
  K.along(7, [-1], 4, 26, 1.6, (b, x, z) => P.pine(b, x, z, 2.4 + K.rnd() * 2.4));
  K.along(34, [-1], 3, 5, 1, (b, x, z) => P.snowman(b, x, z));
  const vm = material('vending', { emit: 0.7 });
  K.F.pinches.forEach(p => { const q = K.beside((p.s0 + p.s1) / 2, 1, 0.5), r = K.beside((p.s0 + p.s1) / 2, -1, 0.5); for (const e of [q, r]) box(K.b(e.x, e.z), e.x, 0.8, e.z, 0.9, 1.6, 0.9, vm); });
  K.F.counters.forEach(c => { const q = K.line.at((c.s0 + c.s1) / 2), b = K.b(q.x, q.z), top = c.h + 0.25; box(b, q.x, top + 0.45, q.z, 1.5, 0.8, 3.2, material('tin')); box(b, q.x, top + 0.9, q.z, 1.4, 0.5, 1.8, material('window', { emit: 0.5 })); });
  K.banner(K.startS + 3, 4.4, 2.6, 'MAIN STREET', ix(COOL, 15), ix(RED, 5));
}

/* SNOWY PASS: a white ground, peaks standing in the fog, pines in drifts along the road, a few huts */
export function pass(K) {
  K.ground('snow', 80, 5);
  const rock = material('rock'), snow = material('snow');
  K.along(36, [1, -1], 22, 30, 12, (b, x, z) => { const h = 9 + K.rnd() * 9, r = 9 + K.rnd() * 6; cylinder(b, x, GROUND_Y, z, r, 1.5, h, 7, rock, 4); cylinder(b, x, GROUND_Y + h * 0.62, z, r * 0.45, 0.8, h * 0.4, 7, snow, 4); });
  K.along(6, [1, -1], 1.5, 12, 1.4, (b, x, z) => P.pine(b, x, z, 2 + K.rnd() * 3));
  K.along(60, [1, -1], 5, 6, 3, (b, x, z) => P.hut(b, x, z, 3, 2.4, 1.8, 'planks'));
  K.banner(K.startS + 3, 4.8, 2.8, 'SNOWY PASS', ix(COOL, 15), ix(GREY, 4));
}

/* THE DAM: bare rock and concrete, the lake (ice) inside the crest, tall piers along it, lamps; the machine hall has a ceiling */
export function dam(K) {
  K.ground('rock', 60, 4);
  const ice = material('ice'), conc = material('concrete');
  for (let x = 0; x < 150; x += 12) for (let z = 3; z < 47; z += 12) K.b(x + 6, z + 6).use(ice).quad([x, GROUND_Y + 0.02, z], [x, GROUND_Y + 0.02, z + 12], [x + 12, GROUND_Y + 0.02, z + 12], [x + 12, GROUND_Y + 0.02, z], [0, 1, 0], [[x / 4, z / 4], [x / 4, (z + 12) / 4], [(x + 12) / 4, (z + 12) / 4], [(x + 12) / 4, z / 4]]);
  K.along(14, [-1], 0.8, 0.4, 1.2, (b, x, z) => box(b, x, GROUND_Y + 3.3, z, 1.4, 7, 1.4, conc, 2));
  K.along(18, [1, -1], 1.3, 0.3, 0.4, (b, x, z) => P.lamp(b, x, z, 3.2, false));
  K.along(30, [-1], 8, 10, 4, (b, x, z) => P.block(b, x, z, 6 + K.rnd() * 6, 6, 5 + K.rnd() * 5, 'concrete', false));
  K.banner(K.startS + 3, 4.6, 2.6, 'THE DAM', ix(COOL, 15), ix(GREY, 3));
}

/* FROZEN HARBOUR: ice to the horizon, stacks of containers, cranes, lamps, and the boats stuck fast in the ice on the water side of the quay */
export function harbour(K) {
  K.ground('ice', 70, 4);
  const hull = material('tin'), cab = material('formica'), rod = mat(ix(GREY, 5));
  K.along(11, [-1], 2.5, 14, 2.4, (b, x, z) => { const h = 1.2 + Math.floor(K.rnd() * 3) * 1.1; P.stack(b, x, z, 2.4, 6, h, K.rnd() < 0.5 ? 'container' : 'tin'); });
  K.along(16, [1, -1], 1.5, 0.3, 0.4, (b, x, z) => P.lamp(b, x, z, 4.4));
  K.along(46, [-1], 14, 10, 7, (b, x, z) => { box(b, x, GROUND_Y + 0.9, z, 5, 1.8, 11, hull, 3); box(b, x, GROUND_Y + 2.2, z - 1.5, 3.2, 1.6, 3.4, cab, 1); cylinder(b, x, GROUND_Y + 2.8, z - 1.5, 0.08, 0.06, 4.2, 6, rod, 1); });
  K.along(70, [-1], 12, 6, 6, (b, x, z) => { box(b, x, GROUND_Y + 6, z, 0.9, 12.6, 0.9, mat(ix(RED, 7)), 2); box(b, x, GROUND_Y + 12.3, z + 3.2, 0.7, 0.7, 8, mat(ix(RED, 7)), 2); });
  K.banner(K.startS + 3, 4.6, 2.7, 'FROZEN HARBOUR', ix(COOL, 15), ix(BROWN, 4));
}
void RED; void GREY; void BROWN;

/* THE STUNT YARD: snow all round the bank, the depot's blocks and pines beyond it, floodlight poles along the edge, and a snowman who has seen it all. The infield is the yard's own (track_yard.js). */
export function yard(K) {
  K.ground('snow', 70, 4);
  K.along(15, [-1], 2.5, 10, 2, (b, x, z) => P.pine(b, x, z, 2 + K.rnd() * 3));
  K.along(26, [-1], 1.4, 0.3, 0.4, (b, x, z) => P.lamp(b, x, z, 4.6));
  K.along(46, [-1], 9, 8, 7, (b, x, z) => P.block(b, x, z, 9 + K.rnd() * 5, 7 + K.rnd() * 4, 4 + K.rnd() * 4, K.rnd() < 0.5 ? 'brick' : 'concrete', true));
  K.along(70, [-1], 3, 4, 1, (b, x, z) => P.snowman(b, x, z));
  K.banner(K.startS + 4, 11, 3.0, 'STUNT YARD', ix(COOL, 15), ix(RED, 5));
}
