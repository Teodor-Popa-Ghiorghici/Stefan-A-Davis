/* CUT CHECK (dev-only, not packaged): a shortcut is worth a route part and nothing else. For every shortcut on every road in every variant: a CPU car with what the shortcut needs takes it, and that is a lap faster than the same car without it by
   a second or two (the plan: 1.5 to 3 s; the check allows 0.8 to 4); a car without it keeps to the road and never goes in; and a car that has been through a gate has really broken it.   node apps/vroom/cut_check.js */
import { buildTrack } from './track_build.js';
import { allTracks, defFor } from './tracks.js';
import { createRace } from './race.js';
import { suite } from './check_kit.js';
import { tierProfile } from './ai_profiles.js';

const S = suite('cut_check'), { ok } = S;
const ONLY = (process.env.TRACK || '').split(',').filter(Boolean), ONLYV = (process.env.VARIANT || '').split(',').filter(Boolean);
const wear = list => Object.fromEntries(list.map(n => [n, true]));
const SEEDS = [4, 5, 6];
/* the second and third laps of a PRO driver in the car, on the road with the cut open for it or not, averaged over three seeds (a lap on ice is a chancy thing) */
function lap(T, parts) {
  let sum = 0, inCut = 0, gates = 0, done = true;
  for (const seed of SEEDS) {
    const race = createRace({ track: T, entries: [{ id: 'a', name: 'A', car: 'courier', profile: Object.assign({}, tierProfile(4), { mistake: 0 }), parts }], laps: 3, seed, pickups: false });
    for (let i = 0; i < 60 * 300 && race.state !== 'done'; i++) { race.step(); if (race.field[0].inCut >= 0) inCut++; for (const e of race.events) if (e.type === 'gate') gates++; }
    const f = race.field[0]; sum += ((f.lapTimes[1] || 999) + (f.lapTimes[2] || 999)) / 2; done = done && f.finished;
  }
  return { lap: sum / SEEDS.length, inCut: inCut / SEEDS.length, gates: gates / SEEDS.length, done };
}
for (const [tid, tv] of allTracks()) {
  if ((ONLY.length && !ONLY.includes(tid)) || (ONLYV.length && !ONLYV.includes(tv))) continue;
  const T = buildTrack(defFor(tid, tv)), tag = tid + (tv === 'f' ? '' : ':' + tv) + ': ';
  T.cuts.forEach((c, k) => {
    const base = T.needs.filter(n => n !== 'headlights'), a = lap(T, wear(base)), b = lap(T, wear([...new Set([...base, ...c.needs])])), name = 'shortcut ' + (k + 1) + ' (' + c.needs.join(' + ') + ')';
    ok(a.done && b.done, tag + name + ': both cars finish');
    ok(a.inCut < 40, tag + name + ': a car without ' + c.needs.join(' and ') + ' keeps to the road (' + a.inCut.toFixed(0) + ' steps in it)');
    ok(b.inCut > 150, tag + name + ': a car with them takes it (' + b.inCut + ' steps in it)');
    const skipped = T.presses.filter(p => ((p.s0 - c.sa + 10 + T.length) % T.length) < ((c.sb - c.sa + 20 + T.length) % T.length)).length, hi = 4 + 1.5 * skipped;        /* a shortcut that goes round a press saves the wait for it too */
    ok(a.lap - b.lap >= 0.8 && a.lap - b.lap <= hi, tag + name + ' saves 0.8 to ' + hi + ' s a lap (' + (a.lap - b.lap).toFixed(2) + ' s' + (skipped ? ', and it skips ' + skipped + ' press' : '') + ')');
    if (c.gate) ok(b.gates === 1, tag + name + ': the gate is broken once (' + b.gates + ')');
  });
}
S.done();
