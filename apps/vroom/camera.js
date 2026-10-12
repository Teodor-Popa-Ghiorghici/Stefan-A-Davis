/* THE CHASE CAMERA (docs/vroom/plan.md section 4): behind and above the car, looking down the way it is going. The way it looks is the car's heading blended with the way it is travelling (so a slide does not
   whip the picture round and a spin does not spin the world), eased so a bend turns the view a moment after the car; it pulls in when a wall would be between it and the car; the field of view opens up
   with speed; and a hit or a landing shakes it, unless reduced motion is asked for. A pure function of the car and the time: Node holds it (track_check.js, camera checks in vroom_gate_check's neighbour). */
import { ray } from './col_grid.js'; import { FAR } from './view.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

export function createCamera(o) {
  o = o || {};
  const C = { yaw: 0, x: 0, y: 1, z: 0, fov: 1.0, shakeAmp: 0, t: 0, calm: false, back: 0.78, up: 0.36 };
  let seeded = false;
  /* a hit or a landing: `amount` is metres of shake */
  C.shake = amount => { if (!C.calm) C.shakeAmp = Math.min(0.06, C.shakeAmp + amount); };
  /* the camera for a frame: returns { x, y, z, yaw, pitch, roll, fov, near } */
  C.update = (car, dt, col, o2) => {
    const p = car.p, v = car.v, R = car.R, sp = Math.hypot(v[0], v[2]);
    const hy = Math.atan2(R[2], R[8]);                                    /* the way the car points */
    const vy = sp > 2 ? Math.atan2(v[0], v[2]) : hy;                       /* the way it is going */
    const w = clamp((sp - 2) / 6, 0, 0.55);
    const target = hy + angDiff(hy, vy) * w;
    if (!seeded) { C.yaw = target; seeded = true; }
    C.yaw += angDiff(C.yaw, target) * (1 - Math.exp(-dt * (4.5 + sp * 0.15)));
    const back = C.back + sp * 0.012, up = C.up;
    const sx = Math.sin(C.yaw), cz = Math.cos(C.yaw);
    let cx = p[0] - sx * back, cy = p[1] + up, cz2 = p[2] - cz * back;
    /* a wall between the car and the camera: stand in front of it */
    if (col) {
      const dx = cx - p[0], dy = cy - p[1], dz = cz2 - p[2], len = Math.hypot(dx, dy, dz), t = ray(col, p[0], p[1] + 0.05, p[2], dx / len, dy / len, dz / len, len);
      if (t >= 0 && t < len) { const k = Math.max(0.12, t - 0.06) / len; cx = p[0] + dx * k; cy = p[1] + dy * k + 0.03; cz2 = p[2] + dz * k; }
    }
    C.t += dt; C.shakeAmp *= Math.exp(-dt * 7);
    const sh = C.shakeAmp;
    const nx = Math.sin(C.t * 83) * sh, ny = Math.sin(C.t * 97 + 1) * sh, nyaw = Math.sin(C.t * 71 + 2) * sh * 0.5;
    const ahead = 0.9, look = [p[0] + sx * ahead, p[1] + 0.06, p[2] + cz * ahead];
    const ddx = look[0] - cx, ddy = look[1] - cy, ddz = look[2] - cz2;
    const pitch = Math.atan2(ddy, Math.hypot(ddx, ddz));
    const fov = (o2 && o2.fov) || 1.0, k = clamp(sp / 14, 0, 1.2);
    C.fov += ((fov + 0.12 * k) - C.fov) * (1 - Math.exp(-dt * 4));
    return { x: cx + nx, y: cy + ny, z: cz2, yaw: C.yaw + nyaw, pitch: pitch, roll: 0, fov: C.fov, near: 0.05, far: (o2 && o2.far) || FAR };
  };
  C.snap = () => { seeded = false; C.shakeAmp = 0; };
  return C;
}
