/* THE WORLD: cars on a track, stepped at a fixed 60 Hz, four physics substeps to a step (tune.js). Pure and seeded: no canvas, no clock, no audio, no Math.random -- the same inputs give the same race
   to the bit, which is what lets a recorded input stream be a ghost, the CPU be tested, and the budget bot play whole championships (docs/vroom/plan.md sections 4 and 6).
     const w = createWorld({ col, nodes });        col: a grid from col_grid.js, nodes: [{ x, y, z, yaw }] the line, for putting a car back
     const car = w.addCar(spec, { x, y, z, yaw }); y is the GROUND under it; the car is set down on its springs
     car.input = { throttle: 0..1, brake: 0..1, steer: -1..1, repo: bool };      w.step();      w.events
   Events each step: land {car, airtime, speed}, flip, upside {car}, wheelie {car}, hit-wall {car, speed}, hit-car {a, b, speed, ma, mb}, repo-start {car}, repo {car}, surface {car, surf}. */
import { STEP, SUBSTEPS, STEER, REPOS, WHEELIE, GRAVITY } from './tune.js';
import { wheelForces } from './sim_wheel.js';
import { integrate, collide, rotFromQuat, quatYaw } from './sim_body.js';
import { carCollisions } from './sim_cars.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createWorld(o) {
  const W = { col: o.col, nodes: o.nodes || [], cars: [], events: [], frame: 0, time: 0, nextId: 0 };
  W.addCar = (spec, at, opts) => {
    const n = spec.probes.length, car = {
      id: opts && opts.id != null ? opts.id : W.nextId++, spec, p: new Float64Array(3), q: new Float64Array(4), v: new Float64Array(3), w: new Float64Array(3), R: new Float64Array(9), F: new Float64Array(3), T: new Float64Array(3),
      pw: new Float64Array(n * 3), pprev: new Float64Array(n * 3), sw: new Float64Array(9), hitCool: {},
      wheels: spec.wheels.map(() => ({ ground: false, N: 0, prevX: 0, comp: 0, tri: -1, surf: 0, spin: 0, vf: 0, vs: 0, slide: 0 })),
      input: { throttle: 0, brake: 0, steer: 0, repo: false }, steer: 0, grip: 1, parts: (opts && opts.parts) || { snowTyres: false, iceChains: false, compound: 0 },
      airtime: 0, fallV: 0, roofTime: 0, stuckTime: 0, upside: false, wheelie: false, repoT: 0, ghost: 0, contacts: 0, hardest: 0, lastGood: null, wasRepo: false, lastSurf: -1,
      tSpill: 0, tPower: 0, tTurbo: 0, tStun: 0, odometer: 0
    };
    W.cars.push(car);
    W.place(car, at);
    return car;
  };
  /* set a car on the ground at (x, y, z) facing yaw, at rest on its springs */
  W.place = (car, at) => {
    const sp = car.spec;
    car.p[0] = at.x; car.p[1] = at.y + sp.comY + 0.004; car.p[2] = at.z;
    quatYaw(at.yaw || 0, car.q); rotFromQuat(car.q, car.R);
    car.v.fill(0); car.w.fill(0); car.steer = 0; car.airtime = 0; car.roofTime = 0; car.stuckTime = 0; car.upside = false; car.repoT = 0;
    car.wheels.forEach(w => { w.prevX = 0; w.N = 0; w.ground = false; w.comp = 0; });
    sync(car);
  };
  const sync = car => {                                                       /* the probes' last positions, so the swept test has nothing to sweep from */
    const R = car.R, P = car.p, pr = car.spec.probes;
    for (let k = 0; k < pr.length; k++) { const b = pr[k]; car.pprev[k * 3] = P[0] + R[0] * b[0] + R[1] * b[1] + R[2] * b[2]; car.pprev[k * 3 + 1] = P[1] + R[3] * b[0] + R[4] * b[1] + R[5] * b[2]; car.pprev[k * 3 + 2] = P[2] + R[6] * b[0] + R[7] * b[1] + R[8] * b[2]; }
  };
  const nearest = car => {
    const ref = car.lastGood || { x: car.p[0], y: car.p[1], z: car.p[2] };
    let best = null, bd = Infinity;
    for (const n of W.nodes) { const d = (n.x - ref.x) ** 2 + (n.y - ref.y) ** 2 + (n.z - ref.z) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  };
  /* ask for a car to be put back on the line: after the fade it is moved to the nearest node, facing along the line, and is a ghost for a second */
  W.reposition = car => { if (car.repoT > 0) return false; car.repoT = REPOS.fade; W.events.push({ type: 'repo-start', car: car.id }); return true; };
  W.step = () => {
    const ev = W.events; ev.length = 0;
    const h = STEP / SUBSTEPS;
    const cars = W.cars;
    for (const car of cars) {
      /* the wheels turn toward what is asked, a smaller lock the faster it goes */
      const vF = car.v[0] * car.R[2] + car.v[1] * car.R[5] + car.v[2] * car.R[8];
      const lock = Math.min(car.spec.steerMax, Math.atan(STEER.gain * GRAVITY * car.spec.wheelbase / Math.max(0.25, vF * vF)));
      const target = clamp(car.input.steer, -1, 1) * lock, d = target - car.steer, mv = STEER.rate * STEP;
      car.steer += d > mv ? mv : d < -mv ? -mv : d;
      car.hardest = 0; car.minVy = car.v[1];
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const car of cars) {
        car.F.fill(0); car.T.fill(0);
        if (car.repoT > 0 && car.repoT <= REPOS.fade * 0.9999) { /* waiting out the fade: the car keeps driving as it was */ }
        const touching = wheelForces(W, car, h);
        car.touching = touching;
        integrate(car, h, touching, W.col);
        const hard = collide(W, car, h);
        if (hard > car.hardest) car.hardest = hard;
        if (car.v[1] < car.minVy) car.minVy = car.v[1];
      }
      carCollisions(W, s === SUBSTEPS - 1 ? ev : null);
    }
    for (const car of cars) post(car, ev);
    W.frame++; W.time += STEP;
  };
  function post(car, ev) {
    const R = car.R, v = car.v, speed = Math.hypot(v[0], v[1], v[2]), grounded = car.touching > 0, up = R[4];
    car.odometer += speed * STEP;
    if (grounded) {
      if (car.airtime > 0.25) ev.push({ type: 'land', car: car.id, airtime: car.airtime, speed: -car.minVy });
      car.airtime = 0;
      if (car.touching >= 3 && up > 0.5 && W.frame % 15 === 0) car.lastGood = { x: car.p[0], y: car.p[1], z: car.p[2] };
      let surf = -1; for (const w of car.wheels) if (w.ground) { surf = w.surf; break; }
      if (surf !== car.lastSurf) { car.lastSurf = surf; ev.push({ type: 'surface', car: car.id, surf }); }
    } else car.airtime += STEP;
    if (car.hardest > 1.2) ev.push({ type: 'hit-wall', car: car.id, speed: car.hardest });
    const roof = up < -0.2;
    if (roof && !car.upside) ev.push({ type: 'flip', car: car.id });
    car.upside = roof;
    const nose = R[5] > Math.sin(WHEELIE.pitch) && !car.wheels[0].ground && !car.wheels[1].ground && (car.wheels[2].ground || car.wheels[3].ground);
    if (nose && !car.wheelie) ev.push({ type: 'wheelie', car: car.id });
    car.wheelie = nose;
    car.roofTime = up < 0.1 && speed < 1.5 ? car.roofTime + STEP : 0;
    car.stuckTime = (car.input.throttle > 0.3 || car.input.brake > 0.3) && speed < REPOS.stuckSpeed && car.repoT === 0 ? car.stuckTime + STEP : 0;
    if (car.roofTime >= REPOS.upside || car.stuckTime >= REPOS.stuck || car.p[1] < REPOS.floor || (car.input.repo && !car.wasRepo)) { W.reposition(car); car.roofTime = 0; car.stuckTime = 0; }
    car.wasRepo = !!car.input.repo;
    if (car.repoT > 0) {
      car.repoT -= STEP;
      if (car.repoT <= 0) {
        const n = nearest(car);
        if (n) { W.place(car, { x: n.x, y: n.y + REPOS.lift, z: n.z, yaw: n.yaw }); car.ghost = REPOS.ghost; ev.push({ type: 'repo', car: car.id }); }
        car.repoT = 0;
      }
    }
    if (car.ghost > 0) car.ghost = Math.max(0, car.ghost - STEP);
    if (car.tSpill > 0) car.tSpill -= STEP; if (car.tPower > 0) car.tPower -= STEP; if (car.tTurbo > 0) car.tTurbo -= STEP; if (car.tStun > 0) car.tStun -= STEP;
  }
  /* a hash of the whole state: two runs that agree here agree everywhere (the checks hold ten minutes of it) */
  W.hash = () => {
    let h = 0x811C9DC5;
    const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
    const mix = x => { f64[0] = x; h ^= u32[0]; h = Math.imul(h, 0x01000193) >>> 0; h ^= u32[1]; h = Math.imul(h, 0x01000193) >>> 0; };
    for (const c of W.cars) { for (let i = 0; i < 3; i++) { mix(c.p[i]); mix(c.v[i]); mix(c.w[i]); } for (let i = 0; i < 4; i++) mix(c.q[i]); c.wheels.forEach(w => { mix(w.comp); mix(w.spin); }); mix(c.steer); }
    return h.toString(16).padStart(8, '0');
  };
  return W;
}
