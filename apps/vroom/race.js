/* A RACE (docs/vroom/plan.md sections 4 and 9): the world with its cars on the grid, a countdown, laps counted along the track's line, the order of the field, and the finish. Pure and seeded, at the sim's
   fixed 60 Hz: the game, the headless harness and the budget bot all drive it the same way, with `race.step(humanInput)`; a CPU car is asked for its inputs by its driver (ai.js), a human's come from outside.
   Progress is the distance a car has covered along the line, unwrapped, counted from the start line: a lap is a multiple of the track's length, so the order of the field is just who is furthest, and
   being put back on the line (REPOSITION) costs the time and not the lap. Events (race.events, a list rebuilt each step) are the sim's own plus
     { type: 'count', n: 3 | 2 | 1 | 0 }   { type: 'lap', i, lap, time, best }   { type: 'finish', i, place, time }   { type: 'over' }
   where `i` is the car's index in the field. Pure. */
import { createWorld } from './sim.js';
import { specOf } from './cars.js';
import { createDriver } from './ai.js';
import { TIERS, HUMAN, styled, tierProfile } from './ai_profiles.js';
import { createPickups } from './pickups.js';
import { STEP } from './tune.js';
import { pressAt } from './press.js';

function dice(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export const COUNT = 3.2;                       /* seconds on the grid before GO */
const WAIT = 4;                                 /* seconds the race runs on after the human finishes, so the others cross the line */

/* o: { track, entries: [{ id, name, car, human?, tier?, paint? }], laps?, rating?, seed? }; the entry order is the grid order (the first is on pole) */
export function createRace(o) {
  const T = o.track, laps = o.laps || T.laps, L = T.length, rating = o.rating == null ? 0 : o.rating, seed = o.seed == null ? 1 : o.seed;
  const world = createWorld({ col: T.col, nodes: T.nodes, gates: T.gates });
  const TD = o.noCuts ? Object.assign(Object.create(T), { cuts: [] }) : T;        /* the road as the CPU drivers know it: with `noCuts` (LAST MILE, whose doors a shortcut would skip) they keep to the main road */
  const field = o.entries.map((e, i) => {
    const spec = specOf(e.car, rating, e.kit), g = T.grid[i % T.grid.length];
    const car = world.addCar(spec, { x: g.x, y: g.y, z: g.z, yaw: g.yaw }, { id: i, parts: e.parts, mods: e.mods });
    const near = T.line.nearest(g.x, g.z);
    let dist = T.line.samples[near].s; dist = ((dist - T.startS + L * 1.5) % L) - L / 2 + T.startS;      /* in the half lap round the start line */
    const profile = e.human ? null : styled(e.profile || tierProfile(e.tier == null ? rating : e.tier), e.style);      /* `profile` is a driver of its own numbers: the budget bot's person */
    return {
      i, entry: e, name: e.name, human: !!e.human, car, spec, near, dist, prevS: T.line.samples[near].s, prog: 0, lap: 0, lapStart: 0, lapTimes: [], best: null, finished: false, finishT: 0, place: i + 1, lat: 0, wrong: 0,
      driver: profile ? createDriver(TD, spec, profile, seed * 31 + i * 7 + 1, e.parts) : null, in: { throttle: 0, brake: 0, steer: 0, repo: false, fire: false },
      hold: [], cap: e.parts && e.parts.roofRack ? 2 : 1, bomb: null, leads: 0, zapped: {}, fireWas: false, hitBy: 0
    };
  });
  const R = { track: T, world, field, laps, rating, state: 'count', t: -COUNT, frame: 0, events: [], order: field.map(f => f.i), winner: -1, overT: 0, humanDone: false };
  R.stats = { leadChanges: 0, swaps: 0, flips: 0 };
  R.starsGot = new Set();                                                        /* the hidden stars picked up (PRACTICE asks for them: `stars: true`) */
  R.pickups = createPickups(R, dice(seed * 977 + 13));
  if (o.pickups === false) { R.pickups.spots.length = 0; }                      /* a race of driving alone: the checks that are about the road and the CPU's hands, not about what is thrown at it */
  const sampleS = i => T.line.samples[i].s;
  const label = n => R.events.push({ type: 'count', n });

  function track(f) {
    const c = f.car, S = T.line.samples;
    /* a car in a shortcut is the way along it, taken as the same share of the stretch of road it skips: it has gone the short way, so it gains the distance and never loses the lap */
    const hit = T.cuts.length ? T.cutAt(c.p[0], c.p[2], f.cutHint) : null;
    f.cutHint = hit; f.inCut = hit ? hit.cut : -1;
    let near, s;
    if (hit) { const cut = T.cuts[hit.cut]; s = cut.sa + (cut.sb - cut.sa) * hit.u; near = Math.round(s / T.line.step) % S.length; }
    else {
      near = T.line.nearest(c.p[0], c.p[2], f.near, 12);
      const d = (S[near].x - c.p[0]) ** 2 + (S[near].z - c.p[2]) ** 2;
      if (d > 36) near = T.line.nearest(c.p[0], c.p[2]);                                   /* put back on the line, or thrown a long way: look everywhere */
      s = sampleS(near);
    }
    f.near = near;
    let dd = s - f.prevS; if (dd > L / 2) dd -= L; else if (dd < -L / 2) dd += L;
    f.dist += dd;                                                                        /* a jump (being put back) is progress along the line like any other: the distance between where the car was and is */
    f.prevS = s;
    f.prog = f.dist - T.startS;
    f.lat = hit ? 0 : (c.p[0] - S[near].x) * S[near].nx + (c.p[2] - S[near].z) * S[near].nz;
    const vt = c.v[0] * S[near].tx + c.v[2] * S[near].tz;
    f.wrong = !hit && vt < -1.5 && !f.finished ? f.wrong + STEP : Math.max(0, f.wrong - STEP * 2);
  }
  function rank() {
    const f = R.field;
    R.order = f.map(x => x.i).sort((a, b) => {
      const A = f[a], B = f[b];
      if (A.finished !== B.finished) return A.finished ? -1 : 1;
      if (A.finished) return A.finishT - B.finishT || a - b;
      return B.prog - A.prog || a - b;
    });
    R.order.forEach((id, k) => { f[id].place = k + 1; });
  }
  /* what the cars near this one look like to its driver */
  function around(f) {
    const out = [];
    for (const g of R.field) { if (g === f) continue; const d = g.dist - f.dist; if (Math.abs(d) < 12) out.push({ ahead: d, lat: g.lat, speed: Math.hypot(g.car.v[0], g.car.v[2]), bomb: !!g.bomb }); }
    return out;
  }
  /* what else a driver sees: what it holds, where it is in the field, and the parcels and hazards on the road ahead of it (a fake parcel looks like a pickup but for the one wrong texel, `tell`) */
  function seen(f) {
    const P = R.pickups, S = T.line.samples, fs = ((f.dist % L) + L) % L, road = [];
    const at = (x, z) => { const k = T.line.nearest(x, z, f.near, 60), q = S[k]; return { ahead: ((q.s - fs) % L + L) % L, lat: (x - q.x) * q.nx + (z - q.z) * q.nz }; };
    for (const s of P.spots) if (s.alive) { const a = ((s.s - fs) % L + L) % L; if (a < 12) road.push({ id: 's' + s.i, kind: 'spot', ahead: a, lat: s.lat, tell: false }); }
    for (const o of P.objs) if (o.kind === 'fake' || o.kind === 'freeze' || o.kind === 'stone') { const a = at(o.x, o.z); if (a.ahead < 12) road.push({ id: 'o' + o.id, kind: o.kind === 'fake' ? 'spot' : o.kind, ahead: a.ahead, lat: a.lat, tell: o.kind === 'fake' }); }
    return { held: f.hold[0] || null, bomb: f.bomb, place: f.place, n: R.field.length, t: R.t, road, around: null, lat: f.lat, free: f.hold.length < f.cap && !f.bomb, stop: R.lm ? R.lm.stopFor(f) : null, k: T.line.samples[f.near].k, speed: Math.hypot(f.car.v[0], f.car.v[2]) };
  }

  R.step = (human) => {
    R.events.length = 0;
    const prevT = R.t;
    for (const f of R.field) {
      let inp;
      if (R.state === 'count') inp = { throttle: 0, brake: 0, steer: 0, repo: false, fire: false };      /* on the grid with the engine idling (brake at a standstill is reverse, so none) */
      else if (f.human) inp = human || f.in;
      else { const ar = around(f), cx = seen(f); cx.around = ar; inp = f.driver.drive(f.car, f.near, ar, STEP, cx); }
      if (f.finished && f.human) inp = { throttle: 0, brake: 0.3, steer: 0, repo: false, fire: false };
      f.car.input = inp;
      R.pickups.fire(f, inp.fire);
    }
    for (const p of T.presses) world.press(p.tag, pressAt(p, R.t).down);              /* the presses are down or up by the race clock */
    world.step();
    for (const e of world.events) R.events.push(e);
    R.frame++; R.t += STEP;
    if (R.state === 'count') {
      for (const n of [3, 2, 1]) if (prevT < -n && R.t >= -n) label(n);
      if (R.t >= 0) { R.state = 'racing'; R.t = 0; label(0); for (const f of R.field) f.lapStart = 0; }
    }
    for (const f of R.field) track(f);
    if (R.lm) R.lm.step(R.events);                                               /* LAST MILE: the parcels and the doors (lastmile.js) */
    if (o.stars) for (const f of R.field) if (f.human || f.entry.proxy) for (const st of T.stars) {
      if (R.starsGot.has(st.id)) continue;
      const dx = f.car.p[0] - st.x, dz = f.car.p[2] - st.z;
      if (dx * dx + dz * dz < (st.r2 || 0.2) && Math.abs(f.car.p[1] - st.y) < (st.dy || 0.6)) { R.starsGot.add(st.id); R.events.push({ type: 'star', id: st.id, i: f.i }); }
    }
    if (R.state === 'racing' || R.state === 'over' || R.state === 'done') {
      for (const f of R.field) {
        if (f.finished) continue;
        const lap = Math.max(0, Math.floor(f.prog / L));
        if (lap > f.lap) {
          const lt = R.t - f.lapStart; f.lapStart = R.t; f.lapTimes.push(lt); f.best = f.best == null ? lt : Math.min(f.best, lt); f.lap = lap;
          if (lap >= laps) {
            f.finished = true; f.finishT = R.t - (f.prog - laps * L) / Math.max(1, Math.hypot(f.car.v[0], f.car.v[2]));
            R.events.push({ type: 'finish', i: f.i, place: 0, time: f.finishT });
            if (R.winner < 0) R.winner = f.i;
            if (f.human) R.humanDone = true;
          } else R.events.push({ type: 'lap', i: f.i, lap, time: lt, best: f.best });
        }
      }
      rank();
      for (const e of R.events) if (e.type === 'finish') e.place = R.field[e.i].place;
      const humans = R.field.filter(f => f.human || f.entry.proxy);                 /* a `proxy` is a CPU car standing in for a person: the race ends when it does */
      if (R.state === 'racing') {
        const done = humans.length ? humans.every(f => f.finished) : R.field.every(f => f.finished);
        if (done) { R.state = 'over'; R.overT = 0; R.events.push({ type: 'over' }); }
      } else {
        R.overT += STEP;
        if (R.field.every(f => f.finished) || R.overT >= WAIT) R.state = 'done';
      }
    } else rank();
    R.pickups.post(world.events);
    /* places change hands for good, not as two cars side by side swap: a car's place counts as moved when its raw place has been another for a second and a half. A lead change is the front moving; a swap is two cars exchanging. */
    if (R.state === 'racing' && R.t > 2) {
      let moved = 0;
      for (const f of R.field) {
        if (f.sp == null) { f.sp = f.place; f.spT = 0; continue; }
        if (f.place === f.sp) { f.spT = 0; continue; }
        f.spT += STEP;
        if (f.spT > 1.5) { if (f.place === 1) R.stats.leadChanges++; f.sp = f.place; f.spT = 0; moved++; }
      }
      R.stats.swaps += moved / 2;
    }
    for (const e of world.events) if (e.type === 'flip') R.stats.flips++;
    return R.events;
  };
  /* the order as a table: the finishers by time, the rest by how far they got */
  R.results = () => {
    rank();
    return R.order.map((id, k) => { const f = R.field[id]; return { place: k + 1, i: id, id: f.entry.id, name: f.name, human: f.human, car: f.entry.car, time: f.finished ? f.finishT : null, laps: f.lap, best: f.best, prog: f.prog }; });
  };
  rank();
  return R;
}
void HUMAN; void TIERS;
