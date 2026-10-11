/* THE GAME'S FRAME LOOP (docs/vroom/plan.md sections 4 and 12). One canvas of 320 x 180 that the window manager scales by whole pixels (`data-fit="int"`), the screens of screens.js drawn into it one at a time, the
   race stepped at the sim's fixed 60 Hz whatever the display's rate is. The career is loaded from the window's save before the first screen and saved by the screens whenever it changes (`G.save`). Keys come
   from the canvas (input.js); a window that loses focus pauses the race. Everything this file starts -- the animation frame, the listeners -- `mountGame` hands back as one function that stops them. */
import { createRaster, W, H } from './raster.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createScreens } from './screens.js';
import { trackFor } from './tracks.js';
import { fresh, sanitize } from './career.js';
import { createAudio } from './audio.js';
import { createCalls } from './trophy_calls.js';
import { settle } from './sun.js';
import { drawRadio } from './radio_hud.js';

const KEY = 'vroom.v1';

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
  const img = g.createImageData(W, H), R = createRaster();
  const calmQ = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const cam = createCamera(); cam.calm = calmQ();
  const onCalm = () => { cam.calm = calmQ(); };
  window.addEventListener('calm-changed', onCalm);
  const G = { ctx, R, cam, career: fresh(), t: 0, fps: 0, onBlur: null, showFps: !!window.__vroomFps, screens: null, ready: false };
  G.input = createInput(cv, { blur: () => { if (G.onBlur) G.onBlur(); } });
  G.hall = () => trackFor('sorting', 'f');                       /* the room behind the menus */
  G.go = (name, args) => G.screens.go(name, args);
  let saving = null;
  G.save = () => {
    try { const p = ctx && ctx.save ? ctx.save(KEY, JSON.parse(JSON.stringify(G.career))) : null; if (p && p.catch) saving = p.catch(() => {}); } catch (e) { /* a save that fails is tried again at the next change */ }
    G.trophy.career(G.career);                                   /* the ledger counts what the career holds every time it changes */
  };
  /* a time trial's best run, kept apart from the career (it is a few kilobytes of keys): one key to a road and variant */
  G.loadGhost = key => Promise.resolve(ctx && ctx.load ? ctx.load('ghost.' + key) : null).then(g => (g && typeof g.text === 'string' && g.car ? g : null)).catch(() => null);
  G.saveGhost = (key, g) => { try { const p = ctx && ctx.save ? ctx.save('ghost.' + key, g) : null; if (p && p.catch) p.catch(() => {}); } catch (e) { /* tried again next time */ } };
  /* the radio's station is the player's own choice, kept apart from the career (audio.js, music.js) */
  G.radioPref = null;
  Promise.resolve(ctx && ctx.load ? ctx.load('vroom.radio.v1') : null).then(v => { if (v === 'race' || v === 'night') G.radioPref = v; }).catch(() => {});
  G.audio = createAudio(ctx, null, { get: () => G.radioPref, set: v => { G.radioPref = v; try { const p = ctx && ctx.save ? ctx.save('vroom.radio.v1', v) : null; if (p && p.catch) p.catch(() => {}); } catch (e) { /* the choice is kept for this session anyway */ } } });
  const onMix = () => G.audio.relevel();
  window.addEventListener('mixer-changed', onMix);
  G.paused = false;
  G.trophy = createCalls();
  /* the machine's SUN for what the career says is earned and not yet paid (sun.js): once, through Economy.earn with the game's id so the golden eggs can raise it. `keep` false leaves the save to the caller. */
  G.settleSun = keep => {
    try {
      const E = window.Economy, lines = settle(G.career, (n, why) => (E && E.earn ? E.earn(n, why, { game: 'vroom' }) : n));
      if (lines.length && keep !== false) G.save();
      return lines;
    } catch (e) { return []; }
  };
  G.screens = createScreens(G);

  let raf = 0, alive = true, last = 0, frames = 0, clock = 0;
  const frame = ts => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (G.ready) {
      G.t += dt;
      if (G.input.take('KeyV') && G.audio.radio()) G.trophy.radio();           /* V is the radio wherever you are */
      G.screens.update(dt);
      G.audio.frame(dt, G.paused);
      G.screens.draw();
      drawRadio(R, G.audio.toast);
    } else { R.rect(0, 0, W, H, 0); }
    R.present(img); g.putImageData(img, 0, 0);
    frames++; clock += dt; if (clock >= 0.5) { G.fps = Math.round(frames / clock); frames = 0; clock = 0; }
  };
  /* the career first (a window asked for before its save arrives shows black for a moment), then the title */
  Promise.resolve(ctx && ctx.load ? ctx.load(KEY) : null).catch(() => null).then(raw => {
    if (!alive) return;
    G.career = sanitize(raw);
    G.trophy.career(G.career);
    G.settleSun();                                              /* whatever the career had earned and was not paid for */
    G.ready = true;
    G.go(G.career.run ? 'cups' : 'title');
  });
  raf = requestAnimationFrame(frame);
  cv.addEventListener('mousedown', () => cv.focus());
  setTimeout(() => { if (alive) cv.focus(); }, 0);
  return () => {
    alive = false; if (raf) cancelAnimationFrame(raf);
    G.input.dispose(); window.removeEventListener('calm-changed', onCalm); window.removeEventListener('mixer-changed', onMix); G.audio.stop(); G.trophy.stop();
    void saving;
    wrap.remove();
  };
}
