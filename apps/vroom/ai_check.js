/* AI CHECK (dev-only, not packaged): the CPU is a player, not a cheat (docs/vroom/plan.md section 8). It is held to four promises:
     it has no advantage the rules do not give a person: a driver reads the car and returns four numbers, and the car it drives is built by the same function from the same table as a human's;
     it is deterministic: the same race and seed give the same race to the bit;
     it drives well enough to race and badly enough to be beaten: a lap is a lap, a tier slower than the next, and a field never finishes in one lap time;
     its difficulty is its numbers: a driver with the PRO numbers in a ROOKIE car is quicker than the ROOKIE numbers in it, and by about what the numbers are worth;
   it is a function of what it could see: the same view gives the same drive, cars out of its sight and what other cars hold change nothing, what is in front of it (a car in its lane, a parcel it has room for, a puddle) does,
   and what it sees of the road it sees `reaction` steps late.
   node apps/vroom/ai_check.js */
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { createDriver } from './ai.js';
import { TIERS } from './ai_profiles.js';
import { specOf, CAR_IDS } from './cars.js';
import { createWorld } from './sim.js';
import { suite } from './check_kit.js';
import { styled } from './ai_profiles.js';
import { RIVALS } from './rivals.js';

const S = suite('ai_check'), { ok } = S;
const T = buildTrack(TRACKS.sorting);

/* a driver changes nothing but the four numbers it returns */
{
  const w = createWorld({ col: T.col, nodes: T.nodes }), g = T.grid[0], spec = specOf('courier', 0), car = w.addCar(spec, { x: g.x, y: g.y, z: g.z, yaw: g.yaw }, { id: 0 });
  for (let i = 0; i < 20; i++) w.step();
  const d = createDriver(T, spec, TIERS[2], 3), before = w.hash(), near = T.line.nearest(car.p[0], car.p[2]);
  const inp = d.drive(car, near, [], 1 / 60);
  ok(w.hash() === before, 'asking a driver what to do does not touch the car or the world');
  ok(Object.keys(inp).sort().join() === 'brake,fire,repo,steer,throttle' && inp.throttle >= 0 && inp.throttle <= 1 && inp.brake >= 0 && inp.brake <= 1 && Math.abs(inp.steer) <= 1, 'and what it returns is a throttle, a brake, a steer and the two keys (R and FIRE) inside the keyboard\'s range');
  ok(specOf('courier', 0) === specOf('courier', 0) && CAR_IDS.every(id => specOf(id, 0).mass > 0), 'every car is made by one function from one table (a CPU car is a human\'s car)');
}
/* a whole race is the same race twice */
function lap(tier, car, seed, laps) {
  const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car, tier }], laps: laps || 2, seed, pickups: false });
  for (let i = 0; i < 60 * 300 && race.state !== 'done'; i++) race.step();
  const f = race.field[0];
  return { race, f, t: f.finished ? f.finishT : 999, best: f.best, hash: race.world.hash() };
}
{
  const a = lap(2, 'courier', 7), b = lap(2, 'courier', 7), c = lap(2, 'courier', 8);
  ok(a.hash === b.hash && a.t === b.t, 'the same race with the same seed is the same race to the bit (' + a.hash + ')');
  ok(a.hash !== c.hash, 'and another seed is another race');
}
/* the tiers: slower to faster, by what their numbers are worth */
{
  const rows = TIERS.map((p, i) => { let t = 0, n = 0; for (const seed of [1, 2, 3, 4]) { const r = lap(i, 'courier', seed, 2); t += r.best || 99; n++; } return t / n; });
  console.log('  best lap by tier (the courier, four seeds): ' + rows.map((t, i) => TIERS[i].name + ' ' + t.toFixed(2)).join('   '));
  ok(rows.every(t => t > T.length / 14 && t < T.length / 7), 'a lap is a lap at every tier (' + rows.map(t => t.toFixed(1)).join(', ') + ' s over ' + T.length.toFixed(0) + ' m)');
  let mono = true; for (let i = 1; i < rows.length; i++) if (rows[i] > rows[i - 1] + 0.15) mono = false;
  ok(mono, 'a better tier is never slower than the one before it');
  ok(rows[0] / rows[4] > 1.02 && rows[0] / rows[4] < 1.25, 'and the spread from ROOKIE to PRO is a few per cent in a lap and not a different game (' + ((rows[0] / rows[4] - 1) * 100).toFixed(1) + ' %)');
}
/* no cheating: the PRO numbers in a ROOKIE car have the ROOKIE car's top speed and nothing more */
{
  const r = lap(4, 'courier', 5, 2), top = Math.max(...r.race.field[0].lapTimes.map(() => 0)), spec = specOf('courier', 0);
  let vmax = 0;
  const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 4 }], laps: 2, seed: 5, pickups: false });
  for (let i = 0; i < 60 * 80; i++) { race.step(); const c = race.field[0].car; vmax = Math.max(vmax, Math.hypot(c.v[0], c.v[2])); }
  ok(vmax <= spec.vtop * 1.04, 'the best driver never goes faster than the car can (' + vmax.toFixed(2) + ' m/s of ' + spec.vtop + ')');
  void top;
}
/* a mixed field races: they finish, they are not one lap time, and they meet each other */
{
  const entries = [{ id: 'a', name: 'A', car: 'courier', tier: 0 }, { id: 'b', name: 'B', car: 'milkfloat', tier: 1 }, { id: 'c', name: 'C', car: 'snowbug', tier: 2 }, { id: 'd', name: 'D', car: 'tofu', tier: 3 }];
  let hits = 0, finished = 0, repos = 0;
  const times = [];
  for (const seed of [1, 2, 3]) {
    const race = createRace({ track: T, entries, laps: 3, seed, pickups: false });
    for (let i = 0; i < 60 * 400 && race.state !== 'done'; i++) { race.step(); for (const e of race.events) { if (e.type === 'hit-car') hits++; if (e.type === 'repo') repos++; } }
    finished += race.field.filter(f => f.finished).length; times.push(race.results().map(r => r.time || 999));
  }
  ok(finished === 12, 'a field of four finishes three laps three times over (' + finished + ' of 12)');
  ok(hits > 0, 'the cars meet each other (' + hits + ' knocks in three races)');
  ok(times.every(t => Math.max(...t) - Math.min(...t) > 1.5), 'a field is spread out and not a procession of one time');
  ok(repos <= 6, 'and the CPU is not put back on the road all the time (' + repos + ' in three races)');
}
/* the driver is a function of what it could see */
{
  const g = T.line.at(50), w = createWorld({ col: T.col, nodes: T.nodes }), spec = specOf('courier', 0), car = w.addCar(spec, { x: g.x, y: g.y, z: g.z, yaw: g.yaw }, { id: 0 });
  for (let i = 0; i < 30; i++) w.step();
  car.v[0] = Math.sin(g.yaw) * 10; car.v[2] = Math.cos(g.yaw) * 10;                        /* on the line, on the straight, doing ten metres a second */
  const near = T.line.nearest(car.p[0], car.p[2]), view = (o) => Object.assign({ held: null, bomb: null, place: 3, n: 8, t: 20, road: [], around: [], lat: 0, free: true, k: 0, speed: 10 }, o);
  const mk = prof => createDriver(T, spec, prof || TIERS[2], 9), play = (d, frames, o, others) => { const out = []; for (let i = 0; i < frames; i++) out.push(d.drive(car, near, others || [], 1 / 60, view(Object.assign({ t: 20 + i / 60 }, o)))); return out; };
  const key = o => JSON.stringify(o);
  ok(play(mk(), 90).map(key).join() === play(mk(), 90).map(key).join(), 'the same view gives the same drive, step for step, from two drivers made alike');
  /* what it cannot see changes nothing: a car forty metres off is outside its twelve, and what others hold is not on the glass */
  const plain = play(mk(), 90, {}, []).map(key).join();
  ok(plain === play(mk(), 90, {}, []).map(key).join(), '(and a driver with nothing around it drives the same each time)');
  ok(plain === play(mk(), 90, { place: 3 }, []).map(key).join(), 'a car that is out of its sight changes nothing: the race hands a driver only the cars within twelve metres');
  /* what it can see does: a car in its lane just ahead, a parcel it has room for off to one side, a puddle in its way */
  const sum = (a, b) => a.reduce((t, x, i) => t + Math.abs(x.steer - b[i].steer), 0), base = play(mk(TIERS[4]), 120, {}, []);
  ok(sum(base, play(mk(TIERS[4]), 120, {}, [{ ahead: 3.2, lat: 0, speed: 6 }])) > 0.4, 'a car in its lane a few metres ahead changes its steering: it goes round');
  ok(sum(base, play(mk(TIERS[4]), 120, { road: [{ id: 's1', kind: 'spot', ahead: 7, lat: 1.0, tell: false }] })) > 0.3, 'a parcel ahead to one side that it has room for draws it that way');
  ok(sum(base, play(mk(TIERS[4]), 120, { free: false, road: [{ id: 's1', kind: 'spot', ahead: 7, lat: 1.0, tell: false }] })) === 0, 'and with its hands full it drives past it exactly as if it were not there');
  ok(sum(base, play(mk(TIERS[4]), 120, { road: [{ id: 'o1', kind: 'freeze', ahead: 5, lat: 0.1, tell: false }] })) > 0.3, 'a puddle in its way is gone round');
  /* a fake parcel has one wrong texel: a sharp-eyed driver (the profile's pickups) sees it and keeps off, a dull one drives at it as if it were real */
  const fake = { id: 'o7', kind: 'spot', ahead: 7, lat: 0.1, tell: true };
  const dull = Object.assign({}, TIERS[0], { pickups: 0 }), sharp = Object.assign({}, TIERS[0], { pickups: 1 });
  ok(sum(play(mk(sharp), 120, {}), play(mk(sharp), 120, { road: [fake] })) > 0.2 && sum(play(mk(dull), 120, {}), play(mk(dull), 120, { road: [fake] })) < 0.2, 'a driver with the eye for it steers off a fake parcel and one without does not (the tell is one texel)');
  /* it fires only at something: a rocket held, nothing ahead; then a car ahead on a straight */
  const fires = (o, others, prof) => play(mk(prof || TIERS[4]), 240, o, others).some(x => x.fire);
  ok(!fires({ held: { id: 'rocket', count: 1 } }, []) && fires({ held: { id: 'rocket', count: 1 }, around: [{ ahead: 12, lat: 0, speed: 8 }] }, [{ ahead: 12, lat: 0, speed: 8 }]), 'it does not fire a rocket at nothing and does at a car ahead of it on a straight');
  /* what it sees of the road it sees `reaction` steps late: a bend appears in the lap position at step 60 and the braking for it starts `reaction` steps after */
  {
    const prof = TIERS[0], a = mk(prof), b = mk(prof), pre = Math.max(0, Math.round((10 * 0.2 + prof.brakeEarly) / a.line.step)), vmin = Math.min(...a.plan.v), at = Array.from(a.plan.v).indexOf(vmin), far = (at - pre + a.plan.n) % a.plan.n;
    let first = -1;
    for (let i = 0; i < 120; i++) {
      const x = a.drive(car, near, [], 1 / 60, view()), y = b.drive(car, i < 60 ? near : far, [], 1 / 60, view());
      if (i < 60) ok(x.throttle === y.throttle && x.brake === y.brake, 'step ' + i + ': before the view changes the two drive alike');
      else if (first < 0 && (x.throttle !== y.throttle || x.brake !== y.brake)) first = i - 60;
    }
    ok(first === prof.reaction, 'a driver whose view changes at step 60 changes its throttle and brake exactly `reaction` steps (' + prof.reaction + ') later (' + first + ')');
  }
  /* its difficulty is its numbers and nothing else */
  const KEYS = 'aggression,brakeEarly,gripUse,lineError,mistake,name,pickups,reaction';
  ok(TIERS.every(t => Object.keys(t).sort().join() === KEYS) && RIVALS.every(r => { const p = styled(TIERS[2], r.style); return Object.keys(p).sort().join() === KEYS && p.reaction === TIERS[2].reaction && p.gripUse === TIERS[2].gripUse && p.brakeEarly === TIERS[2].brakeEarly; }), 'a driver is eight numbers (reaction, line error, grip use, early braking, aggression, mistakes, pickups) and a name: no speed, grip or mass, and a rival\'s style moves only its bold, sloppy and keen');
  ok(TIERS.every((t, i) => i === 0 || (t.reaction < TIERS[i - 1].reaction && t.lineError < TIERS[i - 1].lineError && t.gripUse > TIERS[i - 1].gripUse && t.mistake < TIERS[i - 1].mistake && t.pickups > TIERS[i - 1].pickups && t.aggression > TIERS[i - 1].aggression)), 'the tiers climb in every one of them: quicker eyes, a straighter line, more of the tyres, fewer slips, keener on pickups and bolder');
  /* a tier between two: the field's strength can be any number from ROOKIE to PRO */
  const { tierProfile, FIELD } = await import('./ai_profiles.js');
  ok(TIERS.every((t, i) => { const p = tierProfile(i); return p.reaction === t.reaction && Math.abs(p.gripUse - t.gripUse) < 1e-12 && Math.abs(p.mistake - t.mistake) < 1e-12; }), 'a whole number of tier is exactly that tier');
  let mono = true; for (let t = 0; t < 4; t += 0.25) { const a = tierProfile(t), b = tierProfile(t + 0.25); if (!(b.gripUse >= a.gripUse && b.lineError <= a.lineError && b.reaction <= a.reaction && b.mistake <= a.mistake && b.aggression >= a.aggression && b.pickups >= a.pickups)) mono = false; }
  ok(mono && tierProfile(-3).name === 'ROOKIE' && tierProfile(9).name === 'PRO' && tierProfile(1.5).gripUse > TIERS[1].gripUse && tierProfile(1.5).gripUse < TIERS[2].gripUse, 'and between them every number is between its neighbours\', climbing all the way, held at either end');
  ok(FIELD.ofRating.length === 5 && FIELD.ofRating.every((t, i) => t >= 0 && t <= 4 && (i === 0 || t > FIELD.ofRating[i - 1] - 1)) && FIELD.skillStep > 0 && FIELD.skillStep <= 1, 'the field\'s strength is a tier for each rating, held between ROOKIE and PRO and no more than a tier under the rating before it (' + FIELD.ofRating.join(', ') + ': the lower ratings\' caps hold skill down, so AMATEUR wants a sharper field than ADVANCED to be the same test), and a rival\'s skill moves it by at most one');
}
S.done();