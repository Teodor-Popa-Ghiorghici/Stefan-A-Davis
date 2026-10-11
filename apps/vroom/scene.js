/* DRAWING A RACE (docs/vroom/plan.md sections 4 and 9): one view of the track from a camera -- the sky or the ceiling, the light, the fog, the road in its chunks (only those near the camera), the room
   around it, the cars with their shadows. The same function draws the one big view and, later, each half of the split screen. Everything that decides what the picture looks like is here and in the
   track's own data; the game loop only says which view and from where. Pure but for the raster it is given. */
import { COOL, BLUE, ix } from './palette.js';
import { place } from './raster_math.js';
import { drawCar } from './car_art.js';
import { ray } from './col_grid.js';

const ID = place(0, 0, 0);
/* the light a track is seen in: the sun or the room's lamps, the sky, the fog */
export const LIGHT = {
  hall: { sun: { dir: [0.25, 1, 0.35], i: 0.5 }, ambient: [0.62, 0.9], fog: { start: 24, end: 110 }, sky: { ramp: COOL, horizon: 8.5, zenith: 6.5 } },
  night: { sun: { dir: [-0.2, 0.6, 0.5], i: 0.18 }, ambient: [0.2, 0.34], fog: { start: 8, end: 55 }, sky: { ramp: BLUE, horizon: 4, zenith: 1 } },
  day: { sun: { dir: [0.5, 0.8, -0.35], i: 0.75 }, ambient: [0.34, 0.62], fog: { start: 14, end: 85 }, sky: { ramp: COOL, horizon: 13, zenith: 7 } }
};

/* a view: `field` the cars [{ car, model, ghost }], `cam` a camera spec, `range` how far to draw road and room */
export function drawView(R, rect, track, field, cam, o) {
  o = o || {};
  const L = LIGHT[track.def.light] || LIGHT.day, range = o.range || 110;
  R.view(rect, cam);
  R.env({ sun: L.sun, ambient: L.ambient, fog: L.fog, lights: o.lights || [] });
  R.sky(L.sky);
  const cx = cam.x, cz = cam.z, S = track.line.samples;
  for (let i = 0; i < track.chunks.length; i++) {
    const c = track.chunks[i], mid = S[Math.min(S.length - 1, Math.round((c.s0 + c.s1) / 2 / track.line.step))];
    if (mid && (mid.x - cx) ** 2 + (mid.z - cz) ** 2 > (range + 20) ** 2) continue;
    R.draw(c.mesh, ID);
  }
  for (const d of track.decor) { const dx = d.x - cx, dz = d.z - cz, r = range + d.r; if (dx * dx + dz * dz < r * r) R.draw(d.mesh, d.m); }
  for (const f of field) {
    const p = f.car.p, dx = p[0] - cx, dz = p[2] - cz;
    if (dx * dx + dz * dz > 80 * 80) continue;
    const t = ray(track.col, p[0], p[1] + 0.02, p[2], 0, -1, 0, 3);
    drawCar(R, f.model, f.car, t >= 0 ? p[1] + 0.02 - t : null, { ghost: f.car.ghost > 0 ? f.car.ghost : 0, fuse: f.fuse });
  }
  if (o.after) o.after(R);
}
void ix;
