#!/usr/bin/env node
/* Dev tool, not a check: LOOK at a VROOM road from anywhere, with the real renderer and the real dressing, and write PNGs.
     node scripts/vroom_look.mjs <outdir> <track> <view> [<view> ...]            (VARIANT=r|m|rm, T=<seconds of race clock>, SCALE=<pixels per pixel>, HEAD=1 for headlights, W=<width> H=<height>)
   a view is one of
     s=<metres along the road>[,side=<-1..1 across it>][,h=<height>][,yaw=<degrees off the road's way>][,pitch=<degrees>][,fov=<radians>]     the chase camera's place at that distance along the line
     x=<x>,z=<z>[,y=<height>][,yaw=<degrees>][,pitch=<degrees>][,fov=<radians>]                                                         anywhere in the world
   Several views are put side by side in one PNG named <outdir>/<track>.png (two across, as many down as it takes). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { png } from './vroom_shots.mjs';
const [, , dir = 'look', id = 'sorting', ...views] = process.argv;
const { FAR } = await import('../apps/vroom/view.js');
const { createRaster } = await import('../apps/vroom/raster.js'), { buildTrack } = await import('../apps/vroom/track_build.js'), { defFor } = await import('../apps/vroom/tracks.js'), { drawView } = await import('../apps/vroom/scene.js');
const T = buildTrack(id === 'yard' ? (await import('../apps/vroom/yard_def.js')).YARD : defFor(id, process.env.VARIANT || 'f')), W = +process.env.W || 320, H = +process.env.H || 180, scale = +process.env.SCALE || 2, R = createRaster(W, H), t = +process.env.T || 12;
const kv = s => Object.fromEntries(s.split(',').map(p => p.split('=')).map(([k, v]) => [k, +v]));
const shots = [];
for (const v of views.length ? views : ['s=20']) {
  const o = kv(v); let cam;
  if (o.s != null) {
    const p = T.line.at(o.s), w = T.width[Math.min(T.width.length - 1, Math.round(p.s / T.line.step))] / 2, side = (o.side || 0) * w, yaw = Math.atan2(p.tx, p.tz) + (o.yaw || 0) * Math.PI / 180;
    cam = { x: p.x + p.nx * side, y: (p.y || 0) + (o.h == null ? 0.42 : o.h), z: p.z + p.nz * side, yaw, pitch: (o.pitch || -4) * Math.PI / 180, roll: 0, fov: o.fov || 1.0, near: 0.05, far: FAR };
  } else cam = { x: o.x, y: o.y == null ? 0.42 : o.y, z: o.z, yaw: (o.yaw || 0) * Math.PI / 180, pitch: (o.pitch || -4) * Math.PI / 180, roll: 0, fov: o.fov || 1.0, near: 0.05, far: FAR };
  drawView(R, { x: 0, y: 0, w: W, h: H }, T, [], cam, { t, headlights: !!process.env.HEAD, calm: true });
  shots.push(R.snapshot());
}
/* a sheet: two across */
const cols = Math.min(2, shots.length), rows = Math.ceil(shots.length / cols), SW = W * cols, SH = H * rows, sheet = new Uint8Array(SW * SH);
shots.forEach((b, k) => { const ox = (k % cols) * W, oy = Math.floor(k / cols) * H; for (let y = 0; y < H; y++) sheet.set(b.subarray(y * W, y * W + W), (oy + y) * SW + ox); });
mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, id + '.png'), png(sheet, SW, SH, scale));
console.log('wrote ' + join(dir, id + '.png') + ' (' + shots.length + ' views, ' + T.name + ', ' + (T.decor.length) + ' decor pieces)');
