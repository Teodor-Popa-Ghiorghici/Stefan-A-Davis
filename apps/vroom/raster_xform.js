/* FROM A MESH TO TRIANGLES ON THE SCREEN. One placed mesh at a time: is its bounding sphere inside the view at all; every vertex moved into the camera's space, lit (a sun, a sky above and snow
   below, and the few point lights that reach this object) and given its fog (a straight line in depth, per vertex, as the PS1 did it); then each triangle: a back face is dropped before anything else
   is spent on it, the near plane cuts what crosses it, the corners are projected and SNAPPED to whole pixels, and a triangle that is both big on the screen and deep (which an affine texture would
   smear) is cut into four and the four judged again, up to three times. What is left goes to the filler (raster_tri.js). Camera space: x right, y up, z ahead. No allocation per triangle: the
   working corners live in one arena and the filler's input in one array. */
import { fillTri } from './raster_tri.js';

const UV_OFF = 1 << 20;            /* added to every texel position so that the filler never sees a negative one (a multiple of every texture size) */
const W_STRIDE = 7;                /* a working corner: x, y, z (camera space), light, fog, u, v */
const MAX_SUB = 3, SUB_EDGE = 28, SUB_DEEP = 1.35, SUB_HUGE = 96;

export function newState(w, h) {
  return {
    w, h, buf: new Uint8Array(w * h), zbuf: new Float32Array(w * h), vx0: 0, vy0: 0, vx1: w, vy1: h, fogIdx: 0,
    cam: null, env: null, cx: w / 2, cy: h / 2, focal: 150, tanx: 1, tany: 0.6,
    tv: new Float64Array(7 * 3), W: new Float64Array(W_STRIDE * 512), wp: 0,
    vcap: 0, vx: null, vy: null, vz: null, vl: null, vf: null,
    stats: { instances: 0, culled: 0, tris: 0, backface: 0, clipped: 0, split: 0, filled: 0 }
  };
}
/* the view: a rectangle of the buffer and a camera (raster_math.camera) */
export function setView(S, rect, cam) {
  S.vx0 = rect.x; S.vy0 = rect.y; S.vx1 = rect.x + rect.w; S.vy1 = rect.y + rect.h;
  S.cam = cam; S.cx = rect.x + rect.w / 2; S.cy = rect.y + rect.h / 2;
  S.focal = (rect.h / 2) / Math.tan(cam.fov / 2);
  cam.focal = S.focal;
  S.tanx = (rect.w / 2) / S.focal; S.tany = (rect.h / 2) / S.focal;
}

const prep = m => m._p || (m._p = {
  d: m.tex.d, ws: m.tex.ws, wm: m.tex.w - 1, hm: m.tex.h - 1, tw: m.tex.w, th: m.tex.h, darken: m.mode === 'darken', steps: m.steps || 0, double: !!m.double, emit: m.emit || 0, bias: 1 + (m.zbias || 0)
});

function room(S, n) {
  if (S.vcap >= n) return;
  const c = Math.max(n, S.vcap * 2, 1024);
  S.vx = new Float64Array(c); S.vy = new Float64Array(c); S.vz = new Float64Array(c); S.vl = new Float64Array(c); S.vf = new Float64Array(c); S.vcap = c;
}

/* draw a mesh placed by M (12 numbers: rotation then translation, raster_math.place) */
export function drawMesh(S, mesh, M, opt) {
  const cam = S.cam, env = S.env, st = S.stats;
  st.instances++;
  const sc = Math.hypot(M[0], M[3], M[6]) || 1, bc = mesh.bound, br = bc.r * sc;
  const bwx = M[0] * bc.x + M[1] * bc.y + M[2] * bc.z + M[9] - cam.x, bwy = M[3] * bc.x + M[4] * bc.y + M[5] * bc.z + M[10] - cam.y, bwz = M[6] * bc.x + M[7] * bc.y + M[8] * bc.z + M[11] - cam.z;
  const bx = bwx * cam.rx + bwy * cam.ry + bwz * cam.rz, by = bwx * cam.ux + bwy * cam.uy + bwz * cam.uz, bz = bwx * cam.fx + bwy * cam.fy + bwz * cam.fz;
  const far = (opt && opt.far) || cam.far;
  if (bz + br < cam.near || bz - br > far) { st.culled++; return; }
  const kx = Math.sqrt(1 + S.tanx * S.tanx), ky = Math.sqrt(1 + S.tany * S.tany);
  if (bx - S.tanx * bz > br * kx || -bx - S.tanx * bz > br * kx || by - S.tany * bz > br * ky || -by - S.tany * bz > br * ky) { st.culled++; return; }

  const nv = mesh.verts;
  room(S, nv);
  const VX = S.vx, VY = S.vy, VZ = S.vz, VL = S.vl, VF = S.vf, P = mesh.pos, N = mesh.nrm;
  const tx0 = M[9] - cam.x, ty0 = M[10] - cam.y, tz0 = M[11] - cam.z;
  const a00 = cam.rx * M[0] + cam.ry * M[3] + cam.rz * M[6], a01 = cam.rx * M[1] + cam.ry * M[4] + cam.rz * M[7], a02 = cam.rx * M[2] + cam.ry * M[5] + cam.rz * M[8], a03 = cam.rx * tx0 + cam.ry * ty0 + cam.rz * tz0;
  const a10 = cam.ux * M[0] + cam.uy * M[3] + cam.uz * M[6], a11 = cam.ux * M[1] + cam.uy * M[4] + cam.uz * M[7], a12 = cam.ux * M[2] + cam.uy * M[5] + cam.uz * M[8], a13 = cam.ux * tx0 + cam.uy * ty0 + cam.uz * tz0;
  const a20 = cam.fx * M[0] + cam.fy * M[3] + cam.fz * M[6], a21 = cam.fx * M[1] + cam.fy * M[4] + cam.fz * M[7], a22 = cam.fx * M[2] + cam.fy * M[5] + cam.fz * M[8], a23 = cam.fx * tx0 + cam.fy * ty0 + cam.fz * tz0;
  /* the sun in the object's own space, and which way is up in it */
  const s1 = 1 / sc, lx = env.sx, ly = env.sy, lz = env.sz;
  const Lx = (M[0] * lx + M[3] * ly + M[6] * lz) * s1, Ly = (M[1] * lx + M[4] * ly + M[7] * lz) * s1, Lz = (M[2] * lx + M[5] * ly + M[8] * lz) * s1;
  const Ux = M[3] * s1, Uy = M[4] * s1, Uz = M[5] * s1;
  const ambLo = env.ambLow, ambSpan = env.ambHigh - env.ambLow, sun = env.sun, fogS = env.fogStart, fogK = 1 / Math.max(1e-6, env.fogEnd - env.fogStart);
  /* the point lights that can reach this object */
  let pl = null;
  if (env.lights.length) {
    for (let i = 0; i < env.lights.length; i++) {
      const q = env.lights[i], dx = q.x - (bwx + cam.x), dy = q.y - (bwy + cam.y), dz = q.z - (bwz + cam.z), rr = q.r + br;
      if (dx * dx + dy * dy + dz * dz < rr * rr) (pl || (pl = [])).push(q);
    }
  }
  const unlit = opt && opt.unlit;
  for (let i = 0; i < nv; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    VX[i] = a00 * x + a01 * y + a02 * z + a03;
    VY[i] = a10 * x + a11 * y + a12 * z + a13;
    const vz = a20 * x + a21 * y + a22 * z + a23;
    VZ[i] = vz;
    let f = (vz - fogS) * fogK; if (f > 1.5) f = 1.5;
    VF[i] = f;
    if (unlit) { VL[i] = 1; continue; }
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    let nl = nx * Lx + ny * Ly + nz * Lz; if (nl < 0) nl = 0;
    let light = ambLo + ambSpan * (0.5 + 0.5 * (nx * Ux + ny * Uy + nz * Uz)) + sun * nl;
    if (pl) {
      const wx = M[0] * x + M[1] * y + M[2] * z + M[9], wy = M[3] * x + M[4] * y + M[5] * z + M[10], wz = M[6] * x + M[7] * y + M[8] * z + M[11];
      const wnx = (M[0] * nx + M[1] * ny + M[2] * nz) * s1, wny = (M[3] * nx + M[4] * ny + M[5] * nz) * s1, wnz = (M[6] * nx + M[7] * ny + M[8] * nz) * s1;
      for (let k = 0; k < pl.length; k++) {
        const q = pl[k], dx = q.x - wx, dy = q.y - wy, dz = q.z - wz, d2 = dx * dx + dy * dy + dz * dz, r2 = q.r * q.r;
        if (d2 >= r2) continue;
        const d = Math.sqrt(d2) || 1e-6, fall = 1 - d / q.r;
        let nd = (wnx * dx + wny * dy + wnz * dz) / d; nd = nd * 0.7 + 0.3; if (nd < 0) nd = 0;
        light += q.i * fall * fall * nd;
      }
    }
    VL[i] = light;
  }

  const U = mesh.uv, I = mesh.idx, Wr = S.W, bias = (opt && opt.bias) || 1;
  for (let gi = 0; gi < mesh.groups.length; gi++) {
    const g = mesh.groups[gi], m = prep(g.mat), tw = m.tw, th = m.th, em = m.emit, t1 = g.start + g.count;
    for (let t = g.start; t < t1; t++) {
      st.tris++;
      const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
      const z0 = VZ[i0], z1 = VZ[i1], z2 = VZ[i2];
      if (z0 > far && z1 > far && z2 > far) continue;
      /* trivial rejects against the four sides (all three corners on the wrong side of one) */
      const x0 = VX[i0], x1 = VX[i1], x2 = VX[i2], y0 = VY[i0], y1 = VY[i1], y2 = VY[i2], tX = S.tanx, tY = S.tany;
      if ((x0 > tX * z0 && x1 > tX * z1 && x2 > tX * z2) || (-x0 > tX * z0 && -x1 > tX * z1 && -x2 > tX * z2) || (y0 > tY * z0 && y1 > tY * z1 && y2 > tY * z2) || (-y0 > tY * z0 && -y1 > tY * z1 && -y2 > tY * z2)) continue;
      const wp = S.wp;
      Wr[wp] = x0; Wr[wp + 1] = y0; Wr[wp + 2] = z0; Wr[wp + 3] = VL[i0] + em; Wr[wp + 4] = VF[i0]; Wr[wp + 5] = U[i0 * 2] * tw + UV_OFF; Wr[wp + 6] = U[i0 * 2 + 1] * th + UV_OFF;
      Wr[wp + 7] = x1; Wr[wp + 8] = y1; Wr[wp + 9] = z1; Wr[wp + 10] = VL[i1] + em; Wr[wp + 11] = VF[i1]; Wr[wp + 12] = U[i1 * 2] * tw + UV_OFF; Wr[wp + 13] = U[i1 * 2 + 1] * th + UV_OFF;
      Wr[wp + 14] = x2; Wr[wp + 15] = y2; Wr[wp + 16] = z2; Wr[wp + 17] = VL[i2] + em; Wr[wp + 18] = VF[i2]; Wr[wp + 19] = U[i2 * 2] * tw + UV_OFF; Wr[wp + 20] = U[i2 * 2 + 1] * th + UV_OFF;
      S.wp = wp + 21;
      tri(S, m, wp, wp + 7, wp + 14, 0, bias * m.bias);
      S.wp = wp;
    }
  }
}

/* one triangle of working corners (camera space): clip, project, maybe split, fill */
function tri(S, m, a, b, c, depth, bias) {
  const W = S.W, near = S.cam.near, za = W[a + 2], zb = W[b + 2], zc = W[c + 2];
  if (za < near || zb < near || zc < near) {
    if (za < near && zb < near && zc < near) return;
    S.stats.clipped++;
    /* Sutherland-Hodgman against z = near on the three corners: up to four come out */
    const ids = [a, b, c], out = [];
    for (let i = 0; i < 3; i++) {
      const p = ids[i], q = ids[(i + 1) % 3], pin = W[p + 2] >= near, qin = W[q + 2] >= near;
      if (pin) out.push(p);
      if (pin !== qin) {
        const t = (near - W[p + 2]) / (W[q + 2] - W[p + 2]), at = S.wp; S.wp += W_STRIDE;
        for (let k = 0; k < W_STRIDE; k++) W[at + k] = W[p + k] + (W[q + k] - W[p + k]) * t;
        W[at + 2] = near;
        out.push(at);
      }
    }
    if (out.length >= 3) { tri(S, m, out[0], out[1], out[2], depth, bias); if (out.length === 4) tri(S, m, out[0], out[2], out[3], depth, bias); }
    return;
  }
  const tv = S.tv, f = S.focal, cx = S.cx, cy = S.cy;
  const ia = 1 / za, ib = 1 / zb, ic = 1 / zc;
  const sx0 = cx + W[a] * ia * f, sy0 = cy - W[a + 1] * ia * f, sx1 = cx + W[b] * ib * f, sy1 = cy - W[b + 1] * ib * f, sx2 = cx + W[c] * ic * f, sy2 = cy - W[c + 1] * ic * f;
  const area = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0);
  if (area > 0 && !m.double) { S.stats.backface++; return; }
  if ((sx0 < S.vx0 && sx1 < S.vx0 && sx2 < S.vx0) || (sx0 >= S.vx1 && sx1 >= S.vx1 && sx2 >= S.vx1) || (sy0 < S.vy0 && sy1 < S.vy0 && sy2 < S.vy0) || (sy0 >= S.vy1 && sy1 >= S.vy1 && sy2 >= S.vy1)) return;
  if (depth < MAX_SUB) {
    const e0 = Math.max(Math.abs(sx1 - sx0), Math.abs(sy1 - sy0)), e1 = Math.max(Math.abs(sx2 - sx1), Math.abs(sy2 - sy1)), e2 = Math.max(Math.abs(sx0 - sx2), Math.abs(sy0 - sy2));
    const edge = Math.max(e0, e1, e2);
    if (edge > SUB_HUGE || (edge > SUB_EDGE && Math.max(za, zb, zc) > SUB_DEEP * Math.min(za, zb, zc))) {
      S.stats.split++;
      const at = S.wp; S.wp += 3 * W_STRIDE;
      for (let k = 0; k < W_STRIDE; k++) { W[at + k] = (W[a + k] + W[b + k]) * 0.5; W[at + W_STRIDE + k] = (W[b + k] + W[c + k]) * 0.5; W[at + 2 * W_STRIDE + k] = (W[c + k] + W[a + k]) * 0.5; }
      const ab = at, bc = at + W_STRIDE, ca = at + 2 * W_STRIDE;
      tri(S, m, a, ab, ca, depth + 1, bias); tri(S, m, ab, b, bc, depth + 1, bias); tri(S, m, ca, bc, c, depth + 1, bias); tri(S, m, ab, bc, ca, depth + 1, bias);
      S.wp = at;
      return;
    }
  }
  /* snap to whole pixels and hand over */
  tv[0] = Math.round(sx0); tv[1] = Math.round(sy0); tv[2] = ia * bias; tv[3] = W[a + 5]; tv[4] = W[a + 6]; tv[5] = W[a + 3]; tv[6] = W[a + 4];
  tv[7] = Math.round(sx1); tv[8] = Math.round(sy1); tv[9] = ib * bias; tv[10] = W[b + 5]; tv[11] = W[b + 6]; tv[12] = W[b + 3]; tv[13] = W[b + 4];
  tv[14] = Math.round(sx2); tv[15] = Math.round(sy2); tv[16] = ic * bias; tv[17] = W[c + 5]; tv[18] = W[c + 6]; tv[19] = W[c + 3]; tv[20] = W[c + 4];
  if (fillTri(S, tv, 0, 7, 14, m)) S.stats.filled++;
}
