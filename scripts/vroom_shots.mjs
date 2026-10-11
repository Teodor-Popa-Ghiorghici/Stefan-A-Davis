#!/usr/bin/env node
/* Dev tool, not a check: draw VROOM's renderer to PNG files so a person (or Claude) can LOOK at it. Pure Node (no browser): the same software rasterizer the game uses, a palette-index buffer turned to
   RGB through VGA128 and written as a PNG (zlib is Node's own), enlarged by whole pixels.
     node scripts/vroom_shots.mjs <outdir> [scale]            the test town from a few cameras, day and night
   Phases add their own views (a track, a car, the HUD) through `shot(name, R)`. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { PAL } from '../apps/vroom/palette.js';

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (t, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(t, 4, 'latin1'); d.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + d.length)), 8 + d.length); return o; };
/* a palette-index buffer w x h as a PNG, each pixel `scale` square */
export function png(buf, w, h, scale) {
  const s = scale || 1, W = w * s, H = h * s, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1); raw[row] = 0;
    for (let x = 0; x < W; x++) { const c = PAL[buf[((y / s) | 0) * w + ((x / s) | 0)]]; raw[row + 1 + x * 3] = c[0]; raw[row + 2 + x * 3] = c[1]; raw[row + 3 + x * 3] = c[2]; }
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export function saveShot(dir, name, R, scale) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name + '.png'), png(R.buf, R.w, R.h, scale || 3)); }

if (process.argv[1] && process.argv[1].endsWith('vroom_shots.mjs')) {
  const dir = process.argv[2] || 'vroom-shots', scale = +process.argv[3] || 3;
  const { createRaster } = await import('../apps/vroom/raster.js');
  const { town, drawTown } = await import('../apps/vroom/raster_scene.js');
  const R = createRaster(), T = town(), full = { x: 0, y: 0, w: 320, h: 180 };
  const views = [
    ['street', { x: 0.4, y: 1.1, z: -8, yaw: 0.05, pitch: -0.04, fov: 1.05 }, false],
    ['truck', { x: 2.2, y: 0.55, z: 4, yaw: 0.35, pitch: -0.02, fov: 1.05 }, false],
    ['low', { x: -2.4, y: 0.32, z: 9, yaw: -0.1, pitch: 0, fov: 1.15 }, false],
    ['night', { x: 0.4, y: 1.1, z: -8, yaw: 0.05, pitch: -0.04, fov: 1.05 }, true]
  ];
  for (const [name, cam, night] of views) { drawTown(R, T, full, cam, night); saveShot(dir, name, R, scale); }
  console.log('wrote ' + views.length + ' shots to ' + dir);
}
