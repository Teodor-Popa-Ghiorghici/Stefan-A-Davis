/* THE KIT THE ROADS ARE DRESSED WITH (docs/vroom/plan.md section 9: each road is a place). Everything round a road that is not the road: the ground it stands on, the buildings, the trees, the lamps, the machines. It is all
   picture and none of it is driven on (the road has its own walls), so it is only ever put where it cannot be in the road: `clear(x, z, r)` asks the track's own line and its shortcuts' corridors. Props are built into
   one mesh a 24 m square of the world, so the renderer can leave out what is behind the camera and a frame is a few dozen draws, not a few hundred. Seeded by the road's name: the same road is dressed the same way
   every time. Pure. */
import { builder, box, mat } from './raster_mesh.js'; import { material } from './track_geo.js'; import { place } from './raster_math.js'; import { sign } from './raster_tex.js'; import { ix, GREY, BROWN, COOL } from './palette.js';
import { extend } from './dress_ext.js';

const ID = place(0, 0, 0), CELL = 16;
export const GROUND_Y = -0.6;                                   /* the floor of the world, a little below the road: a toy's road stands on the table */
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export function kitOf(def, line, width, cuts, F, startS) { const S = line.samples, cells = new Map(), road = []; S.forEach((p, i) => { if (i % 2 === 0) road.push([p.x, p.z, width[i] / 2]); });
  (cuts || []).forEach(c => c.samples.forEach((p, i) => { if (i % 3 === 0) road.push([p.x, p.z, c.w / 2]); }));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; S.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  let seed = hash(def.id) || 1; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; const K = { def, line, S, width, rnd, F, startS, bbox: { x0, x1, z0, z1 },
    /* the mesh of the 24 m square a point is in */
    b(x, z) { const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let c = cells.get(key); if (!c) { c = { b: builder(), cx: (Math.floor(x / CELL) + 0.5) * CELL, cz: (Math.floor(z / CELL) + 0.5) * CELL }; cells.set(key, c); } return c.b; },
    /* how far is the nearest road (the main line and the shortcuts) from here, edge to edge */
    gap(x, z) { let d = 1e9; for (const q of road) { const e = Math.hypot(q[0] - x, q[1] - z) - q[2]; if (e < d) d = e; } return d; },
    clear(x, z, r) { return K.gap(x, z) > r + 0.7; },
    /* a point beside the road at distance `off` from its edge on the side `side` (1 left, -1 right) of the sample at distance `s` along the line */
    beside(s, side, off) { const p = line.at(((s % line.length) + line.length) % line.length), w = width[Math.min(width.length - 1, Math.round(p.s / line.step))] / 2; return { x: p.x + p.nx * side * (w + off), z: p.z + p.nz * side * (w + off), p }; },
    /* the ground: 12 m squares of a texture over everything within `reach` metres of the road */
    ground(tex, reach, k, y) { const m = material(tex), P = 12, yy = y == null ? GROUND_Y : y; for (let x = Math.floor((x0 - reach) / P) * P; x < x1 + reach; x += P) for (let z = Math.floor((z0 - reach) / P) * P; z < z1 + reach; z += P) {
        if (K.gap(x + P / 2, z + P / 2) > reach) continue;
        K.b(x + P / 2, z + P / 2).use(m).quad([x, yy, z], [x, yy, z + P], [x + P, yy, z + P], [x + P, yy, z], [0, 1, 0], [[x / k, z / k], [x / k, (z + P) / k], [(x + P) / k, (z + P) / k], [(x + P) / k, z / k]]); } },
    /* a sign over the road across it at distance `s`, `w` wide, `y` high, text `str` (it is read from both ways) */
    banner(s, w, y, str, fg, bg) { const p = line.at(s), a = [p.x + p.nx * (w / 2 + 0.2), p.z + p.nz * (w / 2 + 0.2)], c = [p.x - p.nx * (w / 2 + 0.2), p.z - p.nz * (w / 2 + 0.2)], b = K.b(p.x, p.z), m = mat(sign(str, fg, bg, 64, 16));
      b.use(m).quad([a[0], y - 0.35, a[1]], [c[0], y - 0.35, c[1]], [c[0], y + 0.35, c[1]], [a[0], y + 0.35, a[1]], [-p.tx, 0, -p.tz], [[0, 1], [1, 1], [1, 0], [0, 0]]);
      b.quad([c[0], y - 0.35, c[1]], [a[0], y - 0.35, a[1]], [a[0], y + 0.35, a[1]], [c[0], y + 0.35, c[1]], [p.tx, 0, p.tz], [[0, 1], [1, 1], [1, 0], [0, 0]]); for (const e of [a, c]) box(b, e[0], y / 2, e[1], 0.14, y, 0.14, mat(ix(GREY, 5))); },
    /* a room round the road: a ceiling at `H` with a beam and a strip light every 10 m, and four walls (`wallTex`) a few metres outside it all */
    room(H, wallTex, ceilTex, margin) {
      const M = margin || 14, ex0 = x0 - M, ex1 = x1 + M, ez0 = z0 - M, ez1 = z1 + M, ceil = material(ceilTex || 'under'), beam = mat(ix(COOL, 4)), lamp = material(ix(BROWN, 14), { emit: 0.9 }), wm = material(wallTex || 'brick');
      const sides = [[ex0, ez0, ex1, ez0, 0, 1], [ex1, ez0, ex1, ez1, -1, 0], [ex1, ez1, ex0, ez1, 0, -1], [ex0, ez1, ex0, ez0, 1, 0]]; K.hall = { x0: ex0, x1: ex1, z0: ez0, z1: ez1, H, sides };
      for (let a = ex0; a < ex1; a += 10) for (let c = ez0; c < ez1; c += 10) { const a2 = Math.min(a + 10, ex1), c2 = Math.min(c + 10, ez1), b = K.b(a + 5, c + 5);
        b.use(ceil).quad([a, H, c], [a, H, c2], [a2, H, c2], [a2, H, c], [0, -1, 0], [[a / 4, c / 4], [a / 4, c2 / 4], [a2 / 4, c2 / 4], [a2 / 4, c / 4]]);
        box(b, a + 5, H - 0.35, (c + c2) / 2, 0.5, 0.7, c2 - c, beam); box(b, a + 5, H - 0.74, (c + c2) / 2, 0.22, 0.06, Math.min(c2 - c, 8), lamp); } for (const [ax, az, bx, bz, nx, nz] of sides) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 10); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, px = ax + (bx - ax) * t0, pz = az + (bz - az) * t0, qx = ax + (bx - ax) * t1, qz = az + (bz - az) * t1, y0 = GROUND_Y;
          K.b((px + qx) / 2, (pz + qz) / 2).use(wm).quad([px, y0, pz], [qx, y0, qz], [qx, H, qz], [px, H, pz], [nx, 0, nz], [[t0 * len / 2, 0], [t1 * len / 2, 0], [t1 * len / 2, (H - y0) / 2], [t0 * len / 2, (H - y0) / 2]]); } } },
    finish() { return [...cells.values()].map(c => ({ mesh: c.b.build(), m: ID, x: c.cx, z: c.cz, r: CELL })).concat(K.moving.map(d => Object.assign({ m: ID }, d)), K.lights.length ? [{ mesh: null, m: ID, x: 0, z: 0, r: 1e5, lights: K.lights }] : []); } };
  K.bbox = { x0, x1, z0, z1 }; extend(K, GROUND_Y); return K; }
