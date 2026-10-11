/* A TEST TOWN for the renderer: one snowed-in street with everything the real tracks will be made of -- ground, road, kerb, brick and tin and plank, windows that glow, lamp posts, pines, a fence, a parked
   kei truck to drive under, a shadow on the snow. It is not a track (no line, no pickups); it is what raster_check.js draws to hold the palette, determinism and the milliseconds a frame, and what
   scripts/vroom_shots.mjs draws to look at. `town()` builds the meshes once; `drawTown(R, view)` draws one view. Pure. */
import { builder, mat, box, sheet, strip, cylinder, gable, blob } from './raster_mesh.js';
import { tex } from './raster_tex.js';
import { place } from './raster_math.js';
import { ix, COOL, GREY, RED, BROWN, BLUE, CYAN } from './palette.js';

const M = {
  snow: mat(tex.snow()), slush: mat(tex.slush()), drift: mat(tex.drift()), road: mat(tex.asphalt()), dash: mat(tex.dash(), { double: true, zbias: 0.002 }), edge: mat(tex.edge(), { double: true, zbias: 0.002 }),
  brick: mat(tex.brick()), tin: mat(tex.tin()), plank: mat(tex.planks()), concrete: mat(tex.concrete()), board: mat(tex.board()), window: mat(tex.window(), { emit: 0.55 }), glass: mat(tex.glass()),
  pine: mat(tex.pine()), fence: mat(tex.fence(), { double: true }), cardboard: mat(tex.cardboard()), rubber: mat(tex.rubber()),
  shadow: mat(tex.rubber(), { mode: 'darken', steps: 7, zbias: 0.004 }),
  yellow: mat(ix(BROWN, 10)), red: mat(ix(RED, 7)), paint: mat(ix(CYAN, 8)), chrome: mat(ix(GREY, 12)), lampGlow: mat(ix(BROWN, 14), { emit: 1 }), black: mat(ix(GREY, 2))
};

function house(w, d, h, wallM, roofM, lit) {
  const b = builder();
  box(b, 0, h / 2, 0, w, h, d, { top: null, bottom: null, side: wallM }, 2.4);
  gable(b, 0, h, 0, w + 0.6, d + 0.6, h + d * 0.28, roofM, wallM, 2.4);
  b.use(M.board).quad([-0.5, 0, d / 2 + 0.02], [0.5, 0, d / 2 + 0.02], [0.5, 2.1, d / 2 + 0.02], [-0.5, 2.1, d / 2 + 0.02], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  const rows = Math.max(1, Math.floor(h / 3.2));
  for (let r = 0; r < rows; r++) for (const wx of [-w * 0.3, w * 0.3]) {
    b.use(lit && (r + (wx > 0 ? 1 : 0)) % 2 === 0 ? M.window : M.glass).quad([wx - 0.5, 1.2 + r * 3, d / 2 + 0.03], [wx + 0.5, 1.2 + r * 3, d / 2 + 0.03], [wx + 0.5, 2.4 + r * 3, d / 2 + 0.03], [wx - 0.5, 2.4 + r * 3, d / 2 + 0.03], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  return b.build();
}
function lamp() {
  const b = builder();
  cylinder(b, 0, 0, 0, 0.1, 0.07, 4.4, 6, M.black);
  box(b, 0.45, 4.35, 0, 1.0, 0.1, 0.18, M.black);
  box(b, 0.85, 4.25, 0, 0.3, 0.12, 0.3, M.lampGlow);
  return b.build();
}
function pine(hh) {
  const b = builder();
  cylinder(b, 0, 0, 0, 0.14, 0.1, 1.2, 5, M.plank);
  cylinder(b, 0, 0.9, 0, 1.35, 0.55, hh * 0.45, 7, M.pine, 2);
  cylinder(b, 0, 0.9 + hh * 0.34, 0, 1.0, 0.35, hh * 0.4, 7, M.pine, 2);
  cylinder(b, 0, 0.9 + hh * 0.66, 0, 0.65, 0, hh * 0.38, 7, M.pine, 2);
  return b.build();
}
/* a full-size kei truck: tall enough to drive under the bed of */
function truck() {
  const b = builder();
  box(b, 0, 1.0, 0.7, 1.5, 1.2, 1.7, { top: M.paint, bottom: M.black, side: M.paint });
  box(b, 0, 1.05, -1.1, 1.7, 0.18, 2.6, { top: M.plank, bottom: M.black, side: M.plank }, 1);
  box(b, 0, 1.45, -1.1, 0.06, 0.6, 2.6, M.plank); box(b, 0.85, 1.45, -1.1, 0.06, 0.6, 2.6, M.plank); box(b, -0.85, 1.45, -1.1, 0.06, 0.6, 2.6, M.plank);
  b.use(M.glass).quad([-0.6, 1.25, 1.56], [0.6, 1.25, 1.56], [0.6, 1.85, 1.2], [-0.6, 1.85, 1.2], [0, 0.5, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const sx of [-0.75, 0.75]) for (const z of [0.9, -1.8]) cylinder(b, sx, 0, z, 0.38, 0.38, 0.3, 8, M.rubber);
  return b.build();
}

export function town() {
  const g = builder();
  /* the ground: snow, 8 m pieces; the road down the middle in 4 m pieces, a kerb of snowbank either side */
  sheet(g, -80, -16, 80, 150, 0, 20, 21, M.snow, 3);
  strip(g, -3.4, -16, 3.4, 150, 0.02, 42, M.road, 2.4);
  strip(g, -0.25, -16, 0.25, 150, 0.03, 42, M.dash, 3.2);
  strip(g, -3.2, -16, -2.6, 150, 0.03, 42, M.edge, 3.2); strip(g, 2.6, -16, 3.2, 150, 0.03, 42, M.edge, 3.2);
  for (let z = -16; z < 150; z += 6) for (const sx of [-1, 1]) {
    const sz = 5.6 + ((z * 7) % 3) * 0.2, h = 0.5 + (((z + sx * 11) * 13) % 5) * 0.08;
    box(g, sx * 4.1, h / 2, z + 3, 1.6, h, sz, { top: M.drift, bottom: null, side: M.slush }, 2);
  }
  const ground = g.build();
  const out = { ground, houses: [], lamps: [], pines: [], trucks: [], fences: [] };
  const hs = [house(7, 9, 6.4, M.brick, M.tin, true), house(6, 7, 3.4, M.plank, M.tin, true), house(9, 8, 9.6, M.brick, M.tin, false), house(5.5, 6, 3.2, M.concrete, M.plank, true)];
  let z = -4, i = 0;
  while (z < 140) {
    const side = i % 2 ? 1 : -1, h = hs[(i * 3) % hs.length];
    out.houses.push({ mesh: h, m: place(side * (9 + (i % 3) * 1.4), 0, z + 5, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0) });
    if (i % 2 === 0) out.houses.push({ mesh: hs[(i + 1) % hs.length], m: place(-side * (10 + (i % 4)), 0, z + 9, -side > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0) });
    z += 11 + (i % 3) * 3; i++;
  }
  const L = lamp(), P = [pine(5), pine(7.5), pine(4)];
  for (let k = 0; k < 20; k++) {
    out.lamps.push({ mesh: L, m: place(k % 2 ? 4.2 : -4.2, 0, -10 + k * 8, k % 2 ? Math.PI : 0, 0, 0), x: (k % 2 ? 4.2 : -4.2) + (k % 2 ? -0.85 : 0.85), z: -10 + k * 8 });
  }
  for (let k = 0; k < 46; k++) {
    const side = k % 2 ? 1 : -1, x = side * (6.5 + ((k * 17) % 9)), zz = -8 + k * 3.3 + ((k * 5) % 4);
    out.pines.push({ mesh: P[k % 3], m: place(x, 0, zz, k * 1.7, 0, 0) });
  }
  const T = truck();
  out.trucks.push({ mesh: T, m: place(-5.2, 0, 14, 0.05, 0, 0) }, { mesh: T, m: place(5.1, 0, 38, -0.04, 0, 0) });
  const f = builder();
  for (let s = 0; s < 8; s++) b4(f, s * 3.2);
  out.fences.push({ mesh: f.build(), m: place(5.6, 0, 20, Math.PI / 2, 0, 0) }, { mesh: f.build(), m: place(-5.9, 0, 60, Math.PI / 2, 0, 0) });
  const sb = builder(); blob(sb, 0, 0.05, 0, 1.2, 0.8, 10, M.shadow);
  out.shadow = sb.build();
  return out;
}
function b4(f, x) { f.use(M.fence).quad([x, 0, 0], [x + 3.2, 0, 0], [x + 3.2, 1.1, 0], [x, 1.1, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]); }

/* one view of the town: the sky, the light, the fog, then everything (the camera is wherever the caller says) */
export function drawTown(R, T, rect, cam, night) {
  R.view(rect, cam);
  const day = !night;
  R.env({
    sun: { dir: day ? [0.5, 0.8, -0.35] : [-0.2, 0.6, 0.5], i: day ? 0.75 : 0.18 }, ambient: day ? [0.34, 0.62] : [0.2, 0.34],
    fog: { start: day ? 14 : 8, end: day ? 85 : 55 },
    lights: night ? T.lamps.map(l => ({ x: l.x, y: 4.1, z: l.z, r: 14, i: 1.1 })) : []
  });
  R.sky(day ? { ramp: COOL, horizon: 13, zenith: 7 } : { ramp: BLUE, horizon: 4, zenith: 1 });
  R.draw(T.ground, place(0, 0, 0));
  for (const o of T.houses) R.draw(o.mesh, o.m);
  for (const o of T.lamps) R.draw(o.mesh, o.m);
  for (const o of T.pines) R.draw(o.mesh, o.m);
  for (const o of T.trucks) R.draw(o.mesh, o.m);
  for (const o of T.fences) R.draw(o.mesh, o.m);
  for (const o of T.trucks) R.draw(T.shadow, place(o.m[9], 0.06, o.m[11] - 0.4, 0, 0, 0, 2.2));
}
