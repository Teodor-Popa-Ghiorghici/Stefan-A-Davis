/* LAST MILE (docs/vroom/plan.md section 9: the child's own mode). A parcel rides in the bed of your truck, PHYSICALLY: it stays there while the truck is driven and comes out over a jump, in a hit or on its roof, and
   then it is a loose thing on the road that you must stop on to pick up. The doors of the road (track_door.js, six of them round the lap) light up one at a time, the same order for everybody; stop on the pad of the lit
   door with the parcel in the bed and it is delivered, and the next door lights. The first to deliver all six wins. The tip for a delivery falls with time carried and with damage (a drop, a hit), and rivals deliver
   theirs the same way (they stop on the pad too: ai.js `stop`), with a parcel that is never dropped but whose tip falls with the time. Pure and seeded: it is stepped after the race's own step.
     const lm = createLastMile(race, o);  race.lm = lm;  lm.step(events)  (every step)  lm.result() */
import { GRAVITY, STEP } from './tune.js';
import { ray } from './col_grid.js';
import { SCRATCH_TIP } from './lm_tip.js';

export const N_DOORS = 6, BASE_TIP = 100, TIME_RATE = 1.6, DROP_COST = 14, HIT_COST = 4, MIN_TIP = 10, WIN_TIP = 150, HOLD = 0.7;
/* what the truck must do to throw the parcel: a change of speed within a twentieth of a second (m/s, the way the bed faces) that is a hard landing, a side blow or a hard stop, or being on its side or its roof */
export const EJECT = { up: 2.7, lat: 2.4, along: 3.2, tilt: 0.25, window: 3 };
const BED = [0, 0.11, -0.06], R_PARCEL = 0.06, PICK = { r: 0.38, speed: 3.2 };

export function createLastMile(race, o) {
  o = o || {};
  const T = race.track, n = Math.min(o.deliveries || N_DOORS, T.doors.length), L = T.length;
  /* the doors in the order they will be asked for: those ahead of the start line, nearest first */
  const ahead = T.doors.map((d, i) => ({ i, s: ((d.s - T.startS) % L + L) % L })).sort((a, b) => a.s - b.s);
  while (ahead.length && ahead[0].s < 40) ahead.push(ahead.shift());                       /* (a door right after the grid is left to the end: a field of eight has not sorted itself out by then) */
  const order = ahead.slice(0, n).map(d => d.i);
  const st = race.field.map(f => ({ f, k: 0, tips: 0, delivered: 0, perfect: 0, carry: 0, damage: 0, hold: 0, dvs: [], parcel: { state: 'bed', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, drops: 0 }, vprev: [0, 0, 0], done: false, finishT: 0, deliveries: [] }));
  const LM = { race, order, n, st, events: [], over: false };
  const door = s => T.doors[order[Math.min(s.k, n - 1)]];
  /* what a driver is told about its next stop: how far along the line the pad is, and which side of the road it is on */
  LM.stopFor = f => {
    const s = st[f.i]; if (s.done) return null;
    const d = door(s), ds = (((T.line.samples[T.line.nearest(d.x, d.z)].s - (((f.dist % L) + L) % L)) % L) + L) % L;
    const q = T.line.samples[T.line.nearest(d.x, d.z)], lat = (d.x - q.x) * q.nx + (d.z - q.z) * q.nz;
    return { ahead: ds > L / 2 ? ds - L : ds, lat, hold: s.hold > 0 };                       /* negative: the pad is behind (a few metres over-run is backed up from) */
  };
  LM.target = i => (st[i].done ? -1 : door(st[i]).i);
  const tipOf = s => Math.max(MIN_TIP, Math.round(BASE_TIP - TIME_RATE * s.carry - DROP_COST * s.parcel.drops - HIT_COST * s.damage));
  LM.tip = i => tipOf(st[i]);
  const bedAt = c => { const R = c.R; return [c.p[0] + R[0] * BED[0] + R[1] * BED[1] + R[2] * BED[2], c.p[1] + R[3] * BED[0] + R[4] * BED[1] + R[5] * BED[2], c.p[2] + R[6] * BED[0] + R[7] * BED[1] + R[8] * BED[2]]; };

  LM.step = events => {
    LM.events.length = 0;
    if (race.state === 'count') return;
    for (const s of st) {
      const f = s.f, c = f.car, v = c.v, R = c.R, sp = Math.hypot(v[0], v[2]);
      if (s.done) continue;
      if (s.hold > 0) s.hold -= STEP;
      s.carry += STEP;
      for (const e of events) if (e.type === 'hit-wall' && e.car === f.i && e.speed > 4) { s.damage++; LM.events.push({ type: 'hurt', i: f.i }); }
      /* the human's parcel is a thing: in the bed, loose, or (when it falls out of the world) back in the bed after a moment */
      if (f.human || f.entry.proxy) {
        const P = s.parcel, up = [R[1], R[4], R[7]], fw = [R[2], R[5], R[8]], rt = [R[0], R[3], R[6]];
        const dv = [v[0] - s.vprev[0], v[1] - s.vprev[1] + GRAVITY * STEP, v[2] - s.vprev[2]];                    /* what this step did to the truck's speed, the pull of gravity taken out */
        s.vprev = [v[0], v[1], v[2]]; s.dvs.push(dv); if (s.dvs.length > EJECT.window) s.dvs.shift();
        if (P.state === 'bed') {
          const sum = [0, 0, 0]; for (const d of s.dvs) { sum[0] += d[0]; sum[1] += d[1]; sum[2] += d[2]; }
          const sfUp = sum[0] * up[0] + sum[1] * up[1] + sum[2] * up[2], sfLat = Math.abs(sum[0] * rt[0] + sum[1] * rt[1] + sum[2] * rt[2]), sfAlong = Math.abs(sum[0] * fw[0] + sum[1] * fw[1] + sum[2] * fw[2]);
          const nowAt = bedAt(c); P.x = nowAt[0]; P.y = nowAt[1]; P.z = nowAt[2];
          P.grace = Math.max(0, (P.grace || 0) - STEP);
          if (race.t > 3 && P.grace <= 0 && (sfUp > EJECT.up || sfLat > EJECT.lat || sfAlong > EJECT.along || up[1] < EJECT.tilt)) {
            P.y = Math.max(P.y, c.p[1] + 0.1); P.state = 'loose'; P.vx = v[0] + up[0] * 1.6; P.vy = v[1] + Math.max(1.2, up[1] * 1.6); P.vz = v[2] + up[2] * 1.6; P.drops++; P.t = 0; LM.events.push({ type: 'drop', i: f.i, force: Math.max(sfUp, sfLat, sfAlong) });
          }
        } else {
          P.t += STEP; P.vy -= GRAVITY * STEP; P.x += P.vx * STEP; P.y += P.vy * STEP; P.z += P.vz * STEP;
          const g = ray(T.col, P.x, P.y + 0.5, P.z, 0, -1, 0, 4), gy = g >= 0 ? P.y + 0.5 - g : null;
          if (gy != null && P.y < gy + R_PARCEL) { P.y = gy + R_PARCEL; if (P.vy < -0.6) { P.vy *= -0.4; LM.events.push({ type: 'thud', i: f.i }); } else P.vy = 0; P.vx *= 0.9; P.vz *= 0.9; }
          if (P.y < -12) { P.state = 'bed'; P.grace = 1.5; LM.events.push({ type: 'lost', i: f.i }); }
          const d = Math.hypot(P.x - c.p[0], P.z - c.p[2]);
          if (P.t > 0.4 && d < PICK.r && sp < PICK.speed && Math.abs(P.y - c.p[1]) < 0.5 && R[4] > 0.5) { P.state = 'bed'; P.grace = 1; LM.events.push({ type: 'pickup', i: f.i }); }
        }
      }
      /* the pad of the lit door: stop on it (with the parcel in the bed, if it is the human's) and it is delivered after a moment */
      const d = door(s), at = Math.hypot(c.p[0] - d.x, c.p[2] - d.z), carrying = !(f.human || f.entry.proxy) || s.parcel.state === 'bed';
      if (carrying && at < d.r && sp < 2.4) {
        s.hold += STEP * 2; if (s.hold >= HOLD) {
          const tip = tipOf(s); s.tips += tip; s.delivered++; if (tip >= SCRATCH_TIP) s.perfect++; s.deliveries.push({ door: d.i, tip, time: race.t });
          LM.events.push({ type: 'delivered', i: f.i, door: d.i, tip, k: s.k + 1 });
          s.k++; s.carry = 0; s.damage = 0; s.parcel.drops = 0; s.hold = 0;
          if (s.k >= n) { s.done = true; s.finishT = race.t; f.finished = true; f.finishT = race.t; race.events.push({ type: 'finish', i: f.i, place: 0, time: race.t }); if (race.winner < 0) race.winner = f.i; if (f.human) race.humanDone = true; LM.events.push({ type: 'done', i: f.i }); }
        }
      } else if (s.hold > 0 && at >= d.r) s.hold = Math.max(0, s.hold - STEP * 4);
    }
    LM.over = st.every(s => s.done);
  };
  /* what a person has after it is over: the tips of the human's deliveries, a bonus for the win, and how it went (the rating multiplies it) */
  LM.result = () => {
    const h = st.find(s => s.f.human || s.f.entry.proxy), place = race.field.slice().sort((a, b) => (st[a.i].done ? st[a.i].finishT : 1e9) - (st[b.i].done ? st[b.i].finishT : 1e9) || a.i - b.i).findIndex(f => f === h.f) + 1;
    return { delivered: h.delivered, perfect: h.perfect, tips: h.tips + (place === 1 && h.done ? WIN_TIP : 0), win: place === 1 && h.done, place, time: h.done ? h.finishT : null };
  };
  race.lm = LM;
  return LM;
}
