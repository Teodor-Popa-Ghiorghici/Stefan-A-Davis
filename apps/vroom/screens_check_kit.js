/* A SCREEN RIG FOR NODE (dev-only, not packaged): the shared state `G` that game.js makes for the screens, built without a window -- a raster, a camera, keys that are pressed by hand, a career that is saved into a
   variable -- so a check can walk the screens with scripted keys and a script can draw them to PNG. */
import { createRaster } from './raster.js';
import { createCamera } from './camera.js';
import { createScreens } from './screens.js';
import { trackFor } from './tracks.js';
import { fresh, sanitize } from './career.js';
import { createAudio } from './audio.js';
import { createCalls } from './trophy_calls.js';
import { settle } from './sun.js';
import { loadRoads } from './maker_io.js';

export function fakeInput() {
  const pressed = [], down = new Set();
  return {
    pressed, down,
    press(code) { pressed.push(code); },
    hold(code, on) { if (on) down.add(code); else down.delete(code); },
    take(code) { const i = pressed.indexOf(code); if (i < 0) return false; pressed.splice(i, 1); return true; },
    clear() { pressed.length = 0; },
    /* the keys of one hand: the left (W A S D, SPACE fires, R puts back), the right (the arrows, ENTER fires, / puts back), or with no side both (as input.js: the arrows too) */
    drive(side) {
      const k = c => down.has(c), r = side === 'right';
      return { throttle: (r ? k('ArrowUp') : k('KeyW') || (side == null && k('ArrowUp'))) ? 1 : 0, brake: (r ? k('ArrowDown') : k('KeyS') || (side == null && k('ArrowDown'))) ? 1 : 0,
        steer: ((r ? k('ArrowRight') : k('KeyD') || (side == null && k('ArrowRight'))) ? 1 : 0) - ((r ? k('ArrowLeft') : k('KeyA') || (side == null && k('ArrowLeft'))) ? 1 : 0), repo: r ? k('Slash') : k('KeyR'), fire: r ? k('Enter') : k('Space') };
    },
    dispose() {}
  };
}
/* the window's files, in a table: write, read and list as ctx.fs does (a folder is the paths that start with it) */
export function fakeFs() {
  const files = new Map();
  return {
    files,
    async write(p, rec) { files.set(p, rec); },
    async read(p) { return files.get(p) || null; },
    async list(dir) { const out = []; for (const p of files.keys()) if (p.indexOf(dir + '/') === 0 && p.slice(dir.length + 1).indexOf('/') < 0) out.push({ name: p.slice(dir.length + 1) }); return out; }
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
  /* the sound, over a host that has no speaker: everything the screens tell it is said and nothing is made */
  G.audio = createAudio({ studio: null }, { on: () => false, ctx: () => null, bus: () => null, level: () => 1 }, null);
  G.trophy = createCalls();
  /* the roads of the player's own: a disk in a table, the name box answered by hand (G.asked.cb('NAME')), the best laps kept in a variable */
  const fs = fakeFs();
  G.ctx = { fs, ask(title, def, cb) { G.asked = { title, def, cb }; } };
  G.userRoads = []; G.userList = []; G.userBest = {};
  G.refreshRoads = () => loadRoads(fs).then(list => { G.userList = list; G.userRoads = list.filter(r => r.ok).map(r => ({ id: r.id, name: r.name })); return list; });
  G.saveUserBest = () => {}; G.focus = () => {};
  G.settleSun = keep => { const lines = settle(G.career, null); if (lines.length && keep !== false) G.save(); return lines; };
  G.screens = createScreens(G);
  /* a frame: the time moves on, the screen updates and draws */
  G.frame = (dt, n) => { for (let i = 0; i < (n || 1); i++) { G.t += dt == null ? 1 / 60 : dt; G.screens.update(dt == null ? 1 / 60 : dt); G.screens.draw(); } };
  G.press = (...codes) => { for (const c of codes) { G.input.press(c); G.frame(1 / 60); } };
  G.reload = () => { G.career = sanitize(JSON.parse(saved[saved.length - 1])); return G.career; };
  return G;
}
