/* THE 2P SPLIT, THE RACE (docs/vroom/plan.md section 9): two people at one keyboard, the picture cut in two, 320 x 90 each, a chase camera and a HUD of its own in each half (hud.js and scene.js both take a rectangle:
   that is what they were written for). P1 is the top half and the left hand of the keyboard (W A S D, SPACE or E or SHIFT to fire, R to be put back), P2 the bottom half and the right (the arrows, ENTER or RIGHT SHIFT
   or 0 on the pad, / to be put back). The field is the people and up to six CPU cars; the race is over for the screen when both people have finished, and the board says who won. Nothing is paid, kept or earned:
   the career is not touched (a second person's win must not be a first person's money) and the trophies are not told. The vertical field of view is narrower in a half (0.58 against 1.0), so that the
   picture is as wide to the eye as the whole one: a half that kept the whole's field would be a fisheye. */
import { createRace } from './race.js';
import { setupSplit } from './events.js';
import { createCamera } from './camera.js';
import { drawView } from './scene.js';
import { drawHud, drawPause, drawResults, fmtTime } from './hud.js';
import { modelFor } from './showroom.js';
import { STEP } from './tune.js';
import { nav } from './input.js';
import { C, mid, panel } from './ui.js';
import { PAINT } from './events.js';

export const HALF = 90, FOV = 0.58;
export function create(G) {
  let S = null;
  const cams = [createCamera(), createCamera()];
  const items = ['RESUME', 'RESTART', 'QUIT'];
  function begin() {
    const s = setupSplit(G.career, S.ev), race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
    S.s = s; S.race = race; S.humans = [race.field.find(f => f.entry.id === 'p1'), race.field.find(f => f.entry.id === 'p2')]; S.human = S.humans[0];
    race.field.forEach(f => { f.model = modelFor(f.entry.car, f.entry.paint, f.entry.livery, f.entry.num); });
    S.paused = false; G.paused = false; S.sel = 0; S.acc = 0; S.over = false; S.t0 = 0; S.board = false;
    cams.forEach(c => { c.calm = G.cam.calm; c.snap(); });
    G.live = S;
    G.audio.begin({ race, human: S.human, kind: 'split', night: !!(s.track.def && s.track.def.light === 'night') });
  }
  return {
    enter(args) { S = { ev: args.ev }; G.onBlur = () => { if (S && S.race && !S.board) S.paused = true; }; begin(); },
    leave() { G.onBlur = null; G.live = null; G.paused = false; G.audio.leave(); },
    update(dt) {
      const I = G.input, r = S.race;
      G.paused = S.paused;
      if (S.paused) {
        const k = nav(I);
        if (k.back) S.paused = false;
        if (k.dy) S.sel = (S.sel + k.dy + items.length) % items.length;
        if (k.ok) { if (S.sel === 0) S.paused = false; else if (S.sel === 1) begin(); else G.go('splitmenu'); }
        return;
      }
      if (S.board) { const k = nav(I); if (k.ok) begin(); else if (k.back) G.go('splitmenu'); return; }
      if (I.take('Escape') || I.take('KeyP')) { S.paused = true; G.paused = true; S.sel = 0; }
      I.clear();
      S.acc += dt;
      let n = 0;
      while (S.acc >= STEP && n < 6) {
        r.step([I.drive('left'), I.drive('right')]);
        G.audio.events(r);
        for (const e of r.events) S.humans.forEach((h, i) => {
          if (e.type === 'hit-wall' && e.car === h.i) cams[i].shake(Math.min(0.03, e.speed * 0.003));
          if (e.type === 'land' && e.car === h.i) cams[i].shake(Math.min(0.03, e.speed * 0.004));
          if ((e.type === 'hit' || e.type === 'boom') && e.i === h.i) cams[i].shake(0.05);
        });
        S.acc -= STEP; n++;
      }
      if (n === 6) S.acc = 0;
      if (S.humans.every(h => h.finished) && !S.over) { S.over = true; S.t0 = r.t; G.audio.finish('win'); }
      if (S.over && r.t - S.t0 > 1.5) S.board = true;
    },
    draw() {
      const R = G.R, r = S.race, T = S.s.track;
      S.humans.forEach((h, i) => {
        const rect = { x: 0, y: i * HALF, w: R.w, h: HALF }, spec = cams[i].update(h.car, S.paused ? 0 : 1 / 60, T.col, { fov: FOV });
        drawView(R, rect, T, r.field, spec, { pickups: { P: r.pickups, t: r.t > 0 ? r.t : 0 }, t: r.t, broken: r.world.broken, me: h, headlights: !!(h.entry.parts && h.entry.parts.headlights), calm: G.cam.calm });
        drawHud(R, r, h, { rect, mode: 'split' });
        R.text(i ? 'P2' : 'P1', R.w / 2, rect.y + 3, i ? PAINT.orange : C.white, { outline: C.black });
      });
      R.rect(0, HALF - 1, R.w, 2, C.black);
      if (S.board) {
        drawResults(R, r, { prompt: 'ENTER  AGAIN      ESC  BACK' });
        const [a, b] = S.humans, win = a.finishT <= b.finishT ? 'P1' : 'P2';
        panel(R, 90, 8, R.w - 180, 14);
        mid(R, win + ' WINS  ' + fmtTime(Math.min(a.finishT, b.finishT)), R.w / 2, 12, C.yellow, { outline: C.black });
      }
      if (S.paused) drawPause(R, { sel: S.sel, items });
    }
  };
}
