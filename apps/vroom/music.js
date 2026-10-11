/* VROOM's music: which tune, which station, how much of it, and what happens when the race is over.
 *
 *   THE RADIO   two stations: RACE (the drum and bass pool) and NIGHT (the lo-fi pool). Left alone, the menus, the depot and the night roads play NIGHT and a road by day plays RACE; V takes the other one, and the
 *               choice is kept (`A.pref`) until V is pressed again. Which tune of a pool is the director's (apps/director.js): each is heard through twice, the next is arranged in the last fourteen seconds
 *               and starts on the downbeat after the old one, in the order of the pool; a change of station is the one thing that cannot wait, and takes a short crossfade that begins on a bar line.
 *   THE LAYERS  the tune is a core that is a tune on its own and two layers the race rides while it plays (music_heat.js): `last` for the last lap, `fight` for a car close by. Fast in, slow out, glided to
 *               by the desk; nothing restarts, ducks or re-cues the tune.
 *   THE END     a stinger (a win, a miss) is played once over the top of the music, which goes out under it; when it has had its tail the radio comes back.
 * It plays on the studio's own 'vroom' channel through `studio.deck('vroom')`, so the MUS knob and the taskbar mixer's VROOM slider set how loud, and the deck is the only thing that is ever playing:
 * `stop()` fades it and leaves nothing behind.
 *
 * `createMusic(A)` wants:
 *   A.studio()   the studio (ctx.studio)
 *   A.playing()  whether it may make a sound at all (the window is alive, the set is on, MUS is up)
 *   A.pref       { get(), set(v) } the station the player chose, or null for the place's own (optional)
 */
import { createDirector } from '../director.js';
import { POOLS, NAMES, song as scoreOf, sting as stingOf, secsOf } from './score.js';
import { heat, lean, FEEL, LAYER_KEYS } from './music_heat.js';

export const GLIDE = 0.35;                 /* seconds a layer takes to come to a new level on the desk */
export const PUSH = 0.16, EPS = 0.02;      /* how often a changed level is sent to the desk, and how small a change is not worth sending */
export const TAIL = 0.6;                   /* seconds after a stinger's last bar before the radio comes back */
export const PLACES = ['menu', 'depot', 'day', 'night'];
/* the station each place plays when nobody has chosen */
export const AUTO = { menu: 'night', depot: 'night', day: 'race', night: 'night' };
export const STATIONS = ['race', 'night'];
export const STATION_NAME = { race: 'RACE', night: 'NIGHT' };
const rotate = (a, k) => { const n = a.length, j = ((k % n) + n) % n; return a.slice(j).concat(a.slice(0, j)); };

export function createMusic(A) {
  const M = {
    place: 'menu', seed: 0, lv: { last: 0, fight: 0 }, sent: null, pushT: 0, hold: 0, chosen: null, started: null,
    deck() { const S = A.studio && A.studio(); return S && S.deck ? S.deck('vroom') : null; },
    /* the station now playing: the player's choice, else the place's own */
    station() { const p = M.chosen || (A.pref && A.pref.get()); return STATIONS.indexOf(p) >= 0 ? p : AUTO[M.place]; },
    pool() { return rotate(POOLS[M.station()], M.seed); },
    now() { return dir.cur; },
    title() { return NAMES[dir.cur] || ''; },
    /* where the player is: a change into a race or the depot starts the pool from the next tune along, so no two races open alike */
    where(p) {
      if (PLACES.indexOf(p) < 0 || p === M.place) return;
      const was = M.place; M.place = p;
      if ((p === 'day' || p === 'night') && was !== 'day' && was !== 'night') M.seed++;
    },
    /* V: the other station. Returns its name. */
    radio() {
      const next = STATIONS[(STATIONS.indexOf(M.station()) + 1) % STATIONS.length];
      M.chosen = next; if (A.pref) A.pref.set(next);
      M.seed++;
      return next;
    },
    /* load the instruments of the tune that will be heard first, so the first bar does not wait for them */
    warm() {
      const S = A.studio && A.studio(), D = M.deck();
      if (!S || !D || !D.preload || !A.playing()) return;
      try { Promise.resolve(D.preload(scoreOf(S.lang, M.pool()[0]))).catch(() => {}); } catch (e) { /* a tune that will not build is play()'s to report */ }
    },
    /* the race is over: a stinger over the music, then the radio again. `how` is 'win' or 'miss'. */
    end(how) {
      const S = A.studio && A.studio(), D = M.deck();
      if (!S || !D || !A.playing() || !stingOf(S.lang, how)) return;
      const sg = stingOf(S.lang, how);
      M.hold = secsOf(sg) + TAIL;
      dir.stop();
      Promise.resolve(D.play(sg, { fade: 0.12, fadeIn: 0, loop: false })).catch(() => {});
    },
    /* every frame: `S` is { race, human, sinceHit } while a race is on screen and null in a menu. Keeps the radio going, rides the layers. */
    step(dt, S) {
      if (M.hold > 0) { M.hold -= dt; return; }
      dir.sync();
      dir.rotStep();
      const h = S && S.race ? heat(S.race, S.human, S.sinceHit) : { last: 0, fight: 0 };
      LAYER_KEYS.forEach(k => { M.lv[k] = lean(M.lv[k], h[k], dt, FEEL[k]); if (Math.abs(M.lv[k] - h[k]) < 0.002) M.lv[k] = h[k]; });
      M.pushT -= dt;
      const D = M.deck();
      if (M.pushT > 0 || !D || !dir.on || !M.sent) return;
      const moved = LAYER_KEYS.some(k => Math.abs(M.lv[k] - (M.sent[k] || 0)) >= EPS), residue = LAYER_KEYS.some(k => M.lv[k] === h[k] && M.lv[k] !== M.sent[k]);
      if (!moved && !residue) return;
      M.pushT = PUSH; M.sent = Object.assign({}, M.lv);
      D.levels(Object.assign({}, M.lv), { glide: GLIDE });
    },
    stop() { dir.stop(); M.sent = null; M.hold = 0; }
  };
  const dir = createDirector({
    studio: () => A.studio && A.studio(), channel: 'vroom', playing: () => A.playing() && M.hold <= 0, pool: () => M.pool(), minLoops: 2, prep: 14, fade: 1.6, segueFade: 1.2,
    score: (L, id) => scoreOf(L, id), levels: () => Object.assign({}, M.lv), onStart: id => { M.started = id; M.sent = Object.assign({}, M.lv); }
  });
  M.director = dir;
  return M;
}
