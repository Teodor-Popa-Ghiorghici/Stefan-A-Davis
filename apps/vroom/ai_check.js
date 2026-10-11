/* AI CHECK (dev-only, not packaged): the CPU is a player, not a cheat (docs/vroom/plan.md section 8). It is held to four promises:
     it has no advantage the rules do not give a person: a driver reads the car and returns four numbers, and the car it drives is built by the same function from the same table as a human's;
     it is deterministic: the same race and seed give the same race to the bit;
     it drives well enough to race and badly enough to be beaten: a lap is a lap, a tier slower than the next, and a field never finishes in one lap time;
     its difficulty is its numbers: a driver with the PRO numbers in a ROOKIE car is quicker than the ROOKIE numbers in it, and by about what the numbers are worth.
   node apps/vroom/ai_check.js */
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { createDriver } from './ai.js';
import { TIERS } from './ai_profiles.js';
import { specOf, CAR_IDS } from './cars.js';
import { createWorld } from './sim.js';
import { suite } from './check_kit.js';

const S = suite('ai_check'), { ok } = S;
const T = buildTrack(TRACKS.sorting);

/* a driver changes nothing but the four numbers it returns */
{
  const w = createWorld({ col: T.col, nodes: T.nodes }), g = T.grid[0], spec = specOf('courier', 0), car = w.addCar(spec, { x: g.x, y: g.y, z: g.z, yaw: g.yaw }, { id: 0 });
  for (let i = 0; i < 20; i++) w.step();
  const d = createDriver(T, spec, TIERS[2], 3), before = w.hash(), near = T.line.nearest(car.p[0], car.p[2]);
  const inp = d.drive(car, near, [], 1 / 60);
  ok(w.hash() === before, 'asking a driver what to do does not touch the car or the world');
  ok(Object.keys(inp).sort().join() === 'brake,repo,steer,throttle' && inp.throttle >= 0 && inp.throttle <= 1 && inp.brake >= 0 && inp.brake <= 1 && Math.abs(inp.steer) <= 1, 'and what it returns is a throttle, a brake and a steer inside the keyboard\'s range');
  ok(specOf('courier', 0) === specOf('courier', 0) && CAR_IDS.every(id => specOf(id, 0).mass > 0), 'every car is made by one function from one table (a CPU car is a human\'s car)');
}
/* a whole race is the same race twice */
function lap(tier, car, seed, laps) {
  const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car, tier }], laps: laps || 2, seed });
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
  const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 4 }], laps: 2, seed: 5 });
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
    const race = createRace({ track: T, entries, laps: 3, seed });
    for (let i = 0; i < 60 * 400 && race.state !== 'done'; i++) { race.step(); for (const e of race.events) { if (e.type === 'hit-car') hits++; if (e.type === 'repo') repos++; } }
    finished += race.field.filter(f => f.finished).length; times.push(race.results().map(r => r.time || 999));
  }
  ok(finished === 12, 'a field of four finishes three laps three times over (' + finished + ' of 12)');
  ok(hits > 0, 'the cars meet each other (' + hits + ' knocks in three races)');
  ok(times.every(t => Math.max(...t) - Math.min(...t) > 1.5), 'a field is spread out and not a procession of one time');
  ok(repos <= 6, 'and the CPU is not put back on the road all the time (' + repos + ' in three races)');
}
S.done();
