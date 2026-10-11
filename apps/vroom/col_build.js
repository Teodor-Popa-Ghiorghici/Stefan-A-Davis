/* BUILDING A COLLISION SOUP: triangles with a surface, gathered by shape and turned into a grid (col_grid.js). The tracks use it (track_build.js hands it the same triangles it draws); the checks use it to
   make a flat road, a ramp, a kerb, a wall, an ice patch. Every shape is a sheet or a closed box of sheets: both sides of a triangle are solid. Pure. */
import { buildGrid } from './col_grid.js';
import { SURF } from './tune.js';

export function soup() {
  const t = [], s = [], b = [], tg = [];
  const S = {
    /* `tag` marks a triangle as part of a thing that can be taken away (a gate: 1, 2, ...): a world can switch a tag off and the triangles of it stop being there */
    tri(a, bb, c, surf, belt, tag) { t.push(a[0], a[1], a[2], bb[0], bb[1], bb[2], c[0], c[1], c[2]); s.push(surf == null ? SURF.asphalt.id : surf); b.push(belt ? belt[0] : 0, belt ? belt[1] : 0); tg.push(tag || 0); return S; },
    quad(a, bb, c, d, surf, belt, tag) { S.tri(a, bb, c, surf, belt, tag); S.tri(a, c, d, surf, belt, tag); return S; },
    /* flat ground on y from (x0, z0) to (x1, z1), in n x n pieces */
    ground(x0, z0, x1, z1, y, surf, n, belt) {
      n = n || 1;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const ax = x0 + (x1 - x0) * i / n, bx = x0 + (x1 - x0) * (i + 1) / n, az = z0 + (z1 - z0) * j / n, bz = z0 + (z1 - z0) * (j + 1) / n;
        S.quad([ax, y, az], [bx, y, az], [bx, y, bz], [ax, y, bz], surf, belt);
      }
      return S;
    },
    /* a closed box */
    box(cx, cy, cz, sx, sy, sz, surf, tag) {
      const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      S.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], surf, null, tag); S.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], surf, null, tag);
      S.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], surf, null, tag); S.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], surf, null, tag);
      S.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], surf, null, tag); S.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], surf, null, tag);
      return S;
    },
    /* a ramp up along +z from (y0 at z0) to (y1 at z1), x0..x1 wide */
    ramp(x0, x1, z0, z1, y0, y1, surf) { return S.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1], surf); },
    /* a ramp that climbs from (x0, z0) at y0 to (x1, z1) at y1, w wide (centred on the line between them) */
    incline(x0, z0, x1, z1, w, y0, y1, surf) {
      const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l * w / 2, nz = dx / l * w / 2;
      return S.quad([x0 - nx, y0, z0 - nz], [x0 + nx, y0, z0 + nz], [x1 + nx, y1, z1 + nz], [x1 - nx, y1, z1 - nz], surf);
    },
    /* a wall standing on y from the line (x0, z0) -> (x1, z1), h tall */
    wall(x0, z0, x1, z1, y, h, surf) { return S.quad([x0, y, z0], [x1, y, z1], [x1, y + h, z1], [x0, y + h, z0], surf); },
    build() { return buildGrid(Float64Array.from(t), Uint8Array.from(s), Float32Array.from(b), undefined, Uint8Array.from(tg)); },
    get count() { return s.length; }
  };
  return S;
}
