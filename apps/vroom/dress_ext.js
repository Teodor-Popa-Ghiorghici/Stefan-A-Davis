/* WHAT THE KIT CAN DO FOR THE DRESSING (dress_kit.js adds these to its own object): put a prop down so that it faces the road, scatter props over a stretch of ground, paint on the road, raise a mound, set a thing
   moving. A prop is written once in dress_props.js and friends (a builder `g` at its foot, +z toward the road) and set down by `K.prop`; every call is seeded by the road's own dice, so a road is dressed
   the same way every time. Pure. */
import { builder, mat } from './raster_mesh.js'; import { local, lathe } from './dress_prims.js'; import { tx, col, GREY } from './dress_mats.js'; import { tex } from './raster_tex.js';

export function extend(K, GROUND_Y) { const { line, width, F } = K;
  /* a prop at (x, z) turned `yaw`, `s` times its size, standing on `y0` (the table, by default) */
  K.prop = (x, z, yaw, s, fn, y0) => fn(local(K.b(x, z), x, y0 == null ? GROUND_Y : y0, z, yaw, s || 1), K.rnd);
  /* the way from a point to the nearest road, as a yaw: what a prop that faces the road is turned by */
  K.toward = (x, z) => { let bd = 1e9, bx = x, bz = z; for (let i = 0; i < K.S.length; i += 3) { const p = K.S[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bx = p.x; bz = p.z; } } return Math.atan2(bx - x, bz - z); };
  /* props beside the road, every `every` metres (jittered), on `sides`, `off` to `off + spread` from its edge, if there is room for radius `r`: fn(g, rnd, side, i). o: { s: [min, max] size, from, to (distances along it), skip(s), turn (a yaw added), yawJit } */
  K.row = (every, sides, off, spread, r, fn, o) => { o = o || {}; let i = 0; for (let s = (o.from || 0) + every * 0.5; s < (o.to || line.length); s += every * (0.85 + K.rnd() * 0.3)) for (const side of sides) { i++; if (o.skip && o.skip(s, side)) continue;
      const q = K.beside(s, side, off + K.rnd() * spread); if (!K.clear(q.x, q.z, r)) continue; const yaw = Math.atan2(-side * q.p.nx, -side * q.p.nz) + (o.turn || 0) + (K.rnd() - 0.5) * (o.yawJit || 0), sz = o.s ? o.s[0] + K.rnd() * (o.s[1] - o.s[0]) : 1;
      K.prop(q.x, q.z, yaw, sz, (g, rnd) => fn(g, rnd, side, i, q)); } };
  /* a street front: buildings side by side along the road, each as wide as it is given (`wMin` to `wMax` metres, a gap of `gap` between), `off` from the road's edge, as far back as `d` deep; fn(g, rnd, w, side, i, q) builds one at its foot (+z to the road).
     A building that would stand on the road, or whose two ends would, is left out. o: { from, to, gap, skip(s, side), yawJit } */
  K.frontage = (sides, off, wMin, wMax, d, fn, o) => { o = o || {}; let i = 0; for (const side of sides) for (let s = o.from || 0; s < (o.to || line.length) - wMin;) {
      const w = wMin + K.rnd() * (wMax - wMin), gap = o.gap == null ? 0.25 : o.gap * (0.5 + K.rnd()), c = s + w / 2; s += w + gap; i++; if (o.skip && o.skip(c, side)) continue;
      const q = K.beside(c, side, off + d / 2), a = K.beside(c - w / 2, side, off + d / 2), b = K.beside(c + w / 2, side, off + d / 2); if (!K.clear(q.x, q.z, d / 2) || !K.clear(a.x, a.z, d / 2 - 0.5) || !K.clear(b.x, b.z, d / 2 - 0.5)) continue;
      const yaw = Math.atan2(-side * q.p.nx, -side * q.p.nz) + (K.rnd() - 0.5) * (o.yawJit || 0); K.prop(q.x, q.z, yaw, 1, (g, rnd) => fn(g, rnd, w, side, i, q)); } };
  /* what the road is made of at distance s (its floor's name), and the stretches [a, b] of it where `pred(floor)` holds: the kits dress a diner's counter differently from its dining room */
  K.floorAt = s => K.def.controls[Math.floor(line.at(((s % line.length) + line.length) % line.length).u) % K.def.controls.length].floor;
  K.stretches = pred => { const out = []; for (let s = 0, a = null; s <= line.length; s += 2.5) { const on = s < line.length && pred(K.floorAt(s)); if (on && a == null) a = s; if (!on && a != null) { out.push([a, s]); a = null; } } return out; };
  /* which side of the road (1 left, -1 right) is OUTSIDE the loop it makes */
  K.sideOut = () => ([0.1, 0.25, 0.4, 0.55, 0.7, 0.85].reduce((a, f) => { const q = K.beside(line.length * f, 1, 6); return a + (K.inside(q.x, q.z) ? -1 : 1); }, 0) > 0 ? 1 : -1);
  /* a span across the road at distance s, standing on two feet outside it (both checked clear, the road there flat): fn(b, a, c, p, w) is told the feet a and c as [x, z], the road's sample p and the half width w. Not built (false) where it would not fit */
  K.span = (s, fn) => { const p = line.at(s), w = width[Math.min(width.length - 1, Math.round(p.s / line.step))] / 2 + 1.5, a = [p.x + p.nx * w, p.z + p.nz * w], c = [p.x - p.nx * w, p.z - p.nz * w]; if (!K.flatAt(s - 2, 4) || !K.clear(a[0], a[1], 0.6) || !K.clear(c[0], c[1], 0.6)) return false; fn(K.b(p.x, p.z), a, c, p, w); return true; };
  /* a place on the ground that nothing else has: false if a circle of radius r at (x, z) overlaps one already taken (the scatter takes its own) */
  const taken = []; K.claim = (x, z, r) => { for (const q of taken) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + r) return false; taken.push([x, z, r]); return true; };
  /* props along the walls of a room (K.room): every `every` metres, `inset` in from the wall, facing into the room: fn(g, rnd, t, side, x, z) */
  K.wallRow = (every, inset, fn, o) => { const h = K.hall; if (!h) return; o = o || {};
    h.sides.forEach(([ax, az, bx, bz, nx, nz], si) => { const len = Math.hypot(bx - ax, bz - az); for (let t = every / 2 + (o.from || 0); t < len - every / 2; t += every * (0.9 + K.rnd() * 0.2)) { const x = ax + (bx - ax) * t / len + nx * inset, z = az + (bz - az) * t / len + nz * inset; if (o.skip && o.skip(x, z, si, t)) continue; K.prop(x, z, Math.atan2(nx, nz), 1, (g, rnd) => fn(g, rnd, t, si, x, z)); } });
  };
  /* `n` props scattered over the ground within `reach` metres of the road (and not nearer than `min` to it), anywhere: fn(g, rnd, i, x, z) */
  K.scatter = (n, min, reach, r, fn, o) => { o = o || {}; const b = K.bbox; for (let t = 0, i = 0; i < n && t < n * 12; t++) {
      const x = b.x0 - reach + K.rnd() * (b.x1 - b.x0 + 2 * reach), z = b.z0 - reach + K.rnd() * (b.z1 - b.z0 + 2 * reach), gp = K.gap(x, z);
      if (gp < min + r || gp > reach || (o.inside != null && K.inside(x, z) !== o.inside) || (K.hall && (x < K.hall.x0 + 1.5 || x > K.hall.x1 - 1.5 || z < K.hall.z0 + 1.5 || z > K.hall.z1 - 1.5)) || !K.claim(x, z, r * 0.8)) continue;
      i++; K.prop(x, z, o.face ? K.toward(x, z) : K.rnd() * 6.28, o.s ? o.s[0] + K.rnd() * (o.s[1] - o.s[0]) : 1, (g, rnd) => fn(g, rnd, i, x, z)); } };
  /* is a point inside the loop of the road (an even-odd test on the centreline)? */
  K.inside = (x, z) => { let c = false; const S = K.S; for (let i = 0, j = S.length - 1; i < S.length; j = i, i += 2) { const a = S[i], b = S[j]; if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c; } return c; };
  /* is the road flat and plain from s to s + len (no belt, jump, kerb, pinch, counter or press, and no bend)? */
  K.flatAt = (s, len) => { const a = s - 1.5, b = s + len + 1.5; for (const list of [F.belts, F.jumps, F.kerbs, F.pinches, F.counters, F.presses]) for (const f of list || []) { const f0 = f.s0 != null ? f.s0 : f.a, f1 = f.s1 != null ? f.s1 : f.d; if (b > f0 && a < f1) return false; } for (let q = s; q <= s + len; q += 2) if (Math.abs(line.at(q % line.length).k) > 0.025) return false; return true; };
  /* paint on the road: texture `name`, `len` metres long from distance s, `w` wide, `off` across from the middle (+ left). Only where the road is flat, and only over the road (never over a wall or a shortcut's mouth) */
  K.decal = (s, off, w, len, name, o) => { o = o || {}; s = ((s % line.length) + line.length) % line.length; if (!K.flatAt(s, len)) return false;
    const p0 = line.at(s), p1 = line.at((s + len) % line.length), hw = width[Math.min(width.length - 1, Math.round(p0.s / line.step))] / 2; if (Math.abs(off) + w / 2 > hw - 0.12) w = Math.max(0.1, (hw - 0.12 - Math.abs(off)) * 2);
    const A = (p, o2) => [p.x + p.nx * o2, 0.005, p.z + p.nz * o2], k = o.k || w, m = o.mat || mat(tex[name](), { zbias: 0.003 });
    K.b(p0.x, p0.z).use(m).quad(A(p0, off - w / 2), A(p0, off + w / 2), A(p1, off + w / 2), A(p1, off - w / 2), [0, 1, 0], [[0, 0], [1, 0], [1, len / k], [0, len / k]]); return true; };
  /* a patch of ground of its own kind laid on the table (lawn, gravel, a car park): w x d, turned `yaw`, texture `name` repeating every k metres; and the same for paint on it (a bay, an arrow) which lies a little above */
  K.patch = (x, z, w, d, yaw, name, k, lift) => { const c = Math.cos(yaw), s = Math.sin(yaw), P = (a, b) => [x + a * c + b * s, GROUND_Y + (lift == null ? 0.03 : lift), z - a * s + b * c], kk = k || 4; K.b(x, z).use(mat(tex[name](), { zbias: 0.003 })).quad(P(-w / 2, -d / 2), P(-w / 2, d / 2), P(w / 2, d / 2), P(w / 2, -d / 2), [0, 1, 0], [[0, 0], [0, d / kk], [w / kk, d / kk], [w / kk, 0]]); };
  K.paint = (x, z, w, d, yaw, name) => K.patch(x, z, w, d, yaw, name, Math.max(w, d), 0.06);
  /* a low round hill of `tex` standing on the table: snowdrifts, a rise of lawn */
  K.mound = (x, z, r, h, name) => lathe(K.b(x, z), x, GROUND_Y - 0.05, z, [[r, 0], [r * 0.82, h * 0.42], [r * 0.5, h * 0.8], [r * 0.2, h * 0.97], [0, h]], 9, tx(name || 'snow'), 4);
  /* a thing that moves: built round its origin by fn(b) (a builder), put where `at(t)` says; (x, z, r) the ground it ever covers */
  K.moving = []; K.mover = (x, z, r, fn, at, extra) => { const b = builder(); fn(extra && extra.s ? local(b, 0, 0, 0, 0, extra.s) : b); K.moving.push(Object.assign({ mesh: b.build(), at, x, z, r }, extra || {})); };
  /* a lamp that flashes: two meshes (the second may be nothing) at one place, `rate` flashes a second */
  K.flasher = (x, z, y, rate, phase, onFn, offFn) => { const a = builder(), b = builder(); onFn(local(a, x, y, z, 0, 1)); if (offFn) offFn(local(b, x, y, z, 0, 1)); K.moving.push({ mesh: a.build(), alt: offFn ? b.build() : null, blink: rate, phase: phase || 0, x, z, r: 4 }); };
  /* a light on the road: a lamp's pool (`r` metres, `i` bright) that the scene lays on whatever is near it, the few nearest the camera at a time (scene.js). `y` is the lamp's height */
  K.lights = []; K.light = (x, y, z, r, i) => { K.lights.push({ x, y, z, r: r || 11, i: i == null ? 0.9 : i }); }; void col; void GREY; }
