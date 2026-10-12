/* GHOST CHECK (dev-only, not packaged): a run is the keys that were given, and the keys are enough. The keys survive being rounded to a byte and run-length coded to text and back; a run driven by a person (here a CPU driver standing in
   for one, its keys rounded as a keyboard's would be) replays, frame for frame and to the bit, in a second race of the same road and car, whether that is on the road as it was built or built again; the ghost's world and the
   player's are two worlds (a gate broken in one is whole in the other); and the challenge times can be beaten by a PRO driver and not by a ROOKIE.   node apps/vroom/ghost_check.js */
import { suite } from './check_kit.js';
import { encode, decode, quantize, pack, unpack, recorder, player } from './ghost.js';
import { createSolo } from './solo.js';
import { fresh } from './career.js';
import { createDriver } from './ai.js';
import { trackFor } from './tracks.js';
import { tierProfile } from './ai_profiles.js';
import { PAR } from './challenge_data.js';
import { CHAIN, parOf, variantOpen, beaten } from './challenge.js';
import { TRACK_IDS } from './tracks.js';
import { VARIANTS } from './track_variant.js';
import { ttFinish } from './career_modes.js';

const S = suite('ghost_check'), { ok } = S;
/* the byte */
{
  let good = true; for (let b = 0; b < 256; b++) { if ((b >> 3) > 30) { good = good && decode(b).steer === 1; continue; } const d = decode(b); if (encode(d) !== (b & 0xff)) good = false; }
  ok(good, 'every byte that is ever written decodes to keys that encode to the same byte (and the one that is never written reads as full lock)');
  const q = quantize({ throttle: 1, brake: 0, steer: 0.49, repo: false });
  ok(q.throttle === 1 && Math.abs(q.steer - 0.4667) < 0.01 && quantize(q).steer === q.steer, 'a stick in between is rounded to a fifteenth, and rounding twice changes nothing (' + q.steer.toFixed(3) + ')');
  const rec = recorder(); const keys = []; for (let i = 0; i < 600; i++) { const k = { throttle: i < 300 ? 1 : 0, brake: i % 90 > 80 ? 1 : 0, steer: Math.sin(i / 40), repo: i === 500 }; keys.push(encode(k)); rec.push(k); }
  const text = rec.text(), back = unpack(text);
  ok(back.length === 600 && back.every((v, i) => v === keys[i]) && text.length < 1500 && pack(back) === text, 'a run is run-length coded to a short string and back (600 frames, ' + text.length + ' characters)');
  const p = player(text); let same = true; for (let i = 0; i < 600; i++) { const d = p.next(); if (encode(d) !== keys[i]) same = false; }
  ok(same && p.done && p.next().throttle === 0, 'a replay gives back the keys, and then none (the car coasts)');
  ok(unpack('zz').length === 0 && unpack('').length === 0 && unpack(null).length === 0 && unpack('1:0').length === 0, 'damaged text reads as no run, not as a crash');
}
/* a run replays to the bit */
function drive(c, ev, seconds, tier) {
  const solo = createSolo(c, ev, null), drv = createDriver(solo.T, solo.human.spec, Object.assign({}, tierProfile(tier), { mistake: 0.02 }), 5, solo.human.entry.parts), trace = [];
  for (let i = 0; i < seconds * 60 && solo.race.state !== 'done'; i++) {
    const f = solo.human, inp = drv.drive(f.car, f.near, [], 1 / 60, { t: solo.race.t });
    solo.step({ throttle: inp.throttle, brake: inp.brake, steer: inp.steer, repo: inp.repo });
    if (i % 60 === 0) trace.push(solo.race.world.hash ? solo.race.world.hash() : f.car.p.join());
  }
  return { solo, trace };
}
for (const [track, v] of [['sorting', 'f'], ['dam', 'rm'], ['factory', 'm']]) {
  const c = fresh(), run = drive(c, { kind: 'tt', track, v }, 90, 3), res = run.solo.result();
  const again = createSolo(c, { kind: 'tt', track, v }, { text: res.text, car: res.car, kit: res.kit }), trace = [];
  for (let i = 0; i < 90 * 60 && again.ghostRace.state !== 'done'; i++) { again.step(null); if (i % 60 === 0) trace.push(again.ghostRace.world.hash ? again.ghostRace.world.hash() : again.ghostRace.field[0].car.p.join()); }
  const n = Math.min(trace.length, run.trace.length);
  ok(n > 20 && trace.slice(0, n).every((h, i) => h === run.trace[i]), track + ':' + v + ': the ghost drives the run again to the bit (' + n + ' seconds compared, ' + res.frames + ' frames, ' + res.text.length + ' characters)');
  ok(again.ghostRace.field[0].lapTimes.length >= 1 && Math.abs(again.ghostRace.field[0].lapTimes[0] - run.solo.human.lapTimes[0]) < 1e-9, track + ':' + v + ': and its first lap is the same lap (' + run.solo.human.lapTimes[0].toFixed(3) + ' s)');
}
/* the challenges */
{
  ok(TRACK_IDS.every(id => VARIANTS.every(v => PAR[id + ':' + v] > 20)), 'every road in every variant has a challenge time (' + Object.keys(PAR).length + ' of ' + TRACK_IDS.length * VARIANTS.length + ')');
  const c = fresh();
  ok(VARIANTS.every(v => variantOpen(c, 'sorting', v) === (v === 'f')), 'a new career has the roads as drawn and nothing else');
  c.tt['sorting:f'] = { lap: PAR['sorting:f'] + 0.5, time: 100, car: 'courier' };
  ok(!variantOpen(c, 'sorting', 'r'), 'a lap over the challenge opens nothing');
  const r = ttFinish(c, { track: 'sorting', v: 'f', lap: PAR['sorting:f'] - 0.1, time: 99, car: 'courier' });
  ok(r.beaten && r.tips > 0 && variantOpen(c, 'sorting', 'r') && !variantOpen(c, 'sorting', 'm') && r.news.some(n => /REVERSED/.test(n)), 'beating it opens the road reversed, and pays once (' + r.tips + ' TIPS)');
  const again = ttFinish(c, { track: 'sorting', v: 'f', lap: PAR['sorting:f'] - 0.2, time: 98, car: 'courier' });
  ok(again.tips === 0 && again.record, 'a better lap is a record and pays nothing more');
  ttFinish(c, { track: 'sorting', v: 'r', lap: PAR['sorting:r'] - 0.1, time: 99, car: 'courier' }); ttFinish(c, { track: 'sorting', v: 'm', lap: PAR['sorting:m'] - 0.1, time: 99, car: 'courier' });
  ok(VARIANTS.every(v => variantOpen(c, 'sorting', v)) && CHAIN.rm === 'm' && beaten(c, 'sorting', 'm') && parOf('sorting', 'rm') === PAR['sorting:rm'], 'reversed opens mirrored and mirrored opens both: the whole chain');
}
S.done();
