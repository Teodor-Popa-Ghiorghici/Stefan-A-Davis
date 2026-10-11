/* THE DOORS OF LAST MILE (docs/vroom/plan.md section 9: a parcel is carried to a lit door across the track). Every road has six, worked out from its own line and not authored: spread evenly round the lap, each on the
   nearest straight that has no belt, jump, kerb, pinch, counter, press, shortcut or star on it, alternating sides. A door is a lit panel in the road's wall and a pad on the road in front of it (a car that stops on the
   pad with the parcel delivers it); it is drawn only in LAST MILE, the one lit that is wanted next and the others dim. Returns the doors, `{ i, s, side, x, z, dx, dz, r }` (the pad's centre and the door's) and the
   scene's decor. Pure. */
import { builder, box } from './raster_mesh.js';
import { material, across } from './track_geo.js';
import { place } from './raster_math.js';
import { ix, BROWN, GREY } from './palette.js';

export const DOORS = 6, PAD = 1.5;
export function buildDoors(ctx) {
  const { line, widthAt, F, cuts, stars, startS } = ctx, L = line.length, zones = [];
  F.belts.forEach(b => zones.push([b.s0 - 3, b.s1 + 3])); F.jumps.forEach(j => zones.push([j.a - 8, j.d + 4])); F.kerbs.forEach(k => zones.push([k.s0 - 3, k.s1 + 3])); F.pinches.forEach(k => zones.push([k.s0 - 5, k.s1 + 3]));
  F.counters.forEach(k => zones.push([k.s0 - 3, k.s1 + 3])); F.presses.forEach(k => zones.push([k.s0 - 6, k.s1 + 3])); stars.forEach(t => zones.push([t.s - 7, t.s + 7])); cuts.forEach(c => { zones.push([c.sa - 14, c.sa + 8], [c.sb - 8, c.sb + 14]); });
  const wrap = s => ((s % L) + L) % L, free = s => zones.every(z => { const a = wrap(s); return !(a >= wrap(z[0]) - 1e-9 && z[0] <= z[1] && a <= wrap(z[1])) && !(z[0] < 0 && (a >= wrap(z[0]) || a <= z[1])) && !(z[1] > L && (a <= wrap(z[1]) || a >= z[0])); });
  const straight = s => { for (let d = -4; d <= 4; d += 2) if (Math.abs(line.at(wrap(s + d)).k) > 0.02) return false; return true; };
  const doors = [], decor = [], at = [];
  for (let i = 0; i < DOORS; i++) {
    const want = startS + (i + 0.5) * L / DOORS;
    let s = null; for (let d = 0; d < L / 2 && s == null; d++) for (const sg of [1, -1]) { const q = wrap(want + sg * d); if (straight(q) && free(q) && at.every(p => Math.min(Math.abs(q - p), L - Math.abs(q - p)) > 25)) { s = q; break; } }
    if (s == null) continue;
    at.push(s);
    const side = i % 2 ? -1 : 1, p = line.at(s), w = widthAt(s) / 2, door = across(p, side * w), pad = across(p, side * (w - PAD * 0.55)), k = doors.length;
    doors.push({ i: k, s, side, x: pad.x, z: pad.z, y: p.y, dx: door.x, dz: door.z, r: PAD });
    /* the door and its pad: lit, with a column of light; and the same thing unlit */
    const make = lit => {
      const b = builder(), glass = material('window', { emit: lit ? 0.95 : 0 }), frame = material(ix(lit ? BROWN : GREY, lit ? 12 : 5), { emit: lit ? 0.6 : 0 }), glow = material(ix(BROWN, 15), { emit: 1, double: true });
      const nx = -p.nx * side, nz = -p.nz * side;                                                  /* into the road from the wall */
      const o = { x: door.x + nx * 0.02, z: door.z + nz * 0.02 };
      b.use(glass).quad([o.x - p.tx * 0.45, 0.02, o.z - p.tz * 0.45], [o.x + p.tx * 0.45, 0.02, o.z + p.tz * 0.45], [o.x + p.tx * 0.45, 1.25, o.z + p.tz * 0.45], [o.x - p.tx * 0.45, 1.25, o.z - p.tz * 0.45], [nx, 0, nz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      for (const e of [-1, 1]) box(b, o.x + p.tx * 0.5 * e, 0.64, o.z + p.tz * 0.5 * e, 0.1, 1.3, 0.1, frame, 1);
      if (lit) {
        b.use(material(ix(BROWN, 14), { emit: 0.85, zbias: 0.004 })).quad([pad.x - p.tx * PAD, p.y + 0.01, pad.z - p.tz * PAD], [pad.x + p.tx * PAD, p.y + 0.01, pad.z + p.tz * PAD], [pad.x + p.tx * PAD + nx * 0.1, p.y + 0.01, pad.z + p.tz * PAD + nz * 0.1], [pad.x - p.tx * PAD + nx * 0.1, p.y + 0.01, pad.z - p.tz * PAD + nz * 0.1], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        b.use(glow).quad([pad.x - 0.2 * p.nx, 0, pad.z - 0.2 * p.nz], [pad.x + 0.2 * p.nx, 0, pad.z + 0.2 * p.nz], [pad.x + 0.2 * p.nx, 4, pad.z + 0.2 * p.nz], [pad.x - 0.2 * p.nx, 4, pad.z - 0.2 * p.nz], [p.tx, 0, p.tz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      }
      return b.build();
    };
    decor.push({ mesh: make(true), dim: make(false), m: place(0, 0, 0), x: door.x, z: door.z, r: 6, door: k });
  }
  return { doors, decor };
}
