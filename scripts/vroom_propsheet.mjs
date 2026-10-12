#!/usr/bin/env node
/* Dev tool, not a check: draw VROOM's props side by side, close up, to look at them (the real renderer, a flat ground, a day's light).
     node scripts/vroom_propsheet.mjs <out.png> <module> <prop[:json]> [<prop[:json]> ...]      e.g.  node scripts/vroom_propsheet.mjs props.png dress_props building:'{"w":6,"d":5,"h":5,"door":1}' vehicle pine:'{"h":4}'
   <module> is a file of apps/vroom/ that exports props `(g, o)` (dress_props.js ...). Props stand in a row, 3 m apart, facing the camera; SCALE and CAMERA (x,y,z,yaw,pitch) can be set in the environment. */
import { writeFileSync } from 'node:fs';
import { png } from './vroom_shots.mjs';
const [, , out = 'props.png', mod = 'dress_props', ...list] = process.argv;
const { createRaster } = await import('../apps/vroom/raster.js'), { builder } = await import('../apps/vroom/raster_mesh.js'), { local } = await import('../apps/vroom/dress_prims.js'), { place } = await import('../apps/vroom/raster_math.js');
const { material } = await import('../apps/vroom/track_geo.js'), { COOL, ix } = await import('../apps/vroom/palette.js'), M = await import('../apps/vroom/' + mod + '.js');
const gap = +process.env.GAP || 4, n = list.length, b = builder();
b.use(material('concrete')).quad([-gap * n, 0, -2], [gap * n, 0, -2], [gap * n, 0, 9], [-gap * n, 0, 9], [0, 1, 0], [[0, 0], [n * 2, 0], [n * 2, 3], [0, 3]]);
list.forEach((s, i) => { const k = s.indexOf(':'), name = k < 0 ? s : s.slice(0, k), o = k < 0 ? {} : JSON.parse(s.slice(k + 1)); if (!M[name]) throw new Error('no prop ' + name); M[name](local(b, (i - (n - 1) / 2) * gap, 0, 3, Math.PI, 1), o); });
const mesh = b.build(), W = 320 * Math.min(2, Math.max(1, Math.ceil(n / 3))), H = 180, R = createRaster(W, H), c = (process.env.CAMERA || '0,2.6,-10,0,-3').split(',').map(Number);
R.view({ x: 0, y: 0, w: W, h: H }, { x: c[0], y: c[1], z: c[2], yaw: c[3] * Math.PI / 180, pitch: c[4] * Math.PI / 180, roll: 0, fov: +process.env.FOV || 0.9, near: 0.05, far: 130 });
R.env({ sun: { dir: [0.5, 0.8, -0.4], i: 0.75 }, ambient: [0.4, 0.7], fog: { start: 40, end: 120 }, lights: [] }); R.sky({ ramp: COOL, horizon: 12, zenith: 8 });
R.draw(mesh, place(0, 0, 0)); writeFileSync(out, png(R.buf, W, H, +process.env.SCALE || 3)); console.log('wrote ' + out + ' (' + mesh.tris + ' triangles)');
