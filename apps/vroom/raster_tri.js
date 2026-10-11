/* THE TRIANGLE FILLER, the inner loop of the renderer. It is handed a triangle already on the screen -- corners on whole pixels (the PS1's vertex snapping) -- with, at each corner, 1/depth, a texel
   position (affine: it is walked in a straight line across the screen, which is the wobble), a light and a fog value. Everything that changes across the triangle is a plane, so the setup is one
   division and the rows are additions; there is no per-pixel division anywhere. A pixel is: a depth test, a texel (CLEAR is a hole), the light moving it along its ramp with the Bayer pattern choosing
   between two steps, and the fog turning a band of pixels to the fog colour with the same pattern (raster_shade.js is this arithmetic written out once, and raster_check.js holds the two together).
   `tv` is a Float64Array of corners, 7 numbers each: sx, sy, iz, u, v, light, fog. `m` is a material prepared by the renderer: { d, ws, wm, hm, darken, steps, double }. Returns 1 if anything was
   covered. No allocation, no calls in the pixel loop. */
import { BAYER, BAYER_RANK, LIGHT_STEPS } from './raster_shade.js';

export const STRIDE = 7;
const BAY = BAYER, RANK = BAYER_RANK, LS = LIGHT_STEPS;

export function fillTri(S, tv, a, b, c, m) {
  const x0 = tv[a], y0 = tv[a + 1], x1 = tv[b], y1 = tv[b + 1], x2 = tv[c], y2 = tv[c + 1];
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (area === 0) return 0;
  if (area > 0 && !m.double) return 0;                       /* a back face: the front runs counter-clockwise, which is a negative area with y down */
  const inv = 1 / area;
  /* the planes: value at the pixel centre (px, py) = k + gx * px + gy * py */
  const iz0 = tv[a + 2], iz1 = tv[b + 2], iz2 = tv[c + 2];
  const gzx = ((iz1 - iz0) * (y2 - y0) - (iz2 - iz0) * (y1 - y0)) * inv, gzy = ((iz2 - iz0) * (x1 - x0) - (iz1 - iz0) * (x2 - x0)) * inv;
  const kz = iz0 - gzx * x0 - gzy * y0;
  const u0 = tv[a + 3], u1 = tv[b + 3], u2 = tv[c + 3];
  const gux = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) * inv, guy = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) * inv;
  const ku = u0 - gux * x0 - guy * y0;
  const v0 = tv[a + 4], v1 = tv[b + 4], v2 = tv[c + 4];
  const gvx = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) * inv, gvy = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) * inv;
  const kv = v0 - gvx * x0 - gvy * y0;
  const l0 = tv[a + 5], l1 = tv[b + 5], l2 = tv[c + 5];
  const glx = ((l1 - l0) * (y2 - y0) - (l2 - l0) * (y1 - y0)) * inv, gly = ((l2 - l0) * (x1 - x0) - (l1 - l0) * (x2 - x0)) * inv;
  const kl = l0 - glx * x0 - gly * y0;
  const f0 = tv[a + 6], f1 = tv[b + 6], f2 = tv[c + 6];
  const gfx = ((f1 - f0) * (y2 - y0) - (f2 - f0) * (y1 - y0)) * inv, gfy = ((f2 - f0) * (x1 - x0) - (f1 - f0) * (x2 - x0)) * inv;
  const kf = f0 - gfx * x0 - gfy * y0;

  /* sort the corners top to bottom for the edges */
  let ax = x0, ay = y0, bx = x1, by = y1, cx = x2, cy = y2, t;
  if (by < ay) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
  if (cy < ay) { t = ax; ax = cx; cx = t; t = ay; ay = cy; cy = t; }
  if (cy < by) { t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; }
  const vy0 = S.vy0, vy1 = S.vy1, vx0 = S.vx0, vx1 = S.vx1;
  let ys = ay, ye = cy;
  if (ys < vy0) ys = vy0;
  if (ye > vy1) ye = vy1;
  if (ys >= ye) return 0;
  const longS = (cx - ax) / (cy - ay), topS = by > ay ? (bx - ax) / (by - ay) : 0, botS = cy > by ? (cx - bx) / (cy - by) : 0;

  const Z = S.zbuf, B = S.buf, W = S.w, d = m.d, ws = m.ws, wm = m.wm, hm = m.hm, fogIdx = S.fogIdx, steps = m.steps;
  const darken = m.darken;
  let any = 0;
  for (let y = ys; y < ye; y++) {
    const py = y + 0.5;
    const xl = ax + (py - ay) * longS;
    const xs2 = py < by ? ax + (py - ay) * topS : bx + (py - by) * botS;
    let xa, xb;
    if (xl < xs2) { xa = xl; xb = xs2; } else { xa = xs2; xb = xl; }
    let xs = Math.ceil(xa - 0.5), xe = Math.ceil(xb - 0.5);
    if (xs < vx0) xs = vx0;
    if (xe > vx1) xe = vx1;
    if (xs >= xe) continue;
    any = 1;
    const px = xs + 0.5;
    let iz = kz + gzx * px + gzy * py, u = ku + gux * px + guy * py, v = kv + gvx * px + gvy * py, l = kl + glx * px + gly * py, f = kf + gfx * px + gfy * py;
    const row = (y & 3) << 2;
    let p = y * W + xs;
    if (!darken) {
      for (let x = xs; x < xe; x++, p++) {
        if (iz > Z[p]) {
          const tx = d[(((v | 0) & hm) << ws) | ((u | 0) & wm)];
          if (tx !== 255) {
            Z[p] = iz;
            let s = (tx & 15) + (l - 1) * LS + BAY[row | (x & 3)];
            if (s < 0) s = 0;
            let lv = s | 0;
            if (lv > 15) lv = 15;
            let col = (tx & 112) | lv;
            if (f > 0 && RANK[row | (x & 3)] < ((f * 8) | 0) * 2) col = fogIdx;
            B[p] = col;
          }
        }
        iz += gzx; u += gux; v += gvx; l += glx; f += gfx;
      }
    } else {
      /* a shadow: on or in front of what is drawn, it takes `l * steps` steps off the pixel's own ramp; it writes no depth */
      for (let x = xs; x < xe; x++, p++) {
        if (iz >= Z[p]) {
          const c0 = B[p];
          let s = (c0 & 15) - l * steps + BAY[row | (x & 3)];
          if (s < 0) s = 0;
          B[p] = (c0 & 112) | (s | 0);
        }
        iz += gzx; l += glx;
      }
    }
  }
  return any;
}
