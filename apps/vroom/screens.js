/* THE SCREENS OF THE GAME (docs/vroom/plan.md section 9): a title, the cups, the garage, the depot, a single race, the race itself and the board after it. Each is a small object made from the game's shared state
   `G` and asked for four things -- `enter(args)` when it is shown, `update(dt)`, `draw()` and `leave()` -- so the frame loop in game.js does not know which one it is running. The keys are read once
   a frame, in one place (`nav`), so every menu answers to the same ones: the arrows or WASD to move, ENTER or SPACE to choose, ESC to go back. Pure but for the raster and the keys it is given. */
import { create as title } from './screen_title.js';
import { create as cups } from './screen_cups.js';
import { create as garage } from './screen_garage.js';
import { create as depot } from './screen_depot.js';
import { create as single } from './screen_single.js';
import { create as modes } from './screen_modes.js';
import { create as race } from './screen_race.js';
import { create as finish } from './screen_finish.js';

export function createScreens(G) {
  const all = { title: title(G), cups: cups(G), garage: garage(G), depot: depot(G), single: single(G), modes: modes(G), race: race(G), finish: finish(G) };
  let cur = null, name = null;
  const S = {
    get name() { return name; }, get screen() { return cur; },
    go(n, args) {
      if (cur && cur.leave) cur.leave();
      name = n; cur = all[n];
      if (cur.enter) cur.enter(args || {});
    },
    update(dt) { if (cur) cur.update(dt); },
    draw() { if (cur) cur.draw(); }
  };
  return S;
}
