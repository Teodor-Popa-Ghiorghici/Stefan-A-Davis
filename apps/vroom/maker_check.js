/* TRACK MAKER check -- `node apps/vroom/maker_check.js` (dev-only, pure Node)
 *
 *  THE FILE     a road is text and comes back as the same road; a file that is garbage, too big, or full of tiles that are not on the grid is cut down to what is safe and never throws.
 *  THE RING     a painted road is a road only if it is one ring: every kind of mistake is found at the tile that is the mistake (alone, a dead end, a fork, a crossing, two rings, too long, nothing painted).
 *  THE MODULES  a jump, a belt, a pinch, a counter and pickups need a straight tile, a kerb a corner, and nothing may stand on the tile the line starts at; a road with no straight tile has nowhere to start;
 *               the start is the straight tile with the longest straight run, or the one asked for; a road with no pickups is given some, a road with them is not.
 *  THE ROADS    forty roads grown at random (a ring, then bumps pushed out of it one tile at a time, every one kept only if it is still a ring), in every theme, with modules strewn on them: each is built into a
 *               track and held to EVERYTHING the town's own roads are held to (track_check_kit.js: the line closes, the things on it are where their data says and clear of each other, every parcel is taken by a car
 *               driven down its lane, the grid and the checkpoints and the nodes are on the road, a CPU drives two laps without being put back, a jump is cleared whatever is done to the keys in the air) and eight
 *               cars race it to the flag, every one of them, with nobody stuck.
 *  THE SAVE     a road is kept by name as `<NAME>.TRK` under ::/Home/Vroom and is registered as a track the menus and the race can name (tracks.js). */
import { GRID_W, GRID_H, MAX_CELLS, THEME_IDS, MODULES, MODULE_IDS, blank, toText, fromText, cellKey, cellsOf, cleanName, fileOf, inGrid } from './maker_trk.js';
import { loopOf } from './maker_loop.js';
import { defOf } from './maker_def.js';
import { TOOLS, paint, removeRoad, put, clearTile, analyse } from './maker_edit.js';
import { buildTrack } from './track_build.js';
import { trackChecks } from './track_check_kit.js';
import { createRace } from './race.js';
import { fieldFor } from './rivals.js';
import { suite, dice } from './check_kit.js';

const S = suite('maker_check'), { ok } = S;
const ring = (x0, y0, x1, y1) => { const t = blank('RING'); for (let x = x0; x <= x1; x++) { t.road[cellKey(x, y0)] = 1; t.road[cellKey(x, y1)] = 1; } for (let y = y0; y <= y1; y++) { t.road[cellKey(x0, y)] = 1; t.road[cellKey(x1, y)] = 1; } return t; };

/* ---- the file ---- */
{
  const t = ring(2, 1, 8, 5); t.name = 'LAMP POST 7'; t.theme = 'snow'; t.laps = 4; t.mods[cellKey(5, 1)] = 'jump'; t.mods[cellKey(8, 3)] = 'belt'; t.mods[cellKey(2, 3)] = 'counter'; t.mods[cellKey(8, 1)] = 'kerb'; t.start = cellKey(4, 5);
  const text = toText(t), back = fromText(text);
  ok(/^VROOM ROAD 1\nNAME LAMP POST 7\nTHEME SNOW\nLAPS 4\nROAD /.test(text), 'a road is text: a header, a name, a theme, laps, the road');
  ok(toText(back) === text && back.name === 'LAMP POST 7' && back.theme === 'snow' && back.laps === 4 && back.start === '4,5', 'and comes back as the same road', JSON.stringify(back.mods));
  ok(fromText('').name === 'MY ROAD' && Object.keys(fromText(null).road).length === 0 && Object.keys(fromText(undefined).mods).length === 0, 'an empty file, null and undefined are an empty road');
  const junk = fromText('ROAD 99,99 -1,2 a,b 3,3 3,3\nJUMP 3,3\nJUMP 7,7\nTHEME LAVA\nLAPS 99\nNAME ' + 'x'.repeat(200) + '\nBOGUS 1,1\n\u0000\u0001ROAD 5,5\nROAD 4,4');
  ok(Object.keys(junk.road).join('|') === '3,3|4,4' && junk.mods['3,3'] === 'jump' && !junk.mods['7,7'] && junk.theme === 'hall' && junk.laps === 3 && junk.name.length === 20, 'a tile off the grid, a word that is not one, a module on no road, a theme there is not, laps of 99 and a long name are all cut down', JSON.stringify(junk));
  const big = fromText('ROAD ' + Array.from({ length: 200 }, (_, i) => (i % GRID_W) + ',' + (Math.floor(i / GRID_W) % GRID_H)).join(' '));
  ok(Object.keys(big.road).length <= MAX_CELLS, 'a file with more tiles than a road may have is cut to ' + MAX_CELLS + ' (' + Object.keys(big.road).length + ')');
  ok(fromText('ROAD 1,1\n'.repeat(5000)).name === 'MY ROAD', 'a file far too big is read as far as it is allowed and no further');
  ok(cleanName('  my   road!! 7 ') === 'MY ROAD 7' && fileOf('my road') === 'MY_ROAD.TRK' && fileOf('!!!') === 'ROAD.TRK', 'a name is capitals, digits and spaces; a file is its name with underscores');
  ok(inGrid(0, 0) && inGrid(GRID_W - 1, GRID_H - 1) && !inGrid(GRID_W, 0) && !inGrid(-1, 2) && !inGrid(1.5, 2), 'the grid is ' + GRID_W + ' x ' + GRID_H);
}

/* ---- the ring ---- */
{
  const r = loopOf(ring(2, 1, 8, 5).road);
  ok(r.ok && r.order.length === 20 && r.turns.filter(Boolean).length === 4 && r.cells === 20, 'a rectangle of tiles is a ring of twenty, with four corners');
  const again = loopOf(ring(2, 1, 8, 5).road);
  ok(JSON.stringify(again.order) === JSON.stringify(r.order) && r.order[0].join() === '2,1' && r.order[1].join() === '3,1', 'it is walked the same way every time, from the first tile in reading order, to the right');
  const why = (t, text) => { const lp = loopOf(t.road); return !lp.ok && lp.problems.some(p => p.text === text); };
  const a = ring(2, 1, 8, 5); delete a.road['5,1'];
  ok(why(a, 'A DEAD END') && loopOf(a.road).problems.every(p => p.at && p.text === 'A DEAD END') && loopOf(a.road).problems.length === 2, 'a gap in the ring is two dead ends, each at its tile', JSON.stringify(loopOf(a.road).problems));
  const b = ring(2, 1, 8, 5); b.road['5,2'] = 1;
  ok(why(b, 'A FORK') && loopOf(b.road).problems.some(p => p.at && p.at.join() === '5,1') && why(b, 'A DEAD END'), 'a tile stuck on the side is a fork where it joins and a dead end where it stops');
  const c = blank('X'); for (const k of ['5,3', '4,3', '6,3', '5,2', '5,4']) c.road[k] = 1;
  ok(why(c, 'A CROSSING'), 'a plus is a crossing at its middle', JSON.stringify(loopOf(c.road).problems.map(p => p.text)));
  const d = blank('X'); d.road['3,3'] = 1; ok(why(d, 'A TILE ALONE'), 'a lone tile is alone');
  const e = ring(1, 1, 3, 3); const f = ring(6, 3, 9, 6); Object.assign(e.road, f.road);
  ok(why(e, 'TWO RINGS: A ROAD IS ONE RING') && loopOf(e.road).problems[0].at, 'two rings are two rings, and the problem points at a tile of the other one', JSON.stringify(loopOf(e.road).problems));
  ok(loopOf({}).problems[0].text === 'PAINT SOME ROAD' && !loopOf({}).ok, 'nothing painted is nothing to race');
  const g = blank('X'); for (let x = 3; x <= 5; x++) for (let y = 2; y <= 4; y++) g.road[cellKey(x, y)] = 1;
  ok(!loopOf(g.road).ok && loopOf(g.road).problems.some(p => p.text === 'A CROSSING'), 'a block of tiles is not a ring: the middle is a crossing');
  const h = ring(0, 0, GRID_W - 1, GRID_H - 1), hl = loopOf(h.road);
  ok(hl.ok && hl.order.length === 2 * (GRID_W + GRID_H) - 4, 'the whole border of the grid is a ring of ' + hl.order.length);
  const o = ring(0, 0, 17, 17), ol = loopOf(o.road);
  ok(!ol.ok && ol.problems.length === 1 && /TOO LONG: 68 TILES, THE MOST IS 64/.test(ol.problems[0].text), 'and a ring longer than ' + MAX_CELLS + ' is refused by name', JSON.stringify(ol.problems));
  const two = ring(1, 1, 2, 2);
  ok(loopOf(two.road).ok && loopOf(two.road).turns.every(Boolean), 'two by two tiles is a ring and every tile of it is a corner');
  ok(defOf(two, 'user:x').problems[0].text === 'NEEDS A STRAIGHT TILE FOR THE START LINE' && defOf(two, 'user:x').def === null, 'and has nowhere to put the start line');
}

/* ---- the modules ---- */
{
  const base = ring(2, 1, 8, 5), put = (k, id, start) => { const t = JSON.parse(JSON.stringify(base)); t.mods[k] = id; if (start) t.start = start; return defOf(t, 'user:t'); };
  const names = r => r.problems.map(p => p.text).join('; ');
  ok(put('5,1', 'jump').def && put('5,1', 'belt').def && put('5,1', 'pinch').def && put('5,1', 'counter').def && put('5,1', 'pickups').def, 'a jump, a belt, a pinch, a counter and pickups stand on a straight tile');
  ok(!put('2,1', 'jump').def && /NEEDS A STRAIGHT TILE/.test(names(put('2,1', 'jump'))) && put('2,1', 'jump').problems[0].at.join() === '2,1', 'but not on a corner: the problem names the tile');
  const afterCorner = (() => { const t = JSON.parse(JSON.stringify(base)); t.mods['3,1'] = 'jump'; return defOf(t, 'user:j'); })();
  ok(!afterCorner.def && /A JUMP NEEDS A RUN-UP/.test(names(afterCorner)) && afterCorner.problems[0].at.join() === '3,1' && put('4,1', 'jump').def, 'a jump right after a corner has no run-up and is refused; one with a straight tile before it is fine');
  ok(!put('2,1', 'pickups').def && /NEEDS A STRAIGHT TILE/.test(names(put('2,1', 'pickups'))), 'pickups are a cluster across the road and want a straight too');
  ok(put('2,1', 'kerb').def && !put('5,1', 'kerb').def && /NEEDS A CORNER/.test(names(put('5,1', 'kerb'))), 'a kerb stands on a corner and not on a straight');
  const auto = put('5,1', 'pickups').info.start;
  const strt = put('5,3', 'jump', '5,1');
  ok(strt.def && strt.info.start.join() === '5,1', 'the start is the tile asked for');
  ok(!put('5,1', 'jump', '5,1').def && /START LINE IS HERE/.test(names(put('5,1', 'jump', '5,1'))), 'and nothing else may stand on it');
  const corner = (() => { const t = JSON.parse(JSON.stringify(base)); t.start = '2,1'; return defOf(t, 'user:t'); })();
  ok(!corner.def && /START LINE NEEDS A STRAIGHT TILE/.test(names(corner)), 'a start asked for on a corner is refused');
  const plain = defOf(base, 'user:t');
  ok(plain.def && plain.info.start.join() !== '2,1' && plain.info.pickups === 5, 'with no start asked for it is made, and a road with no pickups is given five clusters, one for every four tiles (' + plain.info.pickups + ')');
  const small = ring(2, 2, 4, 4);
  ok(defOf(small, 'user:s').problems.some(p => /ROOM FOR FOUR PICKUPS/.test(p.text)) && defOf(small, 'user:s').def === null, 'a road with no room for four clusters of pickups is told so');
  const ell = (() => { const t = blank('L'); for (let x = 1; x <= 6; x++) t.road[cellKey(x, 1)] = 1; for (let y = 2; y <= 5; y++) t.road[cellKey(1, y)] = 1; for (let x = 2; x <= 6; x++) t.road[cellKey(x, 5)] = 1; for (let y = 2; y <= 4; y++) t.road[cellKey(6, y)] = 1; return t; })();
  ok(defOf(ell, 'user:l').def && auto != null, 'a ring of another shape (an oblong with a tooth cut into it)');
  const withP = JSON.parse(JSON.stringify(base)); withP.mods['5,1'] = 'pickups';
  const dp = defOf(withP, 'user:t').def;
  const kept = dp.features.filter(f => f.type === 'pickups').length;
  ok(kept === 5 && dp.features.some(f => f.type === 'pickups' && f.u === dp.features.find(g => g.type === 'pickups').u), 'a road with a cluster of pickups put on it keeps it, and is given more only until it has the five', String(kept));
  const def = defOf(Object.assign(JSON.parse(JSON.stringify(base)), { mods: { '5,1': 'jump', '8,3': 'belt', '5,5': 'pinch', '2,3': 'counter', '8,1': 'kerb' } }), 'user:t').def;
  const kinds = def.features.map(f => f.type).sort();
  ok(['belt', 'counter', 'jump', 'kerb', 'pinch'].every(k => kinds.includes(k)) && def.id === 'user:t' && def.user === true && def.laps === 3 && def.controls.length > 50 && def.start.rows === 4, 'each module becomes the town\'s own feature of its kind, with the data of a road of the town', kinds.join(' '));
  ok(MODULE_IDS.every(id => MODULES[id].name && MODULES[id].letter && ['straight', 'corner'].includes(MODULES[id].on)), 'every module has a name, a letter and a place it may stand');
}

let report = '';
/* ---- the editor's verbs ---- */
{
  const t = blank('E');
  ok(paint(t, 3, 3) && !paint(t, 3, 3) && !paint(t, -1, 3) && !paint(t, GRID_W, 0) && Object.keys(t.road).length === 1, 'a tile is painted once, and nothing off the grid is');
  ok(put(t, 'jump', 3, 3) === null && t.mods['3,3'] === 'jump' && put(t, 'jump', 3, 3) === null && !t.mods['3,3'], 'a module goes on a road tile, and the same one again takes it off');
  ok(/PAINT ROAD/.test(put(t, 'belt', 4, 3)) && !t.mods['4,3'] && /PAINT ROAD/.test(put(t, 'start', 9, 9)), 'but not on a tile with no road');
  put(t, 'start', 3, 3); put(t, 'kerb', 3, 3);
  ok(t.mods['3,3'] === 'kerb' && t.start === null, 'a module on the start line takes the line off the tile');
  put(t, 'start', 3, 3);
  ok(t.start === '3,3' && !t.mods['3,3'], 'and the start line takes the module off');
  ok(clearTile(t, 3, 3) && t.start === null && t.road['3,3'] && clearTile(t, 3, 3) && !t.road['3,3'], 'the eraser takes what stands on a tile first and the road itself second');
  paint(t, 5, 5); put(t, 'pinch', 5, 5); removeRoad(t, 5, 5);
  ok(!t.mods['5,5'] && !clearTile(t, 5, 5), 'a tile of road taken away takes its module with it, and there is nothing more to clear');
  ok(TOOLS.length === 9 && TOOLS.every(x => x.id === 'road' || x.id === 'start' || x.id === 'erase' || MODULES[x.id]), 'nine tools: the road, the six modules, the start line and the eraser');
  const a = analyse(ring(2, 1, 8, 5), 'user:X');
  ok(a.ok && a.def.id === 'user:X' && a.info.cells === 20 && !analyse(blank('Z')).ok && analyse(blank('Z')).problems[0].text === 'PAINT SOME ROAD', 'analyse says what a road is: a track for a ring, and why not for anything else');
}

/* ---- roads grown at random ---- */
const grow = rng => {
  const w = 4 + Math.floor(rng() * 4), h = 3 + Math.floor(rng() * 3), x0 = Math.floor(rng() * (GRID_W - w - 1)) + 1, y0 = Math.floor(rng() * (GRID_H - h - 1)) + 1;
  let t = ring(x0, y0, x0 + w - 1, y0 + h - 1);
  for (let k = 0, bumps = 0, want = 3 + Math.floor(rng() * 5); k < 150 && bumps < want; k++) {
    const lp = loopOf(t.road), o = lp.order, n = o.length;
    if (n >= 44) break;
    const i = Math.floor(rng() * n), sign = rng() < 0.5 ? 1 : -1, c = [0, 1, 2, 3, 4].map(j => o[(i + j) % n]);
    const d = [c[1][0] - c[0][0], c[1][1] - c[0][1]];
    if (!c.every((q, j) => !j || (q[0] - c[j - 1][0] === d[0] && q[1] - c[j - 1][1] === d[1]))) continue;              /* five tiles in a straight line */
    const nm = [-d[1] * sign, d[0] * sign], add = [c[1], c[2], c[3]].map(q => [q[0] + nm[0], q[1] + nm[1]]);
    if (!add.every(q => inGrid(q[0], q[1]) && !t.road[cellKey(q[0], q[1])])) continue;
    const u = JSON.parse(JSON.stringify(t)); delete u.road[cellKey(c[2][0], c[2][1])]; add.forEach(q => { u.road[cellKey(q[0], q[1])] = 1; });
    if (loopOf(u.road).ok) { t = u; bumps++; }
  }
  return t;
};
const rng = dice(7);
const roads = [];
for (let i = 0; i < 40; i++) {
  let t, lp, plain;
  do { t = grow(rng); lp = loopOf(t.road); plain = defOf(t, 'user:plain'); } while (!plain.def);                  /* a ring with room for a start and four pickups: the ones that have not are the next check's */
  t.theme = THEME_IDS[i % THEME_IDS.length];
  lp.order.forEach((c, j) => { if (lp.turns[j]) { if (rng() < 0.25) t.mods[cellKey(c[0], c[1])] = 'kerb'; } else if (rng() < 0.25 && !(plain.info.start[0] === c[0] && plain.info.start[1] === c[1])) t.mods[cellKey(c[0], c[1])] = ['jump', 'belt', 'pinch', 'counter', 'pickups'][Math.floor(rng() * 5)]; });
  if (i % 2 === 1 && !Object.values(t.mods).includes('jump')) {                                      /* every other road gets a jump if it has room for one: the module with the most to go wrong, and the one the random strewing seldom chooses */
    const free = lp.order.filter((c, j) => !lp.turns[j] && !lp.turns[(j + lp.order.length - 1) % lp.order.length] && !t.mods[cellKey(c[0], c[1])] && !(plain.info.start[0] === c[0] && plain.info.start[1] === c[1]));
    if (free.length) { const c = free[Math.floor(rng() * free.length)]; t.mods[cellKey(c[0], c[1])] = 'jump'; }
  }
  while (!defOf(t, 'user:strewn').def) { const ks = Object.keys(t.mods).filter(k => t.mods[k] !== 'kerb'); delete t.mods[ks[Math.floor(rng() * ks.length)]]; }        /* strewn too thickly (a jump after a corner, too few tiles left for the pickups): a module comes off */
  roads.push(t);
}
{
  let built = 0, shapes = new Set(), lens = [];
  roads.forEach((t, i) => {
    const r = defOf(t, 'user:r' + i);
    if (r.def) {
      built++; lens.push(r.info.length);
      const cs = cellsOf(t.road), x0 = Math.min(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1]));
      shapes.add(cs.map(c => (c[0] - x0) + ',' + (c[1] - y0)).join(' '));            /* the shape of a road, wherever on the grid it is */
    } else console.log('  road ' + i + ' is not a road: ' + r.problems.map(p => p.text).join('; '));
  });
  ok(built === roads.length, 'all ' + roads.length + ' roads grown at random are roads (' + built + ' built)');
  ok(shapes.size >= 20 && Math.min(...lens) < 400 && Math.max(...lens) > 450, 'of many shapes and lengths (' + shapes.size + ' shapes, ' + Math.min(...lens).toFixed(0) + ' to ' + Math.max(...lens).toFixed(0) + ' m)');
}
{
  /* every one built, and held to what the town's own are held to, in a few themes; and a field of eight raced to the flag on all forty */
  const stride = Number(process.env.MAKER_FULL ? 1 : 8);
  let n = 0, raced = 0, stuck = 0, worstRepos = 0; const all = [], untrue = [];
  roads.forEach((t, i) => {
    const r = defOf(t, 'user:r' + i);
    if (!r.def) return;
    const T = buildTrack(r.def);
    ok(T.length > 150 && T.length < 1500, 'road ' + i + ' (' + t.theme + ', ' + Object.keys(t.road).length + ' tiles): a lap of ' + T.length.toFixed(0) + ' m');
    r.def.controls.forEach((c, k, a) => { const b = a[(k + 1) % a.length]; if (Math.hypot(c.x - b.x, c.z - b.z) < 1e-6) untrue.push('road ' + i + ' has two control points in one place at ' + k); });
    T.features.jumps.forEach(j => { const d = Math.hypot(T.line.at(j.b).x - T.line.at(j.a).x, T.line.at(j.b).z - T.line.at(j.a).z); if (Math.abs(d - j.run) > 0.02) untrue.push('road ' + i + ': a ramp of ' + j.run + ' m is ' + d.toFixed(2) + ' m long on the line'); });
    if (i % stride === 0) { trackChecks(S, T, 'road ' + i + ' (' + t.theme + '): '); n++; }
    const need = T.needs.reduce((a, k) => { a[k] = true; return a; }, {});
    const e = fieldFor(2, 8, i + 1).map(x => Object.assign(x, { parts: Object.assign({ snowTyres: true, iceChains: true, headlights: true }, need) }));
    const race = createRace({ track: T, entries: e, laps: 2, rating: 2, seed: i + 5 });
    let repos = 0;
    for (let g = 0; g < 60 * 400 && race.state !== 'done'; g++) { race.step(); for (const ev of race.events) if (ev.type === 'repo') repos++; }
    if (race.field.every(f => f.finished)) raced++; else stuck++;
    worstRepos = Math.max(worstRepos, repos); all.push(repos);
  });
  ok(untrue.length === 0, 'the line is true to its metres on every road: no corner with two control points in one place (the spline stretched a metre of road to half its length there, and a jump set on it was steeper than its data), and every ramp is as long on the road as in its data', untrue.slice(0, 3).join('; '));
  ok(n >= 5, 'a good few of them (' + n + ') were put through the whole of the town\'s own track check');
  ok(raced === roads.length && stuck === 0, 'eight cars race every one of the forty roads to the flag, every car, two laps (' + raced + ' of ' + roads.length + ')');
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  report = ', ' + mean.toFixed(1) + ' repositions a race of eight (' + worstRepos + ' at the worst)';
  ok(worstRepos <= 28 && mean < 12, 'with ' + mean.toFixed(1) + ' repositions a race of eight on average and ' + worstRepos + ' at the worst (the town\'s own roads: 28 at the most)');
}
S.done(roads.length + ' roads' + report);
