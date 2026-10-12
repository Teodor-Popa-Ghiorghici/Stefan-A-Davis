#!/usr/bin/env node
/* node apps/vroom/wall_check.js: a car that has been hit into a wall is not glued to it (pure Node, no browser).
   A wall is a sheet (both sides solid), and a car's corners are pushed out of it by the side they came from. Two things used to hold a car against one:
     THE SIDE      the probes' last places were recorded before the push out, so a corner that had been pushed back across the sheet "came" from the far side on the next substep and was pushed through again, one way
                   and then the other (16 mm either way, 240 times a second): a wedge that reversing did not undo, left only to the three-second rescue
     THE FRICTION  a wall rubbed a car as hard as the floor did (mu 0.45), so a car pressed against one at a steep angle could not slide along it with the engine on, whichever way it was steered
   What is held here: the car backs off a wall it was hit into at every angle and speed within a moment (and never by the rescue); a corner that is pushed back across a wall is not pushed through it again; a car that keeps its foot down at a
   glancing angle slides on along the wall; a car pressed straight in is still put back after three seconds (the rescue is the net, not the way out). */
import { suite, carSpec, stage, drop, speed } from './check_kit.js';
import { soup } from './col_build.js';
import { collide } from './sim_body.js';
import { BODY } from './tune.js';

const T = suite('wall_check');
const { ok } = T;
const WZ = 3;                                                              /* the wall: the sheet z = 3, from far behind to far ahead, 0.6 m tall */
const deg = d => d * Math.PI / 180;

/* a car approaches the wall at `ang` degrees to it and `v` m/s; once it has hit, `after(car, since)` sets the controls. Returns what happened. */
function hitWall(ang, v, after, secs) {
  const S = soup().ground(-60, -60, 300, 60, 0, 0, 30).wall(-50, WZ, 250, WZ, 0, 0.6), w = stage(S);
  const yaw = Math.PI / 2 - deg(ang), car = drop(w, carSpec(), { x: 0, z: WZ - 1.5, yaw });
  for (let i = 0; i < 60; i++) w.step();
  car.v[0] = Math.sin(yaw) * v; car.v[2] = Math.cos(yaw) * v;
  let hit = -1, free = -1, rescues = 0, still = 0;
  const n = Math.round((secs || 5) * 60);
  for (let i = 0; i < n; i++) {
    if (hit < 0) { car.input.throttle = 1; car.input.brake = 0; car.input.steer = 0; } else after(car, (i - hit) / 60);
    w.step();
    for (const e of w.events) { if (e.type === 'hit-wall' && hit < 0) hit = i; if (e.type === 'repo-start') rescues++; }
    if (hit >= 0) {
      const d = WZ - car.p[2];
      if (free < 0 && d > 0.4) free = (i - hit) / 60;
      if (speed(car) < 0.5 && d < 0.3 && rescues === 0) still += 1 / 60;
    }
  }
  return { hit: hit >= 0, free, rescues, still, car };
}
const reverse = c => { c.input.throttle = 0; c.input.brake = 1; c.input.steer = 0; };

/* ---- backing off: every angle, two speeds ---- */
{
  let worst = 0, rescued = 0, hits = 0, said = '';
  for (const ang of [25, 45, 60, 80, 90]) for (const v of [4, 9]) {
    /* hold reverse only while the car faces the wall: once it has backed round and faces away, a held reverse is a car driven into the wall on purpose */
    const r = hitWall(ang, v, c => { if (c.R[8] > 0) reverse(c); else { c.input.throttle = 1; c.input.brake = 0; c.input.steer = 0; } }, 3);
    if (r.hit) hits++; else said += ' ' + ang + '/' + v + ':no hit';
    worst = Math.max(worst, r.still); rescued += r.rescues;
    if (r.still > 0.35) said += ' ' + ang + '/' + v + ':' + r.still.toFixed(1) + ' s';
  }
  ok(hits === 10, 'every one of ten hits (25 to 90 degrees, 4 and 9 m/s) is a hit' + said);
  ok(worst <= 0.35, 'a car hit into a wall and put in reverse is never held against it (the longest it stood still against one: ' + worst.toFixed(2) + ' s)');
  ok(rescued === 0, 'and the rescue is not what gets it off (' + rescued + ' put back)');
}
/* ---- the side a corner is pushed out to ---- */
{
  /* the front corners of a car are 8 mm through the sheet, having come from the near side; the solver is run over and over with the car not moving. The first push puts them back across; none after it may put them
     through again (it used to, each way in turn: the push was recorded before it was made) */
  const w = stage(soup().ground(-20, -20, 20, 20, 0, 0, 4).wall(-20, WZ, 20, WZ, 0, 0.6)), car = drop(w, carSpec(), { x: 0, z: WZ - 0.21 + 0.008, yaw: 0 });
  for (let k = 0; k < car.pprev.length / 3; k++) car.pprev[k * 3 + 2] -= 0.05;
  const front = car.spec.probes.map((b, k) => [b, k]).filter(([b]) => b[2] > 0.2), zOf = (k) => car.pw[k * 3 + 2];
  const zs = [];
  for (let i = 0; i < 10; i++) { collide(w, car, 1 / 240); zs.push(car.p[2]); }
  let through = 0; for (let i = 1; i < zs.length; i++) if (zs[i] > zs[i - 1] + 0.001) through++;
  ok(front.length >= 4 && zOf(front[0][1]) > 0, 'the corners were set up through the sheet (' + front.length + ' front probes)');
  ok(zs[0] < WZ - 0.21 + 0.008 - 0.005, 'the first push takes the car back across the wall (' + ((zs[0] - (WZ - 0.21 + 0.008)) * 1000).toFixed(1) + ' mm)');
  ok(through === 0 && Math.abs(zs[9] - zs[1]) < 0.002, 'and nothing afterwards pushes it back through (' + through + ' pushes the wrong way in 9; it moves ' + (Math.abs(zs[9] - zs[1]) * 1000).toFixed(2) + ' mm after the second)');
}
/* ---- the foot kept down at a glancing angle ---- */
{
  let slid = 0, n = 0, minSpeed = 99;
  for (const ang of [20, 30, 45]) {
    const r = hitWall(ang, 6, c => { c.input.throttle = 1; c.input.brake = 0; c.input.steer = 0; }, 2.5);
    n++; if (r.still < 0.4) slid++; minSpeed = Math.min(minSpeed, speed(r.car));
  }
  ok(slid === n, 'a car that keeps its foot down at 20, 30 and 45 degrees to a wall slides on along it and is not held (' + slid + ' of ' + n + ', never under ' + minSpeed.toFixed(1) + ' m/s at the end)');
  ok(BODY.wallMu > 0 && BODY.wallMu < BODY.mu / 2, 'a wall rubs a car, but a good deal less than the floor does (wall mu ' + BODY.wallMu + ', floor ' + BODY.mu + ')');
}
/* ---- pressed straight in: the net still holds ---- */
{
  const r = hitWall(90, 6, c => { c.input.throttle = 1; c.input.brake = 0; c.input.steer = 0; }, 6);
  ok(r.rescues >= 1, 'a car driven straight into a wall and held there is put back after three seconds (' + r.rescues + ' time(s))');
}
T.done();
