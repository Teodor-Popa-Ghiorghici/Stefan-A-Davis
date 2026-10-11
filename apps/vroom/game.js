/* THE GAME'S FRAME LOOP (docs/vroom/plan.md sections 4 and 12). One canvas of 320 x 180 that the window manager scales by whole pixels (`data-fit="int"`), a race (race.js) stepped at the sim's fixed
   60 Hz whatever the display's rate is, one view drawn from a chase camera, the HUD over it. Keys come from the canvas (input.js); a window that loses focus pauses the race, because a car with a stuck
   key drives itself into a wall. Everything this file starts -- the animation frame, the listeners -- `mountGame` hands back as one function that stops them. */
import { createRaster, W, H } from './raster.js';
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { carModel } from './car_art.js';
import { RIVALS } from './cars.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { drawView } from './scene.js';
import { drawHud, drawResults, drawPause } from './hud.js';
import { STEP } from './tune.js';

export function mountGame(root, ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'gamepane';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.className = 'gamecv';
  cv.dataset.fit = 'int';
  cv.tabIndex = 0;
  wrap.appendChild(cv);
  root.appendChild(wrap);
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const img = g.createImageData(W, H), R = createRaster(), models = {};
  const calmQ = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const cam = createCamera(); cam.calm = calmQ();
  const onCalm = () => { cam.calm = calmQ(); };
  window.addEventListener('calm-changed', onCalm);
  const G = { track: null, race: null, human: null, paused: false, sel: 0, acc: 0, fps: 0 };
  const input = createInput(cv, { blur: () => { if (G.race && G.race.state !== 'done' && G.race.state !== 'over') G.paused = true; } });

  /* a new race: the courier at the back of a grid of three rivals */
  function start() {
    if (!G.track) G.track = buildTrack(TRACKS.sorting);
    const entries = RIVALS.slice(0, 3).map(r => ({ id: r.id, name: r.name, car: r.car, tier: r.tier, paint: r.paint })).concat([{ id: 'you', name: 'YOU', car: 'courier', human: true, tier: 0 }]);
    G.race = createRace({ track: G.track, entries, laps: G.track.laps, rating: 0, seed: (Date.now() & 0xffff) | 1 });
    G.human = G.race.field.find(f => f.human);
    G.race.field.forEach(f => { const k = f.entry.car + ':' + f.entry.paint; f.model = models[k] || (models[k] = carModel(f.entry.car, f.entry.paint)); });
    G.paused = false; G.sel = 0; G.acc = 0; cam.snap();
  }
  start();

  /* what the keys do outside the driving: pause, and the finish board */
  function menus() {
    const r = G.race;
    if (input.take('Escape') || input.take('KeyP')) { if (r.state !== 'done') G.paused = !G.paused; G.sel = 0; }
    if (G.paused) {
      if (input.take('ArrowDown') || input.take('KeyS')) G.sel = (G.sel + 1) % 3;
      if (input.take('ArrowUp') || input.take('KeyW')) G.sel = (G.sel + 2) % 3;
      if (input.take('Enter') || input.take('Space')) { if (G.sel === 0) G.paused = false; else if (G.sel === 1) start(); else if (ctx && ctx.close) ctx.close(); }
    } else if (r.state === 'done' && (input.take('Enter') || input.take('Space'))) start();
    input.clear();
  }

  let raf = 0, alive = true, last = 0, frames = 0, clock = 0;
  const frame = ts => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    const r = G.race;
    menus();
    if (!G.paused) {
      G.acc += dt;
      let n = 0;
      while (G.acc >= STEP && n < 6) {
        r.step(input.drive());
        for (const e of r.events) {
          if (e.type === 'hit-wall' && e.car === G.human.i) cam.shake(Math.min(0.03, e.speed * 0.003));
          if (e.type === 'land' && e.car === G.human.i) cam.shake(Math.min(0.03, e.speed * 0.004));
        }
        G.acc -= STEP; n++;
      }
      if (n === 6) G.acc = 0;
    }
    const spec = cam.update(G.human.car, G.paused ? 0 : dt, G.track.col);
    drawView(R, { x: 0, y: 0, w: W, h: H }, G.track, r.field, spec);
    drawHud(R, r, G.human, { fps: window.__vroomFps ? G.fps : null });
    if (r.state === 'done' || (r.state === 'over' && G.human.finished && r.overT > 1.5)) drawResults(R, r, {});
    if (G.paused) drawPause(R, { sel: G.sel });
    R.present(img); g.putImageData(img, 0, 0);
    frames++; clock += dt; if (clock >= 0.5) { G.fps = Math.round(frames / clock); frames = 0; clock = 0; }
  };
  raf = requestAnimationFrame(frame);
  cv.addEventListener('mousedown', () => cv.focus());
  setTimeout(() => { if (alive) cv.focus(); }, 0);
  return () => {
    alive = false; if (raf) cancelAnimationFrame(raf);
    input.dispose(); window.removeEventListener('calm-changed', onCalm);
    wrap.remove();
  };
}
