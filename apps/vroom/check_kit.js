/* THE KIT THE VROOM CHECKS SHARE (dev-only, not packaged): a flat road, a courier car, a world to put them in, a way to run it, a seeded dice, and the little `ok` every check prints with. */
import { soup } from './col_build.js';
import { chassis } from './sim_spec.js';
import { createWorld } from './sim.js';

export function suite(name) {
  const S = { bad: 0, checks: 0, name };
  S.ok = (c, m, d) => { S.checks++; if (!c) { S.bad++; console.log('FAIL: ' + m + (d ? '   ' + d : '')); } return !!c; };
  S.done = extra => { console.log(S.bad ? S.bad + ' FAILED (of ' + S.checks + ')' : name + ': ok (' + S.checks + ' checks' + (extra ? ', ' + extra : '') + ')'); process.exit(S.bad ? 1 : 0); };
  return S;
}
/* the plain courier: what most scenarios drive. Override anything. */
export const COURIER = { name: 'KEI COURIER', mass: 1.5, length: 0.42, width: 0.22, height: 0.1, comY: 0.058, comZ: 0, vtop: 13, accel: 2.4, drive: 'fwd' };
export const carSpec = o => chassis(Object.assign({}, COURIER, o || {}));
export const flatSoup = (surf, y) => soup().ground(-60, -60, 400, 60, y || 0, surf == null ? 0 : surf, 30);
/* a world, a line to put cars back on, and cars on it heading +x */
export function stage(S, o) {
  o = o || {};
  const w = createWorld({ col: (S || flatSoup()).build(), nodes: o.nodes || [{ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }] });
  return w;
}
export function drop(w, spec, at, opts) { const car = w.addCar(spec, Object.assign({ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }, at || {}), opts); return car; }
export const run = (w, n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); w.step(); } };
export const speed = c => Math.hypot(c.v[0], c.v[2]);
/* settle on the springs for a second */
export const settle = (w, n) => run(w, n || 60);
/* a seeded dice (not the sim's: the sim has none) */
export function dice(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export const deg = r => r * 180 / Math.PI;
