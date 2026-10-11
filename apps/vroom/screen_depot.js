/* THE DEPOT (docs/vroom/plan.md section 8): a garage with the truck on the bench and the goods on the wall. UP and DOWN change the row (route parts, tuning, looks), LEFT and RIGHT slide along it, and the camera
   goes with the cursor. ENTER buys a part (a tuning part a level at a time); on the weight and on a look it opens the dial, where LEFT and RIGHT turn it, B buys the next level of what is shown and ENTER takes
   it. What a part does, what it costs, and what it will not do (a rating holds every number) is said in the strip along the bottom. */
import { drawCar } from './car_art.js';
import { stand, modelFor } from './showroom.js';
import { roomDraw, boardMesh, frameMesh, frameAt, boardAt, ROWS, ROW_NAMES, BENCH } from './depot_scene.js';
import { C, panel, mid, left, right, hint, head, wrap, tips } from './ui.js';
import { nav } from './input.js';
import { playerLook } from './events.js';
import { ROUTE, TUNING, COSMETICS, MAX_LEVEL } from './parts.js';
import { offer, buy, setBallast, setLook } from './career.js';
import { specOf } from './cars.js';
import { place } from './raster_math.js';

const SHORT = { snowTyres: 'SNOW', headlights: 'LIGHTS', bumperBar: 'BAR', iceChains: 'CHAINS', roofRack: 'RACK', motor: 'MOTOR', gearing: 'GEARS', tyres: 'TYRES', springs: 'SPRINGS', battery: 'BATTERY', ballast: 'WEIGHT', paint: 'PAINT', bobble: 'BOBBLE', horn: 'HORN', plate: 'PLATE', light: 'LAMP' };
const ROMAN = ['', ' I', ' II', ' III'];
const ID = place(0, 0, 0);

export function create(G) {
  let row = 0, col = 0, mode = null, pre = 0, msg = '', msgT = 0, cam = { y: 0.95, z: 1.05, tx: 0, ty: 1.3 };
  const item = () => { const id = ROWS[row][col]; return row === 0 ? { kind: 'route', id } : row === 1 ? { kind: 'tune', id } : { kind: 'look', of: id }; };
  const say = s => { msg = s; msgT = G.t; };
  const levelOf = (c, it) => (it.kind === 'route' ? (c.own.route[it.id] ? 1 : 0) : it.kind === 'tune' ? c.own.tune[it.id] : 0);
  /* the state a board is in: 0 for sale, 1 out of reach, 2 some is bought, 3 all of it is */
  const stateOf = (c, it) => {
    if (it.kind === 'look') return 0;
    const o = offer(c, it); if (o.price == null) return 3;
    return levelOf(c, it) > 0 ? 2 : c.tips >= o.price ? 0 : 1;
  };
  const label = (c, it) => (it.kind === 'look' ? SHORT[it.of] : SHORT[it.id] + (it.kind === 'tune' ? ROMAN[c.own.tune[it.id]] : ''));
  return {
    enter() { row = 0; col = 0; mode = null; msg = ''; G.cam.snap(); },
    state: () => ({ row, col, mode }),
    update() {
      const k = nav(G.input), c = G.career, it = item(), n = ROWS[row].length;
      if (mode === 'look') {                                                    /* choosing among the looks of one kind */
        const items = COSMETICS[it.of].items;
        if (k.dx) pre = (pre + k.dx + items.length) % items.length;
        if (k.buy) { const r = buy(c, { kind: 'look', of: it.of, id: items[pre].id }); say(r.ok ? 'BOUGHT ' + r.name : r.why); if (r.ok) G.save(); }
        if (k.ok) { if (setLook(c, it.of, items[pre].id)) { G.save(); mode = null; } else say('NOT YOURS YET. B BUYS IT'); }
        if (k.back) mode = null;
        return;
      }
      if (mode === 'dial') {
        if (k.dx) setBallast(c, c.ballast + k.dx);
        if (k.buy) { const r = buy(c, { kind: 'tune', id: 'ballast' }); say(r.ok ? 'BOUGHT ' + r.name : r.why); if (r.ok) G.save(); }
        if (k.ok || k.back) { mode = null; G.save(); }
        return;
      }
      if (k.dy) { row = (row + k.dy + 3) % 3; col = Math.min(col, ROWS[row].length - 1); }
      if (k.dx) col = (col + k.dx + n) % n;
      if (k.back) { G.go('title'); return; }
      if (k.ok || k.buy) {
        if (it.kind === 'look') { mode = 'look'; pre = Math.max(0, COSMETICS[it.of].items.findIndex(x => x.id === c.look[it.of])); return; }
        if (it.id === 'ballast' && c.own.tune.ballast > 0 && k.ok) { mode = 'dial'; return; }
        const r = buy(c, it);
        say(r.ok ? 'BOUGHT ' + r.name + ' FOR ' + r.price : r.why);
        if (r.ok) G.save();
      }
    },
    draw() {
      const R = G.R, c = G.career, it = item(), at = boardAt(row, col);
      /* the camera slides along the wall with the cursor: close to the boards for the parts, back at the bench for the looks, so the truck is in the picture while it is painted */
      const PRE = [{ z: 1.05, y: 0.95, ly: 1.3 }, { z: 1.05, y: 0.88, ly: 1.12 }, { z: 0.42, y: 0.62, ly: 0.8 }][row], k = 1 - Math.exp(-1 / 60 * 6);
      cam.tx += ((row === 2 ? 0 : at.x) - cam.tx) * k; cam.z += (PRE.z - cam.z) * k; cam.y += (PRE.y - cam.y) * k; cam.ty += (PRE.ly - cam.ty) * k;
      const px = cam.tx * 0.7, dx = cam.tx * 0.9 - px, dz = 2.4 - cam.z, view = { x: 0, y: 17, w: R.w, h: 95 };
      R.view(view, { x: px, y: cam.y, z: cam.z, yaw: Math.atan2(dx, dz), pitch: Math.atan2(cam.ty - cam.y, Math.hypot(dx, dz)), roll: 0, fov: 0.85, near: 0.05, far: 30 });
      R.env({ sun: { dir: [0.1, 1, -0.3], i: 0.55 }, ambient: [0.5, 0.85], fog: { start: 8, end: 40 }, lights: [] });
      R.sky({ ramp: 7, horizon: 3, zenith: 3 });
      roomDraw(R);
      ROWS.forEach((ids, r) => ids.forEach((id, j) => {
        const bi = r === 0 ? { kind: 'route', id } : r === 1 ? { kind: 'tune', id } : { kind: 'look', of: id };
        R.draw(boardMesh(r, j, label(c, bi), stateOf(c, bi)), ID);
      }));
      R.draw(frameMesh(), frameAt(row, col));
      /* the truck on the bench: its paint as chosen, or as being tried */
      const look = playerLook(mode === 'look' && it.of === 'paint' ? Object.assign({}, c.look, { paint: COSMETICS.paint.items[pre].id }) : mode === 'look' && it.of === 'plate' ? Object.assign({}, c.look, { plate: COSMETICS.plate.items[pre].id }) : c.look);
      const spec = specOf(c.car), car = stand(spec, BENCH.x, BENCH.y + 0.01, BENCH.z, G.t * 0.5 + 0.6, G.t * 5);
      drawCar(R, modelFor(c.car, look.paint, look.livery, look.num), car, BENCH.y + 0.01, {});
      head(R, 'DEPOT', ROW_NAMES[row] + '   ' + (col + 1) + '/' + ROWS[row].length);
      right(R, tips(c.tips), R.w - 6, 4, C.yellow, { outline: C.black });
      this.strip(R, c, it);
      hint(R, mode ? (mode === 'dial' ? 'LEFT RIGHT  WEIGHT      B  BUY MORE RANGE      ENTER  DONE' : 'LEFT RIGHT  LOOK      B  BUY      ENTER  TAKE IT      ESC  BACK') : 'ARROWS  MOVE      ENTER  BUY OR OPEN      ESC  BACK');
    },
    /* the strip along the bottom: the name, what it does, and what it costs */
    strip(R, c, it) {
      const y = 112, h = 58;
      panel(R, 4, y, R.w - 8, h);
      if (it.kind === 'look') {
        const items = COSMETICS[it.of].items, own = mode === 'look' ? items[pre] : items.find(x => x.id === c.look[it.of]);
        mid(R, COSMETICS[it.of].name, R.w / 2, y + 4, C.yellow, { big: true, outline: C.black });
        const have = !!c.own.look[it.of][own.id];
        mid(R, (mode === 'look' ? '< ' : '') + own.name + (mode === 'look' ? ' >' : ''), R.w / 2, y + 16, C.white, { outline: -1 });
        mid(R, have ? (c.look[it.of] === own.id ? 'ON THE TRUCK' : 'YOURS') : own.price > 0 ? own.price + ' TIPS' : 'FOUND, NOT SOLD', R.w / 2, y + 26, have ? C.green : own.price > 0 && c.tips >= own.price ? C.yellow : C.red, { outline: -1 });
        mid(R, mode === 'look' ? 'ENTER TAKES IT. B BUYS IT.' : 'ENTER TO LOOK AT THEM ALL.', R.w / 2, y + 40, C.dim, { outline: -1 });
      } else {
        const def = it.kind === 'route' ? ROUTE[it.id] : TUNING[it.id], o = offer(c, it), lv = levelOf(c, it), maxLv = it.kind === 'route' ? 1 : MAX_LEVEL;
        mid(R, def.name, R.w / 2, y + 4, C.yellow, { big: true, outline: C.black });
        wrap(def.blurb, R.w - 60).forEach((ln, i) => mid(R, ln, R.w / 2, y + 16 + i * 7, C.white, { outline: -1 }));
        for (let i = 0; i < maxLv; i++) { R.rect(R.w / 2 - maxLv * 6 + i * 12, y + 34, 10, 4, i < lv ? C.green : C.mute); }
        const price = o && o.price != null ? o.price : null;
        mid(R, price == null ? 'ALL FITTED' : price + ' TIPS' + (c.tips < price ? '   NEED ' + (price - c.tips) + ' MORE' : ''), R.w / 2, y + 42, price == null ? C.green : c.tips >= price ? C.yellow : C.red, { outline: -1 });
        if (it.id === 'ballast') mid(R, 'DIAL ' + (c.ballast > 0 ? '+' : '') + c.ballast + ' OF +-' + c.own.tune.ballast, R.w / 2, y + 50, C.dim, { outline: -1 });
      }
      if (msg && G.t - msgT < 2.5) mid(R, msg, R.w / 2, y - 8, C.white, { outline: C.black });
    }
  };
}
