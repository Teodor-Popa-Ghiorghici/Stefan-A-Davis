/* WHAT A PICKUP DOES TO A CAR (docs/vroom/plan.md section 7). Every number a pickup uses is in `U` below, and a pickup does only three things to a car: it KNOCKS it (a toss up, a spin, a push, and for a moment the air does not
   straighten it: sim.js `knock`), it takes its POWER for a while (a timer on the car: tPower, tStun), or it takes its GRIP (a timer on the car's wheels: tSpill, wheel.spill). The sim does not know what a pickup is. Pure. */
export const U = {
  respawn: 4, takeR: 0.2, takeDY: 0.25,
  ball: { v: 20, range: 80, r: 0.22, dy: 0.26, up: 3.0, roll: 9, stun: 0.8, tumble: 0.9, grace: 0.5 },
  rocket: { min: 18, extra: 10, turn: 1.3, cone: 0.6, sense: 16, r: 0.17, life: 3.5, blast: 0.5, up: 2.2, roll: 7, stun: 0.6, tumble: 0.7, delay: 0.25 },
  leads: { time: 5, r: 0.6, cut: 1.5, cool: 1 },
  parcel: { fuse: 6, immune: 0.8, up: 3.2, roll: 10, stun: 1.5, tumble: 1.0, splash: 0.5 },
  freeze: { r: 0.32, life: 14, cool: 1 },
  snow: { v: 13, up: 3.4, splash: 0.5, r: 0.11 },
  stone: { r: 0.09, m: 4, life: 20, fric: 2.0, e: 0.4, cool: 1 },
  fake: { r: 0.15, immune: 1, up: 2.4, roll: 8, stun: 0.8, tumble: 0.8 },
  coffee: { time: 6 },
  cut: { time: 3 }
};

/* a car a pickup may touch: not one that has finished, nor one that has just been put back (a ghost), nor one waiting for the lights */
export const touchable = (R, f) => !f.finished && !(f.car.ghost > 0) && !(f.car.repoT > 0) && R.state !== 'count';

/* the race is told that a pickup landed on a car (the chaos the budget bot counts, and what the sound and the trophies hear) */
export function hit(C, f, by, id) {
  C.R.events.push({ type: 'hit', i: f.i, by, id });
  C.P.stats.hits++; const s = C.P.stats.by[id] || (C.P.stats.by[id] = { picked: 0, used: 0, hit: 0 }); s.hit++;
  f.hitBy = (f.hitBy || 0) + 1;
}
/* toss a car over: up, and a roll to a side the dice choose */
export function flip(C, f, o) {
  const side = C.rnd() < 0.5 ? -1 : 1;
  C.W.knock(f.car, { up: o.up, roll: side * o.roll, push: o.push, stun: o.stun, tumble: o.tumble });
}
/* a burst at a point: cars near it are knocked, more the nearer; the one it hit is `direct` (the whole of it). Returns how many cars it took. */
export function blast(C, x, y, z, by, id, o, direct) {
  let n = 0;
  for (const f of C.R.field) {
    if (!touchable(C.R, f)) continue;
    const p = f.car.p, dx = p[0] - x, dz = p[2] - z, d = Math.hypot(dx, dz), reach = o.blast + 0.12;
    if (f !== direct && (d > reach || Math.abs(p[1] - y) > 0.4)) continue;
    const k = f === direct ? 1 : 1 - d / reach, l = d || 1;
    flip(C, f, { up: o.up * (0.6 + 0.4 * k), roll: o.roll * (0.6 + 0.4 * k), push: [dx / l * 2.5 * k, dz / l * 2.5 * k], stun: o.stun, tumble: o.tumble });
    hit(C, f, by, id); n++;
  }
  C.P.fx.push({ kind: 'boom', x, y, z, age: 0, life: 0.5, r: o.blast });
  return n;
}
/* the ground under a point, or null if there is none (a pit): a ray down from a little above it */
export function groundY(col, ray, x, y, z) { const t = ray(col, x, y + 0.6, z, 0, -1, 0, 2.2); return t < 0 ? null : y + 0.6 - t; }
