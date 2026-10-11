/* A CAR AS THE SIM WANTS IT: what `chassis()` works out from the few numbers that make one car different from another (docs/vroom/plan.md section 5: a car is a stack of parts, and its model, its collision box
   and its handling are all worked out from them, so a long wheelbase handles like one). Body space: the origin is the centre of mass, x to the right, y up, z ahead. Everything the sim needs lives in the
   spec it returns: the four wheels (where, how stiff, which drive and steer), the box and wheel spheres the body is collided with, three spheres for the other cars, the inertia. Pure.
     chassis({ mass, length, width, height, wheelbase, track, radius, comY, comZ, drive, accel, vtop, steer, ... })
   comY is how high the centre of mass is above the ground the car stands on (the tall ones flip); comZ how far forward of the middle of the axles (a negative number is a rear-heavy car, which wheelies). */
import { SUSP, GRAVITY, CARS } from './tune.js';

export function chassis(o) {
  const m = o.mass, L = o.length, W = o.width, H = o.height, wb = o.wheelbase || L * 0.66, tr = o.track || W * 0.86, r = o.radius || 0.04;
  const comY = o.comY, comZ = o.comZ || 0, clear = o.clearance == null ? 0.032 : o.clearance;
  const drive = o.drive || 'rwd', vtop = o.vtop, tTop = o.accel || 1.0;
  /* the engine: thrust F = fmax * (1 - (v / vtop)^2), so the speed climbs as vtop * tanh(t * a0 / vtop); a0 is chosen so the car is at 95 % of its top speed in `accel` seconds */
  const a0 = 1.83 * vtop / tTop, fmax = m * a0;
  const zf = wb / 2 - comZ, zr = -(wb / 2 + comZ), fFront = -zr / wb;              /* the axles' z, and the share of the weight on the front one */
  const wheels = [], load = [m * GRAVITY * fFront / 2, m * GRAVITY * fFront / 2, m * GRAVITY * (1 - fFront) / 2, m * GRAVITY * (1 - fFront) / 2];
  const xs = [-tr / 2, tr / 2, -tr / 2, tr / 2], zs = [zf, zf, zr, zr];
  const share = drive === 'awd' ? [0.25, 0.25, 0.25, 0.25] : drive === 'fwd' ? [0.5, 0.5, 0, 0] : [0, 0, 0.5, 0.5];
  const bshare = [0.3, 0.3, 0.2, 0.2];
  const rest = o.rest || SUSP.rest, travel = o.travel || SUSP.travel, freq = o.freq || SUSP.freq, zeta = o.zeta || SUSP.zeta;
  for (let i = 0; i < 4; i++) {
    const k = Math.pow(2 * Math.PI * freq, 2) * load[i] / GRAVITY, sag = load[i] / k;
    wheels.push({ x: xs[i], z: zs[i], y: -comY + r + rest - sag, r, k, c: 2 * zeta * Math.sqrt(k * load[i] / GRAVITY), rest, travel, steer: i < 2 ? 1 : 0, drive: share[i], brake: bshare[i], load: load[i], front: i < 2 });
  }
  /* the body: a box W x H x L, its centre over the middle of the axles, standing `clear` above the ground */
  const boxY = -comY + clear + H / 2, boxZ = -comZ, hx = W / 2, hy = H / 2, hz = L / 2;
  const probes = [];
  /* a point of the box, by which side of it on each axis (-1, 0, 1). The bottom at either END is lifted a little (a bumper that is cut away: an approach and a departure angle), or the nose digs into the
     foot of every ramp */
  const lift = o.bumper == null ? 0.03 : o.bumper;
  const pt = (sx, sy, sz) => probes.push([sx * hx, boxY + sy * hy + (sy < 0 && sz !== 0 ? lift : 0), boxZ + sz * hz, 0, 0]);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pt(sx, sy, sz);          /* the eight corners */
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) pt(sx, sy, 0);                                       /* the edge midpoints along z */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pt(sx, 0, sz);                                       /* along y */
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) pt(0, sy, sz);                                       /* along x */
  const nBox = probes.length;
  /* probes are [x, y, z, radius, kind]: kind 0 a point of the box, 1 a wheel at its ride height (a kerb or a wall catches it; the ground is the suspension's), 2 a wheel pushed all the way up its travel
     (everything stops it: this is the hard end of the suspension, which a ray down from a mount cannot be once the mount is under the road) */
  for (let i = 0; i < 4; i++) probes.push([xs[i], -comY + r, zs[i], r, 1]);
  for (let i = 0; i < 4; i++) probes.push([xs[i], wheels[i].y - (wheels[i].rest - wheels[i].travel), zs[i], r, 2]);
  /* inertia about the centre of mass: a solid box about its own centre, moved by the parallel-axis theorem; `inertia` scales it (a lower number is a twitchier car) */
  const k = o.inertia == null ? 1.6 : o.inertia;
  const Ix = k * (m / 12 * (H * H + L * L) + m * (boxY * boxY + boxZ * boxZ)), Iy = k * (m / 12 * (W * W + L * L) + m * boxZ * boxZ), Iz = k * (m / 12 * (W * W + H * H) + m * boxY * boxY);
  const sr = (o.sphere || CARS.radius) * Math.min(1.3, W / 0.22);
  return {
    name: o.name || 'CAR', mass: m, L, W, H, wheelbase: wb, track: tr, radius: r, comY, comZ, drive, vtop, tTop, fmax, a0,
    wheels, probes, nBox, box: { x: hx, y: hy, z: hz, cy: boxY, cz: boxZ },
    inertia: [Ix, Iy, Iz], invI: [1 / Ix, 1 / Iy, 1 / Iz],
    spheres: [[0, boxY, boxZ - 0.3 * L, sr], [0, boxY, boxZ, sr], [0, boxY, boxZ + 0.3 * L, sr]],
    brakeF: o.brake || m * GRAVITY * 0.9,                                  /* the most the brakes can ask of the road: a bit under one g, the road's mu limits it */
    steerMax: o.steer || 0.5,                                              /* full lock, radians */
    reverse: o.reverse == null ? 0.5 : o.reverse,                          /* how much of the engine reverse gets */
    gripLat: o.gripLat || 1, gripLong: o.gripLong || 1,                    /* this car's tyre: lateral and longitudinal, on top of the surface */
    latBias: o.latBias == null ? 1.12 : o.latBias,                         /* the rear's sideways grip over the front's: above 1 is a car that pushes wide before it spins, below 1 is a drifty one */
    dragK: o.drag == null ? 1 : o.drag, downforce: o.downforce == null ? 1 : o.downforce,
    airTorque: o.air || 1
  };
}
/* the weight on each wheel at rest, newtons (for the checks and for the suspension: every wheel is tuned to sag by its own share) */
export const staticLoad = spec => spec.wheels.map(w => w.load);
