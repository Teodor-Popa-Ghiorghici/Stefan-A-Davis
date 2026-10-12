/* A CPU DRIVER (docs/vroom/plan.md sections 4 and 8): given the car's own state it hands the sim the integer-free equivalent of a keyboard -- throttle, brake, steer in -1..1 -- from the track's racing line
   (track_line.js) and the speed plan built on it. It sees only what a person sees, and only as it was `reaction` steps ago (the last few observations are kept and an old one is used). It wanders from the
   line a little, picks a side to pass on, now and then slips, and does nothing a keyboard could not. No speed, grip or mass is changed for it. Pure, and seeded: the same race gives the same drive.
     const d = createDriver(track, spec, profile, seed, parts);   car.input = d.drive(car, near, others, dt, ctx)
   `near` is the car's sample index on the line (the race tracks it); `others` are the cars around it [{ ahead, lat, speed }] for passing; `ctx` is what else a driver sees (what it holds, the place it is in, the parcels and hazards ahead, ai_pickups.js).
   `parts` is what the car wears (parts.js simParts): it is what decides the speed a driver plans on snow and ice (surfaceGrip: a car with SNOW TYRES takes a snowy bend faster than one without) and whether it takes a shortcut.
   It returns { throttle, brake, steer, repo, fire }: the keyboard's five keys.
   A SHORTCUT (track_cut.js) is a second line. Coming up to its mouth a driver works out, from the same speed plan it drives by, how long the road it would skip takes and how long the shortcut does (the surface it is made of and the
   fence at its mouth count: a car with no BUMPER BAR does not go at a gate), and goes the short way if that saves enough to be worth the risk, which a bolder driver finds worth less. */
import { racingLine, speedPlan } from './track_line.js';
import { pickupLook, useDecision } from './ai_pickups.js';
import { GRAVITY, STEER, SURF_BY_ID, surfaceGrip } from './tune.js';
import { CUT_LEAD, CUT_TAIL } from './track_cut.js';
import { settleSpeed } from './ai_surface.js';
import { nextClear, clearFor } from './press.js';

const STANLEY = 2.5;                          /* how hard the cross-track error is steered out (1/s) */
const LEAD = 0.25;                            /* seconds ahead the bend's own steering is taken from: a car's yaw is slow to answer the wheels */
const FORK = 24;                              /* metres before a shortcut's mouth at which a driver has made up its mind (its line begins `CUT_LEAD` metres before the mouth, on the road) */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function dice(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* a shortcut as a line to drive: its points, its curvature, the speed to be doing along it and how long it takes (the same plan, for an open road) */
function cutLine(cut, spec, profile, parts, vExit) {
  const S = cut.samples, n = S.length, k = new Float64Array(n), x = new Float64Array(n), z = new Float64Array(n), mu = new Float64Array(n).fill(Math.max(0.12, surfaceGrip(SURF_BY_ID[cut.surf], parts, 0)));
  for (let i = 0; i < n; i++) { x[i] = S[i].x; z[i] = S[i].z; k[i] = S[i].k; }
  const capv = new Float64Array(n).fill(settleSpeed(spec, cut.surf, parts) * 0.95);
  if (cut.gate) { const gi = S.findIndex(p => Math.hypot(p.x - cut.gate.x, p.z - cut.gate.z) < 0.7); if (gi >= 0) for (let i = Math.max(0, gi - 6); i <= Math.min(n - 1, gi + 2); i++) capv[i] = 11; }   /* a gate is broken at any speed over 3 m/s and keeps 0.9 of it: a driver lifts a little, not much */
  const L = { x, z, k, n, step: cut.step, off: new Float64Array(n) }, plan = speedPlan(L, spec, { grip: profile.gripUse, open: true, mu, cap: capv, end: vExit });
  let time = 0; for (let i = 0; i < n; i++) time += cut.step / Math.max(2, plan.v[i]);
  return { cut, L, plan, time, n };
}

export function createDriver(track, spec, profile, seed, parts) {
  const L = racingLine(track);
  /* the grip each place of the road gives this car: asphalt is 1, snow and ice less, and less still without the tyres for them */
  const mu = new Float64Array(L.n); for (let i = 0; i < L.n; i++) mu[i] = Math.max(0.12, surfaceGrip(SURF_BY_ID[track.surfAt ? track.surfAt[i] : 0], parts, 0));
  const dragCap = new Float64Array(L.n).fill(1e9); if (track.surfAt) for (let i = 0; i < L.n; i++) dragCap[i] = Math.min(track.speedCap[i], settleSpeed(spec, track.surfAt[i], parts) * 0.95);
  const plan = speedPlan(L, spec, { grip: profile.gripUse, cap: dragCap, mu: track.surfAt ? mu : null }), n = L.n, ds = L.step, rnd = dice(seed * 2654435761 + 12345);
  const cuts = (track.cuts || []).map(c => cutLine(c, spec, profile, parts, plan.v[Math.round((c.sb + CUT_TAIL) / ds) % n]));
  const hist = [], keep = Math.max(1, profile.reaction + 1);
  const memo = { id: null, since: 0, wait: 0, last: -9 };
  let cycles = 0, cycleT = 0;
  let wander = 0, wanderT = rnd() * 6, slip = 0, slipDir = 1, slipKind = 0, passSide = 0, passT = 0, lastNear = -1, stuckT = 0, backT = 0, age = 0;
  let mode = null;                                              /* the shortcut being driven: { c, j } */
  /* steering toward a line (a Stanley controller: the heading error to the line, a cross-track term that grows with how far off it is and shrinks with speed, and the bend's own steering as feed-forward),
     then to the stick: the sim's front wheels turn a smaller angle at a higher speed (STEER.gain), so the angle wanted is divided by the lock there is. `open` is a road with ends, which is not wrapped round. */
  const idx = (i, m, open) => (open ? clamp(i, 0, m - 1) : ((i % m) + m) % m);
  function steerOn(Ln, i0, o, shift, open) {
    const m = Ln.n, step = Ln.step, w = 2, a = idx(i0 - w, m, open), b = idx(i0 + w, m, open), tx = Ln.x[b] - Ln.x[a], tz = Ln.z[b] - Ln.z[a], tl = Math.hypot(tx, tz) || 1, ux = tx / tl, uz = tz / tl;
    const cte = (o.x - Ln.x[i0]) * -uz + (o.z - Ln.z[i0]) * ux - shift;                       /* to the left of the line (+), less where it was asked to be */
    const yawLine = Math.atan2(ux, uz), yawCar = Math.atan2(o.fx, o.fz);
    let psi = yawLine - yawCar; while (psi > Math.PI) psi -= 2 * Math.PI; while (psi < -Math.PI) psi += 2 * Math.PI;
    const lead = idx(i0 + Math.round(Math.max(0.5, o.sp * LEAD) / step), m, open), kff = Ln.k[lead];
    const delta = psi + Math.atan(STANLEY * cte / (o.sp + 1)) + Math.atan(spec.wheelbase * kff);
    const lock = Math.min(spec.steerMax, Math.atan(STEER.gain * GRAVITY * spec.wheelbase / Math.max(0.25, o.sp * o.sp)));
    return clamp(delta / lock, -1, 1);
  }
  const D = {
    profile, plan, line: L, cuts,
    /* what the driver does this step */
    drive(car, near, others, dt, ctx) {
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
      /* a shortcut: coming up to its mouth a driver decides, once, and takes the edge of the road on the side it is on; at the mouth it is on the shortcut's line until it is out at the other end */
      let forkLat = null;
      if (mode) {
        const Lc = mode.c.L, S = mode.c.cut.samples;
        let bj = mode.j, bd = 1e9; for (let j = Math.max(0, mode.j - 2); j < Math.min(Lc.n, mode.j + 10); j++) { const d = (S[j].x - o.x) ** 2 + (S[j].z - o.z) ** 2; if (d < bd) { bd = d; bj = j; } }
        mode.j = bj;
        if (bj >= Lc.n - 3 || bd > 9) { mode.c.done = true; mode = null; }
      }
      if (!mode) for (const c of cuts) {
        const ia = Math.round(c.cut.sa / ds), ahead = ((ia - near) % n + n) % n;
        if (ahead > n / 2) { c.done = false; c.decision = null; continue; }               /* it is behind: ready for the next lap */
        if (c.done || ahead > FORK / ds) continue;
        if (c.decision == null) {
          /* the same stretch of road both ways: from where the shortcut's line leaves the road to where it is back on it */
          const i0c = Math.round((c.cut.sa - CUT_LEAD) / ds), i1c = Math.round((c.cut.sb + CUT_TAIL) / ds) % n; let tMain = 0; for (let i = ((i0c % n) + n) % n; i !== i1c; i = (i + 1) % n) tMain += ds / Math.max(2, plan.v[i]);
          const need = 0.9 - 0.7 * profile.aggression, gated = c.cut.gate && !(parts && parts.bumperBar);
          c.decision = !gated && tMain - c.time - (c.cut.gate ? 0.4 : 0) > need;
        }
        if (!c.decision) continue;
        const S = c.cut.samples;
        if (Math.hypot(S[1].x - o.x, S[1].z - o.z) < 2.6) mode = { c, j: 1 };
        break;
      }
      /* passing: a car close ahead on my line is gone round on the side with room, at the driver's own boldness */
      passT -= dt;
      if (passT <= 0) {
        passT = 0.25; let want = 0;
        if (others) for (const c of others) if (c.ahead > 0.1 && c.ahead < 2.2 + o.sp * 0.25 && Math.abs(c.lat - (L.off[i0] + wander)) < 0.55 && rnd() < 0.3 + 0.7 * profile.aggression) { want = c.lat > L.off[i0] ? -1 : 1; break; }
        passSide = want;
      }
      /* holding the HOT PARCEL: the nearest car within reach is the one to touch, ahead, or (by easing off and letting it catch up) behind */
      let bombSeek = null;
      if (ctx && ctx.bomb && ctx.around) { let bd = 12; for (const c of ctx.around) if (Math.abs(c.ahead) < bd && Math.abs(c.ahead) > 0.2) { bd = Math.abs(c.ahead); bombSeek = c; } }
      /* where to be: wandering a little, round a car it is passing, toward a parcel it wants, away from a puddle or a stone, or at the car the hot parcel is to be given to */
      let want = wander + passSide * 0.55, steer, vt;
      if (mode) {
        const Lc = mode.c.L;
        steer = steerOn(Lc, mode.j, o, 0, true);
        const pre = Math.round((seen.sp * 0.2 + profile.brakeEarly) / mode.c.cut.step);
        vt = mode.c.plan.v[clamp(mode.j + Math.max(0, pre), 0, Lc.n - 1)];
      } else {
        const look = ctx && forkLat == null ? pickupLook(profile, ctx, ctx.lat, seed) : null;
        if (forkLat != null) want = forkLat - L.off[i0];
        else if (ctx && ctx.stop && ctx.stop.ahead < 28 && ctx.stop.ahead >= 0) want = clamp(ctx.stop.lat - L.off[i0], -3, 3);                  /* LAST MILE: toward the pad of the lit door */
        else if (look && look.avoid) want = look.avoid.lat + (look.avoid.lat > ctx.lat ? -0.7 : 0.7) - L.off[i0];
        else if (bombSeek) want = clamp(bombSeek.lat - L.off[i0], -1.6, 1.6);
        else if (look && look.want != null && !passSide) want = clamp(look.want - L.off[i0], -1.4, 1.4);
        const lim = track.limits, shift = forkLat != null ? clamp(want, -3, 3) : clamp(want, lim.lo[i0] - L.off[i0], lim.hi[i0] - L.off[i0]);
        steer = steerOn(L, i0, o, shift, false);
        /* the speed to be at, a little ahead (the brakes need room), and the profile's own early braking */
        const pre = Math.round((seen.sp * 0.2 + profile.brakeEarly) / ds);
        vt = plan.v[(seen.near + Math.max(0, pre) + n) % n];
      }
      let pressWait = false, stopping = false;
      /* LAST MILE: the lit door's pad is a place to stop on: the speed that gets the car to rest on it (a driver brakes at about 5 m/s^2), and then it waits there (the race says when it has been long enough) */
      if (ctx && ctx.stop && ctx.stop.ahead < -0.4 && ctx.stop.ahead > -20 && sp0 < 6) backT = Math.max(backT, 0.25);              /* over-ran the pad: back up to it */
      if (ctx && ctx.stop && ctx.stop.ahead >= 0 && ctx.stop.ahead < 40) { const d = ctx.stop.ahead - 1.1; vt = Math.min(vt, d <= 0.15 ? 0 : Math.sqrt(2 * 3.2 * d) + 0.3); stopping = true; if (ctx.stop.ahead < 3.5) pressWait = true; }
      /* a press ahead: a driver looks at the beat and arrives when it is up (it can see the slab and hear it): the speed that gets it to the slab at the next time it will be clear, and a stop at the line if it is down now */
      if (ctx && ctx.t != null && track.presses && track.presses.length) {
        const len = track.length, sp = Math.max(sp0, 2.5);
        for (const p of track.presses) {
          const ahead = (((p.s0 - 0.6 - near * ds) % len) + len) % len;
          if (ahead > 40) continue;
          const transit = (p.len + 0.8) / Math.max(sp, 3), t1 = ctx.t + ahead / sp;
          if (clearFor(p, t1, transit)) continue;
          const tw = nextClear(p, t1, transit);
          vt = Math.min(vt, ahead < 1.5 ? 0 : Math.max(1.2, ahead / Math.max(0.2, tw - ctx.t))); if (ahead < 6) pressWait = true;
        }
      }
      if (slip > 0 && slipKind === 0) steer = clamp(steer + slipDir * 0.45, -1, 1);
      const spd = o.sp, over = spd - vt;
      let throttle = clamp((vt - spd) * 2.5 + 0.2, 0, 1), brake = over > 0.25 ? clamp(over * 0.9, 0, 1) : 0;
      if (stopping && over > 0.1) brake = clamp(over * 3, 0, 1);                                                   /* coming up to a door's pad the brakes are used hard enough to stop on it (on ice too) */
      /* a driver feels the tyres let go and eases off the power (a rear-drive car that is flat out out of a bend steps its tail round and then cannot be caught: the wheel's own friction circle says so) */
      let sl = 0; for (const wl of car.wheels) if (wl.slide > sl) sl = wl.slide;
      throttle *= clamp(1 - Math.max(0, sl - 0.06) * 3.5, 0.25, 1);
      if (bombSeek && bombSeek.ahead > 0) { throttle = Math.max(throttle, 0.9); brake = 0; }                       /* after it */
      else if (bombSeek && Math.abs(L.k[i0]) < 0.05) { throttle = 0; brake = bombSeek.ahead > -5 ? 0.3 : 0.7; }       /* let it come: slow right down on a straight so that the car behind runs into the back of it */
      if (slip > 0 && slipKind === 1) { brake = 0; throttle = 1; }
      /* stuck against something: back off for a moment (brake from a standstill is reverse) turning the nose toward where it is going, then go on */
      age += dt;
      stuckT = sp0 < 0.7 && age > 2 && !pressWait ? stuckT + dt : Math.max(0, stuckT - dt * 2);
      /* after three tries at backing out of the same place within ten seconds a driver gives up and presses R, as a person would (the sim's own timer is reset by every bit of backing out) */
      cycleT = Math.max(0, cycleT - dt);
      if (cycleT <= 0) cycles = 0;
      if (stuckT > 0.7) { backT = 0.8; stuckT = 0; cycles++; cycleT = 10; }
      if (cycles >= 3) { cycles = 0; cycleT = 0; backT = 0; mode = null; return { throttle: 0, brake: 0, steer: 0, repo: true, fire: false }; }
      if (backT > 0) { backT -= dt; return { throttle: 0, brake: 1, steer: -steer, repo: false, fire: false }; }
      lastNear = near;
      return { throttle, brake, steer, repo: false, fire: ctx && !mode ? useDecision(profile, ctx, rnd, memo) : false };
    },
    reset() { hist.length = 0; lastNear = -1; mode = null; },
    onCut() { return mode ? mode.c.cut.id : -1; }          /* which shortcut it is driving, if any (the checks read it) */
  };
  void lastNear;
  return D;
}
