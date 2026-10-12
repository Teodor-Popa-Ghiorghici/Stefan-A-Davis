/* THE RENDERER, the part the game talks to. A software rasterizer in plain JS that draws 320 x 180 palette indices (palette.js, VGA128) into one byte buffer and turns them into pixels in one pass
   (`present`). No WebGL, no library, no window: Node runs all of it, which is how raster_check.js can hold the palette, determinism and the milliseconds a frame.
   The PlayStation look is what the method gives for nothing: affine textures (cut up when a big triangle would smear them), corners snapped to whole pixels, light per vertex, a 4 x 4 Bayer dither
   between neighbouring steps of a ramp, and fog that is a band of the picture turned to the fog colour (raster_xform.js, raster_tri.js, raster_shade.js).
     const R = createRaster();               const cam = R.view({ x: 0, y: 0, w: 320, h: 180 }, { x, y, z, yaw, pitch, roll, fov });
     R.env({ sun: { dir: [..], i: 0.7 }, ambient: [0.35, 0.55], fog: { start: 8, end: 60, idx }, lights: [] });
     R.sky({ ramp, horizon: 12, zenith: 7 });   R.draw(mesh, place(...));   R.points(...);   R.present(imageData);
   A second view in the same buffer (the split screen) is another `view` call with a smaller rectangle: nothing is shared but the buffer. */
import { newState, setView, drawMesh } from './raster_xform.js';
import { camera } from './raster_math.js';
import { PAL32, ix, SIZE, CLEAR } from './palette.js';
import { BAYER, BAYER_RANK } from './raster_shade.js';
import { F3, F5, drawText } from '../pixtext.js';

export const W = 320, H = 180;

export function createRaster(w, h) {
  w = w || W; h = h || H;
  const S = newState(w, h);
  S.env = { sx: 0, sy: 1, sz: 0, sun: 0.6, ambLow: 0.3, ambHigh: 0.5, fogStart: 10, fogEnd: 60, lights: [] };
  const R = {
    w, h, buf: S.buf, zbuf: S.zbuf, stats: S.stats, state: S,
    /* choose where to draw and from where; returns the camera. Anything outside the rectangle is left alone. */
    view(rect, spec) {
      const r = rect || { x: 0, y: 0, w, h };
      const cam = camera(spec, r.w, r.h);
      setView(S, r, cam);
      return cam;
    },
    /* the world's light: a sun (direction it shines FROM, so pointing up for noon), a sky above and a bounce from the snow below, the fog and any point lights {x,y,z,r,i} */
    env(e) {
      const E = S.env;
      if (e.sun) {
        const d = e.sun.dir, l = Math.hypot(d[0], d[1], d[2]) || 1;
        E.sx = d[0] / l; E.sy = d[1] / l; E.sz = d[2] / l; E.sun = e.sun.i;
      }
      if (e.ambient) { E.ambLow = e.ambient[0]; E.ambHigh = e.ambient[1]; }
      if (e.fog) { E.fogStart = e.fog.start; E.fogEnd = e.fog.end; if (e.fog.idx != null) S.fogIdx = e.fog.idx; }
      if (e.lights) E.lights = e.lights;
    },
    /* clear the view's depth and fill it with sky: a ramp, light at the horizon and darker (or lighter) overhead, dithered; below the horizon it is the horizon's colour (the ground covers it) */
    sky(o) {
      const cam = S.cam, ramp = o.ramp, hz = o.horizon, zn = o.zenith, span = o.span || S.focal * (o.spanK || 1.4), bands = o.bands, nb = bands ? bands.length - 1 : 0;
      const yH = S.cy + S.focal * Math.tan(Math.asin(Math.max(-1, Math.min(1, cam.fy))));       /* the horizon's row, from where the camera looks (roll is not followed) */
      for (let y = S.vy0; y < S.vy1; y++) {
        let t = (yH - y) / span; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const lv = hz + (zn - hz) * t, base = ramp * 16, row = (y & 3) << 2;
        if (bands) {
          /* a sky of several colours one above another, from the horizon up (each `[ramp, level]`, or `[ramp, level, ramp2, level2]` for a checker of two colours: blue and cyan side by side are sky blue): a pixel takes the band above its row's place between two with the Bayer dither, so the blend is stippled and never leaves the palette */
          const q = t * nb, k = Math.min(nb - 1, q | 0), f = q - k;
          for (let x = S.vx0; x < S.vx1; x++) { const b = bands[f > (BAYER_RANK[row | (x & 3)] + 0.5) / 16 ? k + 1 : k], p = y * w + x; S.buf[p] = b.length > 2 && ((x + y) & 1) ? b[2] * 16 + b[3] : b[0] * 16 + b[1]; S.zbuf[p] = 0; }
          continue;
        }
        for (let x = S.vx0; x < S.vx1; x++) {
          let s = lv + BAYER[row | (x & 3)]; if (s < 0) s = 0;
          let l = s | 0; if (l > 15) l = 15;
          const p = y * w + x; S.buf[p] = base + l; S.zbuf[p] = 0;
        }
      }
      S.fogIdx = bands ? bands[0][0] * 16 + bands[0][1] : ix(ramp, hz);
    },
    /* a PANORAMA behind the world: a strip p = { w, h, d } of palette bytes (CLEAR is the sky showing through) laid round the whole horizon, so it turns as the camera does and is as far off as the sky is. Its
       bottom row stands `drop` rows under the horizon (the ground and the walls cover that). One pixel of it is one pixel of the picture, so a mountain or a skyline costs a few hundred stores and no triangles. */
    panorama(p, o) {
      const cam = S.cam, drop = (o && o.drop) || 0, yH = Math.round(S.cy + S.focal * Math.tan(Math.asin(Math.max(-1, Math.min(1, cam.fy))))) + drop, yaw = Math.atan2(cam.fx, cam.fz), ph = p.h;
      const y0 = Math.max(S.vy0, yH - ph + 1), y1 = Math.min(S.vy1 - 1, yH); if (y1 < y0) return;
      for (let x = S.vx0; x < S.vx1; x++) {
        const a = (yaw + Math.atan((x + 0.5 - S.cx) / S.focal)) / (Math.PI * 2), col = Math.floor((a - Math.floor(a)) * p.w) % p.w;
        for (let y = y0; y <= y1; y++) { const v = p.d[(y - (yH - ph + 1)) * p.w + col]; if (v !== CLEAR) { const q = y * w + x; S.buf[q] = v; S.zbuf[q] = 0; } }
      }
    },
    draw(mesh, M, opt) { drawMesh(S, mesh, M, opt); },
    /* points in the world: snowflakes, sparks. [{ x, y, z, c, s }] c a palette index, s a size in pixels (1 or 2) */
    points(list, n) {
      const cam = S.cam, N = n == null ? list.length : n;
      for (let i = 0; i < N; i++) {
        const q = list[i], dx = q.x - cam.x, dy = q.y - cam.y, dz = q.z - cam.z;
        const vz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
        if (vz < cam.near || vz > cam.far) continue;
        const iz = 1 / vz, sx = Math.round(S.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * iz * S.focal), sy = Math.round(S.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * iz * S.focal), sz = q.s || 1;
        for (let j = 0; j < sz; j++) for (let k = 0; k < sz; k++) {
          const px = sx + k, py = sy + j;
          if (px < S.vx0 || px >= S.vx1 || py < S.vy0 || py >= S.vy1) continue;
          const p = py * w + px;
          if (iz > S.zbuf[p]) S.buf[p] = q.c;
        }
      }
    },
    /* ---- the picture, flat: the HUD and the menus. These ignore depth and the view's rectangle (the buffer's edge only). ---- */
    rect(x, y, rw, rh, c) {
      const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(w, (x + rw) | 0), y1 = Math.min(h, (y + rh) | 0);
      for (let yy = y0; yy < y1; yy++) S.buf.fill(c, yy * w + x0, yy * w + x1);
    },
    /* pixel type (apps/pixtext.js) with an outline so it reads over a picture: the machine's rule for text on a canvas */
    text(str, cx, top, fg, o) {
      o = o || {};
      const font = o.big ? F5 : F3, out = o.outline == null ? ix(0, 0) : o.outline;
      const put = (x, y, rw, rh, c) => R.rect(x, y, rw, rh, c);
      if (out >= 0) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) drawText((x, y, rw, rh, c) => put(x + dx, y + dy, rw, rh, c), str, cx, top, out, font, o);
      return drawText(put, str, cx, top, fg, font, o);
    },
    /* the palette bytes as pixels, into a canvas's ImageData (or anything with a .data of 4 x w x h bytes) */
    present(img) {
      const out = new Uint32Array(img.data.buffer, img.data.byteOffset, w * h), b = S.buf;
      for (let i = 0; i < out.length; i++) out[i] = PAL32[b[i]];
    },
    /* the bytes of the picture, copied (for a hash or a screenshot) */
    snapshot() { return S.buf.slice(); },
    resetStats() { const s = S.stats; s.instances = s.culled = s.tris = s.backface = s.clipped = s.split = s.filled = 0; }
  };
  void SIZE;
  return R;
}
