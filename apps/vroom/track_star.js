/* THE HIDDEN STAR OF A ROAD (docs/vroom/plan.md section 9: PRACTICE has one hidden star per track, in a place you have to DRIVE to). A star stands on a shelf off the road: a short spur leaves the road's edge through a gap in
   its wall, climbs a ramp onto a platform (`rise` metres up) and stops there, and the star is hovering over the platform. Nothing marks the gap but the gap. It is built from the feature
     { type: 'star', u, side: 'left' | 'right', ang, len, w, rise, floor, wall }
   (u: a place along the road; ang: how far the spur leans from the road's direction; len, w: its length and width in metres) into the same sink as the road (so the picture and the collision are one set of faces), and
   returns { x, y, z } of the star, the line down the middle of the spur (for the checks and the CPU) and the gap in the road's wall. Pure. */
import { builder } from './raster_mesh.js';
import { material, across } from './track_geo.js';
import { FLOORS, WALLS } from './track_def.js';
import { place } from './raster_math.js';
import { ix, BROWN, COOL } from './palette.js';

/* the star itself: eight points of yellow light, turned by the scene by the clock */
export function starDecor(star) {
  const b = builder(), gold = material(ix(BROWN, 14), { emit: 0.95, double: true }), halo = material(ix(COOL, 15), { emit: 0.9, double: true });
  for (const [r, h, m] of [[0, 0.2, gold], [Math.PI / 4, 0.2, gold], [Math.PI / 8, 0.1, halo]]) {
    const c = Math.cos(r), n = Math.sin(r), P = (x, y) => [x * c - y * n, x * n + y * c, 0];
    b.use(m).quad(P(-h, -h), P(h, -h), P(h, h), P(-h, h), [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  return { mesh: b.build(), m: place(star.x, star.y, star.z, 0, 0, 0, 1), x: star.x, z: star.z, r: 3, star };
}

export function buildStars(ctx) {
  const { def, line, widthAt, sOfU, out, decor } = ctx, stars = [];
  (def.features || []).filter(f => f.type === 'star').forEach((f, k) => {
    const s = sOfU(f.u), side = f.side === 'left' ? 1 : -1, ang = f.ang == null ? 0.45 : f.ang, len = f.len || 9, w = f.w || 1.7, rise = f.rise == null ? 0.5 : f.rise, p = line.at(s), wr = widthAt(s), fl = FLOORS[f.floor || 'asphalt'], wl = WALLS[f.wall || 'snowbank'];
    /* the way along the spur: the road's direction turned toward the side it leaves by `ang` (x east, z north: left is a quarter turn counter-clockwise) */
    const a = side * ang, dx = p.tx * Math.cos(a) - p.tz * Math.sin(a), dz = p.tx * Math.sin(a) + p.tz * Math.cos(a), A = across(p, side * wr / 2), nx = -dz, nz = dx;
    const pt = i => ({ x: A.x + dx * i, z: A.z + dz * i }), lift = i => rise * Math.max(0, Math.min(1, (i - 1) / (len * 0.65)));
    const inside = (x, z) => { const q = line.samples[line.nearest(x, z)], lat = (x - q.x) * q.nx + (z - q.z) * q.nz; return Math.abs(lat) < widthAt(q.s) / 2 - 0.02; };
    const rm = material(fl.tex, { zbias: 0.004 }), wm = material(wl ? wl.tex : 'snow');
    /* a corner of the floor that falls inside the road is moved out to the road's edge on the spur's side, so the two floors meet and never lie one on the other (a car on the road would feel the spur's floor under it) */
    const clampOut = (x, z) => {
      const q = line.samples[line.nearest(x, z)], lat = (x - q.x) * q.nx + (z - q.z) * q.nz, lim = widthAt(q.s) / 2;
      return lat * side < lim ? { x: q.x + q.nx * lim * side, z: q.z + q.nz * lim * side } : { x, z };
    };
    for (let i = -2; i < len; i++) {
      const a0 = pt(i), b0 = pt(i + 1), y0 = lift(i), y1 = lift(i + 1);
      const c = [clampOut(a0.x + nx * w / 2, a0.z + nz * w / 2), clampOut(a0.x - nx * w / 2, a0.z - nz * w / 2), clampOut(b0.x - nx * w / 2, b0.z - nz * w / 2), clampOut(b0.x + nx * w / 2, b0.z + nz * w / 2)];
      const area = Math.abs((c[0].x - c[2].x) * (c[1].z - c[3].z) - (c[0].z - c[2].z) * (c[1].x - c[3].x)) / 2;
      if (area < 0.01) continue;
      out.quad(s, [c[0].x, y0, c[0].z], [c[1].x, y0, c[1].z], [c[2].x, y1, c[2].z], [c[3].x, y1, c[3].z], [0, 1, 0], [[0, i / fl.k], [w / fl.k, i / fl.k], [w / fl.k, (i + 1) / fl.k], [0, (i + 1) / fl.k]], rm, fl.surf);
      if (wl) for (const sd of [1, -1]) {
        const c0 = [a0.x + nx * sd * w / 2, a0.z + nz * sd * w / 2], c1 = [b0.x + nx * sd * w / 2, b0.z + nz * sd * w / 2];
        if (inside(c0[0], c0[1]) || inside(c1[0], c1[1])) continue;
        out.quad(s, [c0[0], y0, c0[1]], [c1[0], y1, c1[1]], [c1[0], y1 + 0.3, c1[1]], [c0[0], y0 + 0.3, c0[1]], [-sd * nx, 0, -sd * nz], [[i, 0], [i + 1, 0], [i + 1, 0.3], [i, 0.3]], wm, 'wood');
      }
    }
    /* the end of it: a wall across, so the shelf has an edge */
    const e = pt(len); out.quad(s, [e.x + nx * w / 2, rise, e.z + nz * w / 2], [e.x - nx * w / 2, rise, e.z - nz * w / 2], [e.x - nx * w / 2, rise + 0.3, e.z - nz * w / 2], [e.x + nx * w / 2, rise + 0.3, e.z + nz * w / 2], [-dx, 0, -dz], [[0, 0], [1, 0], [1, 0.3], [0, 0.3]], wm, 'wood');
    /* the gap in the road's own wall where the spur leaves it: as wide as the spur is across the road's edge */
    const g = w / 2 / Math.max(0.3, Math.abs(Math.sin(ang))) + 0.08, star = { id: k, x: e.x - dx * 1.2, y: rise + 0.32, z: e.z - dz * 1.2, s, side, rise, len, ang, dx, dz, w, gaps: [{ s0: s - g, s1: s + g, side }], samples: [] };
    for (let i = 0; i <= len; i += 1) { const q = pt(i); star.samples.push({ x: q.x, z: q.z, y: lift(i), w }); }
    decor.push(starDecor(star));
    stars.push(star);
  });
  return stars;
}
