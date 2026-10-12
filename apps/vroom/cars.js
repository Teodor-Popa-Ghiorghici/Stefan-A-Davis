/* THE CARS (docs/vroom/plan.md section 5). A car is a row of cars_data.js: what it is called, its rating, the numbers that make it handle (chassis() in sim_spec.js works the rest out from them: a long wheelbase
   handles like one) and the parts its picture is built from (car_shells_*.js, car_art.js). A rating caps every event: in a race of a rating, a car's top speed, its engine and its tyres are held to that rating's
   envelope (tune.js RATINGS), so tuning lets a weak car reach the cap and nothing passes it. `specOf(id, rating)` is what the world is given. Pure. */
import { chassis } from './sim_spec.js';
import { TOP_SPEED, ACCEL_BEST, GRIP_MAX, RATINGS } from './tune.js';
import { ROWS } from './cars_data.js';
import { tuned } from './parts.js';

export const CARS = ROWS;
export const CAR_IDS = Object.keys(CARS);
/* the twenty cars that belong to a rating, in the order of the table, and the four specials */
export const carsOf = r => CAR_IDS.filter(id => CARS[id].rating === r && !CARS[id].special);
/* the ones of them a rival may be given: the cars a CPU can drive as well as a person (cars_data.js `noRival`) */
export const rivalCars = r => carsOf(r).filter(id => !CARS[id].noRival);
export const SPECIALS = CAR_IDS.filter(id => CARS[id].special);
export { RATINGS };

/* the numbers a car races on in an event of this rating: top speed, engine and tyres held to the rating's envelope (a car of a lower rating is simply what it is). `kit` is the garage's fittings (parts.js):
   tuning is applied first and the envelope after, so nothing a part does passes the rating. */
export function numbersFor(id, rating, kit) {
  const c = CARS[id], r = rating == null ? c.rating : rating, n = kit ? tuned(c.num, kit, r) : Object.assign({}, c.num);
  n.vtop = Math.min(n.vtop, TOP_SPEED[r]);
  n.accel = Math.max(n.accel, ACCEL_BEST[r]);
  n.gripLat = Math.min(n.gripLat || 1, GRIP_MAX[r]);
  n.name = c.name;
  return n;
}
const specs = {};
/* a kit that changes nothing about the numbers shares the car's plain spec: only the levels of the parts that reach `tuned` are part of the key */
const kitKey = kit => {
  if (!kit || !kit.tune) return '';
  const key = ['motor', 'gearing', 'tyres', 'springs'].map(k => kit.tune[k] | 0).join('') + ':' + Math.max(-(kit.tune.ballast | 0), Math.min(kit.tune.ballast | 0, kit.ballast | 0));
  return key === '0000:0' ? '' : key;
};
export function specOf(id, rating, kit) {
  const key = id + ':' + (rating == null ? CARS[id].rating : rating) + ':' + kitKey(kit);
  return specs[key] || (specs[key] = chassis(numbersFor(id, rating, kit)));
}
