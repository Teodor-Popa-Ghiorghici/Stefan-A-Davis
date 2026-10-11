/* THE GAME'S FRAME LOOP (docs/vroom/plan.md sections 4 and 12). One canvas of 320 x 180 that the window manager scales by whole pixels (`data-fit="int"`), the screens of screens.js drawn into it one at a time, the
   race stepped at the sim's fixed 60 Hz whatever the display's rate is. The career is loaded from the window's save before the first screen and saved by the screens whenever it changes (`G.save`). Keys come
   from the canvas (input.js); a window that loses focus pauses the race. Everything this file starts -- the animation frame, the listeners -- `mountGame` hands back as one function that stops them. */
import { createRaster, W, H } from './raster.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createScreens } from './screens.js';
import { trackFor } from './tracks.js';
import { fresh, sanitize } from './career.js';

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
  };
  G.screens = createScreens(G);

  let raf = 0, alive = true, last = 0, frames = 0, clock = 0;
  const frame = ts => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (G.ready) {
      G.t += dt;
      G.screens.update(dt);
      G.screens.draw();
    } else { R.rect(0, 0, W, H, 0); }
    R.present(img); g.putImageData(img, 0, 0);
    frames++; clock += dt; if (clock >= 0.5) { G.fps = Math.round(frames / clock); frames = 0; clock = 0; }
  };
  /* the career first (a window asked for before its save arrives shows black for a moment), then the title */
  Promise.resolve(ctx && ctx.load ? ctx.load(KEY) : null).catch(() => null).then(raw => {
    if (!alive) return;
    G.career = sanitize(raw);
    G.ready = true;
    G.go(G.career.run ? 'cups' : 'title');
  });
  raf = requestAnimationFrame(frame);
  cv.addEventListener('mousedown', () => cv.focus());
  setTimeout(() => { if (alive) cv.focus(); }, 0);
  return () => {
    alive = false; if (raf) cancelAnimationFrame(raf);
    G.input.dispose(); window.removeEventListener('calm-changed', onCalm);
    void saving;
    wrap.remove();
  };
}
