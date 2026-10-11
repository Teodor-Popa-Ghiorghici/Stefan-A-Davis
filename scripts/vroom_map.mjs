#!/usr/bin/env node
/* Dev tool, not a check: the top-down map of a track, drawn straight from its data (the centreline, the edges, the walls, the features, the start) so a track can be designed by looking at it.
     node scripts/vroom_map.mjs <track id> <out.png>        (pure Node; palette indices through VGA128, like vroom_shots.mjs) */
import { png } from './vroom_shots.mjs';
import { writeFileSync } from 'node:fs';
import { ix, GREY, RED, BROWN, CYAN, GREEN, COOL } from '../apps/vroom/palette.js';
const id = process.argv[2] || 'sorting', out = process.argv[3] || 'map.png';
const { TRACKS } = await import('../apps/vroom/track_def.js'), { buildTrack } = await import('../apps/vroom/track_build.js');
const T = buildTrack(TRACKS[id]);
const W = 900, H = 620, buf = new Uint8Array(W * H).fill(ix(COOL, 2));
let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
T.line.samples.forEach(p => { x0 = Math.min(x0, p.x - 12); x1 = Math.max(x1, p.x + 12); z0 = Math.min(z0, p.z - 12); z1 = Math.max(z1, p.z + 12); });
const sc = Math.min((W - 20) / (x1 - x0), (H - 20) / (z1 - z0)), px = x => Math.round(10 + (x - x0) * sc), py = z => Math.round(H - 10 - (z - z0) * sc);
const dot = (x, z, c, r) => { for (let j = -(r || 0); j <= (r || 0); j++) for (let i = -(r || 0); i <= (r || 0); i++) { const X = px(x) + i, Y = py(z) + j; if (X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = c; } };
const lineTo = (ax, az, bx, bz, c) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) * sc)); for (let i = 0; i <= n; i++) dot(ax + (bx - ax) * i / n, az + (bz - az) * i / n, c); };
T.line.samples.forEach((p, i) => { const hw = T.width[i] / 2; lineTo(p.x + p.nx * hw, p.z + p.nz * hw, p.x - p.nx * hw, p.z - p.nz * hw, ix(GREY, 4)); });
T.line.samples.forEach((p, i) => { const hw = T.width[i] / 2; dot(p.x + p.nx * hw, p.z + p.nz * hw, ix(BROWN, 8)); dot(p.x - p.nx * hw, p.z - p.nz * hw, ix(BROWN, 8)); dot(p.x, p.z, ix(CYAN, 7)); });
(T.marks || []).forEach(m => dot(m.x, m.z, m.c, m.r));
T.grid.forEach(g => dot(g.x, g.z, ix(GREEN, 12), 2));
T.checkpoints.forEach(c => lineTo(c.ax, c.az, c.bx, c.bz, ix(RED, 10)));
writeFileSync(out, png(buf, W, H, 1));
console.log('wrote ' + out + ' (' + T.line.length.toFixed(0) + ' m, ' + T.line.count + ' samples)');
