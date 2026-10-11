/* THE GEOMETRY KIT FOR TRACKS. A track is drawn and driven from one set of faces, so every face goes through one door, a `sink`: it takes a quad with a material for the picture and a surface for the
   collision, and puts the one in the chunk of the picture it belongs to (chunks are stretches of road, so the renderer can cull what is behind the camera) and the other in the soup the sim collides with
   (col_build.js). Stations are the places along the line at which the road is cut: every metre and a half, and wherever a feature starts or ends. Pure. */
import { builder, mat } from './raster_mesh.js';
import { tex, flat } from './raster_tex.js';
import { soup } from './col_build.js';
import { SURF } from './tune.js';

/* materials by texture name, made once */
const mats = {};
export const material = (name, o) => {
  const key = name + (o ? JSON.stringify(o) : '');
  return mats[key] || (mats[key] = mat(typeof name === 'number' ? flat(name) : tex[name](), o));
};

export const CHUNK = 24;                       /* metres of road to a chunk of picture */
export function sink(length) {
  const n = Math.max(1, Math.ceil(length / CHUNK)), chunks = [], col = soup();
  for (let i = 0; i < n; i++) chunks.push(builder());
  const S = {
    chunks, col, count: n,
    /* where in the picture: the chunk of a distance along the line */
    at: s => Math.max(0, Math.min(n - 1, Math.floor(s / CHUNK))),
    /* a face: corners a b c d round it, the way it faces (n), uv per corner, the material, the surface (a name in tune.js SURF) and a belt's velocity. `solid` false leaves it out of the collision (a thing to look at). */
    quad(s, a, b, c, d, nrm, uv, m, surf, belt, solid) {
      chunks[S.at(s)].use(m).quad(a, b, c, d, nrm, uv);
      if (solid !== false) col.quad(a, b, c, d, surf == null ? SURF.asphalt.id : SURF[surf].id, belt);
    },
    tri(s, a, b, c, nrm, ua, ub, uc, m, surf, solid) {
      chunks[S.at(s)].use(m).tri(a, b, c, nrm, ua, ub, uc);
      if (solid !== false) col.tri(a, b, c, surf == null ? SURF.asphalt.id : SURF[surf].id);
    },
    /* a box in the picture and (unless solid is false) in the collision, where `s` says which chunk */
    box(s, cx, cy, cz, sx, sy, sz, m, surf, solid, k) {
      const b = chunks[S.at(s)], x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, kk = k || 1;
      const M = m.tex ? { top: m, side: m } : m, T = M.top || M.side, Sd = M.side || M.top;
      const uv = (w, h) => [[0, 0], [w / kk, 0], [w / kk, h / kk], [0, h / kk]];
      b.use(T).quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], uv(sx, sz));
      b.use(Sd);
      b.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uv(sx, sy)); b.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uv(sx, sy));
      b.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uv(sz, sy)); b.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uv(sz, sy));
      if (solid !== false) col.box(cx, cy, cz, sx, sy, sz, SURF[surf || 'asphalt'].id);
    },
    build() { return { chunks: chunks.map(c => c.build()), grid: col.build(), tris: col.count }; }
  };
  return S;
}
/* a point across the road from a sample: `off` metres to the left of the line (negative is right) */
export const across = (p, off) => ({ x: p.x + p.nx * off, z: p.z + p.nz * off });
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

/* the stations: every `step` metres round the line, and the extra distances given, sorted, with none closer than 5 cm */
export function stations(length, step, extra) {
  const out = [];
  for (let s = 0; s < length - 1e-6; s += step) out.push(s);
  (extra || []).forEach(s => { if (s > 0 && s < length) out.push(s); });
  out.sort((a, b) => a - b);
  const r = [out[0]];
  for (let i = 1; i < out.length; i++) if (out[i] - r[r.length - 1] > 0.05) r.push(out[i]);
  r.push(length);                                                       /* closes the loop on the first */
  return r;
}
