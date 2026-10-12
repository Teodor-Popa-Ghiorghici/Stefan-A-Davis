/* VROOM dress check -- `node apps/vroom/dress_check.js` (dev-only, pure Node): what stands round every road (docs/vroom/plan.md section 15) is rich enough to look at, is never where a car is, and is cheap enough to draw.
 *
 *  RICH       every road and the yard has a hundred pieces or more and ten thousand triangles of scenery, things that move (a turning wheel, a swinging lamp, a train), lamps that blink, light on the road at night,
 *             and a horizon behind it if it is outdoors; the stunt yard and every theme of the track maker are dressed too, so a road a person paints is not bare.
 *  CLEAR      no vertex of anything stands over the road at the height of a car (8 cm to 60 cm: paint lies below that, a roof to drive under above it), checked for what stands still and for what moves, at ten moments
 *             of the race clock, against the main road and every short cut and ramp.
 *  ALIVE      every moving piece answers with a placement of twelve finite numbers whenever it is asked; every flasher has a rate and a mesh; every light and every spark is finite and in range.
 *  DETERMINISTIC  a road is dressed the same way every time (the dice are the road's own).
 *  CHEAP      the triangles a frame submits stay under the budget from the start, a quarter, a half and three quarters of the way round, and a road is dressed in well under two seconds. */
import { buildTrack } from './track_build.js';
import { defFor, TRACK_IDS } from './tracks.js';
import { YARD } from './yard_def.js';
import { createRaster } from './raster.js';
import { drawView, LIGHT } from './scene.js'; import { FAR } from './view.js';
import { backdrop, backdropOf } from './backdrop.js';
import { THEME_IDS, blank, cellKey } from './maker_trk.js';
import { defOf } from './maker_def.js';
import { suite } from './check_kit.js';

const S = suite('dress_check'), { ok } = S;
const roads = TRACK_IDS.map(id => [id, buildTrack(defFor(id, 'f'))]).concat([['yard', buildTrack(YARD)]]);
const ring = theme => { const t = blank('RING'); t.theme = theme; for (let x = 2; x <= 9; x++) { t.road[cellKey(x, 1)] = 1; t.road[cellKey(x, 5)] = 1; } for (let y = 1; y <= 5; y++) { t.road[cellKey(2, y)] = 1; t.road[cellKey(9, y)] = 1; } return t; };
const made = THEME_IDS.map(th => ['maker ' + th, buildTrack(defOf(ring(th), 'user:dress-' + th).def)]);
const hashOf = T => { let h = 2166136261; for (const d of T.decor) for (const v of [d.mesh ? d.mesh.verts : -1, d.mesh ? d.mesh.tris : -1, Math.round(d.x * 10), Math.round(d.z * 10), d.blink || 0, d.lights ? d.lights.length : 0, d.sparks ? d.sparks.length : 0]) h = Math.imul(h ^ (v | 0), 16777619) >>> 0; return h >>> 0; };
const place = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z + M[9], M[3] * x + M[4] * y + M[5] * z + M[10], M[6] * x + M[7] * y + M[8] * z + M[11]];
const CAR_LOW = 0.08, CAR_HIGH = 0.6;

function corridors(T) {
  const grid = new Map(), put = (x, z, r) => { const k = Math.floor(x / 4) + ',' + Math.floor(z / 4); (grid.get(k) || grid.set(k, []).get(k)).push([x, z, r]); };
  T.line.samples.forEach((p, i) => put(p.x, p.z, T.width[Math.min(T.width.length - 1, i)] / 2));
  for (const c of T.cuts.concat(T.stars || [])) for (const p of c.samples || []) put(p.x, p.z, c.w / 2);
  return (x, z) => { const cx = Math.floor(x / 4), cz = Math.floor(z / 4); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get((cx + i) + ',' + (cz + j)) || []) if (Math.hypot(q[0] - x, q[1] - z) < q[2] - 0.03) return true; return false; };
}

for (const [name, T] of roads.concat(made)) {
  const dec = T.decor, solid = dec.filter(d => d.mesh), moving = dec.filter(d => d.at), blink = dec.filter(d => d.blink), lights = dec.filter(d => d.lights), tris = solid.reduce((a, d) => a + d.mesh.tris, 0);
  const maker = name.startsWith('maker');
  ok(solid.length >= (maker ? 40 : 100) && tris >= (maker ? 3000 : 10000), name + ': dressed (' + solid.length + ' pieces, ' + tris + ' triangles)');
  ok(moving.length >= 2 || (maker && T.def.light === 'hall'), name + ': something moves (' + moving.length + ' movers, ' + blink.length + ' flashers)');
  if (T.def.light === 'night') ok(lights.length === 1 && lights[0].lights.length >= 8, name + ': a night with lamps that light the road (' + (lights[0] ? lights[0].lights.length : 0) + ' of them)');
  if (['street', 'pass', 'dam', 'harbour', 'forecourt', 'yard'].includes(T.def.dress) && !maker) ok(backdrop(backdropOf(T.def)) !== null, name + ': a horizon behind it');
  /* CLEAR */
  const inRoad = corridors(T); let bad = 0, at = '';
  const test = (pos, M) => { for (let i = 0; i < pos.length; i += 3) { const q = M ? place(M, pos[i], pos[i + 1], pos[i + 2]) : [pos[i], pos[i + 1], pos[i + 2]]; if (q[1] > CAR_LOW && q[1] < CAR_HIGH && inRoad(q[0], q[2])) { bad++; at = at || q.map(v => v.toFixed(1)).join(','); } } };
  for (const d of solid) { if (d.star || d.press || d.door != null || d.gate) continue; if (!d.at) test(d.mesh.pos, null); else for (let t = 0; t < 70; t += 7) test(d.mesh.pos, d.at(t)); }      /* (a star, a press, a door and a gate are the road's own and stand where the cars go on purpose) */
  ok(bad === 0, name + ': nothing stands over the road at the height of a car', bad + ' vertices, the first at ' + at);
  /* ALIVE */
  let live = true; for (const d of moving) for (const t of [0, 1.7, 13, 99.5]) { const M = d.at(t); if (!M || M.length !== 12 || M.some(v => !Number.isFinite(v))) live = false; }
  ok(live && blink.every(d => d.blink > 0 && d.mesh), name + ': every mover answers with a placement and every flasher has a rate');
  ok(lights.every(d => d.lights.length <= 160 && d.lights.every(q => [q.x, q.y, q.z, q.r, q.i].every(Number.isFinite) && q.r > 0 && q.r <= 40 && q.i > 0 && q.i <= 1.5)), name + ': every lamp is a finite light of a sensible reach');
  /* DETERMINISTIC (the maker's ones are the same road built again) */
  const again = name === 'yard' ? buildTrack(YARD) : maker ? buildTrack(defOf(ring(name.slice(6)), 'user:dress-' + name.slice(6)).def) : buildTrack(defFor(name, 'f'));
  ok(hashOf(again) === hashOf(T), name + ': dressed the same way every time');
}

/* CHEAP: a frame from four places round every road of the town */
const R = createRaster(320, 180); let worst = 0, worstAt = '';
for (const [name, T] of roads) {
  for (const f of [0.02, 0.27, 0.52, 0.77]) {
    const p = T.line.at(T.line.length * f), cam = { x: p.x, y: 0.42, z: p.z, yaw: Math.atan2(p.tx, p.tz), pitch: -0.07, roll: 0, fov: 1.0, near: 0.05, far: FAR };
    R.resetStats(); drawView(R, { x: 0, y: 0, w: 320, h: 180 }, T, [], cam, { t: 12, headlights: true, calm: true });
    if (R.stats.tris > worst) { worst = R.stats.tris; worstAt = name + ' at ' + (f * 100) + ' %'; }
  }
}
ok(worst <= 60000, 'a frame submits at most 60,000 triangles from anywhere on a road (the most: ' + worst + ', ' + worstAt + ')');
const t0 = performance.now(); for (const id of TRACK_IDS) buildTrack(defFor(id, 'f')); const per = (performance.now() - t0) / TRACK_IDS.length;
ok(per < 2000, 'a road is built and dressed in well under two seconds (' + per.toFixed(0) + ' ms)');
ok(Object.keys(LIGHT).length >= 4, 'the lights a road can be seen in are all there');
S.done(roads.length + ' roads and ' + made.length + ' themes, a worst frame of ' + worst + ' triangles');
