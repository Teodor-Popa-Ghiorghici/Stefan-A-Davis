#!/usr/bin/env node
/* Dev tool, not a check: draw VROOM's pickups to a PNG sheet: each model on the floor in the hall's light (the parcel, the fake, the ball, the rocket, the snowball, the stone, the puddle, a burst and a splash), and the ten HUD icons.
     node scripts/vroom_pickup_shots.mjs <outdir> [scale] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { png } from './vroom_shots.mjs';
const dir = process.argv[2] || 'vroom-pickups', scale = +process.argv[3] || 3;
const { createRaster, W, H } = await import('../apps/vroom/raster.js');
const { pickupModels } = await import('../apps/vroom/pickups_art.js');
const { drawIcon, ICON_IDS } = await import('../apps/vroom/pickups_icons.js');
const { sheet, mat, builder } = await import('../apps/vroom/raster_mesh.js');
const { tex } = await import('../apps/vroom/raster_tex.js');
const { rotEuler, lookAt, place } = await import('../apps/vroom/raster_math.js');
const { LIGHT } = await import('../apps/vroom/scene.js');
const R = createRaster(), gb = builder(); sheet(gb, -3, -3, 3, 3, 0, 6, 6, mat(tex.lino()), 0.6);
const floor = gb.build(), ID = rotEuler(0, 0, 0), M = pickupModels();
const items = [['spot', 0.13, 1], ['fake', 0.13, 1], ['ball', 0.11, 1], ['rocket', 0.05, 1], ['snow', 0.05, 1], ['stone', 0.09, 1], ['puddle', 0, 1], ['boom', 0.2, 0.18], ['splash', 0.15, 0.15]];
const cols = 3, rows = 4, buf = new Uint8Array(cols * W * rows * H);
const Lt = LIGHT.hall;
items.concat([['icons']]).forEach(([name, y, sc], n) => {
  R.view({ x: 0, y: 0, w: W, h: H }, Object.assign(lookAt([0.3, 0.32, -0.55], [0, 0.1, 0]), { fov: 0.95 }));
  R.env({ sun: Lt.sun, ambient: Lt.ambient, fog: Lt.fog, lights: [] }); R.sky(Lt.sky); R.draw(floor, ID);
  if (name === 'icons') { ICON_IDS.forEach((id, i) => drawIcon(R, id, 14 + (i % 5) * 60, 30 + Math.floor(i / 5) * 60, 4)); }
  else R.draw(M[name], place(0, y, 0, 0.6, 0, 0, sc));
  R.text(name.toUpperCase(), 40, 3, 15, {});
  const cx = (n % cols) * W, cy = Math.floor(n / cols) * H;
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) buf[(cy + yy) * cols * W + cx + x] = R.buf[yy * W + x];
});
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'pickups.png'), png(buf, cols * W, rows * H, scale));
console.log('wrote ' + join(dir, 'pickups.png'));
