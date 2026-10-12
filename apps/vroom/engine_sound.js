/* THE SOUND OF THE CARS: each audible car is an engine (an oscillator pair that follows its revs), and the player's own car is also two beds of noise, the tyres on the road and the tyres letting go.
 * Pure but for the voices it is handed (sfx_synth.js): `engineParams`, `placeOf` and `rollOf` are plain functions of the sim's numbers, so sfx_check.js holds them in Node.
 *
 *   BY KIND    an ELECTRIC car (a toy's brushed motor: a whine that climbs, richer and higher with the class) or a GLOW car (a two-stroke: lower, with a ring in it that chops the sound at a third of its pitch);
 *   BY CLASS   ROOKIE to PRO, each a step higher in pitch and a step brighter, as a real class of motors is faster-turning;
 *   BY REVS    revs follow the speed over the car's top speed, jump with the throttle on a slow car, and race when the tyres slip or the wheels are in the air;
 *   THE SPECIALS  THE CAT purrs (a low saw, chopped slowly), the CURLING STONE has no motor to speak of (it is a rumble in the tyre bed), the SNOWMAN's is muffled.
 * Up to MAX_CARS engines sound at once: the player's, and the nearest others within RANGE metres, quieter and panned by where they are.
 */
import { MAX_VOICES } from './sfx_synth.js';
import { CARS } from './cars.js';

export const MAX_CARS = 4, RANGE = 30;
export const KINDS = {
  electric: { type: 'sawtooth', type2: 'square', ratio: 2.01, mix2: 0.3, lo: 150, hi: 520, stepLo: 30, stepHi: 140, cut: [650, 2400], trem: 0, gain: 0.03 },
  glow: { type: 'sawtooth', type2: 'square', ratio: 1.5, mix2: 0.25, lo: 85, hi: 300, stepLo: 10, stepHi: 42, cut: [500, 1800], trem: 0.55, gain: 0.034 }
};
const SPECIAL = {
  thecat: { type: 'sawtooth', type2: 'triangle', ratio: 2, mix2: 0.4, lo: 26, hi: 70, stepLo: 0, stepHi: 0, cut: [220, 520], trem: 0.9, gain: 0.05 },
  curlingstone: { type: 'triangle', type2: 'sine', ratio: 1, mix2: 0.2, lo: 40, hi: 80, stepLo: 0, stepHi: 0, cut: [200, 400], trem: 0, gain: 0.012 },
  snowman: { cutK: 0.5 }
};
/* the spec of a car's engine voice and the range of its revs: { spec (for synth.engine), lo, hi, cut: [a, b], gain } */
export function engineSpec(carId, kind, rating) {
  const base = SPECIAL[carId] && SPECIAL[carId].type ? SPECIAL[carId] : KINDS[kind] || KINDS.electric, k = SPECIAL[carId] && SPECIAL[carId].cutK || 1;
  return { spec: { type: base.type, type2: base.type2, ratio: base.ratio, mix2: base.mix2, trem: base.trem }, lo: base.lo + base.stepLo * rating, hi: base.hi + base.stepHi * rating, cut: [base.cut[0] * k * (1 + 0.1 * rating), base.cut[1] * k * (1 + 0.1 * rating)], gain: base.gain };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/* the revs, 0 to 1, from how fast the car goes over how fast it can, the throttle, the slide of its tyres and whether it is in the air */
export function revsOf(st) {
  const v = clamp(st.speed / Math.max(1, st.vtop), 0, 1.2);
  let r = 0.1 + 0.9 * Math.min(1, v);
  r += (1 - r) * 0.55 * st.throttle * (1 - Math.min(1, v));
  return clamp(r + 0.3 * (st.slide || 0) + (st.air ? 0.3 * st.throttle : 0), 0, 1);
}
/* what to tell a voice: { f, gain, cut, trem }. st: { speed, vtop, throttle, slide, air } */
export function engineParams(es, st) {
  const r = revsOf(st), load = Math.max(st.throttle, 0.3 + 0.2 * Math.min(1, st.speed / Math.max(1, st.vtop)));
  return { f: es.lo + (es.hi - es.lo) * Math.pow(r, 1.15), gain: es.gain * load, cut: es.cut[0] + (es.cut[1] - es.cut[0]) * r, trem: 0.4 + 0.6 * r, r };
}
/* how loud another car is from where the player sits, and on which side. `me` and `other` are cars of the sim (p, R); the car's right is the first column of its rotation, forward the third. */
export function placeOf(me, other) {
  const dx = other.p[0] - me.p[0], dz = other.p[2] - me.p[2], d = Math.hypot(dx, dz);
  const rx = me.R[0], rz = me.R[6], pan = d < 0.05 ? 0 : clamp((dx * rx + dz * rz) / d, -1, 1);
  return { d, pan: pan * Math.min(1, d / 2), k: 1 / (1 + (d / 3) * (d / 3)) };
}
/* the tyre on the road: [pitch of the band in Hz, loudness at full speed] by surface id (tune.js SURF) */
export const ROLL = {
  0: [1800, 0.05], 1: [2200, 0.05], 2: [650, 0.035], 3: [900, 0.04], 4: [550, 0.07], 5: [330, 0.1], 6: [3200, 0.03], 7: [110, 0.09], 8: [1250, 0.05], 9: [2500, 0.05], 10: [1650, 0.045], 11: [480, 0.045]
};
export function rollOf(surf, speed, vtop, air) {
  const row = ROLL[surf] || ROLL[0], v = clamp(speed / Math.max(1, vtop), 0, 1);
  return { f: row[0] * (0.7 + 0.5 * v), gain: air ? 0 : row[1] * v * v };
}
export const scrubOf = (slide, speed, air) => ({ f: 2400 + 1200 * slide, gain: air ? 0 : clamp(slide, 0, 1) * clamp(speed / 6, 0, 1) * 0.1 });

/* the cars' voices: `update(race, me, k)` keeps an engine alive for `me` (the player's car) and the nearest others, and stops the rest. `k` is the master level (0 hushes it: a pause). */
export function createEngines(synth, rate) {
  const E = { voices: new Map(), roll: null, scrub: null, quiet: false };
  const specFor = f => { const c = CARS[f.entry.car]; return engineSpec(f.entry.car, c && c.look ? c.look.engine : 'electric', c ? c.rating : 0); };
  const stats = f => {
    const c = f.car;
    let sl = 0; for (const w of c.wheels) if (w.slide > sl) sl = w.slide;
    return { speed: Math.hypot(c.v[0], c.v[2]), vtop: f.spec.vtop, throttle: clamp(c.input.throttle || 0, 0, 1) * (c.tPower > 0 ? 0 : 1), slide: sl, air: c.touching === 0 };
  };
  E.update = (race, me, k) => {
    const hush = k === 0;
    const near = race.field.filter(f => f !== me && !f.car.repoT).map(f => ({ f, p: placeOf(me.car, f.car) })).filter(x => x.p.d < RANGE).sort((a, b) => a.p.d - b.p.d).slice(0, MAX_CARS - 1);
    const want = [{ f: me, p: { k: 1, pan: 0 } }].concat(near), keep = new Set();
    for (const w of want) {
      const id = w.f.i; keep.add(id);
      let v = E.voices.get(id);
      if (!v) { const es = specFor(w.f); const voice = synth.engine(es.spec); if (!voice) continue; v = { voice, es }; E.voices.set(id, v); }
      const p = engineParams(v.es, stats(w.f));
      v.voice.set({ f: p.f, gain: hush ? 0 : p.gain * w.p.k * (w.f === me ? 1 : 0.8), cut: p.cut, pan: w.p.pan, trem: p.trem });
    }
    for (const [id, v] of E.voices) if (!keep.has(id)) { v.voice.stop(); E.voices.delete(id); }
    /* the player's tyres */
    const st = stats(me), surf = me.car.lastSurf, r = rollOf(surf, st.speed, st.vtop, st.air), sc = scrubOf(st.slide, st.speed, st.air);
    if (!E.roll) E.roll = synth.bed({ q: 0.8 });
    if (!E.scrub) E.scrub = synth.bed({ q: 1.6 });
    const rock = me.entry.car === 'curlingstone' ? 3 : 1;
    if (E.roll) E.roll.set(r.f, hush ? 0 : r.gain * rock, 0);
    if (E.scrub) E.scrub.set(sc.f, hush ? 0 : sc.gain, 0);
  };
  E.stop = () => { for (const v of E.voices.values()) v.voice.stop(); E.voices.clear(); if (E.roll) E.roll.stop(); if (E.scrub) E.scrub.stop(); E.roll = E.scrub = null; };
  void rate; void MAX_VOICES;
  return E;
}
