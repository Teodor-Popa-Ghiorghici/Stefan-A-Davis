/* THE DRESSING'S MATERIALS: a flat colour by ramp and step (`col(RED, 7)`, lit with `lit`) and a texture by name (`tx('brick')`), each made once (track_geo.js keeps them). Short because the props use hundreds. Pure. */
import { material } from './track_geo.js'; import { ix, GREY, BROWN, RED, GREEN, CYAN, BLUE, MAGENTA, COOL } from './palette.js';

export const col = (ramp, level, o) => material(ix(ramp, level), o); export const lit = (ramp, level, e) => material(ix(ramp, level), { emit: e == null ? 0.95 : e }); export const tx = (name, o) => material(name, o);
export const two = name => material(name, { double: true });               /* a see-through texture (a fence, a leaf) seen from either side */
export { ix, GREY, BROWN, RED, GREEN, CYAN, BLUE, MAGENTA, COOL };
