/* THE ROOM AROUND THE ROAD, for the sorting hall (docs/vroom/plan.md section 9): a ceiling with beams and strip lights, brick walls round the hall, the pillars that hold it up, and signs over the road. None of it is
   driven on (the road has its own walls); all of it is to look at, in tiles so the renderer can leave out what is behind the camera. Returns [{ mesh, m, x, z }]. Pure. */
import { builder, box, cylinder, mat } from './raster_mesh.js';
import { material } from './track_geo.js';
import { sign } from './raster_tex.js';
import { place } from './raster_math.js';
import { ix, GREY, COOL, RED, BROWN } from './palette.js';

const ID = place(0, 0, 0);
/* the sorting room's hall (its own kit: brick walls, pillars, signs) */
function hall(def, line, width, F) {
  const out = [];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  line.samples.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  const M = 14, H = 6.5; x0 -= M; x1 += M; z0 -= M; z1 += M;
  const ceil = material('under'), beam = material(ix(COOL, 4)), lamp = material(ix(BROWN, 14), { emit: 0.9 }), brick = material('brick'), conc = material('concrete');
  /* ceiling and beams, in 20 m tiles, with a strip light under every beam */
  const T = 20;
  for (let tx = x0; tx < x1; tx += T) for (let tz = z0; tz < z1; tz += T) {
    const b = builder(), ex = Math.min(tx + T, x1), ez = Math.min(tz + T, z1);
    b.use(ceil);
    for (let a = tx; a < ex; a += 10) for (let c = tz; c < ez; c += 10) {
      const a2 = Math.min(a + 10, ex), c2 = Math.min(c + 10, ez);
      b.quad([a, H, c], [a, H, c2], [a2, H, c2], [a2, H, c], [0, -1, 0], [[a / 4, c / 4], [a / 4, c2 / 4], [a2 / 4, c2 / 4], [a2 / 4, c / 4]]);
    }
    for (let a = tx + 5; a < ex; a += 10) { box(b, a, H - 0.35, (tz + ez) / 2, 0.5, 0.7, ez - tz, beam); box(b, a, H - 0.74, (tz + ez) / 2, 0.22, 0.06, Math.min(ez - tz, 12), lamp); }
    out.push({ mesh: b.build(), m: ID, x: (tx + ex) / 2, z: (tz + ez) / 2, r: T });
  }
  /* the hall's walls, inward facing, in 10 m pieces with a stripe of conveyor yellow low down */
  const walls = [[x0, z0, x1, z0, 0, 1], [x1, z0, x1, z1, -1, 0], [x1, z1, x0, z1, 0, -1], [x0, z1, x0, z0, 1, 0]];
  for (const [ax, az, bx, bz, nx, nz] of walls) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 10);
    for (let i = 0; i < n; i++) {
      const b = builder().use(brick), t0 = i / n, t1 = (i + 1) / n, px = ax + (bx - ax) * t0, pz = az + (bz - az) * t0, qx = ax + (bx - ax) * t1, qz = az + (bz - az) * t1;
      b.quad([px, 0, pz], [qx, 0, qz], [qx, H, qz], [px, H, pz], [nx, 0, nz], [[t0 * len / 2, 0], [t1 * len / 2, 0], [t1 * len / 2, H / 2], [t0 * len / 2, H / 2]]);
      out.push({ mesh: b.build(), m: ID, x: (px + qx) / 2, z: (pz + qz) / 2, r: 8 });
    }
  }
  /* pillars: beside the road every 24 samples, alternating sides */
  line.samples.forEach((p, i) => {
    if (i % 24 !== 5) return;
    const off = (width[i] / 2 + 3.2) * (i % 48 === 5 ? 1 : -1), x = p.x + p.nx * off, z = p.z + p.nz * off, b = builder();
    cylinder(b, x, 0, z, 0.55, 0.5, H, 10, conc, 2); cylinder(b, x, 0, z, 0.7, 0.7, 0.3, 10, mat(ix(BROWN, 9)), 2);
    out.push({ mesh: b.build(), m: ID, x, z, r: 8 });
  });
  /* signs over the road at the start and where the belt is */
  const sg = (text, s, w, y) => {
    const p = line.at(s), a = [p.x + p.nx * (w / 2 + 0.2), y, p.z + p.nz * (w / 2 + 0.2)], c = [p.x - p.nx * (w / 2 + 0.2), y, p.z - p.nz * (w / 2 + 0.2)], b = builder().use(mat(sign(text, ix(GREY, 15), ix(RED, 5), 64, 16)));
    b.quad([a[0], y - 0.35, a[2]], [c[0], y - 0.35, c[2]], [c[0], y + 0.35, c[2]], [a[0], y + 0.35, a[2]], [-p.tx, 0, -p.tz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    b.quad([c[0], y - 0.35, c[2]], [a[0], y - 0.35, a[2]], [a[0], y + 0.35, a[2]], [c[0], y + 0.35, c[2]], [p.tx, 0, p.tz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    out.push({ mesh: b.build(), m: ID, x: p.x, z: p.z, r: w });
  };
  sg('START', 0.2, 4.4, 2.4);
  F.belts.forEach(bl => sg('SORTING', bl.s0 - 4, 7.2, 2.6));
  F.jumps.forEach(j => sg('MIND THE GAP', j.a - 8, 4.2, 2.1));
  return out;
}

import { kitOf } from './dress_kit.js';
import { street, pass, dam, harbour, yard } from './dress_outdoor.js';
import { forecourt, diner, factory } from './dress_indoor.js';
const KITS = { street, pass, dam, harbour, yard, forecourt, diner, factory };
/* what stands round a road: its kit by name (`def.dress`), or the sorting room's hall */
export function dress(def, line, width, F, cuts, startS) {
  const kit = KITS[def.dress];
  if (!kit) return def.light === 'hall' && !def.dress ? hall(def, line, width, F) : [];
  const K = kitOf(def, line, width, cuts, F, startS); kit(K);
  const out = K.finish();
  if (K.sparks) out.push({ mesh: null, m: ID, x: 0, z: 0, r: 1e5, sparks: K.sparks });
  return out;
}
