/* The game itself. Phase 1 is the renderer on show: the test town (raster_scene.js) drawn by the real software rasterizer, the camera drifting down the street. The race, the physics and
   the rest are built in the order of docs/vroom/plan.md section 12; this file becomes the game's frame loop in phase 3. */
import { createRaster, W, H } from './raster.js';
import { town, drawTown } from './raster_scene.js';
import { ix, GREY } from './palette.js';

export function mountGame(root) {
  const wrap = document.createElement('div');
  wrap.className = 'gamepane';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.className = 'gamecv';
  cv.dataset.fit = 'int';
  wrap.appendChild(cv);
  root.appendChild(wrap);
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const img = g.createImageData(W, H), R = createRaster(), T = town(), full = { x: 0, y: 0, w: W, h: H };
  let raf = 0, alive = true, last = 0, t = 0, frames = 0, shown = 0, clock = 0;
  const frame = ts => {
    if (!alive) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts; t += dt;
    const z = -10 + (t * 5) % 120, x = Math.sin(t * 0.5) * 1.2;
    drawTown(R, T, full, { x, y: 0.9 + Math.sin(t * 0.9) * 0.15, z, yaw: Math.sin(t * 0.3) * 0.12, pitch: -0.05, roll: 0, fov: 1.05 }, false);
    frames++; clock += dt; if (clock >= 0.5) { shown = Math.round(frames / clock); frames = 0; clock = 0; }
    R.text('VROOM.EXE  RENDERER TEST  ' + shown + ' FPS', W / 2, 4, ix(GREY, 15));
    R.present(img); g.putImageData(img, 0, 0);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { alive = false; if (raf) cancelAnimationFrame(raf); wrap.remove(); };
}
