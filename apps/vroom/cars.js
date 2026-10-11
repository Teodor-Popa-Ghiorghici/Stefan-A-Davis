/* THE CARS (docs/vroom/plan.md section 5). A car is a row: what it is called, its rating, the numbers that make it handle (chassis() in sim_spec.js works the rest out from them: a long wheelbase
   handles like one) and the parts its picture is built from (car_art.js). A rating caps every event: in a race of a rating, a car's top speed and its engine are held to that rating's envelope
   (tune.js RATINGS), so tuning lets a weak car reach the cap and nothing passes it. `specOf(id, rating)` is what the world is given. Pure. */
import { chassis } from './sim_spec.js';
import { TOP_SPEED, ACCEL_BEST, GRIP_MAX } from './tune.js';
import { ix, CYAN, RED, BROWN, GREEN, BLUE, MAGENTA, GREY, COOL } from './palette.js';

/* Every car stands on the same four wheels; what differs is the box over them. `look` is its shape and colours for car_art.js: a shell (a profile of cross-sections along its length), the paint and the
   second colour, and the odd extra (a roof light, a spoiler, a plough). */
export const CARS = {
  courier: {
    name: 'KEI COURIER', rating: 0, blurb: 'a kei pickup with a parcel in the bed. it is fine.',
    num: { mass: 1.5, length: 0.42, width: 0.22, height: 0.10, comY: 0.058, comZ: 0, vtop: 13, accel: 2.4, drive: 'fwd' },
    look: { shell: 'pickup', paint: ix(CYAN, 8), trim: ix(GREY, 14), extra: ['parcel', 'bobble'] }
  },
  milkfloat: {
    name: 'MILK FLOAT', rating: 0, blurb: 'tall, slow, and heavy enough to shove.',
    num: { mass: 2.1, length: 0.46, width: 0.24, height: 0.165, comY: 0.085, comZ: 0.0, vtop: 12.2, accel: 3.1, drive: 'fwd', gripLat: 0.97 },
    look: { shell: 'box', paint: ix(GREY, 14), trim: ix(BLUE, 8), extra: ['crates'] }
  },
  snowbug: {
    name: 'SNOWBUG', rating: 0, blurb: 'a tiny bubble car. it will not forgive a kerb.',
    num: { mass: 1.15, length: 0.34, width: 0.20, height: 0.115, comY: 0.062, comZ: -0.01, vtop: 12.6, accel: 2.1, drive: 'rwd', latBias: 1.04 },
    look: { shell: 'bubble', paint: ix(RED, 8), trim: ix(GREY, 15), extra: [] }
  },
  tofu: {
    name: 'TOFU', rating: 1, blurb: 'a light coupe with the engine in the wrong place. drifty.',
    num: { mass: 1.35, length: 0.43, width: 0.22, height: 0.085, comY: 0.05, comZ: -0.012, vtop: 13.4, accel: 2.0, drive: 'rwd', latBias: 1.02 },
    look: { shell: 'wedge', paint: ix(GREY, 15), trim: ix(RED, 7), extra: ['spoiler'] }
  }
};
export const CAR_IDS = Object.keys(CARS);

/* the numbers a car races on in an event of this rating: top speed and engine held to the rating's envelope */
export function numbersFor(id, rating) {
  const c = CARS[id], n = Object.assign({}, c.num), r = rating == null ? c.rating : rating;
  n.vtop = Math.min(n.vtop, TOP_SPEED[r]);
  n.accel = Math.max(n.accel, ACCEL_BEST[r]);
  n.gripLat = Math.min(n.gripLat || 1, GRIP_MAX[r]);
  n.name = c.name;
  return n;
}
const specs = {};
export function specOf(id, rating) {
  const k = id + ':' + (rating == null ? CARS[id].rating : rating);
  return specs[k] || (specs[k] = chassis(numbersFor(id, rating)));
}

/* the rivals: a driver is a name, a car, a paint of its own and a way of driving (ai_profiles.js). Eleven in the finished game; the first three are in the slice. */
export const RIVALS = [
  { id: 'nils', name: 'NILS', car: 'milkfloat', paint: ix(BROWN, 11), tier: 0 },
  { id: 'greta', name: 'GRETA', car: 'snowbug', paint: ix(MAGENTA, 8), tier: 1 },
  { id: 'otto', name: 'OTTO', car: 'tofu', paint: ix(GREEN, 8), tier: 2 }
];
void COOL;
