/* THE RACE (docs/vroom/plan.md sections 4 and 9): a race from events.js stepped at the sim's fixed 60 Hz whatever the display's rate is, one view drawn from the chase camera, the HUD over it, a pause that
   asks what you want. When the race is done the career is told (career.js finishRace: the pay, the records, the cup moving on) and the board after it is the next screen. A window that loses the keyboard
   pauses the race, because a car with a stuck key drives itself into a wall. */
import { createRace } from './race.js';
import { setup } from './events.js';
import { createTally } from './tally.js';
import { drawView } from './scene.js';
import { drawHud, drawPause } from './hud.js';
import { modelFor } from './showroom.js';
import { finishRace } from './career.js';
import { quitCup } from './career.js';
import { STEP } from './tune.js';
import { nav } from './input.js';
import { CARS } from './cars.js';
import { C, mid } from './ui.js';

export function create(G) {
  let S = null;
  const items = () => (S.ev.kind === 'cup' ? ['RESUME', 'QUIT (COSTS A TRY)'] : ['RESUME', 'RESTART', 'QUIT']);
  function begin() {
    const s = setup(G.career, S.ev), race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
    S.s = s; S.race = race; S.human = race.field.find(f => f.human); S.tally = createTally(S.human.i);
    race.field.forEach(f => { f.model = modelFor(f.entry.car, f.entry.paint, f.entry.livery, f.entry.num); });
    S.paused = false; S.sel = 0; S.acc = 0; S.over = false; G.cam.snap();
    G.live = S;                                                         /* what the checks look at: the race, the player's car, the tally */
  }
  function conclude() {
    const r = S.race, s = S.s, rows = r.results(), mine = rows.find(x => x.human);
    const res = finishRace(G.career, { kind: s.kind, track: s.trackId, v: s.v, rating: s.rating, laps: s.laps, n: s.n, place: mine.place, time: mine.time, tally: S.tally, rows });
    G.save();
    S.over = true;
    G.go('finish', { rows, res, kind: s.kind, mine, s, ev: S.ev, tally: S.tally });
  }
  return {
    enter(args) { S = { ev: args.ev }; G.onBlur = () => { if (S && S.race && S.race.state !== 'done' && S.race.state !== 'over') S.paused = true; }; begin(); },
    leave() { G.onBlur = null; G.live = null; },
    update(dt) {
      const I = G.input, r = S.race;
      if (S.paused) {
        const k = nav(I), n = items().length;
        if (k.back) S.paused = false;
        if (k.dy) S.sel = (S.sel + k.dy + n) % n;
        if (k.ok) {
          if (S.sel === 0) S.paused = false;
          else if (S.sel === 1 && S.ev.kind !== 'cup') begin();
          else { if (S.ev.kind === 'cup') quitCup(G.career); G.save(); G.go(S.ev.kind === 'cup' ? 'cups' : 'title'); }
        }
        return;
      }
      if (I.take('Escape') || I.take('KeyP')) { if (r.state !== 'done') { S.paused = true; S.sel = 0; } }
      I.clear();
      S.acc += dt;
      let n = 0;
      while (S.acc >= STEP && n < 6) {
        r.step(I.drive());
        S.tally.eat(r);
        for (const e of r.events) {
          if (e.type === 'hit-wall' && e.car === S.human.i) G.cam.shake(Math.min(0.03, e.speed * 0.003));
          if (e.type === 'land' && e.car === S.human.i) G.cam.shake(Math.min(0.03, e.speed * 0.004));
          if ((e.type === 'hit' && e.i === S.human.i) || (e.type === 'boom' && e.i === S.human.i)) G.cam.shake(0.05);
        }
        S.acc -= STEP; n++;
      }
      if (n === 6) S.acc = 0;
      if (r.state === 'done' && !S.over) conclude();
    },
    draw() {
      const R = G.R, r = S.race, spec = G.cam.update(S.human.car, S.paused ? 0 : 1 / 60, S.s.track.col);
      drawView(R, { x: 0, y: 0, w: R.w, h: R.h }, S.s.track, r.field, spec, { pickups: { P: r.pickups, t: r.t > 0 ? r.t : 0 }, t: r.t, broken: r.world.broken, me: S.human, headlights: !!(S.human.entry.parts && S.human.entry.parts.headlights), calm: G.cam.calm });
      drawHud(R, r, S.human, { fps: G.showFps ? G.fps : null });
      if (S.s.swapped && r.state === 'count') { mid(R, 'THE ' + CARS[S.s.swapped.from].name + ' IS TOO FAST FOR THIS CLASS.', R.w / 2, 120, C.white, { outline: C.black }); mid(R, 'YOU ARE IN THE ' + CARS[S.s.swapped.to].name + '.', R.w / 2, 128, C.yellow, { outline: C.black }); }
      if (S.paused) drawPause(R, { sel: S.sel, items: items() });
    }
  };
}
