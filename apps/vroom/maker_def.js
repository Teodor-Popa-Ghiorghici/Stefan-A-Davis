/* FROM A ROAD OF TILES TO A TRACK (docs/vroom/plan.md section 9): `defOf(road, id)` makes the data the town's own roads are made of (track_def.js), so the road is built, drawn, driven, raced and thought about by the same
   code as theirs and not by a copy of it. Every tile of the ring is a vertex of the route (track_path.js `rounded`): a tile where the road runs straight on is a vertex with no bend, a tile where it turns is a bend of
   BEND metres; every edge is a tile long, so a thing on a tile is placed by *which tile* and *how many metres either side of its middle*, and moves with nothing when another tile is painted. What the modules become:
     JUMP     the standard jump (rise 0.18, a ramp of 0.9, a gap of 1.4) on the middle of a straight tile that has a straight tile before it (a run-up that is a bend is a wall)   BELT     a conveyor, 16 m long, down the middle of the road
     PINCH    two stacks of parcels 1.2 m apart, 6 m of them                                                       COUNTER  a counter with a roof 0.62 m up, 8 m of it, to drive under
     PICKUPS  a cluster of three across the road (a road is given more until it has four, and one for every four tiles of it up to twelve)   KERB     the inside of a corner, 2.5 m either side of the apex, that rolls a tall car
   The line starts on the straight tile that has the longest straight run either side of it (or the tile START was put on), with the grid behind it; nothing else may stand on that tile. Problems come back as
   [{ at: [x, y] or null, text }] for the screen to write and point at; no problem, no throw: `def` is null if there are any. Pure. */
import { rounded } from './track_path.js';
import { loopOf } from './maker_loop.js';
import { TILE, BEND, WIDTH, THEMES, MODULES, cellKey, cleanName } from './maker_trk.js';

const M = 8;                                                    /* the metres either side of a tile's middle a belt or a counter takes */
export function defOf(t, id) {
  const lp = loopOf(t.road), problems = lp.problems.slice();
  if (!lp.ok) return { def: null, problems, info: null };
  const n = lp.order.length, theme = THEMES[t.theme] || THEMES.hall, idx = new Map(lp.order.map((c, i) => [cellKey(c[0], c[1]), i]));
  const straight = lp.turns.map(x => !x);
  if (!straight.some(Boolean)) return { def: null, problems: [{ at: null, text: 'NEEDS A STRAIGHT TILE FOR THE START LINE' }], info: null };
  /* the start: the tile chosen, or the straight tile with the most straight tiles in a row around it */
  let start = t.start != null && idx.has(t.start) ? idx.get(t.start) : -1;
  if (start >= 0 && !straight[start]) { problems.push({ at: lp.order[start], text: 'THE START LINE NEEDS A STRAIGHT TILE' }); start = -1; }
  if (start < 0) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (!straight[i]) continue;
      let a = 0, b = 0; while (a < n && straight[(i - a - 1 + 2 * n) % n]) a++; while (b < n && straight[(i + b + 1) % n]) b++;
      if (a + b > best) { best = a + b; start = i; }
    }
  }
  for (const k of Object.keys(t.mods)) {
    const i = idx.get(k), m = MODULES[t.mods[k]];
    if (i == null || !m) continue;
    const c = lp.order[i];
    if (m.on === 'straight' && !straight[i]) problems.push({ at: c, text: m.name + ' NEEDS A STRAIGHT TILE' });
    else if (t.mods[k] === 'jump' && !straight[(i + n - 1) % n]) problems.push({ at: c, text: 'A JUMP NEEDS A RUN-UP: A STRAIGHT TILE BEFORE IT (SEE THE ARROWS)' });
    else if (m.on === 'corner' && straight[i]) problems.push({ at: c, text: m.name + ' NEEDS A CORNER' });
    else if (i === start) problems.push({ at: c, text: 'THE START LINE IS HERE: NOTHING ELSE MAY BE' });
  }
  if (problems.length) return { def: null, problems, info: null };
  const verts = lp.order.map((c, i) => ({ x: c[0] * TILE, z: (-c[1]) * TILE, r: straight[i] ? 0 : BEND, w: WIDTH, floor: theme.floor, wall: theme.wall }));
  const R = rounded(verts, { step: 2.5, merge: true }), L = i => R.edges[((i % n) + n) % n].length, prev = i => (i + n - 1) % n;
  /* a place `m` metres from the middle of tile i, along the road (negative: before it), as a control-point unit */
  const uAt = (i, m) => (m >= 0 ? R.u(i, Math.min(1, m / L(i))) : R.u(prev(i), Math.max(0, 1 + m / L(prev(i)))));
  const features = [];
  let pickups = 0;
  lp.order.forEach((c, i) => {
    const mod = t.mods[cellKey(c[0], c[1])];
    if (!mod) return;
    if (mod === 'jump') features.push({ type: 'jump', u: uAt(i, 0), rise: 0.18, run: 0.9, gap: 1.4 });
    else if (mod === 'belt') features.push({ type: 'belt', u0: uAt(i, -M), u1: uAt(i, M), lane: [-0.65, 0.65], speed: 1.8, rise: 0.04 });
    else if (mod === 'pinch') features.push({ type: 'pinch', u0: uAt(i, -3), u1: uAt(i, 3), gap: 1.2 });
    else if (mod === 'counter') features.push({ type: 'counter', u0: uAt(i, -M / 2), u1: uAt(i, M / 2), h: 0.62 });
    else if (mod === 'pickups') { features.push({ type: 'pickups', u: uAt(i, 0) }); pickups++; }
    else if (mod === 'kerb') features.push({ type: 'kerb', u0: R.u(prev(i), 1) - 0.8, u1: R.u(i, 0) + 0.8, side: 'inner', h: 0.035 });
  });
  /* a road has at least four clusters of pickups and at most twelve, `n / 4` of them if it is long: the ones put on it, and then more, each on the free straight tile furthest from the clusters there already */
  const want = Math.max(4, Math.min(12, Math.floor(n / 4))), cl = lp.order.map((c, i) => (t.mods[cellKey(c[0], c[1])] === 'pickups' ? i : -1)).filter(i => i >= 0);
  while (cl.length < want) {
    let best = -1, bd = 0;
    for (let i = 0; i < n; i++) {
      if (!straight[i] || i === start || cl.includes(i) || t.mods[cellKey(lp.order[i][0], lp.order[i][1])]) continue;
      const d = cl.length ? Math.min(...cl.map(j => Math.min(Math.abs(i - j), n - Math.abs(i - j)))) : n;
      if (d > bd) { bd = d; best = i; }
    }
    if (best < 0) break;
    cl.push(best); features.push({ type: 'pickups', u: uAt(best, 0) });
  }
  pickups = cl.length;
  if (pickups < 4) return { def: null, problems: [{ at: null, text: 'ROOM FOR FOUR PICKUPS: A LONGER ROAD, OR A MODULE OFF' }], info: null };
  const def = {
    id: id || 'user:road', name: cleanName(t.name) || 'MY ROAD', laps: t.laps, rating: 0, light: theme.light, controls: R.controls, edges: R.edges, features,
    start: { u: uAt(start, 0), rows: 4, gap: 1.5, side: 0.55 }, user: true
  };
  if (theme.dress) def.dress = theme.dress;
  const info = { cells: n, straights: straight.filter(Boolean).length, corners: straight.filter(x => !x).length, length: R.edges.reduce((a, e) => a + e.length, 0) + straight.filter(x => !x).length * (Math.PI / 2 * BEND), start: lp.order[start], pickups };
  return { def, problems: [], info };
}
