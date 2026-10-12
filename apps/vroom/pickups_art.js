/* THE PICKUPS ON THE GLASS (docs/vroom/plan.md section 7): the parcels lying on the road (spinning, bobbing and lit a little from inside, so they are seen down a straight), the things that were thrown (the ball, the rocket
   with its flame, the snowball, the puddle, the stone), a burst, a splash and the crackle round a car with JUMP LEADS. The FAKE PARCEL is the same mesh as a real one with one texel of its texture different
   (pickups_icons.js). Everything is a few triangles; `drawPickups` is called by scene.js after the cars. Pure but for the raster it is given. */
import { builder, mat, box } from './raster_mesh.js';
import { place } from './raster_math.js';
import { ix, GREY, BROWN, CYAN, RED, COOL } from './palette.js';
import { parcelTexture } from './pickups_icons.js'; import { PICKUP_RANGE } from './view.js';

const sph = (b, cx, cy, cz, r, m, seg, rings) => {
  seg = seg || 8; rings = rings || 4; b.use(m);
  const pt = (i, j) => { const th = Math.PI * i / rings, ph = Math.PI * 2 * j / seg, s = Math.sin(th); return { p: [cx + r * s * Math.cos(ph), cy + r * Math.cos(th), cz + r * s * Math.sin(ph)], n: [s * Math.cos(ph), Math.cos(th), s * Math.sin(ph)] }; };
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = pt(i, j), c = pt(i, j + 1), d = pt(i + 1, j + 1), e = pt(i + 1, j);
    if (i > 0) b.triSmooth(a.p, c.p, d.p, a.n, c.n, d.n, [0, 0], [1, 0], [1, 1]);
    if (i < rings - 1) b.triSmooth(a.p, d.p, e.p, a.n, d.n, e.n, [0, 0], [1, 1], [0, 1]);
  }
};
let M = null;
export function pickupModels() {
  if (M) return M;
  const emit = (c, e) => mat(c, { emit: e });
  const real = mat(parcelTexture(false), { emit: 0.4 }), fake = mat(parcelTexture(true), { emit: 0.4 });
  /* a parcel as big as a car is wide, with a thin lit column over it so it is seen a long way down a straight */
  const parcel = m => { const b = builder(); box(b, 0, 0, 0, 0.19, 0.19, 0.19, m, 0.19); box(b, 0, 0.22, 0, 0.012, 0.3, 0.012, emit(ix(BROWN, 14), 1), 0.1); return b.build(); };
  const ball = (() => { const b = builder(); sph(b, 0, 0, 0, 0.1, emit(ix(COOL, 15), 1), 10, 5); sph(b, 0, 0, 0, 0.125, emit(ix(CYAN, 11), 0.8), 8, 4); return b.build(); })();
  const rocket = (() => {
    const b = builder(), body = mat(ix(RED, 9)), tip = mat(ix(GREY, 15)), fin = mat(ix(BROWN, 11));
    box(b, 0, 0, 0, 0.035, 0.035, 0.14, body, 0.1); box(b, 0, 0, 0.085, 0.022, 0.022, 0.03, tip, 0.1);
    box(b, 0, 0.03, -0.05, 0.006, 0.04, 0.035, fin, 0.1); box(b, 0, -0.03, -0.05, 0.006, 0.04, 0.035, fin, 0.1); box(b, 0.03, 0, -0.05, 0.04, 0.006, 0.035, fin, 0.1); box(b, -0.03, 0, -0.05, 0.04, 0.006, 0.035, fin, 0.1);
    box(b, 0, 0, -0.11, 0.022, 0.022, 0.08, emit(ix(BROWN, 14), 1), 0.1);
    return b.build();
  })();
  const snow = (() => { const b = builder(); sph(b, 0, 0, 0, 0.05, mat(ix(GREY, 15)), 8, 4); return b.build(); })();
  const stone = (() => { const b = builder(); sph(b, 0, 0.0, 0, 0.09, mat(ix(GREY, 6)), 10, 4); box(b, 0, 0.1, 0, 0.14, 0.018, 0.026, mat(ix(RED, 9)), 0.1); return b.build(); })();
  const puddle = (() => { const b = builder(), m = mat(ix(2, 11), { emit: 0.3, zbias: 0.003 }); b.use(m); const n = 12, r = 0.32; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; b.tri([0, 0.004, 0], [Math.cos(a0) * r, 0.004, Math.sin(a0) * r * 0.9], [Math.cos(a1) * r, 0.004, Math.sin(a1) * r * 0.9], [0, 1, 0], [0.5, 0.5], [0, 0], [1, 0]); } return b.build(); })();
  const boom = (() => { const b = builder(); sph(b, 0, 0, 0, 1, emit(ix(BROWN, 14), 1), 8, 4); sph(b, 0, 0, 0, 0.62, emit(ix(GREY, 15), 1), 8, 4); return b.build(); })();
  const splash = (() => { const b = builder(); sph(b, 0, 0, 0, 1, emit(ix(COOL, 15), 0.9), 8, 3); return b.build(); })();
  M = { spot: parcel(real), fake: parcel(fake), ball, rocket, snow, stone, puddle, boom, splash };
  return M;
}

const MT = new Float64Array(12);
/* draw everything the pickups have put in the world. `t` is a clock in seconds (the bob and the spin), `cam` the camera (for the distance cull) */
export function drawPickups(R, P, field, t, cam) {
  const m = pickupModels(), cx = cam.x, cz = cam.z, far = PICKUP_RANGE * PICKUP_RANGE;
  const near = (x, z) => (x - cx) * (x - cx) + (z - cz) * (z - cz) < far;
  for (const s of P.spots) if (s.alive && near(s.x, s.z)) R.draw(m.spot, place(s.x, s.y + 0.13 + 0.016 * Math.sin(t * 3 + s.i), s.z, t * 1.4 + s.i * 0.7, 0, 0, 1, MT));
  for (const o of P.objs) {
    if (!near(o.x, o.z)) continue;
    switch (o.kind) {
      case 'fake': R.draw(m.fake, place(o.x, o.y + 0.13 + 0.016 * Math.sin(t * 3 + o.id), o.z, t * 1.4 + o.id * 0.7, 0, 0, 1, MT)); break;
      case 'ball': R.draw(m.ball, place(o.x, o.y + 0.11, o.z, 0, 0, 0, 0.92 + 0.12 * Math.sin(t * 40), MT)); break;
      case 'rocket': R.draw(m.rocket, place(o.x, o.y, o.z, Math.atan2(o.dx, o.dz), 0, 0, 1, MT)); break;
      case 'snow': R.draw(m.snow, place(o.x, o.y, o.z, 0, 0, 0, 1, MT)); break;
      case 'stone': R.draw(m.stone, place(o.x, o.y, o.z, o.t * 0.5, 0, 0, 1, MT)); break;
      case 'freeze': R.draw(m.puddle, place(o.x, o.y, o.z, o.id, 0, 0, 1, MT)); break;
      default: break;
    }
  }
  for (const e of P.fx) {
    const k = e.age / e.life, mm = e.kind === 'boom' ? m.boom : m.splash;
    if (near(e.x, e.z)) R.draw(mm, place(e.x, e.y + 0.05, e.z, 0, 0, 0, e.r * (0.25 + 0.9 * Math.sqrt(k)) * (1 - 0.3 * k), MT));
  }
  /* the crackle round a car with JUMP LEADS, and a lit fuse's spark on one with the HOT PARCEL: points that move with the clock */
  const pts = [];
  for (const f of field) {
    const c = f.car.p;
    if (f.leads > 0) for (let i = 0; i < 7; i++) { const a = t * 17 + i * 2.4 + f.i, r = 0.16 + 0.07 * Math.sin(t * 31 + i * 5), h = 0.03 + 0.1 * ((Math.sin(t * 23 + i * 3) + 1) / 2); pts.push({ x: c[0] + Math.cos(a) * r, y: c[1] + h, z: c[2] + Math.sin(a) * r, c: i & 1 ? ix(COOL, 15) : ix(CYAN, 12), s: 1 + (i & 1) }); }
    if (f.bomb) { const q = f.car.R, ax = c[0] + q[1] * 0.06, ay = c[1] + 0.2 * Math.max(0.15, f.bomb.fuse / 6), az = c[2] + q[7] * 0.06; for (let i = 0; i < 3; i++) pts.push({ x: ax + Math.sin(t * 50 + i) * 0.012, y: ay + i * 0.008, z: az + Math.cos(t * 43 + i) * 0.012, c: i === 0 ? ix(GREY, 15) : i === 1 ? ix(BROWN, 14) : ix(RED, 11), s: 1 + (i === 0 ? 1 : 0) }); }
  }
  if (pts.length) R.points(pts);
}
