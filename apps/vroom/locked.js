/* What VROOM.EXE is while its gate is shut (kernel/vroom_gate_core.js): a black picture that says NOT YET. and nothing else -- no title, no hint, no sound, no timer, no listener. A window can still
   be asked for by a check or by devtools, and this is all it ever finds; it opens and closes as cleanly as any app (check:apps, check:listeners). */
import { F5, drawText } from '../pixtext.js';

export const W = 320, H = 180;

export function mountLocked(root) {
  const wrap = document.createElement('div');
  wrap.className = 'gamepane';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.className = 'gamecv';
  cv.dataset.fit = 'int';
  wrap.appendChild(cv);
  root.appendChild(wrap);
  paintLocked(cv.getContext('2d'));
}

/* split from the mount so Node can paint it onto a fake context */
export function paintLocked(g) {
  if (!g) return;
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
  drawText((x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, 'NOT YET.', W / 2, H / 2 - 4, '#AAAAAA', F5, { heavy: true });
}
