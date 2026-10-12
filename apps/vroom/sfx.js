/* VROOM's sound effects: what the race's events sound like. All of it is synthesised (no samples) through `sfx_synth.js`, and everything that is pitched is pitched into the music's key, F minor, so a chime or a
 * horn is a note the tune could have played and never clashes with it.
 *
 *   count     the three lights, each a beep, and GO a bright fifth and an octave over it
 *   land      a thud under a puff of air, by how hard the car came down;  wall, car: a clack, a scrape;  flip: the car turning over;  repo: a rewind and a pop
 *   pick      a chime up the minor (a fake parcel's one wrong note is the tritone);  use, hit: one voice each for the ten pickups;  boom: the HOT PARCEL going off;  tick: its fuse
 *   gate      a fence going;  star, lap, door, drop, pickup, delivered, lost, hurt: the modes' small sounds
 *   horn      the four horns of the depot: BEEP, HONK, SLEIGH BELL, AHOOGA
 * `near` is { k, pan } for a car that is not the player's: how loud it is from where the player sits (its distance) and which side. Every sound is a function of a few numbers the sim already has; none of it
 * is random but the noise itself.
 */
import { makeSynth } from './sfx_synth.js';

const MINOR = [0, 2, 3, 5, 7, 8, 10];                 /* F minor above F */
export const hz = m => 440 * Math.pow(2, (m - 69) / 12);
/* scale degree `i` of F minor from midi `base` (an F) as a midi note */
export const degree = (i, base) => base + 12 * Math.floor(i / 7) + MINOR[((i % 7) + 7) % 7];
const F5 = 77, F4 = 65;
const NEAR0 = { k: 1, pan: 0 };

export function createSfx(host) {
  const S = makeSynth(host);
  let lastTick = -9;
  const tone = (o, n) => { n = n || NEAR0; if (n.k < 0.02) return; S.tone(Object.assign({}, o, { vol: (o.vol == null ? 0.04 : o.vol) * n.k, pan: n.pan })); };
  const noise = (o, n) => { n = n || NEAR0; if (n.k < 0.02) return; S.noise(Object.assign({}, o, { vol: (o.vol == null ? 0.05 : o.vol) * n.k, pan: n.pan })); };
  const sq = x => Math.max(0, Math.min(1, x));

  const fx = {
    synth: S,
    /* n = 3, 2, 1 the lights; 0 GO */
    count(n) {
      if (n > 0) { tone({ f: hz(degree(0, F5)), dur: 0.2, type: 'square', vol: 0.03 }); tone({ f: hz(degree(0, F5)) * 2, dur: 0.12, vol: 0.012 }); return; }
      tone({ f: hz(degree(4, F5)), dur: 0.7, type: 'square', vol: 0.03 }); tone({ f: hz(degree(7, F5)), dur: 0.8, type: 'triangle', vol: 0.035, delay: 0.01 });
      tone({ f: hz(degree(11, F5)), dur: 0.5, vol: 0.016, delay: 0.03 }); noise({ dur: 0.2, f0: 5000, q: 1.5, vol: 0.02 });
    },
    /* a car comes down at `speed` m/s of fall */
    land(speed, near) {
      const k = sq(speed / 4);
      tone({ f: 130, to: 48, dur: 0.14 + 0.1 * k, vol: 0.05 + 0.1 * k }, near);
      noise({ dur: 0.1 + 0.1 * k, f0: 1800, f1: 300, kind: 'lowpass', q: 0.7, vol: 0.02 + 0.06 * k }, near);
    },
    wall(speed, near) {
      const k = sq(speed / 6);
      noise({ dur: 0.16, f0: 2600, f1: 500, q: 0.8, vol: 0.03 + 0.08 * k }, near);
      tone({ f: 190, to: 80, dur: 0.1, type: 'square', vol: 0.015 + 0.03 * k }, near);
    },
    car(speed, near) {
      const k = sq(speed / 5);
      tone({ f: 640, to: 320, dur: 0.07, type: 'square', vol: 0.02 + 0.03 * k }, near);
      noise({ dur: 0.07, f0: 3400, q: 2, vol: 0.02 + 0.03 * k }, near);
    },
    flip(near) {
      tone({ f: 240, to: 70, dur: 0.3, type: 'triangle', vol: 0.05 }, near);
      noise({ dur: 0.28, f0: 1400, f1: 260, q: 0.9, vol: 0.05, env: [[0, 0], [0.04, 1], [0.12, 0.3], [0.2, 0.6], [0.28, 0]] }, near);
    },
    wheelie(near) { tone({ f: 320, to: 880, dur: 0.22, type: 'triangle', vol: 0.016 }, near); },
    /* being put back on the road: a rewind, and a pop where the car comes down */
    repoStart() { tone({ f: 1300, to: 180, dur: 0.55, type: 'sawtooth', vol: 0.02 }); noise({ dur: 0.55, f0: 4000, f1: 400, q: 1, vol: 0.03, env: [[0, 0], [0.05, 1], [0.55, 0]] }); },
    repo() { tone({ f: hz(degree(4, F5)), dur: 0.12, type: 'triangle', vol: 0.04 }); tone({ f: hz(degree(7, F5)), dur: 0.16, vol: 0.02, delay: 0.05 }); },
    gate(speed) {
      noise({ dur: 0.35, f0: 1500, f1: 200, q: 0.7, vol: 0.12, attack: 0.002 }); noise({ dur: 0.2, f0: 700, q: 2, vol: 0.06, delay: 0.04 });
      tone({ f: 140, to: 50, dur: 0.3, vol: 0.1 + 0.02 * sq(speed / 6) });
    },
    lap(best) {
      tone({ f: hz(degree(4, F5)), dur: 0.14, type: 'triangle', vol: 0.03 }); tone({ f: hz(degree(7, F5)), dur: 0.22, type: 'triangle', vol: 0.03, delay: 0.09 });
      if (best) tone({ f: hz(degree(11, F5)), dur: 0.3, vol: 0.02, delay: 0.18 });
    },
    star() { [0, 2, 4, 7].forEach((d, i) => tone({ f: hz(degree(d, F5 + 12)), dur: 0.2, type: 'triangle', vol: 0.03, delay: i * 0.06 })); noise({ dur: 0.25, f0: 7000, q: 3, vol: 0.012, delay: 0.1 }); },
    /* a parcel on the road taken: a chime up the minor; a fake one is the same chime with the tritone on the end */
    pick(id) {
      tone({ f: hz(degree(2, F5)), dur: 0.14, type: 'triangle', vol: 0.035 }); tone({ f: hz(id === 'fake' ? F5 + 6 : degree(4, F5)), dur: 0.2, type: 'triangle', vol: 0.035, delay: 0.06 });
    },
    use(id, near) {
      switch (id) {
        case 'ball': noise({ dur: 0.4, f0: 300, f1: 2400, q: 1, vol: 0.06, env: [[0, 0], [0.25, 1], [0.4, 0]] }, near); tone({ f: 70, to: 140, dur: 0.4, type: 'sawtooth', vol: 0.03 }, near); break;
        case 'rocket': noise({ dur: 0.5, f0: 500, f1: 3500, q: 0.8, vol: 0.09, env: [[0, 0], [0.08, 1], [0.5, 0.2]] }, near); tone({ f: 260, to: 900, dur: 0.45, type: 'sawtooth', vol: 0.025 }, near); break;
        case 'leads': for (let i = 0; i < 6; i++) noise({ dur: 0.05, f0: 3200 + i * 230, q: 3, vol: 0.05, delay: i * 0.07 }, near); break;
        case 'parcel': tone({ f: hz(degree(0, F5)), dur: 0.1, type: 'square', vol: 0.03 }, near); tone({ f: hz(degree(0, F5)), dur: 0.1, type: 'square', vol: 0.03, delay: 0.12 }, near); break;
        case 'freeze': noise({ dur: 0.28, f0: 2200, f1: 300, kind: 'lowpass', q: 0.7, vol: 0.06 }, near); break;
        case 'snow': tone({ f: 200, to: 95, dur: 0.1, vol: 0.06 }, near); noise({ dur: 0.1, f0: 1600, q: 0.8, vol: 0.04 }, near); break;
        case 'stone': tone({ f: 95, to: 40, dur: 0.3, vol: 0.12 }, near); noise({ dur: 0.18, f0: 900, f1: 200, q: 1, vol: 0.05 }, near); break;
        case 'fake': tone({ f: hz(degree(0, F4)), dur: 0.2, type: 'triangle', vol: 0.03 }, near); break;
        case 'coffee': tone({ f: 380, to: 1500, dur: 0.35, type: 'triangle', vol: 0.04 }, near); noise({ dur: 0.35, f0: 2500, f1: 6000, q: 1.5, vol: 0.02 }, near); break;
        case 'cut': tone({ f: 700, to: 55, dur: 0.7, type: 'sawtooth', vol: 0.035 }, near); break;
        default: break;
      }
    },
    /* what a pickup does to a car it reaches */
    hit(id, near) {
      switch (id) {
        case 'ball': for (let i = 0; i < 4; i++) noise({ dur: 0.06, f0: 2600 + i * 400, q: 3, vol: 0.07, delay: i * 0.05 }, near); tone({ f: 90, to: 40, dur: 0.25, vol: 0.09 }, near); break;
        case 'rocket': noise({ dur: 0.5, f0: 3200, f1: 150, kind: 'lowpass', q: 0.7, vol: 0.2, attack: 0.002 }, near); tone({ f: 110, to: 36, dur: 0.45, vol: 0.16 }, near); break;
        case 'snow': case 'freeze': noise({ dur: 0.22, f0: 1800, f1: 400, q: 0.9, vol: 0.08 }, near); break;
        case 'stone': noise({ dur: 0.2, f0: 800, q: 1.4, vol: 0.12 }, near); tone({ f: 80, to: 40, dur: 0.2, type: 'square', vol: 0.06 }, near); break;
        case 'fake': noise({ dur: 0.3, f0: 2800, f1: 200, kind: 'lowpass', q: 0.7, vol: 0.14 }, near); tone({ f: 150, to: 50, dur: 0.3, vol: 0.1 }, near); break;
        case 'cut': tone({ f: 500, to: 40, dur: 0.6, type: 'sawtooth', vol: 0.05 }, near); break;
        default: noise({ dur: 0.2, f0: 1500, f1: 300, q: 1, vol: 0.07 }, near); break;
      }
    },
    /* the HOT PARCEL goes off */
    boom(near) {
      noise({ dur: 0.9, f0: 3600, f1: 90, kind: 'lowpass', q: 0.7, vol: 0.3, attack: 0.002 }, near);
      noise({ dur: 0.5, f0: 800, f1: 120, q: 0.8, vol: 0.14, delay: 0.03 }, near); tone({ f: 100, to: 28, dur: 0.8, vol: 0.24 }, near);
    },
    pass(near) { tone({ f: hz(degree(5, F5 + 12)), dur: 0.08, type: 'square', vol: 0.025 }, near); tone({ f: hz(degree(2, F5 + 12)), dur: 0.12, type: 'square', vol: 0.025, delay: 0.07 }, near); },
    /* the fuse: one tick, harder as `urgency` (0 to 1) climbs; never twice in 40 ms */
    tick(urgency, near, at) {
      if (at != null) { if (at - lastTick < 0.04) return; lastTick = at; }
      tone({ f: 1500 + 900 * urgency, dur: 0.025, type: 'square', vol: 0.02 + 0.018 * urgency }, near); noise({ dur: 0.02, f0: 5200, q: 2, vol: 0.012 }, near);
    },
    door() { tone({ f: hz(degree(4, F5 + 12)), dur: 0.1, type: 'triangle', vol: 0.025 }); },
    drop() { tone({ f: 320, to: 120, dur: 0.15, type: 'triangle', vol: 0.04 }); },
    thud() { tone({ f: 150, to: 70, dur: 0.07, vol: 0.04 }); },
    pickup() { tone({ f: hz(degree(2, F5)), dur: 0.1, type: 'triangle', vol: 0.03 }); tone({ f: hz(degree(4, F5)), dur: 0.14, type: 'triangle', vol: 0.03, delay: 0.05 }); },
    delivered(k) { [0, 2, 4, 7].forEach((d, i) => tone({ f: hz(degree(d + (k >= 3 ? 2 : 0), F5 + 12)), dur: 0.16, type: 'triangle', vol: 0.035, delay: i * 0.05 })); tone({ f: hz(F5 + 24), dur: 0.5, vol: 0.016, delay: 0.2 }); },
    lost() { tone({ f: 420, to: 90, dur: 0.5, type: 'triangle', vol: 0.04 }); },
    hurt() { noise({ dur: 0.1, f0: 1200, q: 2, vol: 0.05 }); },
    /* the horn the car wears (parts.js COSMETICS.horn) */
    horn(kind) {
      switch (kind) {
        case 'honk': tone({ f: 233, dur: 0.32, type: 'sawtooth', vol: 0.045, env: [[0, 0], [0.02, 1], [0.26, 0.9], [0.32, 0]] }); tone({ f: 311, dur: 0.32, type: 'sawtooth', vol: 0.035, env: [[0, 0], [0.02, 1], [0.26, 0.9], [0.32, 0]] }); break;
        case 'bell': for (let i = 0; i < 5; i++) { tone({ f: 2200 + i * 330, dur: 0.18, vol: 0.02, delay: i * 0.05 }); noise({ dur: 0.05, f0: 6500, q: 4, vol: 0.012, delay: i * 0.05 }); } break;
        case 'ahooga': tone({ f: 300, to: 620, dur: 0.2, type: 'sawtooth', vol: 0.04 }); tone({ f: 620, to: 260, dur: 0.5, type: 'sawtooth', vol: 0.04, delay: 0.22 }); break;
        default: tone({ f: 440, dur: 0.1, type: 'square', vol: 0.03 }); tone({ f: 440, dur: 0.1, type: 'square', vol: 0.03, delay: 0.16 });
      }
    },
    relevel() { S.relevel(); },
    stop() { S.stop(); }
  };
  return fx;
}

/* the host the machine gives it: the audio context behind Snd, the mixer's VROOM slider, the power switch and the SFX knob */
export function machineHost() {
  return {
    ctx() { const s = window.Snd; if (!s) return null; try { s.wake(); } catch (e) { return null; } return s.ctx || null; },
    bus() { const s = window.Snd; return (s && s.sfx) || (s && s.ctx && s.ctx.destination); },
    on() { const c = window.CRT; return !!c && !!c.on && c.sfx > 0; },
    level() { return window.Mixer ? window.Mixer.get('vroom') : 1; }
  };
}
