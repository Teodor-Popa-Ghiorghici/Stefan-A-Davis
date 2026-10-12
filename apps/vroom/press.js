/* THE PRESS (docs/vroom/plan.md section 9: the factory's press slams on a beat). A press is a slab across the road that comes down every `period` seconds, stays down `down` seconds and goes back up; while it is down (or
   nearly down) it is a wall, and while it is up a car goes under it. It is a pure function of the race clock, so it is the same for every car, the picture and the CPU (which reads the beat as a person would, by
   looking): nothing about it is random. `tag` is the collision triangles' tag (sim.js `press`), from PRESS_TAG up. Pure. */
export const PRESS_TAG = 200;
export const UP = 0.8;                         /* metres the slab's underside is above the road when it is up: a car goes under (the tallest are 0.3) */
export const RAMP = 0.3;                       /* seconds it takes to come down, and to go back up */
/* where the slab is at race time `t`: `h` the height of its underside, `down` whether it is low enough to be a wall (below 0.3 m, the height of the tallest car) */
export function pressAt(p, t) {
  const P = p.period, c = (((t + p.phase) % P) + P) % P, up = P - p.down - 2 * RAMP;
  if (c < up) return { h: UP, down: false };
  if (c < up + RAMP) { const f = (c - up) / RAMP; return { h: UP * (1 - f), down: UP * (1 - f) < 0.3 }; }
  if (c < up + RAMP + p.down) return { h: 0, down: true };
  const f = (c - up - RAMP - p.down) / RAMP; return { h: UP * f, down: UP * f < 0.3 };
}
/* can a car that reaches the slab at `t1` and is clear of it after `transit` seconds go through without being caught? (a margin either side: a car is not a point) */
export function clearFor(p, t1, transit) {
  for (let t = t1 - 0.25; t <= t1 + transit + 0.15; t += 0.05) if (pressAt(p, t).down) return false;
  return true;
}
/* the soonest time at or after `t1` that a car could arrive and get through */
export function nextClear(p, t1, transit) {
  for (let t = t1; t < t1 + p.period + 1; t += 0.05) if (clearFor(p, t, transit)) return t;
  return t1 + p.period;
}
