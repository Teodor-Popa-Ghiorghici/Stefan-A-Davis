/* THE CARS (docs/vroom/plan.md section 5). A car is a row of cars_data.js: what it is called, its rating, the numbers that make it handle (chassis() in sim_spec.js works the rest out from them: a long wheelbase
   handles like one) and the parts its picture is built from (car_shells_*.js, car_art.js). A rating caps every event: in a race of a rating, a car's top speed, its engine and its tyres are held to that rating's
   envelope (tune.js RATINGS), so tuning lets a weak car reach the cap and nothing passes it. `specOf(id, rating)` is what the world is given. Pure. */
import { chassis } from './sim_spec.js';
import { TOP_SPEED, ACCEL_BEST, GRIP_MAX, RATINGS } from './tune.js';
import { ROWS } from './cars_data.js';

export const CARS = ROWS;
export const CAR_IDS = Object.keys(CARS);
/* the twenty cars that belong to a rating, in the order of the table, and the four specials */
export const carsOf = r => CAR_IDS.filter(id => CARS[id].rating === r && !CARS[id].special);
export const SPECIALS = CAR_IDS.filter(id => CARS[id].special);
export { RATINGS };

/* the numbers a car races on in an event of this rating: top speed, engine and tyres held to the rating's envelope (a car of a lower rating is simply what it is) */
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
