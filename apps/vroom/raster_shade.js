/* HOW A PIXEL GETS ITS COLOUR: the one place that decides (docs/vroom/plan.md section 4 and 14). A texel is already a palette index (ramp * 16 + level, palette.js). Light moves it along its own ramp, a 4 x 4 Bayer
   pattern decides which of two neighbouring steps a pixel takes (so a smooth gradient is a dithered one, as on the machine's blackout photographs), and fog is the same pattern again: a band of the picture is
   turned to the fog colour, a pixel at a time, as often as the band says. Nothing here allocates or looks at a window; the triangle filler (raster_tri.js) inlines the same arithmetic in its inner loop, so this
   file is also the specification it is checked against (raster_check.js). */
import { LEVELS } from './palette.js';

/* the standard 4 x 4 Bayer ranks, 0..15, row by row */
export const BAYER_RANK = Uint8Array.from([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
/* the strength of the dither (1 = the full pattern, 0 = none: every pixel takes the nearest step) */
export const DITHER = 1;
/* the same as a fraction to add to a level before it is cut: (rank + 0.5) / 16 spread about a half by DITHER, so that on average a pixel keeps the level it was given
   (a flat colour stays a flat colour, a gradient is a gradient of the same mean) */
export const BAYER = Float32Array.from(BAYER_RANK, r => 0.5 + ((r + 0.5) / 16 - 0.5) * DITHER);
export const FOG_BANDS = 8;
/* how many ramp steps a unit of light moves a pixel: light 1 is the texel as drawn, 0 is this many steps down its ramp */
export const LIGHT_STEPS = 9;

/* the colour of a texel `tex` (a palette index) lit by `light` at pixel (x, y): the arithmetic of the triangle filler's inner loop, written out once */
export function lit(tex, light, x, y) {
  let s = (tex & 15) + (light - 1) * LIGHT_STEPS + BAYER[((y & 3) << 2) | (x & 3)];
  if (s < 0) s = 0;
  let l = s | 0; if (l > LEVELS - 1) l = LEVELS - 1;
  return (tex & 0x70) | l;
}
/* fog at (x, y): is this pixel turned to the fog colour. `fog` is 0..1 at the pixel, in eight bands, each a pattern that covers two sixteenths more of the picture than the one before */
export function fogged(fog, x, y) {
  const fq = (fog * FOG_BANDS) | 0;
  return BAYER_RANK[((y & 3) << 2) | (x & 3)] < fq * 2;
}
/* darken a drawn pixel by `steps` of its own ramp (a shadow on the ground), dithered */
export function darkened(c, steps, x, y) {
  let s = (c & 15) - steps + BAYER[((y & 3) << 2) | (x & 3)];
  if (s < 0) s = 0;
  return (c & 0x70) | (s | 0);
}
