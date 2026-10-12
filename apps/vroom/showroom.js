/* THE SHOWROOM (docs/vroom/plan.md section 9): the picture behind the menus. The real sorting hall, in its own light, with a car set down on the start straight and turning slowly while a camera goes round it
   at a metre; nothing in it is a second drawing of anything. A car is shown with its paint and its livery from the garage, so the menus tell you what you will race in. Pure but for the raster. */
import { drawView } from './scene.js';
import { drawCar, carModel } from './car_art.js';
import { quatYaw, rotFromQuat } from './sim_body.js';
import { specOf } from './cars.js';

const models = {};
/* a car's picture is built once for a car, a paint and a number (a rival's livery is its own, and the player's changes with the paint and the plate) */
export const modelFor = (id, paint, livery, num) => { const k = id + ':' + paint + ':' + num; return models[k] || (models[k] = carModel(id, paint, livery)); };

/* a car that is not in a world: just what drawCar reads */
export function stand(spec, x, y, z, yaw, spin) {
  const car = { p: new Float64Array([x, y + spec.comY + 0.004, z]), q: new Float64Array(4), R: new Float64Array(9), spec, steer: 0, ghost: 0, wheels: spec.wheels.map(() => ({ comp: 0, spin })) };
  quatYaw(yaw, car.q); rotFromQuat(car.q, car.R);
  return car;
}
/* draw one frame. o: { track, car (id), paint, livery, num, t (seconds), rect?, zoom? (1 = the car fills a third of the glass), at? ('start' | a distance), off? (sideways shift of the car in the picture) } */
export function drawShowroom(R, o) {
  const T = o.track, rect = o.rect || { x: 0, y: 0, w: R.w, h: R.h }, spec = specOf(o.car, o.rating), t = o.t || 0;
  const p = T.line.at(T.startS + (o.at || 14)), zoom = o.zoom || 1, yaw = t * 0.55;
  const car = stand(spec, p.x, p.y, p.z, p.yaw + yaw * 0 + Math.PI * 0.12 + (o.spin === false ? 0 : yaw), t * 6);
  const a = t * 0.18 + 0.4, d = 0.95 / zoom + spec.L * 0.5, cx = p.x + Math.sin(a) * d, cz = p.z + Math.cos(a) * d, cy = p.y + 0.3 + spec.H * 0.6;
  const dx = p.x - cx, dz = p.z - cz, look = { x: cx, y: cy, z: cz, yaw: Math.atan2(dx, dz), pitch: -0.2, roll: 0, fov: 0.95, near: 0.05, far: 60 };
  const model = modelFor(o.car, o.paint, o.livery, o.num);
  drawView(R, rect, T, [{ car, model }], look, { range: 45 });
  return car;
}
