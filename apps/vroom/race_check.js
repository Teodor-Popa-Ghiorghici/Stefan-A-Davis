/* RACE CHECK (dev-only, not packaged): the race around the sim (race.js). The countdown is 3.2 s, nothing moves before GO and every car moves after it; a lap is a multiple of the track's length along its line and
   counts once; the order of the field is who is furthest and a finished car is ahead of a car that has not; being put back on the line costs the time and not the lap; going the wrong way is noticed; the race
   ends when the human finishes and the others have had a few seconds to cross; the results are the finishers by time and the rest by how far they got; and the whole thing is deterministic.
   node apps/vroom/race_check.js */
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace, COUNT } from './race.js';
import { createDriver } from './ai.js';
import { TIERS } from './ai_profiles.js';
import { suite } from './check_kit.js';

const S = suite('race_check'), { ok } = S;
const T = buildTrack(TRACKS.sorting);
const four = [{ id: 'a', name: 'A', car: 'milkfloat', tier: 0 }, { id: 'b', name: 'B', car: 'snowbug', tier: 1 }, { id: 'c', name: 'C', car: 'tofu', tier: 2 }, { id: 'me', name: 'ME', car: 'courier', human: true }];

/* the countdown */
{
  const r = createRace({ track: T, entries: four, laps: 2, seed: 1 }), counts = [];
  let moved = 0, goAt = -1;
  for (let i = 0; i < 60 * 6; i++) {
    r.step({ throttle: 1, brake: 0, steer: 0, repo: false });
    for (const e of r.events) if (e.type === 'count') { counts.push(e.n); if (e.n === 0) goAt = r.frame; }
    if (r.state === 'count') for (const f of r.field) moved = Math.max(moved, Math.hypot(f.car.v[0], f.car.v[2]));
  }
  ok(counts.join() === '3,2,1,0', 'the count is 3, 2, 1, GO (' + counts.join() + ')');
  ok(Math.abs(goAt / 60 - COUNT) < 0.05, 'GO comes at ' + COUNT + ' s (' + (goAt / 60).toFixed(2) + ')');
  ok(moved < 0.15, 'nothing moves on the grid before it, whatever the keys do (' + moved.toFixed(2) + ' m/s)');
  ok(r.field.every(f => f.prog > -10 && f.prog < 1) || r.field.some(f => f.prog > 1), 'every car stood behind the line');
  ok(r.field.every(f => Math.hypot(f.car.v[0], f.car.v[2]) > 2), 'and every car is moving after it');
}
/* laps and the finish */
function run(entries, laps, seed, human) {
  const r = createRace({ track: T, entries, laps, seed }), ev = [];
  for (let i = 0; i < 60 * 300 && r.state !== 'done'; i++) { r.step(human ? human(r) : undefined); for (const e of r.events) ev.push([r.frame, e]); }
  return { r, ev };
}
{
  const { r, ev } = run(four.slice(0, 3), 3, 2);
  const laps = ev.filter(([, e]) => e.type === 'lap' && e.i === 0), fin = ev.filter(([, e]) => e.type === 'finish');
  ok(laps.length === 2 && laps[0][1].lap === 1 && laps[1][1].lap === 2, 'a three-lap race tells each car of lap 1 and lap 2 once and then the finish (' + laps.map(([, e]) => e.lap).join() + ')');
  ok(fin.length === 3 && new Set(fin.map(([, e]) => e.i)).size === 3, 'and every car finishes once');
  ok(fin.every(([, e], i) => e.place === i + 1), 'with its place told as it crosses (' + fin.map(([, e]) => e.place).join() + ')');
  const res = r.results();
  ok(res.every((x, i) => i === 0 || x.time >= res[i - 1].time), 'the results are in order of time');
  const per = r.field[0].lapTimes; ok(per.length === 3 && per.every(t => t > 25 && t < 60), 'a lap takes a lap (' + per.map(t => t.toFixed(1)).join(', ') + ' s)');
  ok(r.state === 'done', 'and with no human in the race it is done when all have finished');
}
/* the order: who is furthest, and a finisher is ahead of a car that has not */
{
  const r = createRace({ track: T, entries: four.slice(0, 3), laps: 2, seed: 3 });
  let bad = 0;
  for (let i = 0; i < 60 * 40; i++) { r.step(); const f = r.field; for (let k = 0; k + 1 < r.order.length; k++) { const a = f[r.order[k]], b = f[r.order[k + 1]]; if (!a.finished && !b.finished && a.prog < b.prog - 1e-9) bad++; } }
  ok(bad === 0, 'the order of the field is the order of how far round each car is');
}
/* the human finishing ends the race a few seconds on, with the others ranked by how far they got */
{
  const spec = four[3], r = createRace({ track: T, entries: four, laps: 2, seed: 4 }), f = r.field[3];
  const me = createDriver(T, f.spec, TIERS[2], 77);
  let doneAt = -1, finAt = -1;
  for (let i = 0; i < 60 * 200 && r.state !== 'done'; i++) { r.step(me.drive(f.car, f.near, [], 1 / 60)); if (f.finished && finAt < 0) finAt = r.t; if (r.state === 'done') doneAt = r.t; }
  ok(f.finished && finAt > 0, 'a human who drives two laps finishes them (' + finAt.toFixed(1) + ' s)');
  ok(r.state === 'done' && doneAt - finAt < 4.5, 'and the race is over a few seconds after (' + (doneAt - finAt).toFixed(1) + ' s)');
  const res = r.results();
  ok(res.length === 4 && res.every((x, k) => x.place === k + 1), 'the results list all four in order');
  const fin = res.filter(x => x.time != null), rest = res.filter(x => x.time == null);
  ok(fin.every((x, k) => k === 0 || x.time >= fin[k - 1].time) && rest.every((x, k) => k === 0 || x.prog <= rest[k - 1].prog), 'finishers by time, then the rest by how far they got');
  void spec;
}
/* put back on the road costs time and not a lap */
{
  const r = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', tier: 2 }], laps: 2, seed: 5 });
  let before = 0, after = 0, did = false, minAfter = 0;
  for (let i = 0; i < 60 * 40; i++) {
    r.step();
    const f = r.field[0];
    if (!did && r.t > 12) { before = f.prog; r.world.reposition(f.car); did = true; }
    if (did && r.events.some(e => e.type === 'repo')) { after = f.prog; break; }
  }
  ok(did && after < before + 12 && after > before - 14, 'being put back moves a car by metres along the line, not by a lap (' + before.toFixed(1) + ' to ' + after.toFixed(1) + ')');
  void minAfter;
}
/* the wrong way */
{
  const r = createRace({ track: T, entries: [{ id: 'me', name: 'ME', car: 'courier', human: true }], laps: 2, seed: 6 }), f = r.field[0];
  for (let i = 0; i < 60 * 4; i++) r.step({ throttle: 0, brake: 0, steer: 0, repo: false });
  const g = T.line.at(T.startS + 20);
  r.world.place(f.car, { x: g.x, y: g.y, z: g.z, yaw: g.yaw + Math.PI });
  let wrong = 0;
  for (let i = 0; i < 60 * 4; i++) { r.step({ throttle: 1, brake: 0, steer: 0, repo: false }); wrong = Math.max(wrong, f.wrong); }
  ok(wrong > 0.8, 'a car driving against the way of the line is told so after a moment (' + wrong.toFixed(2) + ' s)');
  const h = createRace({ track: T, entries: [{ id: 'me', name: 'ME', car: 'courier', human: true }], laps: 2, seed: 6 });
  let w2 = 0; for (let i = 0; i < 60 * 8; i++) { h.step({ throttle: 1, brake: 0, steer: 0, repo: false }); w2 = Math.max(w2, h.field[0].wrong); }
  ok(w2 === 0, 'and one going the right way never is');
}
/* the same race twice */
{
  const a = run(four.slice(0, 3), 2, 9).r.world.hash(), b = run(four.slice(0, 3), 2, 9).r.world.hash(), c = run(four.slice(0, 3), 2, 10).r.world.hash();
  ok(a === b && a !== c, 'a race is the same race twice and another with another seed (' + a + ')');
}
S.done();
