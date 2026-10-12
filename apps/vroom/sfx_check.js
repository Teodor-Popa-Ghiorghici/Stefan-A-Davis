/* VROOM sound-effects check -- `node apps/vroom/sfx_check.js`
 *
 * Pure Node, against a pretend audio context that is as strict as the real one (sfx_check_kit.js). What is held to numbers:
 *
 *  SILENCE   with the SFX knob down or the power off, or no sound card at all, not one node is made.
 *  EVERY ONE every effect makes sound, every source it starts is told when to stop and that is within five seconds, nothing outlives `stop()`.
 *  PITCH     the lights are one note and GO is higher; a fake parcel's chime ends on the tritone and a real one's does not; a harder landing is louder; the four horns are four sounds.
 *  THE CARS  revs rise with speed; each class is a step higher; a glow engine is lower than an electric one and rings (a tremolo); the cat purrs; a car on the right is on the right; a car further off is
 *            quieter; the engines are at most four and the voices at most six; a pause hushes them and leaving the race lets go of them.
 *  THE ROAD  every surface has a band and the tyres are louder faster; the scrub follows the slide; nothing in the air.
 *  MIXER     the effects bus is the slider times the one trim, and follows the slider.
 *  THE GLUE  a whole race through audio.js: every kind of thing the race says has the effect that is meant for it, the effects never come faster than a few dozen sources a second, finishing and
 *            closing the window leaves nothing running.
 */
import { createSfx, hz, degree } from './sfx.js';
import { makeSynth, MAX_VOICES } from './sfx_synth.js';
import { engineSpec, engineParams, revsOf, placeOf, rollOf, scrubOf, createEngines, MAX_CARS, RANGE, ROLL } from './engine_sound.js';
import { createAudio } from './audio.js';
import { rig, fakeAudio } from './sfx_check_kit.js';
import { suite } from './check_kit.js';
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { fieldFor } from './rivals.js';

const S = suite('sfx_check');
const mk = o => rig(createSfx, o);
const first = (A, kind) => A.made.find(n => n.kind === kind);
const freq0 = o => o.frequency.set[0][0];

/* ---- silence ---- */
{
  const off = mk({ on: false }), none = mk({ noCard: true });
  const all = fx => { fx.count(3); fx.count(0); fx.land(3, null); fx.wall(5, null); fx.car(4, null); fx.flip(null); fx.repoStart(); fx.repo(); fx.gate(5); fx.lap(true); fx.star(); fx.pick('ball'); fx.use('rocket', null); fx.hit('rocket', null); fx.boom(null); fx.pass(null); fx.tick(0.5, null, 1); fx.horn('honk'); fx.delivered(3); };
  all(off.fx); all(none.fx);
  S.ok(off.A.made.length <= 1, 'with the SFX knob down or the power off no node is made', off.A.made.length + ' made');
  S.ok(none.A.made.length <= 1, 'with no sound card nothing is made and nothing throws');
  const sy = makeSynth(off.host);
  S.ok(sy.engine({}) === null && sy.bed({}) === null, 'and no engine or bed voice either');
}

/* ---- every one of them ---- */
const IDS = ['ball', 'rocket', 'leads', 'parcel', 'freeze', 'snow', 'stone', 'fake', 'coffee', 'cut'];
const EFFECTS = { 'count 3': f => f.count(3), GO: f => f.count(0), land: f => f.land(4, null), 'land, light': f => f.land(0.5, null), wall: f => f.wall(6, null), car: f => f.car(4, null), flip: f => f.flip(null), wheelie: f => f.wheelie(null), 'repo start': f => f.repoStart(), repo: f => f.repo(),
  gate: f => f.gate(5), lap: f => f.lap(false), 'best lap': f => f.lap(true), star: f => f.star(), pick: f => f.pick('rocket'), 'pick (fake)': f => f.pick('fake'), boom: f => f.boom(null), pass: f => f.pass(null), tick: f => f.tick(1, null, 5), door: f => f.door(), drop: f => f.drop(), thud: f => f.thud(),
  pickup: f => f.pickup(), delivered: f => f.delivered(1), 'delivered (long)': f => f.delivered(4), lost: f => f.lost(), hurt: f => f.hurt(), 'horn beep': f => f.horn('beep'), 'horn honk': f => f.horn('honk'), 'horn bell': f => f.horn('bell'), 'horn ahooga': f => f.horn('ahooga') };
for (const id of IDS) { EFFECTS['use ' + id] = f => f.use(id, null); EFFECTS['hit ' + id] = f => f.hit(id, null); }
for (const name of Object.keys(EFFECTS)) {
  const { A, fx } = mk();
  let err = null;
  try { EFFECTS[name](fx); } catch (e) { err = e.message; }
  const src = A.sources(), long = src.filter(n => n.stopAt == null || n.stopAt - A.currentTime > 5);
  const heard = src.some(n => n.out.length);
  fx.stop();
  S.ok(!err && src.length >= 1 && heard && !long.length && fx.synth.live === 0, name + ': a sound, each source told when to stop (within five seconds), nothing left after stop()', err || (src.length + ' sources, ' + long.length + ' long'));
}

/* ---- pitch and loudness ---- */
{
  const f = id => { const r = mk(); id(r.fx); return r.A; };
  const n3 = freq0(first(f(x => x.count(3)), 'osc')), n1 = freq0(first(f(x => x.count(1)), 'osc')), go = freq0(first(f(x => x.count(0)), 'osc'));
  S.ok(n3 === n1 && go > n3 * 1.4, 'the three lights are one note and GO is a fifth and more above it', Math.round(n3) + ' / ' + Math.round(go));
  const tail = (id) => { const A = f(x => x.pick(id)); return A.made.filter(n => n.kind === 'osc').map(freq0); };
  const real = tail('ball'), fake = tail('fake');
  S.ok(real[0] === fake[0] && real[1] !== fake[1] && Math.abs(12 * Math.log2(fake[1] / hz(77)) - 6) < 0.01, 'a fake parcel chimes like a real one but for the last note, which is the tritone over F', real.map(Math.round) + ' / ' + fake.map(Math.round));
  const peak = A => Math.max(...A.made.filter(n => n.kind === 'gain').flatMap(g => g.gain.ramps.map(r => r[1])));
  S.ok(peak(f(x => x.land(5, null))) > peak(f(x => x.land(0.5, null))) * 1.5, 'a harder landing is louder');
  S.ok(peak(f(x => x.pick('ball'))) > 0, '(and a pickup is heard)');
  const near = { k: 0.2, pan: 0.5 }, loud = peak(f(x => x.boom(null))), soft = peak(f(x => x.boom(near)));
  S.ok(soft < loud * 0.3 && first(f(x => x.boom(near)), 'pan').pan.value === 0.5, 'a car further off is quieter and on its own side', soft.toFixed(3) + ' < ' + loud.toFixed(3));
  const far = f(x => x.boom({ k: 0.01, pan: 0 }));
  S.ok(far.sources().length === 0, 'and one too far to hear is not played at all');
  const horns = ['beep', 'honk', 'bell', 'ahooga'].map(k => { const A = f(x => x.horn(k)); return A.sources().length + ':' + A.made.filter(n => n.kind === 'osc').map(o => Math.round(freq0(o))).join(','); });
  S.ok(new Set(horns).size === 4, 'the four horns are four different sounds', horns.join(' | '));
  const steps = [0, 1, 2, 3, 4, 5, 6, 7].map(i => Math.round(12 * Math.log2(hz(degree(i, 77)) / hz(77))));
  S.ok(steps.join() === '0,2,3,5,7,8,10,12', 'the effects are pitched in F minor: a tone, a semitone, two tones, a semitone, two tones', steps.join(' '));
  const t = mk(); t.fx.tick(0, null, 1); const a = t.A.sources().length; t.fx.tick(0, null, 1.01);
  S.ok(t.A.sources().length === a, 'the fuse never ticks twice within 40 ms');
}

/* ---- the cars ---- */
{
  const el = engineSpec('courier', 'electric', 0), gl = engineSpec('rattler', 'glow', 0);
  const at = (es, speed, throttle, extra) => engineParams(es, Object.assign({ speed, vtop: 13, throttle, slide: 0, air: false }, extra || {}));
  S.ok(at(el, 0, 0).f < at(el, 6, 1).f && at(el, 6, 1).f < at(el, 13, 1).f, 'revs rise with speed', [0, 6, 13].map(v => Math.round(at(el, v, 1).f)).join(' < '));
  S.ok(at(el, 2, 1).f > at(el, 2, 0).f, 'and jump with the throttle on a slow car');
  S.ok(at(el, 8, 1, { slide: 0.8 }).f > at(el, 8, 1).f && at(el, 8, 1, { air: true }).f > at(el, 8, 1).f, 'and race when the tyres slip or the wheels are in the air');
  S.ok(at(el, 8, 1).gain > at(el, 8, 0).gain && at(el, 8, 1).cut > at(el, 0, 0).cut, 'under load it is louder and brighter');
  const rated = [0, 1, 2, 3, 4].map(r => engineSpec('courier', 'electric', r));
  S.ok(rated.every((e, i) => !i || (e.lo > rated[i - 1].lo && e.hi > rated[i - 1].hi && e.cut[1] > rated[i - 1].cut[1])), 'each class is a step higher in pitch and brighter', rated.map(e => Math.round(e.hi)).join(' < '));
  S.ok(gl.hi < el.hi && gl.spec.trem > 0 && el.spec.trem === 0, 'a glow engine is lower than an electric one and rings (a tremolo)', Math.round(gl.hi) + ' < ' + Math.round(el.hi));
  const cat = engineSpec('thecat', 'electric', 3), stone = engineSpec('curlingstone', 'electric', 2), man = engineSpec('snowman', 'electric', 0);
  S.ok(cat.hi < 100 && cat.spec.trem > 0.5 && stone.gain < el.gain / 2 && man.cut[1] < el.cut[1], 'the cat purrs, the stone has next to no motor, the snowman is muffled');
  const me = { p: [0, 0, 0], R: [1, 0, 0, 0, 1, 0, 0, 0, 1] };                  /* facing +z with its right along +x */
  const right = placeOf(me, { p: [4, 0, 0.5] }), left = placeOf(me, { p: [-4, 0, 0.5] }), ahead = placeOf(me, { p: [0, 0, 6] }), far = placeOf(me, { p: [4, 0, 28] });
  S.ok(right.pan > 0.5 && left.pan < -0.5 && Math.abs(ahead.pan) < 0.05, 'a car on the right is on the right, on the left is on the left, ahead is in the middle', [right.pan, left.pan, ahead.pan].map(v => v.toFixed(2)).join(' '));
  S.ok(right.k > far.k && placeOf(me, { p: [0, 0, 0.01] }).k > 0.99 && far.k < 0.05, 'and the further it is the quieter', far.k.toFixed(3) + ' < ' + right.k.toFixed(3));
  S.ok(revsOf({ speed: 0, vtop: 13, throttle: 0, slide: 0, air: false }) > 0.05 && revsOf({ speed: 99, vtop: 13, throttle: 1, slide: 1, air: true }) <= 1, 'the revs are 0 to 1, with an idle');
  for (const id of Object.keys(ROLL)) S.ok(ROLL[id][0] > 0 && ROLL[id][1] > 0, 'surface ' + id + ' has a band and a loudness');
  S.ok(rollOf(0, 12, 13, false).gain > rollOf(0, 4, 13, false).gain * 4 && rollOf(0, 12, 13, true).gain === 0, 'the tyres are louder faster and silent in the air');
  S.ok(rollOf(5, 12, 13, false).f < rollOf(6, 12, 13, false).f && rollOf(7, 12, 13, false).f < rollOf(0, 12, 13, false).f, 'deep snow is a lower hiss than ice, and a belt a rumble');
  S.ok(scrubOf(1, 10, false).gain > scrubOf(0.2, 10, false).gain && scrubOf(0, 10, false).gain === 0 && scrubOf(1, 10, true).gain === 0 && scrubOf(1, 1, false).gain < scrubOf(1, 10, false).gain, 'the scrub follows the slide, needs speed and is silent in the air');
}

/* ---- the engines in a race ---- */
const track = buildTrack(TRACKS.sorting);
function race(seed, laps) {
  const e = fieldFor(0, 7, seed); e.push({ id: 'you', name: 'YOU', car: 'courier', tier: 0, proxy: true });
  return createRace({ track, entries: e, rating: 0, seed, laps: laps || 3 });
}
{
  const { A, host } = rig(null), sy = makeSynth(host), E = createEngines(sy), r = race(3), me = r.field[7];
  for (let i = 0; i < 60 * 12; i++) r.step();
  E.update(r, me, 1);
  S.ok(E.voices.size >= 1 && E.voices.size <= MAX_CARS && E.voices.has(me.i), 'the player always has an engine and no more than four sound', E.voices.size + ' engines');
  S.ok(sy.voices <= MAX_VOICES && sy.voices === E.voices.size + 2, 'with the two beds of the tyres that is six voices at most', sy.voices + ' voices');
  const heard = [...E.voices.keys()].every(i => i === me.i || placeOf(me.car, r.field[i].car).d < RANGE);
  S.ok(heard, 'and the others are within earshot');
  const gains = [...E.voices.values()].map(v => v.voice).length;
  void gains;
  const amps = A.made.filter(n => n.kind === 'gain' && n.gain.targets.length);
  E.update(r, me, 0);
  S.ok(amps.length > 0 && amps.slice(0, 8).every(g => g.gain.value <= 0.001 || g.gain.targets.length > 0), 'a pause sets every voice to nothing (k = 0)');
  const alive = A.sources().filter(n => n.stopAt == null).length;
  E.stop();
  S.ok(E.voices.size === 0 && sy.voices === 0 && alive >= 4 && A.sources().every(n => n.stopAt != null), 'leaving the race lets go of every voice', alive + ' were running');
}

/* ---- the mixer ---- */
{
  const r = mk({ level: 0.5 });
  r.fx.count(3);
  const bus = r.A.made.find(n => n.kind === 'gain' && n.out.includes(r.A.destination));
  S.ok(bus && Math.abs(bus.gain.value - 0.5 * 1.6) < 1e-9, 'the effects bus is the slider times one trim', bus && bus.gain.value);
  r.host.level = () => 0.25; r.fx.synth.relevel();
  S.ok(Math.abs(bus.gain.target - 0.25 * 1.6) < 1e-9, 'and follows the slider when it moves', bus.gain.target);
  const z = mk({ level: 0 }); z.fx.count(3); z.fx.synth.relevel();
  S.ok(z.A.made.find(n => n.kind === 'gain' && n.out.includes(z.A.destination)).gain.target > 0, 'at nothing it is still a legal gain, not a ramp to zero');
}

/* ---- a whole race through audio.js ---- */
{
  globalThis.window = { CRT: { on: true, mus: 0, sfx: 8 } };
  const r = race(11), me = r.field[7], { A, host } = rig(null), audio = createAudio({ studio: null }, host, null);
  audio.begin({ race: r, human: me, kind: 'single', night: false });
  const seen = {}, perSec = [];
  let prev = 0, steps = 0;
  for (; steps < 60 * 150 && r.state !== 'done'; steps++) {
    A.currentTime = 10 + steps / 60;
    r.step();
    for (const e of r.events) seen[e.type] = (seen[e.type] || 0) + 1;
    audio.events(r); audio.frame(1 / 60, false);
    if (steps % 60 === 59) { perSec.push(A.sources().length - prev); prev = A.sources().length; }
  }
  S.ok(r.state === 'done' || steps >= 60 * 150, 'a race of eight was run through the sound', steps + ' steps: ' + JSON.stringify(seen));
  const rate = A.sources().length / (steps / 60), worst = Math.max(...perSec);
  S.ok(rate < 30 && worst < 80, 'the effects stay a few dozen sources a second at their worst', rate.toFixed(1) + ' a second on average, ' + worst + ' at worst');
  S.ok(A.sources().filter(n => n.kind === 'src').length > 0 && A.sources().filter(n => n.kind === 'osc').length > 0, 'noise and tones both');
  S.ok(seen.count >= 3 && seen.lap >= 1, 'the lights and the laps were said', 'count ' + seen.count + ', lap ' + seen.lap);
  audio.finish('win');
  S.ok(audio.engines.voices.size === 0, 'finishing lets go of the cars');
  audio.stop();
  S.ok(audio.sfx.synth.live === 0 && A.sources().every(n => n.stopAt != null), 'closing the window leaves nothing running', A.sources().filter(n => n.stopAt == null).length + ' unstopped');
  const before = A.made.length; audio.events(r); audio.frame(1, false); audio.begin({ race: r, human: me, kind: 'single', night: false }); audio.horn('honk'); audio.radio();
  S.ok(A.made.length === before, 'and a closed window makes no more sound');
  void fakeAudio;
}
S.done();
