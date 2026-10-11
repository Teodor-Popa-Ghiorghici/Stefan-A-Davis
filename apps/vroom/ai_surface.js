/* HOW FAST A CAR CAN GO WHERE THE GROUND DRAGS (deep snow without snow tyres, a carpet). A driver plans its speed from the bends and from the grip; ground that holds the car back is neither, so the plan asks the world:
   one car, flat out on a flat patch of that surface for a few seconds, and the speed it settles at. The answer is kept per car and per surface, so it costs a few tens of milliseconds once. Pure. */
import { soup } from './col_build.js';
import { createWorld } from './sim.js';
import { SURF_BY_ID } from './tune.js';

const memo = new WeakMap();
export function settleSpeed(spec, surfId, parts) {
  const S = SURF_BY_ID[surfId] || SURF_BY_ID[0];
  if (!(S.drag > 0)) return Infinity;
  const key = surfId + (parts && parts.snowTyres ? 's' : '');
  let m = memo.get(spec); if (!m) { m = {}; memo.set(spec, m); }
  if (m[key] != null) return m[key];
  const w = createWorld({ col: soup().ground(-40, -40, 400, 40, 0, surfId, 40).build(), nodes: [{ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }] }), car = w.addCar(spec, { x: 0, y: 0, z: 0, yaw: Math.PI / 2 }, { parts });
  for (let i = 0; i < 60; i++) w.step();
  car.input.throttle = 1; for (let i = 0; i < 60 * 9; i++) w.step();
  return (m[key] = Math.hypot(car.v[0], car.v[2]));
}
