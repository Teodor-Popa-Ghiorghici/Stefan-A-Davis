/* WHAT STANDS ROUND A ROAD (docs/vroom/plan.md sections 9 and 15): its kit by name (`def.dress`, dress_kit.js builds the kit and the kits are dress_*.js), made of props that are only ever put where the road is not.
   Returns the pieces the picture draws: [{ mesh, m, x, z, r }], some of them moving (`at`), blinking (`blink`), a light (`lights`) or a shower of sparks (`sparks`). Pure. */
import { place } from './raster_math.js';
import { kitOf } from './dress_kit.js';
import { pass } from './dress_pass.js';
import { yard } from './dress_yard.js';
import { harbour } from './dress_harbour.js';
import { dam } from './dress_dam.js';
import { street } from './dress_street.js';
import { factory } from './dress_factory.js';
import { diner } from './dress_diner.js';
import { forecourt } from './dress_station.js';
import { sorting } from './dress_hall.js';

const ID = place(0, 0, 0);
const KITS = { sorting, street, pass, dam, harbour, yard, forecourt, diner, factory };
export function dress(def, line, width, F, cuts, startS) {
  const kit = KITS[def.dress || (def.light === 'hall' ? 'sorting' : '')];
  if (!kit) return [];
  const K = kitOf(def, line, width, cuts, F, startS); kit(K);
  const out = K.finish();
  if (K.sparks) out.push({ mesh: null, m: ID, x: 0, z: 0, r: 1e5, sparks: K.sparks });
  return out;
}
