/* A TRACK THE OTHER WAY ROUND (docs/vroom/plan.md section 9: every track is also REVERSED and MIRRORED). A variant is not a second track to author: it is the same data turned over, so a road, a belt, a jump and
   a pickup are in the same place and mean the same thing, and everything that is built from the data (the road, the walls, the line a CPU follows, the checkpoints) follows by itself.
     'f'  as drawn        'r'  driven the other way        'm'  mirrored (left is right)        'rm'  both
   What turning it over has to get right, each for a reason:
   - Reversed, the controls run backwards, but a corner's floor and wall belong to the stretch that follows it, so each control takes those from the control that used to follow it, or the walls would
     move one stretch along. A place along the track (`u`, in control units) becomes n - 1 - u.
   - A belt keeps the way it moves: driven the other way it runs against you (the speed's sign), which is half of why a reversed lap is a new lap.
   - Left and right are swapped by either turn (a belt's lane, a kerb that is 'left'); both turns put them back.
   - A jump needs a straight run-up (track_check.js holds it), and the straight that was after it is now before it: when the bend that used to follow is too close, the jump slides along the road to the nearest
     stretch that has room for it, and goes if there is none. A cluster of parcels is moved the same way to a stretch where it can be seen coming.
   Pure data in, pure data out. */
import { loop } from './spline.js';
import { CUT_LEAD, CUT_TAIL } from './track_cut.js';

export const VARIANTS = ['f', 'r', 'm', 'rm'];
export const VARIANT_NAME = { f: '', r: 'REVERSED', m: 'MIRRORED', rm: 'REVERSED MIRRORED' };
export const isVariant = v => VARIANTS.indexOf(v) >= 0;

/* the run-up a jump asks for (metres of straight road before it) and the margin round it that nothing else may use */
const RUNUP = 22, CURVE = 0.03, CLEAR = 4, AFTER = 3, SEEN = 9, PAD = 9;      /* SEEN: a car is shown the way to a parcel from 7 m before it, and nothing may be in that stretch */

export function variantOf(def, v) {
  v = v || 'f';
  if (v === 'f') { if (!(def.features || []).some(f => f.auto)) return def; const out = Object.assign({}, def, { features: def.features.map(f => Object.assign({}, f)) }); settle(out); return out; }
  const rev = v.indexOf('r') >= 0, mir = v.indexOf('m') >= 0, n = def.controls.length;
  const U = u => (rev ? (((n - 1 - u) % n) + n) % n : u);
  const flip = rev !== mir;                                   /* one turn swaps the sides, two do not */
  const swap = (a, b) => (rev ? [U(b), U(a)] : [a, b]);
  /* the controls: turned, with each stretch's floor and wall carried to the control that now starts it */
  let controls = def.controls.map(c => Object.assign({}, c));
  if (rev) controls = def.controls.map((_, k) => { const c = def.controls[n - 1 - k], f = def.controls[(n - 2 - k + n) % n]; return Object.assign({}, c, { floor: f.floor, wall: f.wall }); });
  if (mir) controls = controls.map(c => Object.assign({}, c, { x: -c.x }));
  const side = s => (flip ? (s === 'left' ? 'right' : s === 'right' ? 'left' : s) : s);
  const lane = l => (flip ? [-l[1], -l[0]] : l);
  const features = (def.features || []).map(f => {
    const o = Object.assign({}, f);
    if (f.u != null) o.u = U(f.u);
    if (f.u0 != null) { const [a, b] = swap(f.u0, f.u1); o.u0 = a; o.u1 = b; }
    if (f.type === 'belt') { if (f.lane) o.lane = lane(f.lane); if (rev) o.speed = -f.speed; }
    if ((f.type === 'kerb' || f.type === 'star') && f.side) o.side = side(f.side);
    if (f.type === 'cut') {                                      /* a shortcut turned over: the way in becomes the way out, the points it goes through run the other way (and across, if mirrored), and a gate stays at the mouth it was at */
      const into = f.side, outof = f.exitSide || f.side;
      o.side = side(rev ? outof : into); o.exitSide = side(rev ? into : outof);
      if (f.via) o.via = (rev ? f.via.slice().reverse() : f.via.slice()).map(p => [mir ? -p[0] : p[0], p[1]]);
      if (rev && f.gate) o.gateEnd = !f.gateEnd;
    }
    return o;
  });
  const out = Object.assign({}, def, {
    id: def.id + ':' + v, name: def.name + ' ' + VARIANT_NAME[v], base: def.id, variant: v,
    controls, features, start: def.start ? Object.assign({}, def.start, { u: U(def.start.u) }) : def.start
  });
  if (rev || out.features.some(f => f.auto)) settle(out);
  return out;
}

/* give every jump a straight to run up to, and every cluster of parcels a straight to be seen from: each goes to the nearest stretch of road that has room for it, clear of everything else on the road, and a jump
   that finds none goes (a parcel cluster that finds none stays where it was turned to) */
function settle(def) {
  const jumps = def.features.filter(f => f.type === 'jump'), packs = def.features.filter(f => f.type === 'pickups');
  const n = def.controls.length, L = loop(def.controls.map(c => ({ x: c.x, y: c.y || 0, z: c.z })), 1), S = L.samples, len = L.length;
  const sOfU = u => { u = ((u % n) + n) % n; let lo = 0, hi = S.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].u <= u) lo = m; else hi = m - 1; } const a = S[lo], b = S[(lo + 1) % S.length], du = ((b.u - a.u) + n) % n || 1; return a.s + (u - a.u) / du * L.step; };
  const uOfS = s => { s = ((s % len) + len) % len; const i = Math.floor(s / L.step) % S.length, a = S[i], b = S[(i + 1) % S.length], du = ((b.u - a.u) + n) % n; return (a.u + du * (s / L.step - Math.floor(s / L.step))) % n; };
  const kAt = s => Math.abs(L.at(s).k);
  const straight = (s, back) => { for (let d = 0; d <= back; d += 2) if (kAt(s - d) >= CURVE) return false; return true; };
  const zones = [];
  def.features.forEach(f => {
    if (f.type === 'cut') { zones.push([sOfU(f.u0) - CUT_LEAD - 6, sOfU(f.u0) + 8], [sOfU(f.u1) - 8, sOfU(f.u1) + CUT_TAIL + 6]); return; }       /* the two mouths of a shortcut, not the road between them */
    if (f.type === 'star') { zones.push([sOfU(f.u) - 7, sOfU(f.u) + 7]); return; }
    if (f.type !== 'jump' && f.type !== 'pickups' && f.u0 != null) zones.push([sOfU(f.u0) - 3, sOfU(f.u1) + 3]);
  });
  const free = (a, b) => zones.every(z => b < z[0] || a > z[1]);
  /* nearest first from where it was turned to: there, a metre before it, a metre after it, two before ... */
  const nearest = (want, ok) => { for (let d = 0; d < len; d++) { const s = want + (d % 2 ? -1 : 1) * Math.ceil(d / 2); if (ok(s)) return s; } return null; };
  const keep = [];
  jumps.forEach(j => {
    const run = j.run || 0.9, gap = j.gap || 1.4;
    const best = nearest(sOfU(j.u), s => straight(s - run, RUNUP) && kAt(s + gap + run + 2) < CURVE * 2 && free(s - run - CLEAR, s + gap + run + AFTER));
    if (best == null) { keep.push(j); return; }
    j.u = uOfS(best);
    zones.push([best - run - CLEAR, best + gap + run + AFTER]);
  });
  const at = [];
  packs.filter(c => !c.auto).forEach(c => {
    const best = nearest(sOfU(c.u), s => straight(s, SEEN) && free(s - SEEN, s + 3));
    if (best == null) return;
    c.u = uOfS(best);
    zones.push([best - SEEN, best + 3]); at.push(best);
  });
  /* `auto: n` asks for n clusters spread evenly round the lap, each on the nearest straight that has room, a clear 20 m from the next */
  const made = [], start = sOfU((def.start || { u: 0 }).u);
  const apart = s => at.every(p => { const d = Math.abs((((s - p) % len) + len) % len); return Math.min(d, len - d) > 22; });
  packs.filter(c => c.auto).forEach(c => {
    for (let k = 0; k < c.auto; k++) {
      const best = nearest((start + 30 + (k + 0.5) * len / c.auto) % len, s => s > SEEN && s < len - 4 && straight(s, SEEN) && free(s - SEEN, s + 3) && apart(s));
      if (best == null) continue;
      made.push({ type: 'pickups', u: uOfS(best) });
      zones.push([best - SEEN, best + 3]); at.push(best);
    }
  });
  def.features = def.features.filter(f => keep.indexOf(f) < 0 && !(f.type === 'pickups' && f.auto)).concat(made);
}
