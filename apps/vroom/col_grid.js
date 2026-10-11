/* THE TRACK AS THE SIM SEES IT: a soup of triangles in a uniform grid of 2 m cells on the ground plane (docs/vroom/plan.md section 6), each triangle with a surface (tune.js SURF) and, for a conveyor,
   the way it moves what is on it. Built once from the same triangles the picture is made from. Three questions are asked of it a thousand times a second: a ray down from a wheel (what is under me, how far,
   what is it made of), a small sphere (is this corner of the car inside something, and which way out), and a short segment (did this corner pass through a sheet between two steps). No allocation in the
   queries: results land in module-level scratch. Pure. */
export const CELL = 2;

/* tris: Float64Array(9 * n) (ax ay az bx by bz cx cy cz); surf: Uint8Array(n); belt: Float32Array(2 * n) (the surface's own velocity, x and z), or null */
export function buildGrid(tris, surf, belt, cell) {
  const c = cell || CELL, n = tris.length / 9;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  const aabb = new Float64Array(n * 6), nrm = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 9;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const x = tris[o + k * 3], y = tris[o + k * 3 + 1], z = tris[o + k * 3 + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    aabb[i * 6] = x0; aabb[i * 6 + 1] = y0; aabb[i * 6 + 2] = z0; aabb[i * 6 + 3] = x1; aabb[i * 6 + 4] = y1; aabb[i * 6 + 5] = z1;
    if (x0 < minX) minX = x0; if (x1 > maxX) maxX = x1; if (z0 < minZ) minZ = z0; if (z1 > maxZ) maxZ = z1;
    const ux = tris[o + 3] - tris[o], uy = tris[o + 4] - tris[o + 1], uz = tris[o + 5] - tris[o + 2], vx = tris[o + 6] - tris[o], vy = tris[o + 7] - tris[o + 1], vz = tris[o + 8] - tris[o + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    nrm[i * 3] = nx / l; nrm[i * 3 + 1] = ny / l; nrm[i * 3 + 2] = nz / l;
  }
  /* edges that are the seam between two triangles of one plane: a sphere that touches such a seam would be pushed along it instead of out of the surface (a "ghost" contact), so the seam is ignored and
     the triangle whose face is under the sphere does the work. bit 0 is the edge a-b, bit 1 b-c, bit 2 c-a */
  const flat = new Uint8Array(n), seen = new Map(), q = v => Math.round(v * 10000);
  for (let i = 0; i < n; i++) for (let e = 0; e < 3; e++) {
    const o = i * 9 + e * 3, o2 = i * 9 + ((e + 1) % 3) * 3;
    const a = q(tris[o]) + ',' + q(tris[o + 1]) + ',' + q(tris[o + 2]), b = q(tris[o2]) + ',' + q(tris[o2 + 1]) + ',' + q(tris[o2 + 2]), k = a < b ? a + '|' + b : b + '|' + a;
    const prev = seen.get(k);
    if (prev === undefined) seen.set(k, i * 4 + e);
    else if (prev >= 0) {
      const pi = prev >> 2, pe = prev & 3, d = Math.abs(nrm[i * 3] * nrm[pi * 3] + nrm[i * 3 + 1] * nrm[pi * 3 + 1] + nrm[i * 3 + 2] * nrm[pi * 3 + 2]);
      if (d > 0.9995 && pi !== i) { flat[i] |= 1 << e; flat[pi] |= 1 << pe; }
      seen.set(k, -1);
    }
  }
  if (!n) { minX = minZ = 0; maxX = maxZ = 1; }
  const nxc = Math.max(1, Math.ceil((maxX - minX) / c) + 1), nzc = Math.max(1, Math.ceil((maxZ - minZ) / c) + 1);
  const count = new Int32Array(nxc * nzc + 1);
  const span = (i, f) => {
    const x0 = Math.floor((aabb[i * 6] - minX) / c), x1 = Math.floor((aabb[i * 6 + 3] - minX) / c), z0 = Math.floor((aabb[i * 6 + 2] - minZ) / c), z1 = Math.floor((aabb[i * 6 + 5] - minZ) / c);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) f(z * nxc + x);
  };
  for (let i = 0; i < n; i++) span(i, cell => { count[cell + 1]++; });
  for (let i = 0; i < nxc * nzc; i++) count[i + 1] += count[i];
  const start = count, fill = new Int32Array(nxc * nzc), items = new Int32Array(start[nxc * nzc]);
  for (let i = 0; i < n; i++) span(i, cell => { items[start[cell] + fill[cell]++] = i; });
  return { n, tris, surf, belt: belt || null, cell: c, minX, minZ, nx: nxc, nz: nzc, start, items, aabb, nrm, flat, mark: new Int32Array(n), stamp: 0 };
}

/* the triangles whose cell and box meet this box, each once, into `out` (an Int32Array); returns how many */
export function gather(g, x0, y0, z0, x1, y1, z1, out) {
  if (!g.n) return 0;
  const c = g.cell, cx0 = Math.max(0, Math.floor((x0 - g.minX) / c)), cx1 = Math.min(g.nx - 1, Math.floor((x1 - g.minX) / c)), cz0 = Math.max(0, Math.floor((z0 - g.minZ) / c)), cz1 = Math.min(g.nz - 1, Math.floor((z1 - g.minZ) / c));
  const stamp = ++g.stamp, A = g.aabb; let m = 0;
  for (let z = cz0; z <= cz1; z++) for (let x = cx0; x <= cx1; x++) {
    const cell = z * g.nx + x;
    for (let k = g.start[cell], e = g.start[cell + 1]; k < e; k++) {
      const t = g.items[k];
      if (g.mark[t] === stamp) continue;
      g.mark[t] = stamp;
      const o = t * 6;
      if (A[o] > x1 || A[o + 3] < x0 || A[o + 1] > y1 || A[o + 4] < y0 || A[o + 2] > z1 || A[o + 5] < z0) continue;
      if (m < out.length) out[m++] = t;
    }
  }
  return m;
}

/* the closest point on triangle t to p (Ericson): the point goes to CP, the squared distance is returned */
export const CP = new Float64Array(3);
/* where the closest point of the last query was: 0 inside the face, 1 on edge a-b, 2 b-c, 3 c-a, 4 5 6 at corner a b c */
export let REGION = 0;
export const region = () => REGION;
export function closest(g, t, px, py, pz) {
  const T = g.tris, o = t * 9, ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let x, y, z; REGION = 0;
  if (d1 <= 0 && d2 <= 0) { x = ax; y = ay; z = az; REGION = 4; }
  else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { x = bx; y = by; z = bz; REGION = 5; }
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); x = ax + abx * v; y = ay + aby * v; z = az + abz * v; REGION = 1; }
      else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { x = cx; y = cy; z = cz; REGION = 6; }
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); x = ax + acx * w; y = ay + acy * w; z = az + acz * w; REGION = 3; }
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); x = bx + (cx - bx) * w; y = by + (cy - by) * w; z = bz + (cz - bz) * w; REGION = 2; }
            else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; x = ax + abx * v + acx * w; y = ay + aby * v + acy * w; z = az + abz * v + acz * w; }
          }
        }
      }
    }
  }
  CP[0] = x; CP[1] = y; CP[2] = z;
  return (x - px) * (x - px) + (y - py) * (y - py) + (z - pz) * (z - pz);
}

/* is the closest point of the last query on a seam inside a flat piece of track (see `flat` above): such a contact is ignored */
export function onSeam(g, t) {
  const f = g.flat[t];
  if (!f) return false;
  switch (REGION) { case 1: return (f & 1) !== 0; case 2: return (f & 2) !== 0; case 3: return (f & 4) !== 0; case 4: return (f & 5) === 5; case 5: return (f & 3) === 3; case 6: return (f & 6) === 6; default: return false; }
}

/* a ray (from o along d, unit, for len) against triangle t, both sides: the distance, or -1 (Moller-Trumbore) */
export function rayTri(g, t, ox, oy, oz, dx, dy, dz, len) {
  const T = g.tris, o = t * 9, ax = T[o], ay = T[o + 1], az = T[o + 2];
  const e1x = T[o + 3] - ax, e1y = T[o + 4] - ay, e1z = T[o + 5] - az, e2x = T[o + 6] - ax, e2y = T[o + 7] - ay, e2z = T[o + 8] - az;
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
  if (det > -1e-12 && det < 1e-12) return -1;
  const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < -1e-6 || u + v > 1 + 1e-6) return -1;
  const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return s >= 0 && s <= len ? s : -1;
}
/* the nearest hit of a ray among the triangles of the grid: the distance (or -1), and the triangle in HIT.tri */
export const HIT = { tri: -1 };
const RAYBUF = new Int32Array(256);
export function ray(g, ox, oy, oz, dx, dy, dz, len) {
  const ex = ox + dx * len, ey = oy + dy * len, ez = oz + dz * len;
  const m = gather(g, Math.min(ox, ex) - 1e-4, Math.min(oy, ey) - 1e-4, Math.min(oz, ez) - 1e-4, Math.max(ox, ex) + 1e-4, Math.max(oy, ey) + 1e-4, Math.max(oz, ez) + 1e-4, RAYBUF);
  let best = -1; HIT.tri = -1;
  for (let i = 0; i < m; i++) { const s = rayTri(g, RAYBUF[i], ox, oy, oz, dx, dy, dz, best < 0 ? len : best); if (s >= 0 && (best < 0 || s < best)) { best = s; HIT.tri = RAYBUF[i]; } }
  return best;
}
export const QUERYBUF = new Int32Array(256);
/* the unit normal of a triangle, turned to face the side of `p` (it is a sheet: both sides are solid) into N; returns the signed distance of p from its plane */
export const N = new Float64Array(3);
export function facing(g, t, px, py, pz) {
  const o = t * 9, nx = g.nrm[t * 3], ny = g.nrm[t * 3 + 1], nz = g.nrm[t * 3 + 2], d = (px - g.tris[o]) * nx + (py - g.tris[o + 1]) * ny + (pz - g.tris[o + 2]) * nz;
  if (d >= 0) { N[0] = nx; N[1] = ny; N[2] = nz; return d; }
  N[0] = -nx; N[1] = -ny; N[2] = -nz; return -d;
}
