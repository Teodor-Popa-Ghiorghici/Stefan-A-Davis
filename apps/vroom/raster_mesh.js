/* MESHES, and the small kit that builds them. A mesh is the arrays the renderer reads and nothing else:
     pos  (3 floats a vertex)   nrm (3, unit, outward)   uv (2, in repeats of the texture: 1 is one whole tile)   idx (3 a triangle, Uint32)
     groups [{ start, count, mat }]  ranges of triangles that share a material       bound { x, y, z, r }  a sphere round it
   A material is { tex, mode, double, emit, zbias }: `tex` a texture from raster_tex.js; `mode` 'solid' (the default) or 'darken' (a shadow: it takes steps of light off what is already drawn);
   `double` draws both sides; `emit` is light the surface gives off itself (a lit window); `zbias` pulls it a little nearer than it is, for a decal on a road.
   FRONT FACES. Looking at a triangle from its front its corners go round counter-clockwise (x to the right, y up, looking along +z). The builder is told which way a face points and turns the
   triangle round if it was written the other way, so a shape is written in whatever order is easiest and cannot come out inside out (raster_check.js draws a box from every side). Pure. */
import { flat } from './raster_tex.js';

export const mat = (tex, o) => Object.assign({ tex: typeof tex === 'number' ? flat(tex) : tex, mode: 'solid', double: false, emit: 0, zbias: 0, steps: 0 }, o || {});

export function builder() {
  const pos = [], nrm = [], uv = [], idx = [], groups = [];
  let cur = null;
  const B = {
    use(m) { cur = m; return B; },
    /* one vertex; returns its index */
    v(x, y, z, nx, ny, nz, u, w) { pos.push(x, y, z); nrm.push(nx, ny, nz); uv.push(u, w); return pos.length / 3 - 1; },
    /* a triangle with an outward direction n (and uv per corner); written either way round */
    tri(a, b, c, n, ua, ub, uc) {
      const g = cross(sub(b, a), sub(c, a));
      /* with no direction given the face looks the way the corners run round counter-clockwise, which is against the right-hand rule of the cross product (this world is left-handed) */
      const nn = n ? norm(n) : norm(g).map(q => -q);
      const flip = dot(g, nn) > 0;
      const i0 = B.v(a[0], a[1], a[2], nn[0], nn[1], nn[2], ua[0], ua[1]);
      const i1 = B.v(b[0], b[1], b[2], nn[0], nn[1], nn[2], ub[0], ub[1]);
      const i2 = B.v(c[0], c[1], c[2], nn[0], nn[1], nn[2], uc[0], uc[1]);
      if (flip) idx.push(i0, i2, i1); else idx.push(i0, i1, i2);
      const last = groups[groups.length - 1];
      if (last && last.mat === cur) last.count++; else groups.push({ start: idx.length / 3 - 1, count: 1, mat: cur });
      return B;
    },
    /* a quad a b c d in order round its edge, pointing along n; uv per corner [[u,v] x4] or a scale (metres per repeat) taken from a and the quad's own axes */
    quad(a, b, c, d, n, uvs) {
      const u = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
      B.tri(a, b, c, n, u[0], u[1], u[2]);
      B.tri(a, c, d, n, u[0], u[2], u[3]);
      return B;
    },
    /* a smooth-shaded triangle: a normal per corner */
    triSmooth(a, b, c, na, nb, nc, ua, ub, uc) {
      const g = cross(sub(b, a), sub(c, a)), flip = dot(g, add(add(na, nb), nc)) > 0;
      const i0 = B.v(a[0], a[1], a[2], na[0], na[1], na[2], ua[0], ua[1]), i1 = B.v(b[0], b[1], b[2], nb[0], nb[1], nb[2], ub[0], ub[1]), i2 = B.v(c[0], c[1], c[2], nc[0], nc[1], nc[2], uc[0], uc[1]);
      if (flip) idx.push(i0, i2, i1); else idx.push(i0, i1, i2);
      const last = groups[groups.length - 1];
      if (last && last.mat === cur) last.count++; else groups.push({ start: idx.length / 3 - 1, count: 1, mat: cur });
      return B;
    },
    build() {
      const n = pos.length / 3, P = Float32Array.from(pos);
      let mx = 0, my = 0, mz = 0;
      for (let i = 0; i < n; i++) { mx += P[i * 3]; my += P[i * 3 + 1]; mz += P[i * 3 + 2]; }
      if (n) { mx /= n; my /= n; mz /= n; }
      let r = 0;
      for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(P[i * 3] - mx, P[i * 3 + 1] - my, P[i * 3 + 2] - mz));
      return { pos: P, nrm: Float32Array.from(nrm), uv: Float32Array.from(uv), idx: Uint32Array.from(idx), groups: groups.map(g => ({ start: g.start, count: g.count, mat: g.mat })), bound: { x: mx, y: my, z: mz, r }, verts: n, tris: idx.length / 3 };
    }
  };
  return B;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* ---- shapes. Every one takes the builder first and a material (or, for a box, an object of materials) ---- */

/* a box centred at (cx, cy, cz) of size (sx, sy, sz). m is one material, or { top, bottom, side } (side may also be { px, nx, pz, nz }); `k` is metres per repeat of the texture (default 1). */
export function box(b, cx, cy, cz, sx, sy, sz, m, k) {
  k = k || 1;
  const M = m.tex ? { top: m, bottom: m, side: m } : m, hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy, z0 = cz - hz, z1 = cz + hz;
  const S = f => (M.side && M.side.tex ? M.side : M.side[f]);
  const uvq = (w, h) => [[0, 0], [w / k, 0], [w / k, h / k], [0, h / k]];
  if (M.top) b.use(M.top).quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], uvq(sx, sz));
  if (M.bottom) b.use(M.bottom).quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], uvq(sx, sz));
  if (M.side) {
    b.use(S('pz')).quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uvq(sx, sy));
    b.use(S('nz')).quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uvq(sx, sy));
    b.use(S('px')).quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uvq(sz, sy));
    b.use(S('nx')).quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uvq(sz, sy));
  }
  return b;
}
/* a flat sheet on y = `y` from (x0, z0) to (x1, z1), cut into nx x nz pieces (so fog and the texture behave), facing up (or down if `down`); k metres per repeat */
export function sheet(b, x0, z0, x1, z1, y, nx, nz, m, k, down) {
  k = k || 1; b.use(m);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const ax = x0 + (x1 - x0) * i / nx, bx = x0 + (x1 - x0) * (i + 1) / nx, az = z0 + (z1 - z0) * j / nz, bz = z0 + (z1 - z0) * (j + 1) / nz;
    b.quad([ax, y, az], [bx, y, az], [bx, y, bz], [ax, y, bz], [0, down ? -1 : 1, 0], [[ax / k, az / k], [bx / k, az / k], [bx / k, bz / k], [ax / k, bz / k]]);
  }
  return b;
}
/* a flat strip on y = `y` from x0 to x1 and z0 to z1, cut into n pieces along z, with the texture laid ACROSS it (u runs 0..1 from x0 to x1: a road with its tracks, a decal with its one line) and
   repeating every `k` metres along it. Faces up. */
export function strip(b, x0, z0, x1, z1, y, n, m, k) {
  k = k || 1; b.use(m);
  for (let j = 0; j < n; j++) {
    const az = z0 + (z1 - z0) * j / n, bz = z0 + (z1 - z0) * (j + 1) / n;
    b.quad([x0, y, az], [x1, y, az], [x1, y, bz], [x0, y, bz], [0, 1, 0], [[0, az / k], [1, az / k], [1, bz / k], [0, bz / k]]);
  }
  return b;
}
/* an upright wall standing on the line (x0, z0) -> (x1, z1) from y0 up to y1, facing to the left of the way it runs (the side `n` says); cut every `cut` metres along it */
export function wall(b, x0, z0, x1, z1, y0, y1, m, k, cut, flip) {
  k = k || 1; b.use(m);
  const len = Math.hypot(x1 - x0, z1 - z0), pieces = Math.max(1, Math.ceil(len / (cut || 6)));
  const nx = (z1 - z0) / len * (flip ? -1 : 1), nz = -(x1 - x0) / len * (flip ? -1 : 1);
  for (let i = 0; i < pieces; i++) {
    const t0 = i / pieces, t1 = (i + 1) / pieces, ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
    b.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz], [[t0 * len / k, y0 / k], [t1 * len / k, y0 / k], [t1 * len / k, y1 / k], [t0 * len / k, y1 / k]]);
  }
  return b;
}
/* an upright cylinder (or a cone if r1 is 0) on (cx, y0, cz), smooth-shaded round its side */
export function cylinder(b, cx, y0, cz, r0, r1, h, seg, m, k) {
  k = k || 1; b.use(m);
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const slope = (r0 - r1) / h, n0 = norm([c0, slope, s0]), n1 = norm([c1, slope, s1]);
    const u0 = i / seg * (r0 * Math.PI * 2) / k, u1 = (i + 1) / seg * (r0 * Math.PI * 2) / k;
    const p0 = [cx + c0 * r0, y0, cz + s0 * r0], p1 = [cx + c1 * r0, y0, cz + s1 * r0], q0 = [cx + c0 * r1, y0 + h, cz + s0 * r1], q1 = [cx + c1 * r1, y0 + h, cz + s1 * r1];
    b.triSmooth(p0, p1, q1, n0, n1, n1, [u0, 0], [u1, 0], [u1, h / k]);
    if (r1 > 0) b.triSmooth(p0, q1, q0, n0, n1, n0, [u0, 0], [u1, h / k], [u0, h / k]);
    if (r1 > 0) b.tri([cx, y0 + h, cz], [q1[0], q1[1], q1[2]], [q0[0], q0[1], q0[2]], [0, 1, 0], [0.5, 0.5], [0.5 + c1 * 0.5, 0.5 + s1 * 0.5], [0.5 + c0 * 0.5, 0.5 + s0 * 0.5]);
  }
  return b;
}
/* a gabled roof over a rectangle: ridge along x, from the eaves at y0 to the ridge at y1 (two slopes and the two gable ends) */
export function gable(b, cx, y0, cz, sx, sz, y1, slopeM, endM, k) {
  k = k || 1; const hx = sx / 2, hz = sz / 2, x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
  const nA = norm([0, hz, -(y1 - y0)]), nB = norm([0, hz, (y1 - y0)]);
  const sl = Math.hypot(hz, y1 - y0);
  b.use(slopeM);
  b.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, cz], [x0, y1, cz], [nA[0], nA[1], -Math.abs(nA[2])], [[0, 0], [sx / k, 0], [sx / k, sl / k], [0, sl / k]]);
  b.quad([x1, y0, z1], [x0, y0, z1], [x0, y1, cz], [x1, y1, cz], [nB[0], nB[1], Math.abs(nB[2])], [[0, 0], [sx / k, 0], [sx / k, sl / k], [0, sl / k]]);
  b.use(endM);
  b.tri([x0, y0, z1], [x0, y0, z0], [x0, y1, cz], [-1, 0, 0], [0, 0], [sz / k, 0], [sz / 2 / k, (y1 - y0) / k]);
  b.tri([x1, y0, z0], [x1, y0, z1], [x1, y1, cz], [1, 0, 0], [0, 0], [sz / k, 0], [sz / 2 / k, (y1 - y0) / k]);
  return b;
}
/* a soft round shadow for the ground: a fan on y = `y`, whose `light` is 1 in the middle and 0 at the rim (material mode 'darken') */
export function blob(b, cx, y, cz, rx, rz, seg, m) {
  b.use(m);
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    b.triSmooth([cx, y, cz], [cx + Math.cos(a0) * rx, y, cz + Math.sin(a0) * rz], [cx + Math.cos(a1) * rx, y, cz + Math.sin(a1) * rz], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1], [0, 0], [0, 0]);
  }
  return b;
}
/* merge a mesh into the builder, moved by (dx, dy, dz) and turned about y by `yaw`: so a street of the same house is one mesh */
export function stamp(b, mesh, dx, dy, dz, yaw) {
  const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), P = mesh.pos, N = mesh.nrm, U = mesh.uv;
  for (const g of mesh.groups) {
    b.use(g.mat);
    for (let t = g.start; t < g.start + g.count; t++) {
      const v = [0, 1, 2].map(k => { const i = mesh.idx[t * 3 + k]; return { p: [P[i * 3] * c + P[i * 3 + 2] * s + dx, P[i * 3 + 1] + dy, -P[i * 3] * s + P[i * 3 + 2] * c + dz], n: [N[i * 3] * c + N[i * 3 + 2] * s, N[i * 3 + 1], -N[i * 3] * s + N[i * 3 + 2] * c], u: [U[i * 2], U[i * 2 + 1]] }; });
      b.triSmooth(v[0].p, v[1].p, v[2].p, v[0].n, v[1].n, v[2].n, v[0].u, v[1].u, v[2].u);
    }
  }
  return b;
}
