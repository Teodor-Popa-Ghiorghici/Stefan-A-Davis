/* VGA128, the palette of VROOM's picture (docs/vroom/plan.md section 14: the owner granted it, the rest of the machine stays on the sixteen).

   It is built FROM the sixteen so it keeps their feel: eight ramps of sixteen steps. A ramp is four anchors a third of the way apart -- a very dark tint, the dark VGA colour, the bright VGA colour and
   a pale tint -- with straight lines between them, so step 5 and step 10 of each ramp ARE the machine's own colours, exactly (the greys' anchors are black and white, so they hold the greys too). All
   sixteen VGA colours are in it, and no two of the 128 are the same. A colour is `ramp * 16 + level`, one byte: 0..127. Light moves a pixel along its ramp, never to another one, which is why a
   texture can carry its colours and be lit afterwards.

   GREY BLUE GREEN CYAN RED MAGENTA are the machine's colours; BROWN climbs through its brown to its yellow (wood, cardboard, lamplight); COOL is the one that is new: a blue-grey for snow, ice,
   steel and shadow, which a snowed-in town needs and the sixteen do not have. Pure (no window), so Node reads every colour of it. */
export const LEVELS = 16, RAMP_COUNT = 8, SIZE = LEVELS * RAMP_COUNT;
export const GREY = 0, BLUE = 1, GREEN = 2, CYAN = 3, RED = 4, MAGENTA = 5, BROWN = 6, COOL = 7;
export const RAMP_NAMES = ['GREY', 'BLUE', 'GREEN', 'CYAN', 'RED', 'MAGENTA', 'BROWN', 'COOL'];

/* the machine's sixteen, in VGA order (kernel/god.js VGA16: an app never imports the kernel, so they are written out) */
export const VGA16 = ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'];

const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const dark = (c, k) => c.map(v => Math.round(v * k));

/* the four anchors of each ramp: [shadow tint, dark, bright, pale tint] */
const anchors = (d, b) => { const D = rgb(d), B = rgb(b); return [dark(D, 0.2), D, B, mix(B, [255, 255, 255], 0.62)]; };
const ANCHORS = [
  [rgb('#000000'), rgb('#555555'), rgb('#AAAAAA'), rgb('#FFFFFF')],
  anchors('#0000AA', '#5555FF'), anchors('#00AA00', '#55FF55'), anchors('#00AAAA', '#55FFFF'),
  anchors('#AA0000', '#FF5555'), anchors('#AA00AA', '#FF55FF'), anchors('#AA5500', '#FFFF55'),
  [rgb('#06080d'), rgb('#38445c'), rgb('#9fb2ca'), rgb('#f2f7ff')]
];

/* the 128 colours as [r, g, b] */
export const PAL = [];
for (let r = 0; r < RAMP_COUNT; r++) {
  for (let l = 0; l < LEVELS; l++) {
    const seg = Math.min(2, Math.floor(l / 5)), t = l === 15 ? 1 : (l % 5) / 5, a = ANCHORS[r];
    PAL.push(l === 15 ? a[3].slice() : mix(a[seg], a[seg + 1], t));
  }
}
/* the same as one 32-bit word each, as a canvas stores them (little-endian R G B A) */
export const PAL32 = new Uint32Array(SIZE);
PAL.forEach((c, i) => { PAL32[i] = (0xFF000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; });

export const ix = (ramp, level) => ramp * LEVELS + Math.max(0, Math.min(LEVELS - 1, Math.round(level)));
export const rampOf = i => i >> 4;
export const levelOf = i => i & 15;
export const hex = i => '#' + PAL[i].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* where the sixteen are: VGA16 colour k -> its palette index */
export const VGA_AT = [ix(GREY, 0), ix(BLUE, 5), ix(GREEN, 5), ix(CYAN, 5), ix(RED, 5), ix(MAGENTA, 5), ix(BROWN, 5), ix(GREY, 10), ix(GREY, 5), ix(BLUE, 10), ix(GREEN, 10), ix(CYAN, 10), ix(RED, 10), ix(MAGENTA, 10), ix(BROWN, 10), ix(GREY, 15)];
/* the nearest palette index to any colour: for a picture or a livery drawn in hex */
export function nearest(h) {
  const c = rgb(h); let best = 0, bd = 1e9;
  for (let i = 0; i < SIZE; i++) { const p = PAL[i], d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
/* a transparent texel (a fence, a leaf): never a colour */
export const CLEAR = 255;
