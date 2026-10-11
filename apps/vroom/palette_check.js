#!/usr/bin/env node
/* node apps/vroom/palette_check.js: VGA128 and the textures made from it (pure Node).
   THE PALETTE  128 colours, no two alike, all sixteen of the machine's own among them exactly, each ramp lighter at every step, a byte is a ramp and a level
   THE TEXTURES every texel is a palette byte or CLEAR, every size a power of two, the same bytes every time (a hash each), the right sort of colour for what each is (snow pale, asphalt dark, brick red) */
import { PAL, PAL32, SIZE, LEVELS, RAMP_COUNT, RAMP_NAMES, VGA16, VGA_AT, ix, hex, nearest, CLEAR, GREY, BROWN, COOL, RED } from './palette.js';
import { tex, TEXTURE_NAMES, flat, sign } from './raster_tex.js';

let bad = 0, checks = 0;
const ok = (c, m, d) => { checks++; if (!c) { bad++; console.log('FAIL: ' + m + (d ? '   ' + d : '')); } };
const hash = a => { let h = 0x811C9DC5; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/* ---- the palette ---- */
ok(SIZE === 128 && PAL.length === 128 && LEVELS === 16 && RAMP_COUNT === 8 && RAMP_NAMES.length === 8, 'VGA128 is eight ramps of sixteen');
ok(new Set(PAL.map(c => c.join())).size === 128, 'no two of the 128 colours are alike');
ok(PAL.every(c => c.length === 3 && c.every(v => Number.isInteger(v) && v >= 0 && v <= 255)), 'every channel is a whole number 0..255');
VGA16.forEach((h, k) => ok(hex(VGA_AT[k]) === h, 'the machine\'s colour ' + k + ' (' + h + ') is in the palette exactly, at ' + VGA_AT[k], hex(VGA_AT[k])));
ok(new Set(VGA_AT).size === 16, 'the sixteen are sixteen different places');
for (let r = 0; r < RAMP_COUNT; r++) {
  let up = true; for (let l = 1; l < LEVELS; l++) if (lum(PAL[ix(r, l)]) <= lum(PAL[ix(r, l - 1)])) up = false;
  ok(up, RAMP_NAMES[r] + ' gets lighter at every step');
  ok(lum(PAL[ix(r, 15)]) > 150 && lum(PAL[ix(r, 0)]) < 40, RAMP_NAMES[r] + ' runs from near black to pale');
}
ok(ix(3, 7) === 55 && ix(0, -4) === 0 && ix(0, 99) === 15 && ix(7, 15) === 127, 'ix is ramp * 16 + level, held to the ramp');
ok(PAL32.length === 128 && (PAL32[0] >>> 24) === 255 && (PAL32[ix(GREY, 15)] & 0xFFFFFF) === 0xFFFFFF, 'the 32-bit table is opaque, and white is white');
ok(nearest('#FFFF55') === ix(BROWN, 10) && nearest('#000000') === 0 && nearest('#FFFFFF') === ix(GREY, 15), 'nearest() finds the machine\'s own colours');
ok(CLEAR === 255 && 255 >= SIZE, 'CLEAR is a byte that is no colour');

/* ---- the textures ---- */
/* the same bytes on every machine: a hash of each, fixed here (change a texture, change its hash, on purpose: node apps/vroom/palette_check.js --print) */
const HASHES = {"snow": "63c89340", "slush": "3585b53b", "drift": "d1c62e15", "asphalt": "38cb042a", "dash": "7f6bdf4d", "edge": "daa47fc5", "concrete": "278dfa3e", "lino": "7348da0e", "parcels": "bcfbb560", "shelf": "059afbea", "cardboard": "39f6e71f", "tin": "b7d25b37", "brick": "1da66018", "planks": "f23df8cb", "board": "a67d87fc", "window": "7cdd7e94", "glass": "a787c15d", "belt": "a6765f30", "plate": "9b7e4a9d", "checker": "29020b00", "carpet": "f9fabc74", "fence": "50ae9706", "pine": "4962bf1e", "rubber": "7d419dc5", "under": "def62089"};
ok(TEXTURE_NAMES.length === Object.keys(HASHES).length && TEXTURE_NAMES.every(n => n in HASHES), 'the texture set is what this check knows (' + TEXTURE_NAMES.length + ')', TEXTURE_NAMES.join(' '));
const stat = {};
TEXTURE_NAMES.forEach(n => {
  const t = tex[n](), t2 = tex[n]();
  ok(t === t2, n + ': made once');
  ok(Number.isInteger(Math.log2(t.w)) && Number.isInteger(Math.log2(t.h)) && t.w >= 8 && t.w <= 64 && t.h >= 8 && t.h <= 64 && t.ws === Math.log2(t.w) && t.d.length === t.w * t.h, n + ': sizes are powers of two, 8 to 64');
  let clear = 0, sum = 0, n2 = 0, allOk = true;
  for (let i = 0; i < t.d.length; i++) { const b = t.d[i]; if (b === CLEAR) clear++; else if (b >= SIZE) allOk = false; else { sum += lum(PAL[b]); n2++; } }
  ok(allOk, n + ': every texel is a palette byte or CLEAR');
  stat[n] = { lum: n2 ? sum / n2 : 0, clear: clear / t.d.length };
});
/* the see-through ones are see-through, the others solid */
['dash', 'edge', 'fence'].forEach(n => ok(stat[n].clear > 0.3, n + ' has holes', JSON.stringify(stat[n])));
TEXTURE_NAMES.filter(n => !['dash', 'edge', 'fence'].includes(n)).forEach(n => ok(stat[n].clear === 0, n + ' is solid'));
/* what they look like, in a number */
ok(stat.snow.lum > 190 && stat.drift.lum > 170 && stat.snow.lum > stat.slush.lum + 40, 'snow is pale, and paler than slush', stat.snow.lum.toFixed(0) + ' vs ' + stat.slush.lum.toFixed(0));
ok(stat.asphalt.lum < 90 && stat.asphalt.lum < stat.concrete.lum, 'asphalt is dark, darker than concrete', stat.asphalt.lum.toFixed(0));
{ const b = tex.brick(); let red = 0; for (const v of b.d) if ((v >> 4) === RED) red++; ok(red / b.d.length > 0.6, 'brick is mostly red', (red / b.d.length).toFixed(2)); }
{ const b = tex.tin(); let cool = 0; for (const v of b.d) if ((v >> 4) === COOL) cool++; ok(cool / b.d.length > 0.9, 'tin is blue-grey'); }
{ const b = tex.planks(), c = tex.cardboard(); let br = 0, br2 = 0; for (const v of b.d) if ((v >> 4) === BROWN) br++; for (const v of c.d) if ((v >> 4) === BROWN) br2++; ok(br / b.d.length > 0.95 && br2 / c.d.length > 0.95, 'planks and cardboard are brown'); }
ok(stat.window.lum > stat.glass.lum + 60, 'a lit window is much brighter than a dark one');
const got = {}; TEXTURE_NAMES.forEach(n => { got[n] = hash(tex[n]().d); });
const regen = process.argv.includes('--print');
if (regen) console.log(JSON.stringify(got));
Object.keys(HASHES).forEach(n => ok(got[n] === HASHES[n], n + ': the same bytes as ever', got[n]));
/* flat colours and signs */
ok(flat(7).d.every(b => b === 7) && flat(7) === flat(7) && flat(7).w === 8, 'a flat colour is one byte, made once');
{ const s = sign('SORTING', ix(GREY, 15), ix(RED, 4), 64, 16), s2 = sign('SORTING', ix(GREY, 15), ix(RED, 4), 64, 16); ok(s.w === 64 && s.h === 16 && hash(s.d) === hash(s2.d) && new Set(s.d).size === 2, 'a sign is two colours of pixel type, the same each time'); }
{ const s = sign('A VERY LONG NAME THAT CANNOT FIT ON A SIGN', 1, 2, 32, 16); ok(s.d.length === 512, 'a name too long for its sign is cut, not overrun'); }

console.log(bad ? bad + ' FAILED (of ' + checks + ')' : 'palette_check: ok (' + checks + ' checks, ' + TEXTURE_NAMES.length + ' textures)');
process.exit(bad ? 1 : 0);
