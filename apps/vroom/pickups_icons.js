/* THE PICKUPS AS ICONS (docs/vroom/plan.md section 7): ten 11 x 11 pictures for the HUD, drawn one letter a texel from the palette below, and the little parcel texture the pickups on the road wear. The real pickup and the
   FAKE PARCEL are the same picture but for ONE texel: the dot of the question mark on the label (the real one is dark, the fake is red). `FAKE_TELL` is where, and pickups_check.js counts that it is the only difference.
   Pure data and a function that takes the raster's rectangle filler. */
import { ix, GREY, RED, BROWN, GREEN, CYAN, BLUE, COOL, MAGENTA, CLEAR } from './palette.js';
import { F3, drawText } from '../pixtext.js';

const PAL = { '.': -1, w: ix(GREY, 15), k: ix(GREY, 1), x: ix(GREY, 8), l: ix(GREY, 11), r: ix(RED, 11), R: ix(RED, 7), y: ix(BROWN, 14), o: ix(BROWN, 11), b: ix(BROWN, 7), B: ix(BROWN, 4), g: ix(GREEN, 11), G: ix(GREEN, 7), c: ix(CYAN, 12), C: ix(CYAN, 8), u: ix(BLUE, 10), s: ix(COOL, 14), m: ix(MAGENTA, 11) };
const ICONS = {
  ball: ['....ccc....', '..ccwwwcc..', '.ccwwwwwcc.', '.cwwcccwwc.', 'ccwwcsccwwc', 'cwwwcccwwwc', 'ccwwcsccwwc', '.cwwcccwwc.', '.ccwwwwwcc.', '..ccwwwcc..', '....ccc....'],
  rocket: ['.........rr', '........rrw', '.......rrw.', '......rrw..', '.....rrw...', '....rrw....', '...Rrw.....', '..Rry......', '.oyy.......', '.oy........', 'o.........o'],
  leads: ['..........r', '.x.....rrr.', '..x...rrr..', '..x....y...', '..xy..yy...', '...yyy.....', '..yy.yy....', '.yy...y....', '.k.....kkk.', '.kk...kkk..', '..k........'],
  parcel: ['.....y.....', '....yoy..r.', '...y.o..rry', '.bbbbbbbb..', '.boooooob..', '.bobkkobb..', '.boobbbob..', '.bobkkobb..', '.boooooob..', '.bbbbbbbb..', '...........'],
  freeze: ['...........', '...........', '....GGG....', '..GGggggG..', '.GgggwgggG.', 'GggggggggGG', 'GgggggggggG', '.GgggggggG.', '..GGgggGG..', '....GGG....', '...........'],
  snow: ['...........', '..wsw......', '.wwwsw..sw.', '.wwwww.swws', '..www..swws', '.....w..ws.', '....wsw....', '...wwwsw...', '...wwwww...', '....www....', '...........'],
  stone: ['...........', '....rrr....', '...r...r...', '...r...r...', '..xxxxxxx..', '.xlllllllx.', 'xllxlllxllx', 'xlxxllxxlxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '...........'],
  coffee: ['...s..s....', '....s..s...', '...s..s....', '...........', '.wwwwwww...', '.wBBBBBww..', '.wBBBBBw.w.', '.wBBBBBw.w.', '..wBBBww.w.', '...wwww.ww.', '..wwwwww...'],
  cut: ['.....yy....', '....yy.....', '...yy......', '..yyyyy....', '.....yy....', '....yy.....', '...yy......', '..y........', 'rr.......rr', '..rr...rr..', '....rrr....']
};
export const ICON_SIZE = 11;
/* the fake is the parcel with one texel of its label wrong */
ICONS.fake = ICONS.parcel.slice(); ICONS.fake[5] = ICONS.fake[5].replace('kk', 'rk');

export function drawIcon(R, id, x, y, scale) {
  const rows = ICONS[id]; if (!rows) return;
  const k = scale || 1;
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = PAL[rows[j][i]]; if (c >= 0) R.rect(x + i * k, y + j * k, k, k, c); }
}
export const ICON_IDS = Object.keys(ICONS);
export const iconPixels = id => ICONS[id].join('');

/* THE PARCEL ON THE ROAD: 16 x 16 texels, cardboard with a stripe of tape each way and a white label with a question mark. The fake is the same picture with the dot of the question mark red. */
export const FAKE_TELL = { x: 8, y: 12 };
export function parcelTexture(fake) {
  const w = 16, d = new Uint8Array(w * w);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const tape = (x >= 7 && x <= 8) || (y >= 7 && y <= 8);
    d[y * w + x] = tape ? ix(BROWN, 12) : ix(BROWN, 7 + ((x * 3 + y * 5) % 3) * 0.6);
    if (x === 0 || y === 0 || x === 15 || y === 15) d[y * w + x] = ix(BROWN, 4);
  }
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < w) d[y * w + x] = c; };
  for (let y = 3; y <= 13; y++) for (let x = 4; x <= 11; x++) put(x, y, ix(GREY, 15));                      /* the label */
  drawText((x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, c); }, '?', 8, 5, ix(GREY, 1), F3);
  put(FAKE_TELL.x, FAKE_TELL.y, fake ? ix(RED, 9) : ix(GREY, 1));                                              /* the one texel */
  return { w, h: w, ws: 4, d };
}
void CYAN; void CLEAR; void GREEN;
