/* VROOM's sound, as one thing the game talks to: it says what happened and the sound does what that means. The sim never hears of it (a race keeps a list of what happened in a step, `race.events`), and the
 * game only calls these:
 *
 *   place(p)               where the player is, for the radio: 'menu' | 'depot' | 'day' | 'night'
 *   begin(S)               a race is on screen; S is { race, human, kind, night } (what screen_race.js keeps)
 *   events(race)           after every step of the sim: the lights, a landing, a hit, a pickup, a fuse... as sound
 *   frame(dt, paused)      every frame: the radio and its layers (music.js), the engines and the tyres (engine_sound.js), the fuse; paused hushes the cars and leaves the music
 *   finish(how)            the race is over: 'win' (the podium) or 'miss'; the engines stop and the stinger plays
 *   radio()                V: the other station; what it says is in `toast`
 *   horn(kind)             H
 *   relevel()              the mixer slider moved (the music follows it by itself, being on a studio channel; the effects are ours)
 *   stop()                 the window is closing: nothing is left playing
 * Whether anything is heard at all is the machine's: the power switch, the MUS knob (music) and the SFX knob (effects), asked every time.
 * `toast` is what the radio last said, for the HUD to put up for a few seconds: { text, sub, t }.
 */
import { createMusic, STATION_NAME } from './music.js';
import { createSfx, machineHost } from './sfx.js';
import { createEngines, placeOf } from './engine_sound.js';
import { NAMES } from './score.js';
import { STEP } from './tune.js';

export const TOAST = 3;                      /* seconds the radio's name stays up */

export function createAudio(ctx, host, pref) {
  let alive = true, S = null, sinceHit = 99, tickIn = 0, hush = false, lastTune = null;
  const crt = () => (typeof window !== 'undefined' && window.CRT) || {};
  const music = createMusic({ studio: () => ctx && ctx.studio, playing: () => alive && !!crt().on && crt().mus > 0, pref });
  const sfx = createSfx(host || machineHost());
  const engines = createEngines(sfx.synth);
  const A = {
    music, sfx, engines, toast: null,
    place(p) { if (alive) music.where(p); },
    warm() { if (alive) music.warm(); },
    begin(s) { if (!alive) return; S = s; sinceHit = 99; tickIn = 0; hush = false; music.where(s.night ? 'night' : 'day'); music.warm(); },
    /* how loud, and from which side, is another car's sound to the player's ears (null before a race) */
    near(i) { return S && S.race.field[i] && S.human ? placeOf(S.human.car, S.race.field[i].car) : null; },
    events(race) {
      if (!alive || !S) return;
      const me = S.human, nearOf = i => (i === me.i ? null : A.near(i));
      for (const e of race.events) {
        switch (e.type) {
          case 'count': sfx.count(e.n); break;
          case 'land': { const n = nearOf(e.car); sfx.land(e.speed, n); break; }
          case 'hit-wall': sfx.wall(e.speed, nearOf(e.car)); break;
          case 'hit-car': { const a = nearOf(e.a), b = nearOf(e.b); sfx.car(e.speed, a && b ? (a.k > b.k ? a : b) : a || b); break; }
          case 'flip': sfx.flip(nearOf(e.car)); break;
          case 'wheelie': if (e.car === me.i) sfx.wheelie(); break;
          case 'repo-start': if (e.car === me.i) sfx.repoStart(); break;
          case 'repo': if (e.car === me.i) sfx.repo(); break;
          case 'gate': sfx.gate(e.speed); break;
          case 'lap': if (e.i === me.i) sfx.lap(e.time === e.best); break;
          case 'star': if (e.i === me.i) sfx.star(); break;
          case 'pick': if (e.i === me.i) sfx.pick(e.id); break;
          case 'use': sfx.use(e.id, nearOf(e.i)); break;
          case 'hit': if (e.i === me.i) sinceHit = 0; sfx.hit(e.id, nearOf(e.i)); break;
          case 'boom': if (e.i === me.i) sinceHit = 0; sfx.boom(nearOf(e.i)); break;
          case 'pass': if (e.to === me.i || e.from === me.i) sfx.pass(); break;
          case 'fuse': tickIn = 0; break;
          default: break;
        }
      }
      if (race.lm && race.lm.events) for (const e of race.lm.events) {
        if (e.i !== me.i) continue;
        if (e.type === 'drop') sfx.drop(); else if (e.type === 'thud') sfx.thud(); else if (e.type === 'pickup') sfx.pickup(); else if (e.type === 'delivered') sfx.delivered(e.k); else if (e.type === 'lost') sfx.lost(); else if (e.type === 'hurt') sfx.hurt();
      }
    },
    frame(dt, paused) {
      if (!alive) return;
      if (A.toast) { A.toast.t -= dt; if (A.toast.t <= 0) A.toast = null; }
      sinceHit += dt;
      music.step(dt, S && S.race && S.human ? { race: S.race, human: S.human, sinceHit } : null);
      const tune = music.now();
      if (tune && tune !== lastTune && music.director.on) { lastTune = tune; if (S) A.toast = { text: NAMES[tune] || '', sub: STATION_NAME[music.station()] + ' RADIO', t: TOAST }; }
      if (!S || !S.race || !S.human) { engines.stop(); return; }
      const on = !paused && S.race.state !== 'done' && !S.human.finished;
      hush = !on;
      engines.update(S.race, S.human, hush ? 0 : 1);
      /* the fuse: the nearest burning parcel within earshot ticks faster as it burns down */
      if (on) {
        let best = null;
        for (const f of S.race.field) if (f.bomb) { const n = f === S.human ? { k: 1, pan: 0 } : placeOf(S.human.car, f.car); if (n.d == null || n.d < 25) if (!best || n.k > best.n.k) best = { f, n }; }
        tickIn -= dt;
        if (best && tickIn <= 0) {
          const u = Math.max(0, Math.min(1, 1 - best.f.bomb.fuse / 6));
          sfx.tick(u, best.n, S.race.t);
          tickIn = 0.55 - 0.47 * u;
        }
      }
    },
    finish(how) {
      if (!alive) return;
      engines.stop(); S = null; lastTune = null;
      music.end(how === 'win' ? 'win' : 'miss');
    },
    /* V */
    radio() {
      if (!alive) return null;
      const next = music.radio();
      A.toast = { text: STATION_NAME[next] + ' RADIO', sub: NAMES[music.pool()[0]] || '', t: TOAST };
      return next;
    },
    horn(kind) { if (alive) sfx.horn(kind); },
    /* a race screen has been left: no race is on glass, so the cars fall silent */
    leave() { S = null; engines.stop(); },
    relevel() { if (alive) sfx.relevel(); },
    stop() { alive = false; music.stop(); engines.stop(); sfx.stop(); S = null; }
  };
  void STEP;
  return A;
}
