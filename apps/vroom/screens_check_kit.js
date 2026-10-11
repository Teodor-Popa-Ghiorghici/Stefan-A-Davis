/* A SCREEN RIG FOR NODE (dev-only, not packaged): the shared state `G` that game.js makes for the screens, built without a window -- a raster, a camera, keys that are pressed by hand, a career that is saved into a
   variable -- so a check can walk the screens with scripted keys and a script can draw them to PNG. */
import { createRaster } from './raster.js';
import { createCamera } from './camera.js';
import { createScreens } from './screens.js';
import { trackFor } from './tracks.js';
import { fresh, sanitize } from './career.js';

export function fakeInput() {
  const pressed = [], down = new Set();
  return {
    pressed, down,
    press(code) { pressed.push(code); },
    hold(code, on) { if (on) down.add(code); else down.delete(code); },
    take(code) { const i = pressed.indexOf(code); if (i < 0) return false; pressed.splice(i, 1); return true; },
    clear() { pressed.length = 0; },
    drive() { const k = c => down.has(c); return { throttle: k('KeyW') ? 1 : 0, brake: k('KeyS') ? 1 : 0, steer: (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0), repo: false, fire: k('Space') }; },
    dispose() {}
  };
}
export function rig(career) {
  const saved = [];
  const G = { R: createRaster(), cam: createCamera(), input: fakeInput(), career: career || fresh(), t: 1, fps: 60, onBlur: null, showFps: false, ready: true, saved };
  G.hall = () => trackFor('sorting', 'f');
  G.save = () => { saved.push(JSON.stringify(G.career)); };
  G.go = (n, a) => G.screens.go(n, a);
  /* the ghosts the window keeps apart from the career, here in a table */
  G.ghosts = {}; G.loadGhost = key => Promise.resolve(G.ghosts[key] || null); G.saveGhost = (key, g) => { G.ghosts[key] = g; };
  G.screens = createScreens(G);
  /* a frame: the time moves on, the screen updates and draws */
  G.frame = (dt, n) => { for (let i = 0; i < (n || 1); i++) { G.t += dt == null ? 1 / 60 : dt; G.screens.update(dt == null ? 1 / 60 : dt); G.screens.draw(); } };
  G.press = (...codes) => { for (const c of codes) { G.input.press(c); G.frame(1 / 60); } };
  G.reload = () => { G.career = sanitize(JSON.parse(saved[saved.length - 1])); return G.career; };
  return G;
}
