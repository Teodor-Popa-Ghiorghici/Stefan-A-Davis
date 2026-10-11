/* THE RADIO'S NAME on the glass: when a tune begins, or V takes the other station, the station and the tune are put up at the foot of the picture for a few seconds (audio.js `toast`: { text, sub, t }).
   Pixel type with an outline over a dithered panel, like everything else the game says; it fades out through the dither (a fade that never leaves the palette) and is not drawn at all under reduced motion's
   cousin, an empty toast. Pure but for the raster it is given. */
import { C, panel, mid, widthOf, F3 } from './ui.js';
import { shade } from './ui.js';

export function drawRadio(R, toast) {
  if (!toast || toast.t <= 0) return;
  const w = Math.max(widthOf(toast.text, F3), widthOf(toast.sub || '', F3)) + 16, x = Math.round((R.w - w) / 2), y = R.h - 24;
  panel(R, x, y, w, 19, { k: 0.55 });
  mid(R, toast.text, R.w / 2, y + 3, C.white, { outline: C.black });
  if (toast.sub) mid(R, toast.sub, R.w / 2, y + 11, C.yellow, { outline: C.black });
  if (toast.t < 0.4) shade(R, x, y, w, 19, 1 - toast.t / 0.4);            /* the last fifth of a second goes out through the dither */
}
