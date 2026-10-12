/* STUNT YARD CHECK (dev-only, not packaged): the yard is a place a car can be driven in, and its twenty stars are all there to be had.
     the ground:   the ring closes, the grid is on it, the infield is flat ground under every point that is not a piece, nothing stands on another piece, every piece and every star is inside the bank, every star is hung clear
                   of the ground and of the pieces, and every place a car is put back is clear;
     the pieces:   a ramp climbs as far as it says, a trough is as deep as it says, the bowl is closed round and open at its gate;
     the stars:    each is reached by the ways of yard_check_ways.js, driven from a standstill by every car of the roster; every one by at least one car, a few by every car, a few by none of the slowest, and the best car
                   gets most of them. THE CAT is for all twenty, so each must be possible;
     the run:      a yard run has a car on the ground, no rivals and no pickups, remembers the stars the career has, and a star driven through is one event.   node apps/vroom/yard_check.js */
import { suite } from './check_kit.js';
import { YARD, STARS, PIECES, INFIELD } from './yard_def.js';
import { buildTrack } from './track_build.js';
import { yardTrack, createYard } from './yard.js';
import { runRecipe } from './yard_check_kit.js';
import { WAYS, STAR_WAYS } from './yard_check_ways.js';
import { CAR_IDS, CARS, specOf } from './cars.js';
import { fresh } from './career.js';
import { ray } from './col_grid.js';
import { createRaster } from './raster.js';
import { drawView } from './scene.js'; import { FAR } from './view.js';

const S = suite('yard_check'), { ok } = S;
const T = yardTrack();

/* the ground */
ok(T.stars.length === 20 && new Set(T.stars.map(s => s.id)).size === 20 && T.stars.every((s, i) => s.id === i), 'twenty stars, numbered 0 to 19 in order (' + T.stars.length + ')');
ok(buildTrack(YARD).tris === T.tris && T.tris > 2500 && T.tris < 20000, 'the yard is the same every time it is built, and a sensible size (' + T.tris + ' triangles)');
{
  const sm = T.line.samples, last = sm[sm.length - 1], first = sm[0];
  ok(Math.hypot(last.x - first.x, last.z - first.z) < T.line.step * 1.6, 'the ring closes on itself');
  let off = 0; T.grid.slice(0, 16).forEach(g => { const k = T.line.nearest(g.x, g.z), q = sm[k], lat = (g.x - q.x) * q.nx + (g.z - q.z) * q.nz; if (Math.abs(lat) > T.width[k] / 2 - 0.2) off++; });
  ok(T.grid.length >= 16 && off === 0, 'the grid has its places, all on the ring');
}
const inside = (x, z, m) => x > INFIELD.x0 + (m || 0) && x < INFIELD.x1 - (m || 0) && z > INFIELD.z0 + (m || 0) && z < INFIELD.z1 - (m || 0);
ok(STARS.every(s => inside(s.x, s.z, 0.5)), 'every star is inside the infield');
{
  const bad = [];
  for (const p of T.yard.pieces) {                                                             /* a piece's footprint, sampled, must be inside the bank */
    for (let x = INFIELD.x0 - 2; x <= INFIELD.x1 + 2; x += 1) for (let z = INFIELD.z0 - 2; z <= INFIELD.z1 + 2; z += 1) if (p.test(x, z, 0) && !inside(x, z, 0.2)) { bad.push(p.name); x = 1e9; break; }
  }
  ok(bad.length === 0, 'every piece stands inside the infield' + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
}
{
  /* two pieces may meet only where they are meant to (a lip and its landing are metres apart, a ramp joins the deck it climbs to) */
  const allowed = new Set(['ROOF RAMP|ROOF', 'ROOF|ROOF RAMP']), P = T.yard.pieces, clash = [];
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    if (allowed.has(P[i].name + '|' + P[j].name)) continue;
    let hit = false;
    for (let x = INFIELD.x0; x <= INFIELD.x1 && !hit; x += 0.5) for (let z = INFIELD.z0; z <= INFIELD.z1; z += 0.5) if (P[i].test(x, z, 0.2) && P[j].test(x, z, 0.2)) { hit = true; break; }
    if (hit) clash.push(P[i].name + ' / ' + P[j].name);
  }
  ok(clash.length === 0, 'no piece stands on another' + (clash.length ? ' (' + clash.join('; ') + ')' : ''));
}
{
  /* the ground is flat where there is no piece, and a star is hung where a car can pass: off the surface under it and with nothing just over it */
  let wrong = 0, probes = 0;
  for (let x = INFIELD.x0 + 1; x < INFIELD.x1; x += 3) for (let z = INFIELD.z0 + 1; z < INFIELD.z1; z += 3) {
    if (!T.yard.free(x, z, 0.5)) continue;
    probes++; const t = ray(T.col, x, 5, z, 0, -1, 0, 10); if (t < 0 || Math.abs(5 - t) > 0.02) wrong++;
  }
  ok(probes > 100 && wrong === 0, 'the infield is flat ground wherever there is no piece (' + probes + ' places looked at, ' + wrong + ' wrong)');
  const low = [];
  for (const st of STARS) { const t = ray(T.col, st.x, st.y, st.z, 0, -1, 0, 10), u = ray(T.col, st.x, st.y, st.z, 0, 1, 0, 0.6); if (t >= 0 && t < 0.1) low.push(st.name + ' (on the ground: ' + t.toFixed(2) + ')'); if (u >= 0) low.push(st.name + ' (under something: ' + u.toFixed(2) + ')'); }
  ok(low.length === 0, 'every star is hung clear of what is under and over it' + (low.length ? ' (' + low.join(', ') + ')' : ''));
  const bad = T.nodes.filter(n => !T.yard.free(n.x, n.z, 1.5) && inside(n.x, n.z, 0));
  ok(T.nodes.filter(n => inside(n.x, n.z, 0)).length >= 20 && bad.length === 0, 'twenty or more places to be put back in the yard, none of them in the way of a piece (' + T.nodes.filter(n => inside(n.x, n.z, 0)).length + ')');
}

/* the pieces: what they say they are, in the collision a car meets */
{
  const heightAt = (x, z) => { const t = ray(T.col, x, 20, z, 0, -1, 0, 30); return t < 0 ? null : 20 - t; };
  const find = n => PIECES.find(p => p.name === n), F = (p, a, l) => ({ x: p.x + a * Math.sin(p.yaw) - l * Math.cos(p.yaw), z: p.z + a * Math.cos(p.yaw) + l * Math.sin(p.yaw) });
  for (const n of ['SKI JUMP', 'GAP JUMP', 'KICKER 4', 'ROOF RAMP']) {
    const p = find(n), top = F(p, p.len - 0.05, 0), foot = F(p, 0.2, 0), h0 = heightAt(foot.x, foot.z), h1 = heightAt(top.x, top.z);
    ok(h0 != null && h1 != null && Math.abs(h1 - p.h) < 0.06 && h0 < 0.15, n + ': climbs from the ground to ' + p.h + ' m (' + (h0 && h0.toFixed(2)) + ' to ' + (h1 && h1.toFixed(2)) + ')');
  }
  const land = find('SKI LANDING'), a = F(land, 0.1, 0), b = F(land, land.len - 0.1, 0);
  ok(Math.abs(heightAt(a.x, a.z) - land.h) < 0.06 && heightAt(b.x, b.z) < 0.15, 'SKI LANDING: comes down from ' + land.h + ' m to the ground');
  const pipe = find('HALF PIPE'), mid = F(pipe, 12, 0), wall = F(pipe, 12, pipe.flat / 2 + pipe.R * 0.9);
  ok(heightAt(mid.x, mid.z) < 0.02 && heightAt(wall.x, wall.z) > 1.0, 'HALF PIPE: flat on its floor, high on its walls (' + heightAt(wall.x, wall.z).toFixed(2) + ' m)');
  const bowl = find('THE BOWL'), foot = { x: bowl.x, z: bowl.z + 1 }, rimE = { x: bowl.x + bowl.r1, z: bowl.z }, gate = { x: bowl.x - bowl.r1, z: bowl.z };
  ok(heightAt(foot.x, foot.z) < 0.02 && heightAt(rimE.x, rimE.z) > bowl.H - 0.1 && heightAt(gate.x, gate.z) < 0.1, 'THE BOWL: flat at the foot, ' + bowl.H + ' m at the rim, open at the gate');
  let closed = 0; for (let k = 0; k < 360; k += 15) { if (Math.abs(k - 180) <= 70) continue; const q = { x: bowl.x + (bowl.r1 + 0.4) * Math.cos(k * Math.PI / 180), z: bowl.z + (bowl.r1 + 0.4) * Math.sin(k * Math.PI / 180) }; if (heightAt(q.x, q.z) > 1.0) closed++; }
  ok(closed >= 10, 'THE BOWL: the rim is up all round but at the gate (' + closed + ' places looked at)');
}

/* the stars, driven by every car */
const ids = CAR_IDS.slice().sort((a, b) => specOf(a, CARS[a].rating).vtop - specOf(b, CARS[b].rating).vtop), got = {}, t0 = Date.now();
for (const nm of new Set(Object.values(STAR_WAYS).flat())) got[nm] = ids.map(id => runRecipe(T, id, WAYS[nm], {}).got);
const reach = st => ids.map((_, i) => STAR_WAYS[st.id].some(nm => got[nm][i].has(st.id)));
const table = STARS.map(st => ({ st, hit: reach(st) })), count = r => r.hit.filter(Boolean).length;
const unreached = table.filter(r => count(r) === 0).map(r => r.st.name);
ok(unreached.length === 0, 'every star can be reached, from a standstill, by at least one car' + (unreached.length ? ' (not: ' + unreached.join(', ') + ')' : ''));
const bySlowest = id => table.filter(r => r.hit[ids.indexOf(id)]).length;
ok(table.filter(r => count(r) >= 22).length >= 6, 'six or more stars are there for every car, so a new driver finds some at once (' + table.filter(r => count(r) >= 22).length + ')');
ok(table.filter(r => !r.hit[ids.indexOf('courier')]).length >= 3, 'three or more stars are not for the first car, it has to be a better one (' + table.filter(r => !r.hit[ids.indexOf('courier')]).length + ')');
ok(table.filter(r => count(r) <= 11).length >= 3, 'three or more stars are for the faster half of the roster only (' + table.filter(r => count(r) <= 11).length + ')');
ok(table.filter(r => count(r) <= 5).length >= 1, 'one or more stars are for the fastest few (' + table.filter(r => count(r) <= 5).length + ')');
ok(bySlowest('hornet') >= 14 && bySlowest('courier') >= 11 && bySlowest('hornet') > bySlowest('courier'), 'the best car gets most stars and the first car about half and more (' + bySlowest('hornet') + ' and ' + bySlowest('courier') + ' of 20)');
/* a star that is for a faster car is not got by a slow one: counting, among the fastest eight and the slowest eight, the stars each gets (by top speed the fast eight get more) */
{ const slow = table.reduce((a, r) => a + r.hit.slice(0, 8).filter(Boolean).length, 0), fast = table.reduce((a, r) => a + r.hit.slice(-8).filter(Boolean).length, 0);
  ok(fast > slow * 1.1, 'the eight fastest cars get more stars than the eight slowest (' + fast + ' to ' + slow + ' in all)'); }
console.log('   (the roster drove ' + Object.keys(got).length + ' ways in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');

/* the picture: the yard from eight places, each a median of a dozen frames, inside the budget the rest of the game keeps (6 ms) */
{
  const R = createRaster(), full = { x: 0, y: 0, w: 320, h: 180 }, worst = [];
  for (const [x, y, z, yaw] of [[-50, 1, -30, 1.3], [-30, 3, -16, 1.4], [-10, 1, -23, 1.4], [20, 1, -30, 0.1], [30, 1, -36, 0], [-31, 2, 6, 0], [0, 1, 20, 1.5], [40, 1, 0, 3.1]]) {
    const cam = { x, y: y + 1, z, yaw, pitch: -0.12, roll: 0, fov: 1.0, near: 0.05, far: FAR }, t = [];
    for (let i = 0; i < 12; i++) { const a = process.hrtime.bigint(); drawView(R, full, T, [], cam, { t: i / 10, stars: new Set() }); t.push(Number(process.hrtime.bigint() - a) / 1e6); }
    t.sort((a, b) => a - b); worst.push(t[6]);
  }
  ok(Math.max(...worst) < 6, 'the yard is drawn in under 6 ms from every place (' + Math.max(...worst).toFixed(1) + ' ms at the worst)');
}
/* the run */
{
  const c = fresh(); c.yard['3'] = 1; c.yard['7'] = 1;
  const y = createYard(c, {}), r = y.race;
  ok(r.field.length === 1 && r.field[0].human && r.pickups.spots.length === 0, 'a yard run is one car, with no rivals and no pickups');
  ok(r.starsGot.has(3) && r.starsGot.has(7) && r.starsGot.size === 2, 'the stars the career has are not hung up again');
  const n0 = y.nearest(); ok(n0 && !r.starsGot.has(n0.star.id) && n0.d > 0, 'the nearest star is one that is not found yet');
  let events = 0; const st = T.stars[0], car = r.field[0].car, put = () => r.world.place(car, { x: st.x, y: st.y - car.spec.comY - 0.004, z: st.z, yaw: 0 });
  put();
  for (let i = 0; i < 2; i++) { r.step({ throttle: 0, brake: 0, steer: 0, repo: false }); for (const e of r.events) if (e.type === 'star') events++; put(); }
  ok(events === 1 && r.starsGot.has(0), 'a star driven through is one event, and then it is found');
}
S.done();
