/* THE KIT THE PICKUP CHECKS SHARE (dev-only, not packaged): a stage of a few cars on SORTING ROOM's south straight, held still by drivers that do what they are told, and the little tools to put a car somewhere, run the race
   for a while, fire a pickup, and watch what happened to a car (the events, how hard it was stunned and turned over, how long it had no grip or no power). */
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { PICKUPS } from './pickups_deal.js';

export const T = buildTrack(TRACKS.sorting);
export const S0 = 50;                                                         /* the south straight, from 50 m on, is straight for 40 m */
export function arena(n, o) {
  o = o || {};
  const entries = []; for (let i = 0; i < n; i++) entries.push({ id: 'c' + i, name: 'C' + i, car: (o.cars && o.cars[i]) || 'courier', tier: 2 });
  const race = createRace({ track: T, entries, laps: 5, seed: o.seed || 1, rating: 0 });
  for (let i = 0; i < 60 * 4; i++) race.step();
  const P = race.pickups; P.spots.forEach(s => { s.alive = false; s.until = 1e9; });
  race.field.forEach(f => { f.stub = { throttle: 0, brake: 0, steer: 0, repo: false, fire: false }; f.driver = { drive: () => f.stub }; f.hold = []; f.bomb = null; });
  return race;
}
export function put(race, f, s, lat, speed) {
  const p = T.line.at(s);
  race.world.place(f.car, { x: p.x + p.nx * lat, y: p.y, z: p.z + p.nz * lat, yaw: p.yaw });
  f.car.v[0] = p.tx * speed; f.car.v[2] = p.tz * speed;
  f.car.input = { throttle: 0, brake: 0, steer: 0, repo: false };
}
export const run = (race, sec, each) => { for (let i = 0; i < Math.round(sec * 60); i++) { race.step(); if (each) each(race); } };
export const evs = (race, sec, type) => { const out = []; run(race, sec, r => { for (const e of r.events) if (!type || e.type === type) out.push(e); }); return out; };
/* (a few steps first, so the race has seen where the cars were put) */
export const fire = (race, f) => { run(race, 0.05); f.stub.fire = true; race.step(); f.stub.fire = false; return race.events.slice(); };
export const speed = c => Math.hypot(c.v[0], c.v[2]);
/* the most stun and the lowest up-vector a car has over a stretch of time */
export const watch = (race, f, sec) => { let stun = 0, up = 1, flip = false; run(race, sec, r => { stun = Math.max(stun, f.car.tStun); up = Math.min(up, f.car.R[4]); for (const e of r.events) if (e.type === 'flip' && e.car === f.i) flip = true; }); return { stun, up, flip }; };
/* everything over a stretch of time: the events, and how hard a car was stunned and turned over */
export const track = (race, f, sec) => { const events = []; let stun = 0, up = 1, flip = false, spill = 0, power = 0; run(race, sec, r => { stun = Math.max(stun, f.car.tStun); spill = Math.max(spill, f.car.tSpill); power = Math.max(power, f.car.tPower); up = Math.min(up, f.car.R[4]); for (const e of r.events) { events.push(e); if (e.type === 'flip' && e.car === f.i) flip = true; } }); return { events, stun, up, flip, spill, power }; };
export const upMin = (race, f, sec) => { let m = 1, flip = false; run(race, sec, r => { m = Math.min(m, f.car.R[4]); for (const e of r.events) if (e.type === 'flip' && e.car === f.i) flip = true; }); return { up: m, flip }; };
export const give = (f, id, count) => { f.hold = [{ id, count: count || PICKUPS[id].count }]; };

