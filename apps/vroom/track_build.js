/* FROM A TRACK'S DATA TO EVERYTHING THAT USES IT (docs/vroom/plan.md section 4). `buildTrack(def)` cuts the centreline into stations, lays the road between them (a floor, a belt raised in the middle of it, a
   pit where there is a jump), the walls and kerbs beside it, the things set on it, and sends every face through one sink (track_geo.js): into the picture, in chunks, and into the soup the sim collides with.
   It also works out, from the same data: the width and floor at every sample, the cars' starting grid, the checkpoints across the road, the nodes a car is put back on, and the marks the map shows.
   Pure: no window, no sound. */
import { loop } from './spline.js';
import { FLOORS, WALLS } from './track_def.js';
import { sink, material, stations, across, lerp, smooth } from './track_geo.js';
import { dress } from './track_dress.js';
import { buildCuts, cutAt } from './track_cut.js';
import { buildPresses } from './track_press.js';
import { buildStars } from './track_star.js';
import { buildYard } from './track_yard.js';
import { buildDoors } from './track_door.js';
import { needsOfDef } from './track_def.js';
import { SURF } from './tune.js';
import { ix, BROWN } from './palette.js';

/* a belt is raised off the floor, and rises to its height over the first half metre and falls over the last: a step square across the road stopped a car dead */
const BELT_RAMP = 0.5;
export function buildTrack(def) {
  const n = def.controls.length, line = loop(def.controls.map(c => ({ x: c.x, y: c.y || 0, z: c.z }))), L = line.length, S = line.samples;
  const sOfU = u => { u = ((u % n) + n) % n; let lo = 0, hi = S.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (S[mid].u <= u) lo = mid; else hi = mid - 1; } const a = S[lo], b = S[(lo + 1) % S.length], du = ((b.u - a.u) + n) % n || 1; return a.s + (u - a.u) / du * line.step; };
  const ctl = s => { const p = line.at(s), i = Math.floor(p.u) % n, t = p.u - Math.floor(p.u); return { a: def.controls[i], b: def.controls[(i + 1) % n], t, p }; };
  const widthAt = s => { const c = ctl(s); return lerp(c.a.w, c.b.w, smooth(c.t)); };
  const floorAt = s => ctl(s).a.floor || 'lino';
  const wallAt = s => ctl(s).a.wall || 'parcels';
  const width = S.map(p => widthAt(p.s));

  /* the features, in distances along the line */
  const F = { belts: [], jumps: [], kerbs: [], pinches: [], counters: [], pickups: [], presses: [] };
  (def.features || []).forEach(f => {
    if (f.type === 'belt') F.belts.push({ s0: sOfU(f.u0), s1: sOfU(f.u1), lane: f.lane, speed: f.speed, rise: f.rise == null ? 0.04 : f.rise });
    else if (f.type === 'jump') { const sj = sOfU(f.u); F.jumps.push({ s: sj, run: f.run, gap: f.gap, rise: f.rise, w: f.w, a: sj - f.run, b: sj, c: sj + f.gap, d: sj + f.gap + f.run }); }
    else if (f.type === 'kerb') F.kerbs.push({ s0: sOfU(f.u0), s1: sOfU(f.u1), side: f.side, h: f.h });
    else if (f.type === 'pinch') F.pinches.push({ s0: sOfU(f.u0), s1: sOfU(f.u1), gap: f.gap || 2.3 });
    else if (f.type === 'counter') F.counters.push({ s0: sOfU(f.u0), s1: sOfU(f.u1), h: f.h });
    else if (f.type === 'pickups') F.pickups.push({ s: sOfU(f.u), n: f.n || 3, spread: f.spread || 0.7 });
    else if (f.type === 'press') F.presses.push({ s0: sOfU(f.u0), s1: sOfU(f.u1), period: f.period || 3.6, down: f.down || 1.0, phase: f.phase || 0 });
  });
  const lift = s => { for (const j of F.jumps) { if (s >= j.a && s <= j.b) return j.rise * (s - j.a) / j.run; if (s >= j.c && s <= j.d) return j.rise * (1 - (s - j.c) / j.run); } return 0; };
  const inGap = (s0, s1) => F.jumps.some(j => s0 >= j.b - 1e-3 && s1 <= j.c + 1e-3);
  const extra = [];
  F.jumps.forEach(j => extra.push(j.a, j.b, j.c, j.d));
  F.belts.forEach(b => extra.push(b.s0, b.s0 + BELT_RAMP, b.s1 - BELT_RAMP, b.s1));
  F.kerbs.forEach(b => extra.push(b.s0, b.s1)); F.pinches.forEach(b => extra.push(b.s0, b.s1)); F.counters.forEach(b => extra.push(b.s0, b.s1)); F.presses.forEach(b => extra.push(b.s0, b.s1));
  const ST = stations(L, 1.5, extra), out = sink(L), decor = [];
  /* the shortcuts: built first, because they cut gaps in the main road's walls */
  const cuts = buildCuts({ def, line, widthAt, sOfU, out, decor });
  const stars = buildStars({ def, line, widthAt, sOfU, out, decor });
  const yard = def.yard ? buildYard({ def, line, out, decor, L }) : null;                    /* the stunt yard's infield, pieces and stars (track_yard.js) */
  const gapped = (side, s) => cuts.concat(stars, yard ? [yard.fence] : []).some(c => c.gaps.some(g => g.side === side && ((s >= g.s0 && s <= g.s1) || (s + L >= g.s0 && s + L <= g.s1) || (s - L >= g.s0 && s - L <= g.s1))));       /* (a gap by the start line runs across it) */
  const beltAt = s => F.belts.find(b => s >= b.s0 - 1e-3 && s <= b.s1 + 1e-3);

  /* the road */
  for (let i = 0; i + 1 < ST.length; i++) {
    const sa = ST[i], sb = ST[i + 1], mid = (sa + sb) / 2;
    if (inGap(sa, sb)) continue;
    const pa = line.at(sa), pb = line.at(sb % L), wa = widthAt(sa), wb = widthAt(sb % L), fl = FLOORS[floorAt(mid)], m = material(fl.tex), belt = beltAt(mid);
    const ya = pa.y + lift(sa), yb = pb.y + lift(sb);
    /* lateral breakpoints, left (+) to right (-): the whole width, or with a raised belt in it */
    const cutsA = [wa / 2], cutsB = [wb / 2], ra = [0], rb = [0], fls = [];
    if (belt) {
      const [l0, l1] = belt.lane, e = 0.3;
      const ha = belt.rise * Math.max(0, Math.min(1, Math.min(sa - belt.s0, belt.s1 - sa) / BELT_RAMP)), hb = belt.rise * Math.max(0, Math.min(1, Math.min(sb - belt.s0, belt.s1 - sb) / BELT_RAMP));
      cutsA.push(l1 + e, l1, l0, l0 - e); cutsB.push(l1 + e, l1, l0, l0 - e); ra.push(0, ha, ha, 0); rb.push(0, hb, hb, 0);
    }
    cutsA.push(-wa / 2); cutsB.push(-wb / 2); ra.push(0); rb.push(0);
    for (let j = 0; j + 1 < cutsA.length; j++) {
      const onBelt = belt && j >= 1 && j <= 3, mm = onBelt ? material('belt') : m, surf = onBelt ? 'belt' : fl.surf, k = onBelt ? 2.4 : fl.k;
      const A0 = across(pa, cutsA[j]), A1 = across(pa, cutsA[j + 1]), B0 = across(pb, cutsB[j]), B1 = across(pb, cutsB[j + 1]);
      const bv = onBelt ? [pa.tx * belt.speed, pa.tz * belt.speed] : null;
      const u0 = (cutsA[j] + wa / 2) / k, u1 = (cutsA[j + 1] + wa / 2) / k;
      out.quad(mid, [A0.x, ya + ra[j], A0.z], [A1.x, ya + ra[j + 1], A1.z], [B1.x, yb + rb[j + 1], B1.z], [B0.x, yb + rb[j], B0.z], [0, 1, 0], [[u0, sa / k], [u1, sa / k], [u1, sb / k], [u0, sb / k]], mm, surf, bv);
    }
    /* a painted line down each edge (to look at): safety yellow, just inside the walls, a little off the floor so it never fights it */
    if (!belt && fl.surf !== 'belt') {
      const lm = material(ix(BROWN, 11), { zbias: 0.003 }), lw = 0.07, lo = 0.1;
      for (const side of [1, -1]) {
        if (gapped(side, mid)) continue;
        const a0 = across(pa, side * (wa / 2 - lo)), a1 = across(pa, side * (wa / 2 - lo - lw)), b0 = across(pb, side * (wb / 2 - lo)), b1 = across(pb, side * (wb / 2 - lo - lw));
        out.quad(mid, [a0.x, ya + 0.004, a0.z], [a1.x, ya + 0.004, a1.z], [b1.x, yb + 0.004, b1.z], [b0.x, yb + 0.004, b0.z], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], lm, 'lino', null, false);
      }
    }
    /* the walls beside it */
    const wall = WALLS[wallAt(mid)];
    if (wall) {
      const wm = material(wall.tex), deep = F.jumps.some(j => sa >= j.a - 1e-3 && sb <= j.d + 1e-3) ? 0.4 : 0;
      for (const side of [1, -1]) {
        if (gapped(side, mid)) continue;
        const A = across(pa, side * wa / 2), B = across(pb, side * wb / 2), n0 = [-side * pa.nx, 0, -side * pa.nz];
        out.quad(mid, [A.x, ya - deep, A.z], [B.x, yb - deep, B.z], [B.x, yb + wall.h, B.z], [A.x, ya + wall.h, A.z], n0, [[sa / wall.k, (ya - deep) / wall.k], [sb / wall.k, (yb - deep) / wall.k], [sb / wall.k, (yb + wall.h) / wall.k], [sa / wall.k, (ya + wall.h) / wall.k]], wm, 'wood');
      }
    }
    /* a kerb along the inside of the corner */
    F.kerbs.forEach(kb => {
      if (mid < kb.s0 || mid > kb.s1) return;
      const kMid = line.at((kb.s0 + kb.s1) / 2).k, side = kb.side === 'inner' ? (kMid < 0 ? 1 : -1) : kb.side === 'left' ? 1 : -1, km = material('concrete');
      const o1 = side * wa / 2, o0 = side * (wa / 2 - 0.45), o1b = side * wb / 2, o0b = side * (wb / 2 - 0.45), h = kb.h;
      const a1 = across(pa, o1), a0 = across(pa, o0), b1 = across(pb, o1b), b0 = across(pb, o0b);
      out.quad(mid, [a0.x, ya + h, a0.z], [a1.x, ya + h, a1.z], [b1.x, yb + h, b1.z], [b0.x, yb + h, b0.z], [0, 1, 0], [[0, sa], [1, sa], [1, sb], [0, sb]], km, 'asphalt');
      out.quad(mid, [a0.x, ya, a0.z], [b0.x, yb, b0.z], [b0.x, yb + h, b0.z], [a0.x, ya + h, a0.z], [-side * pa.nx, 0, -side * pa.nz], [[sa, 0], [sb, 0], [sb, h], [sa, h]], km, 'asphalt');
    });
    /* the two stacks of parcels that make a pinch */
    F.pinches.forEach(pc => {
      if (mid < pc.s0 || mid > pc.s1) return;
      const th = Math.max(0.3, (wa - pc.gap) / 2), bm = material('cardboard');
      for (const side of [1, -1]) {
        const o1 = side * wa / 2, o0 = side * (wa / 2 - th), a1 = across(pa, o1), a0 = across(pa, o0), b1 = across(pb, side * wb / 2), b0 = across(pb, side * (wb / 2 - th)), h = 0.85;
        out.quad(mid, [a0.x, ya + h, a0.z], [a1.x, ya + h, a1.z], [b1.x, yb + h, b1.z], [b0.x, yb + h, b0.z], [0, 1, 0], [[0, sa], [1, sa], [1, sb], [0, sb]], bm, 'cardboard');
        out.quad(mid, [a0.x, ya, a0.z], [b0.x, yb, b0.z], [b0.x, yb + h, b0.z], [a0.x, ya + h, a0.z], [-side * pa.nx, 0, -side * pa.nz], [[sa, 0], [sb, 0], [sb, h], [sa, h]], bm, 'cardboard');
      }
    });
    /* the counter overhead: a slab to drive under (to look at, not to hit) */
    F.counters.forEach(c => {
      if (mid < c.s0 || mid > c.s1) return;
      const sm = material('planks'), um = material('under'), hw = wa / 2 + 0.7, A0 = across(pa, hw), A1 = across(pa, -hw), B0 = across(pb, hw), B1 = across(pb, -hw), hb = ya + c.h, hbb = yb + c.h;
      out.quad(mid, [A0.x, hb, A0.z], [B0.x, hbb, B0.z], [B1.x, hbb, B1.z], [A1.x, hb, A1.z], [0, -1, 0], [[0, sa], [0, sb], [1, sb], [1, sa]], um, 'wood', null, false);
      out.quad(mid, [A0.x, hb + 0.25, A0.z], [A1.x, hb + 0.25, A1.z], [B1.x, hbb + 0.25, B1.z], [B0.x, hbb + 0.25, B0.z], [0, 1, 0], [[0, sa], [1, sa], [1, sb], [0, sb]], sm, 'wood', null, false);
      out.quad(mid, [A0.x, hb, A0.z], [B0.x, hbb, B0.z], [B0.x, hbb + 0.25, B0.z], [A0.x, hb + 0.25, A0.z], [-pa.nx, 0, -pa.nz], [[sa, 0], [sb, 0], [sb, 0.25], [sa, 0.25]], sm, 'wood', null, false);
      out.quad(mid, [A1.x, hb, A1.z], [B1.x, hbb, B1.z], [B1.x, hbb + 0.25, B1.z], [A1.x, hb + 0.25, A1.z], [pa.nx, 0, pa.nz], [[sa, 0], [sb, 0], [sb, 0.25], [sa, 0.25]], sm, 'wood', null, false);
    });
  }
  /* the pit under a jump: a floor of cardboard, and a wall at each lip */
  F.jumps.forEach(j => {
    const pa = line.at(j.b), pb = line.at(j.c), w = widthAt(j.s), pit = Math.min(...[j.b, j.c].map(s => line.at(s).y)) - 0.4, cm = material('cardboard');
    const a0 = across(pa, w / 2), a1 = across(pa, -w / 2), b0 = across(pb, w / 2), b1 = across(pb, -w / 2);
    out.quad(j.s, [a0.x, pit, a0.z], [a1.x, pit, a1.z], [b1.x, pit, b1.z], [b0.x, pit, b0.z], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], cm, 'cardboard');
    const ya = pa.y + j.rise, yb = pb.y + j.rise;
    out.quad(j.s, [a0.x, pit, a0.z], [a1.x, pit, a1.z], [a1.x, ya, a1.z], [a0.x, ya, a0.z], [pa.tx, 0, pa.tz], [[0, 0], [1, 0], [1, 1], [0, 1]], cm, 'cardboard');
    out.quad(j.s, [b0.x, pit, b0.z], [b1.x, pit, b1.z], [b1.x, yb, b1.z], [b0.x, yb, b0.z], [-pb.tx, 0, -pb.tz], [[0, 0], [1, 0], [1, 1], [0, 1]], cm, 'cardboard');
  });

  /* a checkered line across the road at the start (to look at) */
  { const p0 = line.at(sOfU((def.start || { u: 0.3 }).u)), w = widthAt(p0.s), a = across(p0, w / 2), b = across(p0, -w / 2), q = line.at(p0.s + 0.7), a2 = across(q, w / 2), b2 = across(q, -w / 2);
    out.chunks[out.at(p0.s)].use(material('checker', { zbias: 0.002 })).quad([a.x, p0.y + 0.003, a.z], [b.x, p0.y + 0.003, b.z], [b2.x, q.y + 0.003, b2.z], [a2.x, q.y + 0.003, a2.z], [0, 1, 0], [[0, 0], [w / 1.4, 0], [w / 1.4, 0.5], [0, 0.5]]); }

  /* the starting grid: rows behind the start line, the first row nearest it (a car is placed on the ground: y is the road under it) */
  const st = def.start || { u: 0.3, rows: 4, gap: 2.1, side: 0.95 }, startS = sOfU(st.u), grid = [], s0 = startS - 0.6;
  for (let r = 0; r < Math.max(st.rows, 8) * 2; r++) {            /* eight rows, sixteen places: CLOCKWORK's field (a race of eight uses the first four rows) */
    const row = Math.floor(r / 2), left = r % 2 === 0, p = line.at(s0 - row * st.gap - (left ? 0 : st.gap / 2)), off = (left ? 1 : -1) * st.side;
    grid.push({ x: p.x + p.nx * off, y: p.y, z: p.z + p.nz * off, yaw: p.yaw, s: p.s });
  }
  /* the nodes a car is put back on (every 6 m, in the middle of the road, facing along it) and the checkpoints (gates across the road) */
  const nodes = [];
  /* (never on a jump's ramps or in its pit: a car put back there would be put into the gap; the node before the ramp and the one after the landing stand in) */
  const nodeAt = s => { const p = line.at(s); nodes.push({ x: p.x, y: p.y + lift(s), z: p.z, yaw: p.yaw, s }); };
  for (let s = 0; s < L; s += 6) if (!F.jumps.some(j => s > j.a - 1.2 && s < j.d + 1.2)) nodeAt(s);
  F.jumps.forEach(j => { nodeAt(j.a - 1.6); nodeAt(j.d + 1.6); });
  if (yard) nodes.push(...yard.nodes);
  nodes.sort((a, b) => a.s - b.s);
  const checkpoints = [], NCP = 8;
  for (let i = 0; i < NCP; i++) { const s = (startS + L * i / NCP) % L, p = line.at(s), w = widthAt(s) / 2 + 1, a = across(p, w), b = across(p, -w); checkpoints.push({ s, ax: a.x, az: a.z, bx: b.x, bz: b.z }); }
  const marks = [];
  F.belts.forEach(b => { const p = line.at((b.s0 + b.s1) / 2); marks.push({ x: p.x, z: p.z, c: 77, r: 3 }); });
  F.jumps.forEach(j => { const p = line.at(j.s); marks.push({ x: p.x, z: p.z, c: 126, r: 3 }); });
  F.kerbs.forEach(k => { const p = line.at((k.s0 + k.s1) / 2); marks.push({ x: p.x, z: p.z, c: 76, r: 3 }); });
  F.pinches.forEach(k => { const p = line.at((k.s0 + k.s1) / 2); marks.push({ x: p.x, z: p.z, c: 108, r: 3 }); });
  F.counters.forEach(k => { const p = line.at((k.s0 + k.s1) / 2); marks.push({ x: p.x, z: p.z, c: 90, r: 3 }); });
  F.pickups.forEach(k => { const p = line.at(k.s); marks.push({ x: p.x, z: p.z, c: 104, r: 2 }); });
  F.presses.forEach(k => { const p = line.at((k.s0 + k.s1) / 2); marks.push({ x: p.x, z: p.z, c: 84, r: 3 }); });

  /* where a CPU may put the middle of its car, as offsets left (+) and right (-) of the centreline: inside the walls with a margin, narrowed where a kerb takes the inner edge or a pinch closes the road, and
     tapered so the approach to a narrow place is not a surprise (a driver must be able to see it coming) */
  const lo = new Float64Array(S.length), hi = new Float64Array(S.length);
  S.forEach((p, i) => {
    let a = width[i] / 2 - 0.5, b = a;
    F.kerbs.forEach(k => { if (p.s >= k.s0 && p.s <= k.s1) { const kMid = line.at((k.s0 + k.s1) / 2).k, side = k.side === 'inner' ? (kMid < 0 ? 1 : -1) : k.side === 'left' ? 1 : -1, m = width[i] / 2 - 0.45 - 0.4; if (side > 0) a = Math.min(a, m); else b = Math.min(b, m); } });
    F.pinches.forEach(k => { if (p.s >= k.s0 && p.s <= k.s1) { const m = k.gap / 2 - 0.2; a = Math.min(a, m); b = Math.min(b, m); } });
    hi[i] = a; lo[i] = -b;
  });
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < S.length * 2; i++) { const j = i % S.length, k = (j + 1) % S.length; hi[j] = Math.min(hi[j], hi[k] + 0.06); lo[j] = Math.max(lo[j], lo[k] - 0.06); }
  for (let pass = 0; pass < 2; pass++) for (let i = S.length * 2 - 1; i >= 0; i--) { const j = i % S.length, k = (j + S.length - 1) % S.length; hi[j] = Math.min(hi[j], hi[k] + 0.06); lo[j] = Math.max(lo[j], lo[k] - 0.06); }
  /* the most speed a place can be taken at by a sensible driver, where the road itself asks for it (a CPU's speed plan is held to it: a pinch is a gap, not a wall to be hit at full speed) */
  const cap = new Float64Array(S.length).fill(1e9);
  F.pinches.forEach(k => S.forEach((p, i) => { if (p.s >= k.s0 - 1 && p.s <= k.s1 + 1) cap[i] = Math.min(cap[i], 9); }));
  /* and a jump: a sensible driver lifts for a ramp, and a fast light car with its foot down on one stands on its tail (the speeds a jump is built for are the ROOKIE's: track_check.js) */
  F.jumps.forEach(j => S.forEach((p, i) => { if (p.s >= j.a - 3 && p.s <= j.d + 0.5) cap[i] = Math.min(cap[i], 12.5); }));
  /* the pickups: each cluster is `n` spots abreast of the line, `spread` metres apart, kept inside the walls; a spot is a place a car's middle must pass within a hand's breadth of */
  const spots = [];
  F.pickups.forEach((c, k) => {
    const p = line.at(c.s), w = widthAt(c.s) / 2 - 0.55;
    for (let j = 0; j < c.n; j++) { const lat = Math.max(-w, Math.min(w, (j - (c.n - 1) / 2) * c.spread)), a = across(p, lat); spots.push({ i: spots.length, cluster: k, s: c.s, lat, x: a.x, y: p.y + lift(c.s), z: a.z }); }
  });
  buildPresses({ F, line, widthAt, out, decor });
  const lm = buildDoors({ line, widthAt, F, cuts, stars, startS }); decor.push(...lm.decor);
  decor.push(...dress(def, line, width, F, cuts.concat(stars.map(t => ({ samples: t.samples, w: t.w }))), startS));
  const built = out.build();
  /* what is under the main road at each sample (the CPU plans its speed on it) and what a car must wear to race it */
  const surfAt = new Uint8Array(S.length); S.forEach((p, i) => { surfAt[i] = SURF[FLOORS[floorAt(p.s)].surf].id; });
  return { def, id: def.id, name: def.name, laps: def.laps || 3, needs: needsOfDef(def), cuts, gates: cuts.filter(c => c.gate).map(c => c.gate), surfAt, cutAt: (x, z, hint) => cutAt(cuts, x, z, hint), presses: F.presses, stars: yard ? yard.stars : stars, yard, doors: lm.doors, line, length: L, startS, width, widthAt, floorAt, features: F, chunks: built.chunks.map((mesh, i) => ({ mesh, s0: i * 24, s1: (i + 1) * 24 })), col: built.grid, tris: built.tris, grid, nodes, checkpoints, marks, spots, decor, lift, limits: { lo, hi }, speedCap: cap };
}
