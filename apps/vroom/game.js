/* The game itself. Phase 0 is only the title: the rest is built in the order of docs/vroom/plan.md section 12. */
import { F5, F3, drawText } from '../pixtext.js';

export const W = 320, H = 180;

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
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  R(0, 0, W, H, '#000000');
  drawText(R, 'VROOM.EXE', W / 2, 70, '#FFFF55', F5, { heavy: true, shadow: '#AA5500' });
  drawText(R, 'THE ENGINE IS WARM.', W / 2, 96, '#AAAAAA', F3);
  return () => { wrap.remove(); };
}
