#!/usr/bin/env node
/* node apps/vroom/raster_check.js: the renderer (pure Node, no browser). `--print` writes the golden hashes.
   THE PICTURE   only palette colours come out, every byte and every pixel; nothing is smoothed (the canvas bytes are exactly the palette's); a frame is byte for byte the same every time, and
                 a hash of each view of the test town is fixed here
   THE METHOD    a pixel is what raster_shade.js says (light, dither, fog, a shadow, a hole); a box is solid from every side and empty from inside; a near thing hides a far one in either
                 order; the near plane cuts; a second view in the buffer leaves the rest of it alone; a square twice as far is a quarter the size
   THE SPEED     the heaviest view of the test town, in milliseconds a frame, against the budget of docs/vroom/plan.md (6 ms) */
import { createRaster, W, H } from './raster.js';
import { builder, mat, box, sheet } from './raster_mesh.js';
import { town, drawTown } from './raster_scene.js';
import { place } from './raster_math.js';
import { PAL, PAL32, SIZE, ix, COOL, GREY, RED, GREEN, BLUE, CYAN, BROWN } from './palette.js';
import { lit, fogged, FOG_BANDS, LIGHT_STEPS, BAYER_RANK } from './raster_shade.js';
import { tex } from './raster_tex.js';

let bad = 0, checks = 0;
const ok = (c, m, d) => { checks++; if (!c) { bad++; console.log('FAIL: ' + m + (d ? '   ' + d : '')); } };
const hash = a => { let h = 0x811C9DC5; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const FULL = { x: 0, y: 0, w: W, h: H };
const BUDGET_MS = 6;

/* a view of a thing straight ahead: the camera at the origin looking along +z */
const ahead = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 1.05 };
const NOFOG = { start: 1e9, end: 2e9 };
function fresh(env) { const R = createRaster(); R.view(FULL, ahead); R.env(Object.assign({ sun: { dir: [0, 0, -1], i: 0.6 }, ambient: [0.3, 0.5], fog: NOFOG }, env || {})); R.buf.fill(0); R.zbuf.fill(0); return R; }
/* a quad `s` metres square facing the camera, centred at (x, y, z) */
function wallMesh(m, s, nz) {
  const b = builder().use(m), h = s / 2;
  b.quad([-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0], [0, 0, nz == null ? -1 : nz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  return b.build();
}
const count = (R, f) => { let n = 0; for (let i = 0; i < R.buf.length; i++) if (f(R.buf[i], i)) n++; return n; };

/* ---- the picture: only palette colours ---- */
const T = town(), shots = {};
const VIEWS = {
  street: [{ x: 0.4, y: 1.1, z: -8, yaw: 0.05, pitch: -0.04, fov: 1.05 }, false], low: [{ x: -2.4, y: 0.32, z: 9, yaw: -0.1, pitch: 0, fov: 1.15 }, false],
  high: [{ x: 0, y: 6, z: -12, yaw: 0, pitch: -0.25, fov: 1.2 }, false], night: [{ x: 0.4, y: 1.1, z: -8, yaw: 0.05, pitch: -0.04, fov: 1.05 }, true],
  close: [{ x: 4.6, y: 0.5, z: 30, yaw: -0.5, pitch: 0.1, fov: 1.2 }, false]
};
{
  const R = createRaster();
  for (const [n, [cam, night]] of Object.entries(VIEWS)) {
    drawTown(R, T, FULL, cam, night);
    shots[n] = R.snapshot();
    ok(shots[n].every(b => b < SIZE), n + ': every byte of the picture is a palette index (none is CLEAR or stray)');
    const img = { data: new Uint8ClampedArray(W * H * 4) }; R.present(img);
    const set = new Set(PAL.map(c => c.join())); let allIn = true, opaque = true;
    for (let i = 0; i < W * H; i++) { if (!set.has(img.data[i * 4] + ',' + img.data[i * 4 + 1] + ',' + img.data[i * 4 + 2])) allIn = false; if (img.data[i * 4 + 3] !== 255) opaque = false; }
    ok(allIn && opaque, n + ': every pixel presented is one of the 128 colours, opaque (nothing blended or smoothed)');
    const used = new Set(shots[n]); ok(used.size > 25, n + ': it uses a good part of the palette (' + used.size + ' colours)');
    drawTown(R, T, FULL, cam, night);
    ok(hash(R.buf) === hash(shots[n]), n + ': the same frame twice is the same bytes');
  }
  const a = new Uint8ClampedArray(W * H * 4), R2 = createRaster(); drawTown(R2, T, FULL, VIEWS.street[0], false); R2.present({ data: a });
  const px = new Uint32Array(a.buffer); ok(px.every((v, i) => v === PAL32[R2.buf[i]]), 'present is exactly the palette table, a pixel to a byte');
}
/* the frame is the same from a cold start as after a hundred others (nothing is left over in a buffer) */
{
  const R = createRaster(); for (let i = 0; i < 20; i++) drawTown(R, T, FULL, VIEWS.high[0], false);
  drawTown(R, T, FULL, VIEWS.street[0], false); ok(hash(R.buf) === hash(shots.street), 'a frame after other frames is the frame from a cold start');
}

/* ---- a pixel is what the specification says ---- */
{
  /* light: a flat green wall with a known light, every pixel against raster_shade.lit */
  for (const light of [1, 0.6, 0.25, 1.3]) {
    const tx = ix(GREEN, 8), m = mat(tx, { emit: light - 1 }), R = fresh();
    R.draw(wallMesh(m, 6), place(0, 0, 5), { unlit: true });
    let same = 0, total = 0;
    for (let y = 40; y < 140; y++) for (let x = 100; x < 220; x++) { total++; if (R.buf[y * W + x] === lit(tx, light, x, y)) same++; }
    ok(same === total, 'light ' + light + ': every pixel of a flat wall is raster_shade.lit() of it', same + ' of ' + total);
  }
  /* the dither keeps the mean: a gradient of light has the mean level it was given */
  { const tx = ix(COOL, 8); for (const dl of [1.11, 0.5, -2.3]) { let sum = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) sum += lit(tx, 1 + dl / LIGHT_STEPS, x, y) & 15; ok(Math.abs(sum / 16 - (8 + dl)) <= 1 / 16, 'the 4 x 4 pattern keeps the mean level (' + (8 + dl).toFixed(2) + ')', (sum / 16).toFixed(3)); } }
  ok(lit(ix(RED, 5), 1, 3, 3) === ix(RED, 5) && lit(ix(RED, 5), 1, 0, 0) === ix(RED, 5), 'a texel at light 1 is itself at every pixel of the pattern (a flat colour stays flat)');
  ok(lit(ix(RED, 1), 0, 0, 0) >> 4 === RED && (lit(ix(RED, 1), 0, 0, 0) & 15) === 0, 'light never carries a pixel out of its ramp, and stops at the bottom');
  /* fog: bands at three distances */
  for (const [z, expect] of [[5, 0], [30, 0.5], [70, 1]]) {
    const R = fresh({ fog: { start: 10, end: 50, idx: ix(GREY, 9) } }); R.state.fogIdx = ix(GREY, 9);
    R.draw(wallMesh(mat(ix(RED, 9)), 30), place(0, 0, z), { unlit: true });
    const fogN = count(R, b => b === ix(GREY, 9)), redN = count(R, b => (b >> 4) === RED), got = fogN / (fogN + redN || 1);
    const f = Math.min(1.5, (z - 10) / 40), want = f <= 0 ? 0 : Math.min(1, ((f * FOG_BANDS) | 0) * 2 / 16);
    ok(Math.abs(got - want) < 0.04 && Math.abs(want - expect) < 0.01, 'fog at ' + z + ' m turns ' + (want * 100).toFixed(1) + '% of a wall to the fog colour', 'got ' + (got * 100).toFixed(1) + '%');
  }
  ok(fogged(0.5, 0, 0) === (BAYER_RANK[0] < 8) && !fogged(0, 1, 1) && fogged(1, 3, 3) && fogged(1, 2, 1) && !fogged(0.99, 2, 1) && !fogged(-0.3, 0, 0) && fogged(1.4, 1, 1), 'fogged(): the bands are the Bayer pattern, none below 0 and all from 1');
  /* a sun from in front lights a wall that faces it more than a sun from behind */
  { const meanLevel = R => { let s = 0, n = 0; for (let i = 0; i < R.buf.length; i++) if ((R.buf[i] >> 4) === GREEN) { s += R.buf[i] & 15; n++; } return s / n; };
    const a = fresh({ sun: { dir: [0, 0, -1], i: 0.8 } }), b = fresh({ sun: { dir: [0, 0, 1], i: 0.8 } });
    a.draw(wallMesh(mat(ix(GREEN, 11)), 6), place(0, 0, 5)); b.draw(wallMesh(mat(ix(GREEN, 11)), 6), place(0, 0, 5));
    ok(meanLevel(a) - meanLevel(b) > 0.8 * LIGHT_STEPS * 0.8, 'a wall facing the sun is lighter than one turned from it', meanLevel(a).toFixed(2) + ' vs ' + meanLevel(b).toFixed(2)); }
  /* holes: a texture with CLEAR shows what is behind it, and writes no depth there */
  { const R = fresh(); R.buf.fill(ix(CYAN, 7));
    R.draw(wallMesh(mat(tex.fence()), 6), place(0, 0, 4), { unlit: true });
    const cy = count(R, b => b === ix(CYAN, 7)), br = count(R, b => (b >> 4) === BROWN); ok(cy > 1000 && br > 600, 'a fence shows the picture through its gaps', cy + ' behind, ' + br + ' fence'); }
  /* a shadow takes steps off the ramp it lies on, writes no depth, leaves the rest alone */
  { const R = fresh(); R.buf.fill(ix(COOL, 13)); R.zbuf.fill(0.2);
    const sb = builder(); sb.use(mat(tex.rubber(), { mode: 'darken', steps: 5 })).triSmooth([-3, 0, 0], [3, 0, 0], [0, 0, 6], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1], [1, 1], [1, 1]);
    const z0 = R.zbuf.slice(); R.draw(sb.build(), place(0, -1, 3));
    const dark = count(R, b => b !== ix(COOL, 13)), allCool = count(R, b => (b >> 4) !== COOL);
    ok(dark > 500 && allCool === 0 && R.zbuf.every((v, i) => v === z0[i]) && count(R, b => (b & 15) < 8) === 0, 'a shadow darkens within its ramp by at most its steps and writes no depth', dark + ' pixels'); }
}

/* ---- the method ---- */
{
  /* a box is solid from every side and empty from inside */
  const b = builder(); box(b, 0, 0, 0, 2, 2, 2, mat(ix(RED, 9))); const cube = b.build();
  const dirs = [[0, 0, -7], [0, 0, 7], [7, 0, 0], [-7, 0, 0], [0, 7, 0], [0, -7, 0]], seen = [];
  for (const d of dirs) {
    const R = createRaster(), yaw = Math.atan2(-d[0], -d[2]), pitch = Math.atan2(-d[1], Math.hypot(d[0], d[2]));
    R.view(FULL, { x: d[0], y: d[1], z: d[2], yaw, pitch, roll: 0, fov: 1.05 }); R.env({ sun: { dir: [0.3, 1, -0.4], i: 0.5 }, ambient: [0.4, 0.6], fog: NOFOG });
    R.draw(cube, place(0, 0, 0)); seen.push(count(R, v => (v >> 4) === RED));
  }
  ok(seen.every(n => n > 2500) && Math.max(...seen) - Math.min(...seen) < 60, 'a box seen from each of its six sides is the same solid shape', seen.join(' '));
  { const R = createRaster(); R.view(FULL, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 }); R.env({ fog: NOFOG }); R.draw(cube, place(0, 0, 0)); ok(count(R, v => v !== 0) === 0, 'seen from inside, every face of a box is a back face and none is drawn'); }
  /* the order things are drawn in does not matter */
  const near = wallMesh(mat(ix(RED, 9)), 3), far = wallMesh(mat(ix(BLUE, 9)), 8);
  const A = fresh(), B = fresh(); A.draw(near, place(0, 0, 4)); A.draw(far, place(0.4, 0, 9)); B.draw(far, place(0.4, 0, 9)); B.draw(near, place(0, 0, 4));
  ok(hash(A.buf) === hash(B.buf) && count(A, v => (v >> 4) === RED) > 1000 && count(A, v => (v >> 4) === BLUE) > 1000, 'a near wall hides a far one whichever is drawn first');
  /* the near plane: a ground under the camera is cut, not drawn upside down or dropped */
  { const R = createRaster(); R.view(FULL, { x: 0, y: 0.25, z: 0, yaw: 0, pitch: -0.5, roll: 0, fov: 1.2 }); R.env({ fog: NOFOG });
    const g = builder(); sheet(g, -20, -20, 20, 20, 0, 1, 1, mat(tex.snow())); R.draw(g.build(), place(0, 0, 0));
    const lower = count(R, (v, i) => v !== 0 && i >= (H >> 1) * W), upper = count(R, (v, i) => v !== 0 && i < 20 * W);
    ok(R.stats.clipped > 0 && lower > W * H * 0.35, 'a ground that runs under the camera is cut at the near plane and fills the lower picture', 'clipped ' + R.stats.clipped + ', ' + lower + ' pixels, ' + upper + ' above'); }
  /* a big near triangle is cut in pieces (so its texture does not smear) */
  { const R = createRaster(); R.view(FULL, { x: 0, y: 1, z: 0, yaw: 0, pitch: -0.1, roll: 0, fov: 1.05 }); R.env({ fog: NOFOG }); const g = builder(); sheet(g, -60, 0.5, 60, 80, 0, 1, 1, mat(tex.snow())); R.draw(g.build(), place(0, 0, 0)); ok(R.stats.split > 10, 'a huge ground triangle is subdivided', 'split ' + R.stats.split); }
  /* two views in one buffer leave each other alone */
  { const R = createRaster(); R.buf.fill(99); const a = { x: 0, y: 0, w: W, h: 90 }, bb = { x: 0, y: 90, w: W, h: 90 };
    R.view(a, ahead); R.env({ fog: NOFOG }); R.sky({ ramp: COOL, horizon: 12, zenith: 7 }); R.draw(wallMesh(mat(ix(RED, 9)), 40), place(0, 0, 6));
    ok(count(R, (v, i) => i >= 90 * W && v !== 99) === 0 && count(R, (v, i) => i < 90 * W && v === 99) === 0, 'a view in the top half leaves the bottom half untouched and fills its own');
    R.view(bb, ahead); R.sky({ ramp: BLUE, horizon: 5, zenith: 2 }); R.draw(wallMesh(mat(ix(GREEN, 9)), 40), place(0, 0, 6));
    ok(count(R, (v, i) => i < 90 * W && (v >> 4) === BLUE) === 0 && count(R, (v, i) => i >= 90 * W && v === 99) === 0, 'and the second view leaves the first alone'); }
  /* perspective: twice as far is a quarter the size */
  { const sz = d => { const R = fresh(); R.draw(wallMesh(mat(ix(RED, 9)), 2), place(0, 0, d), { unlit: true }); return count(R, v => v !== 0); };
    const r = sz(8) / sz(16); ok(r > 3.5 && r < 4.5, 'a square twice as far away covers a quarter of the pixels', r.toFixed(2)); }
  /* the corners are whole pixels: a lit square has straight, pixel-exact edges (no pixel of a mixed colour on a flat background) */
  { const R = fresh(); R.draw(wallMesh(mat(ix(RED, 9)), 2, -1), place(0.3, 0.2, 7), { unlit: true }); const used = new Set(R.buf); ok(used.size === 2, 'a flat square on a flat background is two colours: no edge is blended', [...used].join()); }
  /* points and flat text stay in the picture and in the palette */
  { const R = fresh(); R.points([{ x: 0, y: 0, z: 5, c: ix(GREY, 15), s: 2 }, { x: 1e4, y: 0, z: 5, c: 3 }, { x: 0, y: 0, z: -5, c: 3 }]); ok(count(R, v => v === ix(GREY, 15)) === 4 && count(R, v => v === 3) === 0, 'a point is a pixel (or four), and one off the screen or behind is nothing');
    R.text('VROOM 123', 160, 10, ix(GREY, 15), { outline: ix(GREY, 0) }); ok(count(R, v => v === ix(GREY, 15)) > 40 && R.buf.every(v => v < SIZE), 'text is pixel type, in the palette'); }
}

/* ---- the golden hashes ---- */
/* the bytes of each view of the test town, fixed (a change to the renderer, the textures or the town changes them, on purpose: node apps/vroom/raster_check.js --print) */
const GOLD = { street: '81a85728', low: 'b0dc19a8', high: '8035e388', night: '567c15e2', close: '8890c530' };
const got = {}; for (const n of Object.keys(shots)) got[n] = hash(shots[n]);
if (process.argv.includes('--print')) console.log(JSON.stringify(got));
for (const n of Object.keys(GOLD)) ok(got[n] === GOLD[n], n + ': the test town frame is the bytes it was', got[n]);

/* ---- the speed ---- */
{
  const R = createRaster(); let worst = 0, name = '';
  for (const [n, [cam, night]] of Object.entries(VIEWS)) {
    for (let i = 0; i < 25; i++) drawTown(R, T, FULL, cam, night);
    let best = 1e9;
    for (let pass = 0; pass < 3; pass++) {
      const ts = []; for (let i = 0; i < 40; i++) { R.resetStats(); const t0 = performance.now(); drawTown(R, T, FULL, cam, night); ts.push(performance.now() - t0); }
      ts.sort((p, q) => p - q); best = Math.min(best, ts[20]);
    }
    if (best > worst) { worst = best; name = n; }
  }
  console.log('  heaviest view: ' + name + ', ' + worst.toFixed(2) + ' ms a frame (median of 40, best of 3; budget ' + BUDGET_MS + ' ms; ' + R.stats.tris + ' triangles submitted, ' + R.stats.filled + ' filled)');
  ok(worst <= BUDGET_MS, 'the heaviest view is drawn in ' + BUDGET_MS + ' ms or less', worst.toFixed(2) + ' ms');
}

console.log(bad ? bad + ' FAILED (of ' + checks + ')' : 'raster_check: ok (' + checks + ' checks)');
process.exit(bad ? 1 : 0);
