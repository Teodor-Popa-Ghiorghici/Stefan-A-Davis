/* A CPU DRIVER (docs/vroom/plan.md sections 4 and 8): given the car's own state it hands the sim the integer-free equivalent of a keyboard -- throttle, brake, steer in -1..1 -- from the track's racing line
   (track_line.js) and the speed plan built on it. It sees only what a person sees, and only as it was `reaction` steps ago (the last few observations are kept and an old one is used). It wanders from the
   line a little, picks a side to pass on, now and then slips, and does nothing a keyboard could not. No speed, grip or mass is changed for it. Pure, and seeded: the same race gives the same drive.
     const d = createDriver(track, spec, profile, seed);   car.input = d.drive(car, near, others)
   `near` is the car's sample index on the line (the race tracks it); `others` are the cars around it [{ s, lat, ahead }] for passing. */
import { racingLine, speedPlan } from './track_line.js';
import { GRAVITY, STEER } from './tune.js';

const STANLEY = 2.5;                          /* how hard the cross-track error is steered out (1/s) */
const LEAD = 0.25;                            /* seconds ahead the bend's own steering is taken from: a car's yaw is slow to answer the wheels */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function dice(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export function createDriver(track, spec, profile, seed) {
  const L = racingLine(track), plan = speedPlan(L, spec, { grip: profile.gripUse, cap: track.speedCap }), n = L.n, ds = L.step, rnd = dice(seed * 2654435761 + 12345);
  const hist = [], keep = Math.max(1, profile.reaction + 1);
  let wander = 0, wanderT = rnd() * 6, slip = 0, slipDir = 1, slipKind = 0, passSide = 0, passT = 0, lastNear = -1, stuckT = 0, backT = 0, age = 0;
  const D = {
    profile, plan, line: L,
    /* what the driver does this step */
    drive(car, near, others, dt) {
      dt = dt || 1 / 60;
      const R = car.R, p = car.p, v = car.v;
      /* what is felt at once (where the car is, which way it points) and what is seen late (how far round the lap it is, so where the next corner is, and the cars about) */
      const sp0 = Math.hypot(v[0], v[2]), o = { x: p[0], z: p[2], fx: R[2], fz: R[8], sp: sp0 }, i0 = near;
      hist.push({ near, sp: sp0 });
      if (hist.length > keep) hist.shift();
      const seen = hist[0];
      /* the wander: a slow drift from the line, a new target every second or two */
      wanderT -= dt; if (wanderT <= 0) { wanderT = 1 + rnd() * 2; D.wanderTarget = (rnd() * 2 - 1) * profile.lineError; }
      wander += ((D.wanderTarget || 0) - wander) * Math.min(1, dt * 1.2);
      /* a slip, now and then */
      if (slip > 0) slip -= dt; else if (rnd() < profile.mistake * dt) { slip = 0.4 + rnd() * 0.5; slipDir = rnd() < 0.5 ? -1 : 1; slipKind = rnd() < 0.5 ? 0 : 1; }
      /* passing: a car close ahead on my line is gone round on the side with room, at the driver's own boldness */
      passT -= dt;
      if (passT <= 0) {
        passT = 0.25; let want = 0;
        if (others) for (const c of others) if (c.ahead > 0.1 && c.ahead < 2.2 + o.sp * 0.25 && Math.abs(c.lat - (L.off[i0] + wander)) < 0.55 && rnd() < 0.3 + 0.7 * profile.aggression) { want = c.lat > L.off[i0] ? -1 : 1; break; }
        passSide = want;
      }
      const lim = track.limits, shift = clamp(wander + passSide * 0.55, lim.lo[i0] - L.off[i0], lim.hi[i0] - L.off[i0]);
      /* steer to the line (a Stanley controller: the heading error to the line, a cross-track term that grows with how far off it is and shrinks with speed, and the bend's own steering as feed-forward),
         then to the stick: the sim's front wheels turn a smaller angle at a higher speed (STEER.gain), so the angle wanted is divided by the lock there is */
      const w = 2, a = (i0 + n - w) % n, b = (i0 + w) % n, tx = L.x[b] - L.x[a], tz = L.z[b] - L.z[a], tl = Math.hypot(tx, tz) || 1, ux = tx / tl, uz = tz / tl;
      const cte = (o.x - L.x[i0]) * -uz + (o.z - L.z[i0]) * ux - shift;                       /* to the left of the line (+), less where it was asked to be */
      const yawLine = Math.atan2(ux, uz), yawCar = Math.atan2(o.fx, o.fz);
      let psi = yawLine - yawCar; while (psi > Math.PI) psi -= 2 * Math.PI; while (psi < -Math.PI) psi += 2 * Math.PI;
      const lead = (i0 + Math.round(Math.max(0.5, o.sp * LEAD) / ds)) % n, kff = L.k[lead];
      const delta = psi + Math.atan(STANLEY * cte / (o.sp + 1)) + Math.atan(spec.wheelbase * kff);
      const lock = Math.min(spec.steerMax, Math.atan(STEER.gain * GRAVITY * spec.wheelbase / Math.max(0.25, o.sp * o.sp)));
      let steer = clamp(delta / lock, -1, 1);
      if (slip > 0 && slipKind === 0) steer = clamp(steer + slipDir * 0.45, -1, 1);
      /* the speed to be at, a little ahead (the brakes need room), and the profile's own early braking */
      const pre = Math.round((seen.sp * 0.2 + profile.brakeEarly) / ds), vt = plan.v[(seen.near + Math.max(0, pre) + n) % n];
      const spd = o.sp, over = spd - vt;
      let throttle = clamp((vt - spd) * 2.5 + 0.2, 0, 1), brake = over > 0.25 ? clamp(over * 0.9, 0, 1) : 0;
      if (slip > 0 && slipKind === 1) { brake = 0; throttle = 1; }
      /* stuck against something: back off for a moment (brake from a standstill is reverse) turning the nose toward where it is going, then go on */
      age += dt;
      stuckT = sp0 < 0.7 && age > 2 ? stuckT + dt : Math.max(0, stuckT - dt * 2);
      if (stuckT > 0.7) { backT = 0.8; stuckT = 0; }
      if (backT > 0) { backT -= dt; return { throttle: 0, brake: 1, steer: -steer, repo: false }; }
      lastNear = near;
      return { throttle, brake, steer, repo: false };
    },
    reset() { hist.length = 0; lastNear = -1; }
  };
  void lastNear;
  return D;
}
