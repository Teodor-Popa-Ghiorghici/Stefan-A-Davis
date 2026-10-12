/* THE WEATHER AND THE SPARKS (docs/vroom/plan.md section 9: snowfall in pixels, a blizzard, the factory's sparks). Points in the world that the renderer draws as one or two pixels (raster.js `points`): snow is a box of flakes
   about the camera, falling and drifting, each flake a function of its number and the race clock; sparks are what a welder throws, a few at a time, each on its own little arc. Nothing here is random, so a frame is the
   same frame whenever it is drawn; `calm` (reduced motion) draws the snow still. Pure. */
import { ix, COOL, BROWN } from './palette.js';

const hash = i => { let h = Math.imul(i + 1, 0x9e3779b1) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export const SNOW = { flurry: { n: 90, fall: 1.1, wind: 0.5, box: 16 }, blizzard: { n: 230, fall: 2.2, wind: 6, box: 14 } };
const WHITE = ix(COOL, 15), GREY = ix(COOL, 11);
/* the flakes about camera `cam` at race time `t` for a kind of fall (SNOW) */
export function flakes(cam, t, kind, calm) {
  const K = SNOW[kind]; if (!K) return [];
  const out = [], B = K.box, tt = calm ? 0 : t;
  for (let i = 0; i < K.n; i++) {
    const a = hash(i * 3), b = hash(i * 3 + 1), c = hash(i * 3 + 2), sp = 0.6 + 0.8 * b;
    const m = (v, M) => ((v % M) + M) % M;
    out.push({ x: cam.x + m(a * B - tt * K.wind * sp * 0.4, B) - B / 2, y: cam.y + 5 - m(b * 10 + tt * K.fall * sp, 10), z: cam.z + m(c * B, B) - B / 2, c: sp > 1.1 ? WHITE : GREY, s: kind === 'blizzard' && sp > 1.25 ? 2 : 1 });
  }
  return out;
}
/* sparks from emitters [{ x, y, z, phase }] at time `t`: six to an emitter, each living 0.7 s, thrown up and out and pulled down */
export function sparks(emitters, t) {
  const out = [];
  for (const e of emitters) for (let k = 0; k < 6; k++) {
    const life = 0.7, ph = (((t + e.phase + k * 0.113) % life) + life) % life, n = Math.floor((t + e.phase + k * 0.113) / life), a = hash(n * 7 + k + (e.seed || 0)) * Math.PI * 2, v = 1.6 + hash(n * 5 + k) * 1.4;
    out.push({ x: e.x + Math.cos(a) * v * ph, y: e.y + 2.2 * ph - 4.5 * ph * ph + 0.9 * v * ph, z: e.z + Math.sin(a) * v * ph, c: ph < 0.3 ? ix(COOL, 15) : ix(BROWN, 14 - Math.round(ph * 8)), s: 1 });
  }
  return out;
}
