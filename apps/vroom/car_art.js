/* A CAR AS A PICTURE (docs/vroom/plan.md section 5): a body built from a stack of parts (car_parts.js, the shells in car_shells_*.js), wheels that turn and spin, an antenna, lamps, and a livery of decals, every part sized
   from the same numbers the physics was (sim_spec.js: the collision box, the wheels' places), so what you see is what you hit. Body space is the sim's: the origin is the centre of mass, x right, y up, z ahead.
   `carModel(id, paint, livery)` builds the meshes once; `drawCar(R, model, car)` places them from where the sim has the car and its wheels. Low-poly on purpose: a car is 30 to 60 pixels wide on the glass. Pure. */
import { builder, mat, box } from './raster_mesh.js';
import { place, placeQuat, rotEuler } from './raster_math.js';
import { CARS, specOf } from './cars.js';
import { kit, M, wheelMesh } from './car_parts.js';
import { SHELLS_A } from './car_shells_a.js';
import { SHELLS_B } from './car_shells_b.js';
import { SHELLS_C } from './car_shells_c.js';

const SHELLS = Object.assign({}, SHELLS_A, SHELLS_B, SHELLS_C);
const SIDE_DEFAULT = [1, -0.7, 0.3, 0.2, 0.8];

/* the meshes for a car in a paint (a palette byte) and a livery ({ side, top } textures from livery.js, or none): { body, wheel, wheelF, antenna, shadow, d } */
export function carModel(id, paint, livery) {
  const c = CARS[id], sp = specOf(id), look = c.look, K = kit(sp, look, paint), b = K.b;
  const { hl, hw, H, y0, zc, W, L, T } = K;
  box(b, 0, y0 + 0.012, zc, W * 0.8, 0.024, L * 0.98, M.dark);                                       /* the chassis plate under the shell */
  const hint = SHELLS[look.shell](K) || {};
  /* lamps: two at the nose, two at the tail, and a bumper in the trim colour, unless the shell has no front to put them on */
  if (hint.lamps !== false) {
    const ly = y0 + H * (hint.lamps || 0.3);
    for (const sx of [-1, 1]) { box(b, sx * hw * 0.7, ly, zc + hl + 0.002, 0.036, 0.022, 0.008, M.head); box(b, sx * hw * 0.74, ly, zc - hl - 0.002, 0.034, 0.02, 0.008, M.tail); }
    box(b, 0, y0 + 0.022, zc + hl + 0.006, W * 0.8, 0.02, 0.016, T);
  }
  /* the livery: a flat of decals on each flank and one on the roof, textures with holes (CLEAR) in them so the paint shows through */
  if (livery) {
    const s = hint.side || SIDE_DEFAULT, sx = hw * s[0] + 0.0016, za = zc + hl * s[1], zb = zc + hl * s[2], ya = y0 + H * s[3], yb = y0 + H * s[4], dm = mat(livery.side, { zbias: 0.0006 });
    b.use(dm);
    b.quad([sx, ya, za], [sx, ya, zb], [sx, yb, zb], [sx, yb, za], [1, 0, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    b.quad([-sx, ya, zb], [-sx, ya, za], [-sx, yb, za], [-sx, yb, zb], [-1, 0, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    if (livery.top && hint.roof) {
      const r = hint.roof, ry = y0 + H * r[0] + 0.002, z0 = zc + hl * (r[1] - r[2]), z1 = zc + hl * (r[1] + r[2]), hx = hw * r[3];
      b.use(mat(livery.top, { zbias: 0.0006 })).quad([-hx, ry, z1], [hx, ry, z1], [hx, ry, z0], [-hx, ry, z0], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
  }
  const body = b.build();
  /* a wheel: axis along x. A ski replaces the front ones if the car has them. */
  const r = sp.radius, ww = (look.wheel && look.wheel.w) || Math.min(0.04, W * 0.17);
  const wheel = wheelMesh(r, ww, look.wheel && look.wheel.kind), wheelF = look.ski ? wheelMesh(r, 0.035, 'ski') : null;
  const ab = builder(), top = y0 + H;
  box(ab, 0, 0.1, 0, 0.005, 0.2, 0.005, M.chrome); box(ab, 0, 0.205, 0, 0.012, 0.012, 0.012, M.tail);
  const sb = builder(); sb.use(M.shadow);
  { const rx = W * 0.62, rz = L * 0.62, n = 12; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; sb.triSmooth([0, 0, 0], [Math.cos(a0) * rx, 0, Math.sin(a0) * rz], [Math.cos(a1) * rx, 0, Math.sin(a1) * rz], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1], [0, 0], [0, 0]); } }
  const a = hint.ant ? [hw * hint.ant[0], y0 + H * hint.ant[1] - 0.01, zc + hl * hint.ant[2]] : [-hw * 0.6, top - 0.01, zc - hl * 0.75];
  return { id, body, wheel, wheelF, antenna: ab.build(), shadow: sb.build(), antennaAt: a, zc, y0, top, L, W, H, hint };
}

/* a 3 x 3 product, row-major */
function mul(a, b, o) {
  o[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6]; o[1] = a[0] * b[1] + a[1] * b[4] + a[2] * b[7]; o[2] = a[0] * b[2] + a[1] * b[5] + a[2] * b[8];
  o[3] = a[3] * b[0] + a[4] * b[3] + a[5] * b[6]; o[4] = a[3] * b[1] + a[4] * b[4] + a[5] * b[7]; o[5] = a[3] * b[2] + a[4] * b[5] + a[5] * b[8];
  o[6] = a[6] * b[0] + a[7] * b[3] + a[8] * b[6]; o[7] = a[6] * b[1] + a[7] * b[4] + a[8] * b[7]; o[8] = a[6] * b[2] + a[7] * b[5] + a[8] * b[8];
}
const MB = new Float64Array(12), MW = new Float64Array(12), ML = new Float64Array(9), MA = new Float64Array(12), MS = new Float64Array(12);
/* draw one car from the sim's state. `ground` is the road's height under it (for the shadow); `opt.ghost` flickers it (a car being put back), `opt.fuse` shortens the antenna (0..1 left) */
export function drawCar(R, model, car, ground, opt) {
  opt = opt || {};
  if (opt.ghost && (Math.floor(opt.ghost * 12) & 1)) return;
  const p = car.p, q = car.q, Rm = car.R, sp = car.spec;
  placeQuat(q[0], q[1], q[2], q[3], p[0], p[1], p[2], MB);
  R.draw(model.body, MB);
  for (let i = 0; i < sp.wheels.length; i++) {
    const W = sp.wheels[i], S = car.wheels[i], lx = W.x, ly = W.y - W.rest + S.comp, lz = W.z;
    rotEuler(W.steer ? car.steer : 0, model.wheelF && W.front ? 0 : -S.spin, 0, ML);
    mul(Rm, ML, MW);
    MW[9] = p[0] + Rm[0] * lx + Rm[1] * ly + Rm[2] * lz; MW[10] = p[1] + Rm[3] * lx + Rm[4] * ly + Rm[5] * lz; MW[11] = p[2] + Rm[6] * lx + Rm[7] * ly + Rm[8] * lz;
    R.draw(model.wheelF && W.front ? model.wheelF : model.wheel, MW);
  }
  const a = model.antennaAt, f = opt.fuse == null ? 1 : opt.fuse;
  placeQuat(q[0], q[1], q[2], q[3], p[0] + Rm[0] * a[0] + Rm[1] * a[1] + Rm[2] * a[2], p[1] + Rm[3] * a[0] + Rm[4] * a[1] + Rm[5] * a[2], p[2] + Rm[6] * a[0] + Rm[7] * a[1] + Rm[8] * a[2], MA);
  if (f > 0.02) { for (let i = 0; i < 9; i++) if (i === 4) MA[i] *= f; R.draw(model.antenna, MA); }
  if (ground != null && !opt.noShadow) { place(p[0], ground + 0.004, p[2], Math.atan2(Rm[2], Rm[8]), 0, 0, 1, MS); R.draw(model.shadow, MS); }
}
