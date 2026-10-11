#!/usr/bin/env node
/* Dev tool, not a check: draw VROOM's cars to PNG so a person (or Claude) can LOOK at them -- the real car meshes, the real renderer, a flat floor and a hall's light.
     node scripts/vroom_cars_shots.mjs <outdir> [ids|all|rating:N] [view] [scale]      view: rear (three quarters from behind, the way the chase camera sees a car), side, front, top
   One sheet per call: the cars in a grid, each in a 320 x 180 view of its own. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { png } from './vroom_shots.mjs';
const dir = process.argv[2] || 'vroom-cars', sel = process.argv[3] || 'all', view = process.argv[4] || 'rear', scale = +process.argv[5] || 2;
const { createRaster, W, H } = await import('../apps/vroom/raster.js');
const { CAR_IDS, CARS, specOf } = await import('../apps/vroom/cars.js');
const { carModel, drawCar } = await import('../apps/vroom/car_art.js');
const { sheet, mat } = await import('../apps/vroom/raster_mesh.js');
const { builder } = await import('../apps/vroom/raster_mesh.js');
const { tex } = await import('../apps/vroom/raster_tex.js');
const { rotEuler, lookAt } = await import('../apps/vroom/raster_math.js');
const { LIGHT } = await import('../apps/vroom/scene.js');
const { liveryFor } = await import('../apps/vroom/livery.js').catch(() => ({ liveryFor: null }));
const { RIVALS } = await import('../apps/vroom/rivals.js').catch(() => ({ RIVALS: [] }));

const ids = sel === 'all' ? CAR_IDS : sel.startsWith('rating:') ? CAR_IDS.filter(id => CARS[id].rating === +sel.slice(7) && !CARS[id].special) : sel === 'special' ? CAR_IDS.filter(id => CARS[id].special) : sel.split(',');
const R = createRaster(), gb = builder();
sheet(gb, -3, -3, 3, 3, 0, 6, 6, mat(tex.lino()), 0.6);
const floor = gb.build();
const ID = rotEuler(0, 0, 0);
/* a car standing still on its springs, as the sim would leave it */
function pose(spec, yaw, x, z) {
  const q = new Float64Array([Math.cos(yaw / 2), 0, Math.sin(yaw / 2), 0]), Rm = rotEuler(yaw, 0, 0), g = 15.7;
  const wheels = spec.wheels.map(w => ({ comp: w.load / w.k, spin: 0 }));
  void g;
  return { p: new Float64Array([x, spec.comY + 0.004, z]), q, R: Rm, spec, wheels, steer: 0, v: new Float64Array(3), ghost: 0 };
}
const cols = 2, rows = Math.ceil(ids.length / cols), sw = W, sh = H;
const sheetBuf = new Uint8Array(cols * sw * rows * sh);
ids.forEach((id, n) => {
  const spec = specOf(id), car = pose(spec, 0.0, 0, 0), L = spec.L;
  const rv = process.env.LIVERY ? RIVALS[ids.indexOf(id) % RIVALS.length] : null, lv = liveryFor && rv ? liveryFor(rv) : null;
  const model = carModel(id, rv ? rv.paint : undefined, lv);
  const d = Math.max(0.5, L * 1.25), hh = Math.max(spec.H * 0.5, 0.06), tgt = [0, hh, 0];
  const eye = { rear: [-d * 0.6, 0.2 + hh * 0.5, -d * 0.85], side: [-d * 1.15, 0.1 + hh * 0.3, 0], front: [d * 0.6, 0.18 + hh * 0.4, d * 0.95], top: [0, 0.95, -0.02] }[view];
  const cam = Object.assign(lookAt(eye, tgt), { fov: view === 'top' ? 0.8 : 0.95 });
  const Lt = LIGHT.hall;
  R.view({ x: 0, y: 0, w: W, h: H }, cam); R.env({ sun: Lt.sun, ambient: Lt.ambient, fog: Lt.fog, lights: [] }); R.sky(Lt.sky);
  R.draw(floor, ID);
  drawCar(R, model, car, 0.0);
  R.text(CARS[id].name + ' ' + (spec.ssf).toFixed(2), 60, 3, 15, {});
  const cx = (n % cols) * sw, cy = Math.floor(n / cols) * sh;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) sheetBuf[(cy + y) * cols * sw + cx + x] = R.buf[y * W + x];
});
mkdirSync(dir, { recursive: true });
const name = (sel.replace(/[^a-z0-9]+/gi, '_') + '_' + view) + '.png';
writeFileSync(join(dir, name), png(sheetBuf, cols * sw, rows * sh, scale));
console.log('wrote ' + join(dir, name) + ' (' + ids.length + ' cars)');
