/* MAIN STREET AT NIGHT (docs/vroom/plan.md section 15): a town in the snow, lit. Shops side by side along the outer kerb, each with its glowing window, sign and awning, a second rank of tall blocks behind with their windows
   lit; the park inside the loop is a winter fair (stalls, a skating pond, a playground, a gazebo, a Ferris wheel that turns, a lit tree, a church with its clock) with fences and hedges along the road. Lamps put a pool of light on the road; strings of
   coloured lights hang across it, a footbridge crosses it, the traffic lights change, a radio mast blinks, a train crosses a viaduct and a blimp goes over. The road itself is painted. Everything is placed from the road's own line and checked clear of it. */
import { box, cylinder, pole, cable } from './dress_prims.js';
import { building, lamp, hydrant, bin, bench, mailbox, phonebox, busStop, signpost, trafficLight, bollard, cone, snowman, pine, bareTree, vehicle, xmasTree, ferrisBase, ferrisWheel } from './dress_props.js';
import { delineator, stall, fence, hedge, planter, church, swings, slide, gazebo, fireDrum, flame, flag, boardA, lights, drift, pond, blimp } from './dress_town.js'; import { spin, slide as glide } from './dress_anim.js';
import { col, lit, tx, ix, GREY, BROWN, RED, GREEN, CYAN, BLUE, MAGENTA, COOL } from './dress_mats.js'; import { GROUND_Y } from './dress_kit.js';

const SHOPS = ['BAKERY', 'PIZZA', 'BOOKS', 'TOYS', 'CAFE', 'HARDWARE', 'PHARMACY', 'BANK', 'CINEMA', 'FLORIST', 'DELI', 'TAILOR', 'RADIO', 'DINER', 'SHOES', 'MUSIC', 'SKIS', 'COCOA'];
const WALLS = ['brick', 'brick', 'clapboard', 'concrete', 'brick', 'clapboard'], CARCOL = [[RED, 6], [BLUE, 6], [GREEN, 5], [BROWN, 8], [CYAN, 6], [GREY, 6], [MAGENTA, 5]];

export function street(K) { const L = K.line.length, rnd = K.rnd, R = (a, b) => a + rnd() * (b - a), pick = a => a[(rnd() * a.length) | 0], W = s => K.width[Math.min(K.width.length - 1, Math.round(((s % L) + L) % L / K.line.step))] / 2;
  const OUT = K.sideOut(), IN = -OUT; K.ground('snow', 78, 4);
  /* the outer kerb: a front of shops, side by side, every one with its window, sign and awning, and a pool of its light on the road */
  let n = 0; K.frontage([OUT], 3.4, 6, 10, 7, (g, r, w, side, i, q) => { const shop = r() < 0.85, h = 4.8 + r() * 3.4;
    building(g, { w, d: 7, h, wall: pick(WALLS), roof: r() < 0.4 ? 'gable' : 'flat', seed: i, shop, flip: r() < 0.5, awning: shop ? 1 : null, sign: shop ? SHOPS[n++ % SHOPS.length] : null, signColor: pick([RED, BLUE, GREEN, BROWN, MAGENTA]), chimneys: r() < 0.5 ? 1 : 0, lit: 0.55 + r() * 0.3, stuff: r() < 0.5, door: !shop, sides: false });
    if (shop) { lights(g, { w, y: 2.35, seed: i }); K.light(q.x - q.p.nx * side * 4.2, GROUND_Y + 1.6, q.z - q.p.nz * side * 4.2, 7, 0.55); } }, { gap: 0.3, yawJit: 0.05 });
  /* a rank of tall blocks behind them, windows lit */
  K.frontage([OUT], 12, 8, 14, 9, (g, r, w, side, i) => building(g, { w, d: 9, h: 10 + r() * 10, wall: pick(['brick', 'concrete', 'brick']), seed: i + 40, lit: 0.5, k: 4, stuff: true, sills: false, sides: false }), { gap: 0.8 });
  /* the inner kerb: the fair's fence and hedges, a stall every few steps, planters */
  const INNER = [(g, r, w) => stall(g, { w: w - 0.5, ramp: pick([RED, BLUE, GREEN, MAGENTA]), text: pick(['HOT COCOA', 'CHESTNUTS', 'TOYS', 'GLOGG', 'WAFFLES', 'MITTENS', 'CANDY']) }), (g, r, w) => fence(g, { w }), (g, r, w) => hedge(g, { w }), (g, r, w) => planter(g, { w: w - 1 })];
  K.frontage([IN], 3.0, 3, 4.5, 2.2, (g, r, w, side, i) => INNER[i % 4](g, r, w), { gap: 0.1, skip: () => rnd() < 0.18 });
  /* the kerb: lamps (each a pool of light on the road), reflector posts, parked cars, hydrants, bins, benches, post boxes, signs, bollards */
  K.row(15, [1, -1], 1.4, 0.3, 0.4, (g, r, side, i, q) => { lamp(g, { h: 3.2 }); K.light(q.x - q.p.nx * side * 0.5, GROUND_Y + 3.3, q.z - q.p.nz * side * 0.5, 12, 1.05); });
  K.row(7, [1, -1], 0.55, 0.15, 0.2, g => delineator(g, { ramp: pick([RED, CYAN, GREEN]) }));
  K.row(19, [OUT], 2.0, 1.0, 1.7, (g, r) => { const c = pick(CARCOL); vehicle(g, { ramp: c[0], lv: c[1], len: 1.9 + r() * 0.8, truck: r() < 0.25 }); }, { turn: Math.PI / 2, yawJit: 0.12 });
  const stuff = [hydrant, bin, mailbox, phonebox, g => bench(g, {}), g => signpost(g, { text: pick(['ONE WAY', 'STOP', 'SLOW', 'NO PARKING', 'TAXI']), ramp: pick([BLUE, RED, GREEN]) }), bollard, cone, g => boardA(g, { text: pick(['OPEN', 'SALE', 'SOUP']), ramp: pick([GREEN, RED, BLUE]) }), g => drift(g, { w: R(1.4, 2.6) })];
  K.row(8, [1, -1], 1.7, 1.2, 0.7, (g, r, side, i) => stuff[i % stuff.length](g, { ramp: BROWN }), { s: [1, 1.2] }); K.row(70, [1, -1], 2.6, 0.4, 1.8, g => busStop(g, { ad: pick(['SKI', 'COCOA', 'SALE']) }));
  K.row(36, [OUT], 5, 3, 3, g => flag(g, { h: R(5, 7), text: pick(['SALE', 'OPEN', 'FAIR']), ramp: pick([RED, BLUE, GREEN]) }), { from: 8 });
  /* the park: pines and bare trees, snowmen, benches, drifts, and the landmarks below */
  K.scatter(54, 5.5, 75, 2.4, (g, r) => pine(g, { h: 2.4 + r() * 3.4 }), { inside: true }); K.scatter(16, 5, 40, 2, (g, r) => bareTree(g, { h: 2.8 + r() * 2, seed: r() * 9 }), { inside: true });
  K.scatter(9, 5, 40, 1, g => snowman(g), { inside: true, s: [1, 1.5] }); K.scatter(7, 6, 40, 1.2, g => bench(g, {}), { inside: true, face: true }); K.scatter(10, 5, 60, 2, g => drift(g, { w: R(2, 3.5) }), { inside: false });
  K.scatter(10, 5, 30, 1, g => cone(g), { inside: false, s: [1.2, 1.2] });
  for (let i = 0; i < 9; i++) { const x = K.bbox.x0 + rnd() * (K.bbox.x1 - K.bbox.x0), z = K.bbox.z0 + rnd() * (K.bbox.z1 - K.bbox.z0); if (K.gap(x, z) > 9) K.mound(x, z, 2 + rnd() * 2.5, 0.5 + rnd() * 0.7); }
  const spots = []; for (let t = 0; t < 900 && spots.length < 9; t++) { const x = K.bbox.x0 + 12 + rnd() * (K.bbox.x1 - K.bbox.x0 - 24), z = K.bbox.z0 + 12 + rnd() * (K.bbox.z1 - K.bbox.z0 - 24); if (K.inside(x, z) && K.gap(x, z) > 14 && spots.every(q => Math.hypot(q.x - x, q.z - z) > 18)) spots.push({ x, z }); }
  const at = (k, fn) => { if (spots[k]) fn(spots[k].x, spots[k].z, K.toward(spots[k].x, spots[k].z)); };
  at(0, (x, z, yaw) => { K.prop(x, z, yaw, 1, g => xmasTree(g, { h: 6 })); K.prop(x + 4, z, 0, 1.3, g => bench(g, {})); K.light(x, GROUND_Y + 5, z, 12, 0.7); });
  at(1, (x, z, yaw) => { const R2 = 4.2; K.prop(x, z, yaw, 1, g => ferrisBase(g, { r: R2 })); K.mover(x, z, R2 + 3, b => ferrisWheel(b, { r: R2 }), spin(x, GROUND_Y + R2 * 1.05, z, 0.25, 0, yaw + Math.PI / 2)); K.light(x, GROUND_Y + 3, z, 12, 0.6); });
  at(2, (x, z) => { K.prop(x, z, 0, 1, g => { for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [0, 0.7]]) pole(g, [dx, 0, dz], [0, 11, 0], 0.07, 4, col(RED, 6)); pole(g, [0, 11, 0], [0, 13.5, 0], 0.05, 3, col(GREY, 8)); }); K.flasher(x, z, GROUND_Y + 13.6, 1, 0, g => box(g, 0, 0, 0, 0.4, 0.4, 0.4, lit(RED, 14)), g => box(g, 0, 0, 0, 0.4, 0.4, 0.4, col(RED, 4))); });
  at(3, (x, z, yaw) => K.prop(x, z, yaw, 1, g => church(g, { w: 7, d: 11 })));
  at(4, (x, z, yaw) => { K.prop(x, z, yaw, 1, g => pond(g, { w: 11, d: 7 })); for (const dx of [-6.5, 6.5]) { K.prop(x + dx, z, 0, 1, g => lamp(g, { h: 3 })); K.light(x + dx, GROUND_Y + 3.1, z, 10, 0.8); } });
  at(5, (x, z, yaw) => { K.prop(x, z, yaw, 1, g => swings(g)); K.prop(x + 3.6, z + 0.5, yaw + 0.5, 1, g => slide(g)); }); at(6, (x, z, yaw) => { K.prop(x, z, yaw, 1, g => gazebo(g, { r: 1.9 })); K.light(x, GROUND_Y + 2.4, z, 8, 0.6); });
  at(7, (x, z, yaw) => { for (let i = 0; i < 3; i++) K.prop(x + (i - 1) * 3.2, z, yaw, 1, g => stall(g, { w: 2.6, ramp: [RED, BLUE, GREEN][i], text: ['TOYS', 'COCOA', 'CANDY'][i] })); K.light(x, GROUND_Y + 2, z + 1, 9, 0.7); });
  at(8, (x, z) => { for (const [dx, dz] of [[0, 0], [2, 1.4]]) { K.prop(x + dx, z + dz, 0, 1, g => fireDrum(g)); K.flasher(x + dx, z + dz, GROUND_Y, 7, dx, g => flame(g, 1), g => flame(g, 0)); } K.light(x, GROUND_Y + 1.2, z, 7, 0.7); });
  /* across the road: strings of coloured lights from kerb to kerb on poles, a footbridge, the lights that change */
  for (let s = 22, i = 0; s < L - 8; s += 34, i++) { const p = K.line.at(s), w = W(s) + 1.5, a = [p.x + p.nx * w, 3.4, p.z + p.nz * w], c = [p.x - p.nx * w, 3.4, p.z - p.nz * w]; if (!K.clear(a[0], a[2], 0.3) || !K.clear(c[0], c[2], 0.3)) continue;
    const b = K.b(p.x, p.z), bulb = lit([RED, GREEN, BROWN, CYAN, MAGENTA][i % 5], 13, 0.9); for (const e of [a, c]) pole(b, [e[0], GROUND_Y, e[2]], [e[0], e[1] + 0.2, e[2]], 0.05, 4, col(GREY, 4)); cable(b, a, c, 0.5, 9, 0.02, col(GREY, 3), bulb); }
  K.span(L * 0.3, (b, a, c, p) => { const y = 5.2, dk = tx('concrete'); for (const e of [a, c]) { box(b, e[0], (y + GROUND_Y) / 2, e[1], 0.7, y - GROUND_Y, 0.7, dk, 2); box(b, e[0], y + 0.5, e[1], 0.9, 0.2, 0.9, tx('snow')); } pole(b, [a[0], y, a[1]], [c[0], y, c[1]], 0.75, 4, dk); pole(b, [a[0], y - 0.2, a[1]], [c[0], y - 0.2, c[1]], 0.5, 4, lit(BROWN, 14, 0.9)); K.banner(p.s, 5, y + 0.8, 'WINTER FAIR', ix(BROWN, 15), ix(BLUE, 6)); });
  for (const f of [0.1, 0.38, 0.62, 0.86]) { const s = L * f, q = K.beside(s, 1, 0.9), r2 = K.beside(s + 2, -1, 0.9); if (K.clear(q.x, q.z, 0.3) && K.clear(r2.x, r2.z, 0.3)) for (const e of [q, r2]) K.flasher(e.x, e.z, GROUND_Y, 0.17, f * 3, g => trafficLight(g, { on: 0 }), g => trafficLight(g, { on: 2 })); }
  /* paint on the road */
  for (let s = 12, k = 0; s < L - 8; s += 17, k++) { const j = k % 6; if (j === 0) { K.decal(s, 0, 2.6, 2.4, 'zebra'); K.decal(s - 3, 0, 2.6, 0.9, 'stopline'); } else if (j === 1) K.decal(s, 0.5, 1.0, 2.2, 'arrow'); else if (j === 2) K.decal(s, 0.3 - rnd() * 0.6, 1.4, 1.4, 'patch'); else if (j === 3) K.decal(s, 0, 2.0, 5, 'skid'); else if (j === 4) K.decal(s, (rnd() - 0.5) * 1.2, 1.1, 1.1, 'oil'); else K.decal(s, -0.4, 1.0, 2.2, 'arrow'); }
  /* the vending machines at the pinch and the parked truck's roof over the counter (what was always here) */
  const vm = tx('vending', { emit: 0.7 }); K.F.pinches.forEach(p => { for (const sd of [1, -1]) { const e = K.beside((p.s0 + p.s1) / 2, sd, 0.5); box(K.b(e.x, e.z), e.x, 0.8, e.z, 0.9, 1.6, 0.9, vm); K.light(e.x, 1.4, e.z, 6, 0.6); } });
  K.F.counters.forEach(c => { const q = K.line.at((c.s0 + c.s1) / 2), b = K.b(q.x, q.z), top = c.h + 0.25; box(b, q.x, top + 0.45, q.z, 1.5, 0.8, 3.2, tx('tin')); box(b, q.x, top + 0.9, q.z, 1.4, 0.5, 1.8, tx('window', { emit: 0.5 })); });
  /* the far viaduct and its lit train, a blimp with a sign going over, and the banner at the start */
  { const z = K.bbox.z1 + 46, x0 = K.bbox.x0 - 60, x1 = K.bbox.x1 + 60;
    K.prop(0, 0, 0, 1, g => { for (let x = x0; x < x1; x += 14) box(g, x, 3.5, z, 1.2, 7.5, 1.2, tx('concrete'), 2); box(g, (x0 + x1) / 2, 7.4, z, x1 - x0, 0.5, 2.6, tx('concrete'), 2); }, GROUND_Y);
    K.mover((x0 + x1) / 2, z, (x1 - x0) / 2 + 20, b => { for (let i = 0; i < 4; i++) { box(b, i * 5.2, 1.2, 0, 4.8, 2.1, 2.3, col(RED, 6), 2); for (let w = 0; w < 4; w++) box(b, i * 5.2 - 1.8 + w * 1.2, 1.4, 1.17, 0.8, 0.8, 0.05, lit(BROWN, 13, 0.9)); } }, glide(x0, z, x1, z, 38, 0.2, GROUND_Y + 7.7, false, 0));
    const bz = K.bbox.z0 - 40; K.mover((K.bbox.x0 + K.bbox.x1) / 2, bz, 200, b => blimp(b, 'SKI'), glide(K.bbox.x0 - 90, bz, K.bbox.x1 + 90, bz - 30, 140, 0.3, 34, false, 0)); } K.banner(K.startS + 3, 4.6, 2.7, 'MAIN STREET', ix(COOL, 15), ix(RED, 5));
  K.banner(L * 0.55, 4.4, 2.9, 'WINTER FAIR', ix(BROWN, 15), ix(BLUE, 6)); void cylinder; }
