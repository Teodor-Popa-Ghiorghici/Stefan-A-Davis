/* EVERY NUMBER THE FEEL DEPENDS ON, in one place (docs/vroom/plan.md section 6): the checks read these, the sim reads these, and nothing else in the game decides how a car handles. Change a number here and
   run physics_check.js, ai_check.js and (from phase 5) budget_bot.js: the first two say whether it is still a toy RC car, the last whether the game is still the right difficulty.
   The world is life-size and a car is a toy: ~0.4 m long, 1.2 to 3 kg. Speeds are m/s, a scale feel and not real miles an hour. Pure. */
export const STEP = 1 / 60;                    /* a sim step, seconds: the game, the CPU, a ghost and the budget bot all advance in these */
export const SUBSTEPS = 4;                     /* physics substeps inside one step (240 Hz): a suspension and a tyre are stiff */
export const GRAVITY = 9.81 * 1.6;             /* snappy jumps, not floaty ones (a check measures the airtime of a standard jump) */

/* ratings: the top speed of an event's field, m/s. Re-Volt's 32 / 35 / 37 / 41 / 43 mph, scaled. An event clamps every car to its rating's envelope: tuning lets a weak car reach the cap and nothing passes it. */
export const RATINGS = ['ROOKIE', 'AMATEUR', 'ADVANCED', 'SEMI-PRO', 'PRO'];
export const TOP_SPEED = [13, 14.2, 15, 16.6, 17.5];
/* what a rating's cars may reach in acceleration (the engine's 0 to 95 % of top speed, seconds, the quickest) and in grip (the tyre's mu on asphalt, the most). A tyre can ask no more of the road than mu g,
   so a car is held by its tyres long before it is held by this number: 15.7 m/s^2 at mu 1 is about a second to the top of a ROOKIE's speed even with all four driven. */
export const ACCEL_BEST = [1.9, 1.75, 1.6, 1.45, 1.3];
export const GRIP_MAX = [1.0, 1.05, 1.1, 1.15, 1.2];

/* SURFACES: what a triangle of the track is made of. mu is the tyre's grip (the friction circle's radius is mu * the weight on the wheel), drag a drag on the wheel that rolls (newtons per m/s, a deep
   snow, a carpet), and the part that gives a better mu where this one is poor. `belt` is a surface that moves what stands on it (a conveyor: its direction is per triangle). */
export const SURF = {
  asphalt:   { id: 0, mu: 1.0, drag: 0 },
  lino:      { id: 1, mu: 1.0, drag: 0 },
  carpet:    { id: 2, mu: 1.1, drag: 0.35 },
  cardboard: { id: 3, mu: 0.9, drag: 0.05 },
  packed:    { id: 4, mu: 0.55, drag: 0.02, tyres: 0.85 },
  deep:      { id: 5, mu: 0.45, drag: 0.5, tyres: 0.75 },
  ice:       { id: 6, mu: 0.18, drag: 0, chains: 0.6 },
  belt:      { id: 7, mu: 1.0, drag: 0.04, belt: true },         /* a conveyor: its own surface moves (the triangle's belt velocity); see BELT_CARRY */
  wood:      { id: 8, mu: 0.85, drag: 0.02 },
  metal:     { id: 9, mu: 0.8, drag: 0 },
  tile:      { id: 10, mu: 0.75, drag: 0 },
  rubber:    { id: 11, mu: 1.2, drag: 0.1 }
};
export const SURF_BY_ID = Object.values(SURF).sort((a, b) => a.id - b.id);
/* a belt carries what is slower than itself up to its own speed: a standing car is moved off at this share of its weight (about 1.9 m/s^2), and fades out as it reaches the belt's speed; a car already faster than the belt feels nothing but its rolling drag */
export const BELT_CARRY = 0.12;
export const SPILL_GRIP = 0.3, SPILL_TIME = 2.0;       /* antifreeze or a snowball splash: mu x 0.3 for two seconds */
export const COMPOUND = [1, 1.05, 1.1, 1.15];          /* TYRE COMPOUND, three levels (0 is the stock tyre): a multiplier on every surface's mu, held by the rating's cap */

/* the tyre: lateral force is -mu N tanh(LAT_K v_side / (|v_forward| + LAT_V0)), a slip angle that saturates; rolling resistance a little of the load */
export const LAT_K = 5.5, LAT_V0 = 1.0, ROLL_RES = 0.012, ROLL_SMOOTH = 0.3;
export const SUSP = { freq: 7, zeta: 0.35, rest: 0.06, travel: 0.05, bump: 6000 };    /* the spring's natural frequency (Hz) and damping ratio; the wheel's distance from its mount at full droop (m) and how far it may rise from there; a stiff stop at the end of the travel, and then a sphere (sim_spec.js) that stops the body like any other part of it */
export const STEER = { rate: 7.5, gain: 2.0 };                        /* how quickly the wheels turn (rad/s); the lock at speed is the one that asks the road for `gain` times a tyre's grip (v^2 tan(lock) / wheelbase = gain * g), so a keyboard can hold the stick over without spinning */
export const BODY = { mu: 0.45, restitution: 0.22, restSpeed: 0.6, correct: 0.85, slop: 0.0015, probe: 0.012, angDamp: 0.02, linDrag: 0.0016, downforce: 0.0012 };
export const CARS = { restitution: 0.3, mu: 0.25, radius: 0.092 };     /* car against car: three spheres, mass-weighted impulses */
export const AIR = { torque: 7.5, maxRate: 3.2, delay: 0.06, align: 30, damp: 5.5, seek: 0.5, level: 40, levelAfter: 0.15 };   /* a little control in the air: radians a second squared, its cap, and how long off the ground before it works; and what the air itself does: the nose follows the way the car is travelling and the spin dies away, so a jump is an arc and not a tumble */
export const REPOS = { upside: 3.0, stuck: 3.0, fade: 0.6, ghost: 1.0, lift: 0.1, stuckSpeed: 0.25, floor: -12 };
export const WHEELIE = { pitch: 0.45 };                                 /* radians nose up that a check calls a wheelie */

/* mu for a wheel: the surface, the parts the car wears (snowTyres, iceChains, compound 0..3), what has been spilled on it, and the car's own tyre */
export function surfaceGrip(s, parts, spill) {
  const S = typeof s === 'number' ? SURF_BY_ID[s] || SURF.asphalt : s;
  let mu = S.mu;
  if (parts) {
    if (parts.snowTyres && S.tyres) mu = Math.max(mu, S.tyres);
    if (parts.iceChains && S.chains) mu = Math.max(mu, S.chains);
    mu *= COMPOUND[Math.max(0, Math.min(3, parts.compound | 0))];
  }
  return mu * (spill > 0 ? SPILL_GRIP : 1);
}
