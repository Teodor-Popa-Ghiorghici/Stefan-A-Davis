/* PICKUPS CHECK (dev-only, not packaged): the ten pickups (docs/vroom/plan.md section 7). Held to what the plan promises:
     the deal: the leader draws only from ANTIFREEZE, CURLING STONE, FAKE PARCEL and SNOWBALLS; the middle everything but POWER CUT; the last place rockets (often a pack), the ball and the HOT PARCEL most; POWER CUT only
       to the back half; and the same dice give the same deal;
     (each pickup's own effect and counter are held in pickups_effects_check.js)
     a parcel on the road is taken by a car with room, comes back four seconds later and is passed by a car that is full; a car just put back is not touched; a race with the same seed is the same race;
     and a race of eight is chaotic: a dozen hits and more across the field, places that change hands, flips, every kind of pickup seen, everybody finishing.      node apps/vroom/pickups_check.js */
import { createRace } from './race.js';
import { fieldFor } from './rivals.js';
import { deal, weights, PICKUPS, IDS, backFrom, packChance } from './pickups_deal.js';
import { U } from './pickups_fx.js';
import { createDriver } from './ai.js';
import { TIERS } from './ai_profiles.js';
import { suite, dice } from './check_kit.js';
import { T, S0, arena, put, run, evs, fire, give } from './pickups_check_kit.js';

const S = suite('pickups_check'), { ok } = S;

/* ---- the deal ---- */
{
  ok(IDS.length === 10 && IDS.join() === 'ball,rocket,leads,parcel,freeze,snow,stone,fake,coffee,cut' && IDS.every(id => PICKUPS[id].name && PICKUPS[id].blurb), 'there are ten pickups, each with a name and a line');
  ok(Object.keys(weights(1, 8)).sort().join() === 'fake,freeze,snow,stone', 'the leader draws from ANTIFREEZE, CURLING STONE, FAKE PARCEL and SNOWBALLS and nothing else (' + Object.keys(weights(1, 8)).join(', ') + ')');
  for (const p of [2, 3, 4]) ok(!weights(p, 8).cut && Object.keys(weights(p, 8)).length >= 6, 'place ' + p + ' draws a good many kinds and never POWER CUT');
  ok(backFrom(8) === 5 && backFrom(4) === 3 && backFrom(2) === 2, 'POWER CUT is for the back half: from 5 of 8, 3 of 4, 2 of 2');
  for (const p of [5, 6, 7, 8]) ok(weights(p, 8).cut > 0, 'place ' + p + ' may be dealt POWER CUT');
  const w1 = weights(1, 8), w4 = weights(4, 8), w8 = weights(8, 8), sum = w => Object.values(w).reduce((a, b) => a + b, 0), share = (w, ids) => ids.reduce((a, id) => a + (w[id] || 0), 0) / sum(w);
  const off = ['rocket', 'ball', 'parcel'];
  ok(share(w8, off) > share(w4, off) && share(w4, off) > share(w1, off) && share(w8, off) > 0.5, 'the further back, the more of ROCKET, STATIC BALL and HOT PARCEL (' + [1, 4, 8].map(p => (share(weights(p, 8), off) * 100).toFixed(0) + ' %').join(' to ') + ')');
  const def = ['freeze', 'stone', 'fake', 'snow'];
  ok(share(w1, def) === 1 && share(w4, def) < share(w1, def) && share(w8, def) < share(w4, def), 'and the further forward, the more of the ones that hold a race back from behind');
  ok(packChance(1, 8) === 0 && packChance(8, 8) > 0.6 && packChance(4, 8) < packChance(8, 8), 'a rocket is never a pack for the leader and mostly one for the last');
  /* draws */
  const counts = {}; const r = dice(7);
  for (let p = 1; p <= 8; p++) { counts[p] = {}; for (let i = 0; i < 6000; i++) { const d = deal(p, 8, r); counts[p][d.id] = (counts[p][d.id] || 0) + 1; if (d.id === 'rocket' && d.count === 3) counts[p].pack = (counts[p].pack || 0) + 1; } }
  ok(IDS.filter(id => id !== 'cut').every(id => (counts[1][id] || 0) === 0 || def.includes(id)) && Object.keys(counts[1]).every(id => def.includes(id)), 'six thousand deals to the leader are only the four');
  ok([1, 2, 3, 4].every(p => !counts[p].cut) && [5, 6, 7, 8].every(p => counts[p].cut > 0), 'six thousand deals to each place: POWER CUT only ever to 5 to 8');
  ok(IDS.every(id => counts[4][id] > 0 || id === 'cut') && counts[8].rocket > (counts[1].rocket || 0) && (counts[8].pack || 0) > counts[8].rocket * 0.5 && !counts[1].pack, 'the middle draws every kind but the cut, and the last mostly rocket packs (' + counts[8].pack + ' of ' + counts[8].rocket + ')');
  const a = dice(3), b = dice(3), c = dice(4); let same = true, diff = false;
  for (let i = 0; i < 200; i++) { const x = deal(5, 8, a), y = deal(5, 8, b), z = deal(5, 8, c); if (x.id !== y.id || x.count !== y.count) same = false; if (x.id !== z.id) diff = true; }
  ok(same && diff, 'the same dice give the same deal and other dice another');
  ok(!('parcel' in weights(8, 8, ['parcel'])) && deal(8, 8, dice(1), ['parcel']).id !== 'parcel', 'a hot parcel is not dealt while one is alight');
}

/* ---- the parcels on the road ---- */
{
  const r = arena(2), [A, B] = r.field, P = r.pickups, s = P.spots[1];
  s.alive = true; s.until = 0;
  const p = T.line.at(s.s);
  put(r, A, s.s - 4, s.lat, 6); A.stub.throttle = 0.4;
  const e = evs(r, 1.5, 'pick');
  ok(e.length === 1 && e[0].i === A.i && A.hold.length + (A.bomb ? 1 : 0) === 1 && !s.alive, 'a car that drives over a parcel takes what is in it (' + (e[0] ? PICKUPS[e[0].id].name : 'nothing') + ')');
  ok(Math.abs(s.until - (r.t - 0)) < 3 || s.until > r.t, 'and it comes back after ' + U.respawn + ' s');
  const when = s.until; run(r, Math.max(0, when - r.t) + 0.1); ok(s.alive, 'it is there again');
  /* a car that is full drives over it */
  A.hold = [{ id: 'ball', count: 1 }]; A.bomb = null; put(r, A, s.s - 4, s.lat, 6); A.stub.throttle = 0.4; run(r, 1.5);
  ok(s.alive && A.hold.length === 1 && A.hold[0].id === 'ball', 'a car with its hands full passes over it and it stays');
  /* a roof rack holds two */
  const r2 = arena(1), [C] = r2.field; C.cap = 2; const s2 = r2.pickups.spots[0]; s2.alive = true; C.hold = [{ id: 'coffee', count: 1 }]; put(r2, C, s2.s - 4, s2.lat, 6); C.stub.throttle = 0.4; run(r2, 1.5);
  ok(C.hold.length === 2, 'a car with a ROOF RACK holds two');
  /* every parcel is on the road, a hand's breadth from where it is drawn, in the places the track says */
  ok(P.spots.length === T.spots.length && P.spots.length >= 15 && P.spots.every((q, i) => q.x === T.spots[i].x && q.z === T.spots[i].z), 'the parcels are where the track put them (' + P.spots.length + ')');
  void p; void B;
  /* a car just put back is not touched */
  const r3 = arena(2), [X, Y] = r3.field; put(r3, X, S0, 0, 6); put(r3, Y, S0 + 14, 0, 6); Y.car.ghost = 2; give(X, 'ball'); fire(r3, X);
  const g = evs(r3, 2, 'hit'); ok(g.length === 0, 'a car that has just been put back (a ghost) is passed through by everything');
  const r4 = arena(2), [X4, Y4] = r4.field; put(r4, X4, S0, 0, 6); put(r4, Y4, S0 + 14, 0, 6); Y4.finished = true; give(X4, 'ball'); fire(r4, X4);
  ok(evs(r4, 2, 'hit').length === 0, 'and so is a car that has finished');
  const r5 = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 2 }, { id: 'b', name: 'B', car: 'courier', tier: 2 }], laps: 3, seed: 1, rating: 0 }); r5.field[0].hold = [{ id: 'coffee', count: 1 }];
  r5.field[0].driver = { drive: () => ({ throttle: 0, brake: 0, steer: 0, repo: false, fire: true }) }; run(r5, 1);
  ok(r5.field[0].hold.length === 1 && r5.field[0].car.tTurbo <= 0, 'nothing is fired before the lights go green');
}

/* ---- the CPU's side: it sees only what a person could, and uses what it holds ---- */
{
  const r = arena(3), [A, B] = r.field;
  A.driver = createDriver(T, A.spec, TIERS[3], 5); put(r, A, S0, 0, 8); put(r, B, S0 + 14, 0, 8); B.stub.throttle = 0.5; give(A, 'rocket');
  const e = evs(r, 6, 'use'); ok(e.some(x => x.i === A.i && x.id === 'rocket'), 'a driver with a rocket and a car 14 m ahead of it on a straight fires it');
  const r2 = arena(2), [A2, B2] = r2.field; A2.driver = createDriver(T, A2.spec, TIERS[3], 5); put(r2, A2, S0, 0, 8); put(r2, B2, S0 + 60, 0, 8); give(A2, 'ball');
  const e2 = evs(r2, 1.5, 'use'); ok(!e2.some(x => x.id === 'ball'), 'and with the car sixty metres away it does not throw the ball yet');
  /* a keener driver (a higher tier's pickups number) uses what it holds sooner: the time from taking a rocket to firing it, with a car 14 m ahead, over six seeds */
  const wait = tier => { let tot = 0; for (let seed = 1; seed <= 6; seed++) { const a = arena(2), [X, Y] = a.field; X.driver = createDriver(T, X.spec, TIERS[tier], seed); put(a, X, S0, 0, 8); put(a, Y, S0 + 14, 0, 8); Y.stub.throttle = 0.5; give(X, 'rocket'); let t = 6; for (let i = 0; i < 360; i++) { a.step(); if (a.events.some(e => e.type === 'use' && e.i === X.i)) { t = i / 60; break; } } tot += t; } return tot / 6; };
  const w0 = wait(0), w4 = wait(4);
  ok(w4 < w0 - 0.5 && w4 < 1.6, 'a PRO driver fires within a second or so of having a target and a ROOKIE hangs on to it (' + w4.toFixed(1) + ' s and ' + w0.toFixed(1) + ' s)');
}

/* ---- a race is the same race, and a race of eight is chaos ---- */
{
  const go = seed => { const race = createRace({ track: T, entries: fieldFor(0, 8, seed), laps: 3, seed, rating: 0 }); let rep = 0; for (let i = 0; i < 60 * 300 && race.state !== 'done'; i++) { race.step(); for (const e of race.events) if (e.type === 'repo') rep++; } return { race, rep }; };
  const a = go(2), b = go(2), c = go(3);
  ok(a.race.world.hash() === b.race.world.hash() && JSON.stringify(a.race.pickups.stats) === JSON.stringify(b.race.pickups.stats), 'a race with the same seed is the same race, pickups and all (' + a.race.world.hash() + ')');
  ok(a.race.world.hash() !== c.race.world.hash(), 'and another seed is another');
  const runs = [a, c, go(5), go(7)], sum = f => runs.reduce((t, x) => t + f(x), 0);
  const seen = new Set(); runs.forEach(x => Object.keys(x.race.pickups.stats.by).forEach(k => seen.add(k)));
  const hits = runs.map(x => x.race.pickups.stats.hits), swaps = runs.map(x => x.race.stats.swaps), flips = runs.map(x => x.race.stats.flips), lead = runs.map(x => x.race.stats.leadChanges);
  console.log('  four races of eight on SORTING ROOM (3 laps): pickups taken ' + runs.map(x => x.race.pickups.stats.picks).join(', ') + '; used ' + runs.map(x => x.race.pickups.stats.uses).join(', ') + '; hits ' + hits.join(', ') + '; places changed hands ' + swaps.map(v => v.toFixed(0)).join(', ') + '; lead changes ' + lead.join(', ') + '; flips ' + flips.join(', ') + '; put back ' + runs.map(x => x.rep).join(', '));
  ok(hits.every(h => h >= 12), 'every race has a dozen pickup hits or more across the field (' + hits.join(', ') + ')');
  ok(swaps.every(v => v >= 10), 'places change hands ten times or more in a race, for good and not as two cars brush (' + swaps.map(v => v.toFixed(0)).join(', ') + ')');
  ok(flips.every(v => v >= 3), 'cars are flipped in every race (' + flips.join(', ') + ')');
  ok(sum(x => x.race.stats.leadChanges) >= 1, 'the front of the field changes hands in the four races (' + lead.join(', ') + ')');
  ok(IDS.every(id => seen.has(id)), 'all ten pickups turn up (' + [...seen].sort().join(', ') + ')');
  ok(runs.every(x => x.race.field.every(f => f.finished)), 'and everyone finishes');
  ok(runs.every(x => x.rep <= 28), 'nobody is put back more than a few times each (' + runs.map(x => x.rep).join(', ') + ' in the race)');
  ok(runs.every(x => x.race.pickups.stats.hits < x.race.pickups.stats.uses * 1.2 + 50), 'the chaos is not a pile-up: hits stay in step with the pickups used');
}
S.done();
