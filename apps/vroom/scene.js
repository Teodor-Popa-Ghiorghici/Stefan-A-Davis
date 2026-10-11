/* DRAWING A RACE (docs/vroom/plan.md sections 4 and 9): one view of the track from a camera -- the sky or the ceiling, the light, the fog, the road in its chunks (only those near the camera), the room
   around it, the cars with their shadows. The same function draws the one big view and, later, each half of the split screen. Everything that decides what the picture looks like is here and in the
   track's own data; the game loop only says which view and from where. Pure but for the raster it is given. */
import { COOL, BLUE, ix } from './palette.js';
import { place } from './raster_math.js';
import { drawCar } from './car_art.js';
import { ray } from './col_grid.js';
import { drawPickups } from './pickups_art.js';
import { pressAt } from './press.js';
import { flakes, sparks } from './weather.js';

const ID = place(0, 0, 0);
/* the light a track is seen in: the sun or the room's lamps, the sky, the fog */
export const LIGHT = {
  hall: { sun: { dir: [0.25, 1, 0.35], i: 0.5 }, ambient: [0.62, 0.9], fog: { start: 24, end: 110 }, sky: { ramp: COOL, horizon: 8.5, zenith: 6.5 } },
  night: { sun: { dir: [-0.2, 0.6, 0.5], i: 0.18 }, ambient: [0.2, 0.34], fog: { start: 8, end: 55 }, sky: { ramp: BLUE, horizon: 4, zenith: 1 } },
  day: { sun: { dir: [0.5, 0.8, -0.35], i: 0.75 }, ambient: [0.34, 0.62], fog: { start: 14, end: 85 }, sky: { ramp: COOL, horizon: 13, zenith: 7 } },
  /* a blizzard: the sky and the fog are the same pale grey and the fog closes in at a few metres; HEADLIGHTS double how far it is to the grey */
  blizzard: { sun: { dir: [0.1, 1, 0.1], i: 0.3 }, ambient: [0.55, 0.78], fog: { start: 3, end: 24 }, sky: { ramp: COOL, horizon: 10, zenith: 9 }, snow: 'blizzard', dark: true }
};
LIGHT.night.snow = 'flurry'; LIGHT.night.dark = true;

/* a view: `field` the cars [{ car, model, ghost }], `cam` a camera spec, `range` how far to draw road and room */
export function drawView(R, rect, track, field, cam, o) {
  o = o || {};
  const L = LIGHT[track.def.light] || LIGHT.day, range = o.range || 110, k = o.headlights && L.dark ? 2 : 1;
  /* the player's headlights: the fog is twice as far, and a lamp is lit a few metres ahead of the car */
  const lights = (o.lights || []).slice();
  if (o.headlights && L.dark && o.me) { const c = o.me.car, fx = c.R[2], fz = c.R[8]; lights.push({ x: c.p[0] + fx * 3.2, y: c.p[1] + 0.5, z: c.p[2] + fz * 3.2, r: 9, i: 0.9 }); }
  R.view(rect, cam);
  R.env({ sun: L.sun, ambient: L.ambient, fog: { start: L.fog.start * k, end: L.fog.end * k }, lights });
  R.sky(L.sky);
  const cx = cam.x, cz = cam.z, S = track.line.samples, t = o.t || 0;
  for (let i = 0; i < track.chunks.length; i++) {
    const c = track.chunks[i], mid = S[Math.min(S.length - 1, Math.round((c.s0 + c.s1) / 2 / track.line.step))];
    if (mid && (mid.x - cx) ** 2 + (mid.z - cz) ** 2 > (range + 20) ** 2) continue;
    R.draw(c.mesh, ID);
  }
  const emit = [];
  for (const d of track.decor) {
    const dx = d.x - cx, dz = d.z - cz, r = range + d.r;
    if (dx * dx + dz * dz >= r * r) continue;
    if (d.sparks) { emit.push(...d.sparks); continue; }
    if (d.door != null) { if (o.doors) R.draw(o.doors.target === d.door ? d.mesh : d.dim, d.m); continue; }       /* the doors are LAST MILE's: the one wanted next is lit, the others are dim */
    if (d.star) { if (o.stars && !o.stars.has(d.star.id)) R.draw(d.mesh, place(d.star.x, d.star.y + 0.05 * Math.sin(t * 3), d.star.z, t * 1.6, 0, 0, d.star.k || 1)); continue; }       /* a star is PRACTICE's: it turns and bobs until it is picked up */
    if (d.gate && o.broken && o.broken.has(d.gate)) continue;                                  /* a gate that has been broken is not there */
    if (d.press) { const p = d.press, h = pressAt(p, t).h; R.draw(d.mesh, place(p.x, p.y + h, p.z, p.yaw, 0, 0, 1)); if (h < 0.5 && h > 0.05) emit.push({ x: p.x, y: p.y + 0.1, z: p.z, phase: 0, seed: 3 }); }
    else R.draw(d.mesh, d.m);
  }
  for (const f of field) {
    const p = f.car.p, dx = p[0] - cx, dz = p[2] - cz;
    if (dx * dx + dz * dz > 80 * 80) continue;
    const gd = ray(track.col, p[0], p[1] + 0.02, p[2], 0, -1, 0, 3);
    drawCar(R, f.model, f.car, gd >= 0 ? p[1] + 0.02 - gd : null, { ghost: f.car.ghost > 0 ? f.car.ghost : f.ghostDraw ? ((Math.floor(t * 60) & 1) ? 0.09 : 0) : 0, fuse: f.bomb ? Math.max(0.12, f.bomb.fuse / 6) : undefined });
  }
  if (o.pickups) drawPickups(R, o.pickups.P, field, o.pickups.t, cam);
  if (emit.length) R.points(sparks(emit, t));
  if (L.snow) R.points(flakes(cam, t, L.snow, o.calm));
  if (o.after) o.after(R);
}
void ix;
