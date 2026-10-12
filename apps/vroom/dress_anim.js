/* THINGS THAT MOVE (docs/vroom/plan.md section 15): a placement as a function of the race's clock, so a prop can turn, slide along a line, swing or bob and the picture is still a pure function of the time (the scene calls
   `d.at(t)`). Each returns `t => placement` for raster_math's `place`. A thing is built round its own origin and these put the origin where it is at `t`. Pure. */
import { place } from './raster_math.js';

/* turn about the vertical through (x, y, z), `rate` radians a second, from angle `phase` */
export const spin = (x, y, z, rate, phase, yaw) => t => place(x, y, z, (yaw || 0) + (phase || 0) + t * rate, 0, 0, 1);
/* turn about a horizontal axis (a wheel, a fan on a wall, a roller): the axis is the thing's x ('x') or z ('z') after it is turned `yaw` */
export const roll = (x, y, z, rate, phase, yaw, axis) => t => (axis === 'z' ? place(x, y, z, yaw || 0, 0, (phase || 0) + t * rate, 1) : place(x, y, z, yaw || 0, (phase || 0) + t * rate, 0, 1));
/* go from (x0, z0) to (x1, z1) in `period` seconds and again (a lorry on a far road, a gondola, a crate on a belt, a train), `phase` 0..1 of the way round to start; `back` goes there and back instead of round */
export const slide = (x0, z0, x1, z1, period, phase, y, back, yawFix) => { const yaw = Math.atan2(x1 - x0, z1 - z0) + (yawFix || 0);
  return t => { let f = ((t / period + (phase || 0)) % 1 + 1) % 1; if (back) f = f < 0.5 ? f * 2 : 2 - f * 2; return place(x0 + (x1 - x0) * f, y || 0, z0 + (z1 - z0) * f, back && ((((t / period + (phase || 0)) % 1) + 1) % 1) >= 0.5 ? yaw + Math.PI : yaw, 0, 0, 1); };
};
/* swing like a pendulum about the horizontal axis through the thing's origin: `amp` radians each way, `period` seconds (a sign in the wind, a hanging lamp, a crane's hook) */
export const swing = (x, y, z, amp, period, phase, yaw) => t => place(x, y, z, yaw || 0, 0, Math.sin(t * 6.2832 / period + (phase || 0)) * amp, 1);
/* go up and down by `amp` metres every `period` seconds (a press, a sign, a float) */
export const bob = (x, y, z, amp, period, phase, yaw) => t => place(x, y + Math.sin(t * 6.2832 / period + (phase || 0)) * amp, z, yaw || 0, 0, 0, 1);
