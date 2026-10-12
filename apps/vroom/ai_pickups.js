/* A CPU DRIVER AND THE PICKUPS (docs/vroom/plan.md sections 7 and 8). Two things, both from what a person sitting at the wheel could see and do:
     where to drive: toward a parcel lying ahead if there is room to carry what is in it, away from a puddle or a stone, and (only if the driver has the eye for it, the profile's `pickups`) away from a parcel that has
       the one wrong texel of a FAKE PARCEL;
     when to fire: a rocket at a car ahead on a straight road, the ball at one in its lane, jump leads when a car is on its tail, a puddle, a stone or a fake behind a car that is following, snowballs ahead, coffee on a
       straight, POWER CUT when there is a car ahead to cut, after a pause that is longer for a driver that is less sure (`pickups` near 0) and with the odd shot thrown away by a sloppy one.
   It reads `ctx` (the field's own report of what the driver could see: `held`, `bomb`, `place`, `n`, `t`, `road` the parcels and hazards ahead, `around` the cars near) and the dice; it touches nothing. Pure. */
import { backFrom } from './pickups_deal.js';

/* a number from an id and a seed, 0..1, the same each time (a driver notices a thing or does not, once) */
const noise = (a, b) => { let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const idNum = id => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return h; };

/* where to drive, as a lateral place on the road (metres left of the centreline) or null for "as you were", and a place to keep away from */
export function pickupLook(profile, ctx, myLat, seed) {
  let want = null, avoid = null, wantAt = 99;
  for (const r of ctx.road || []) {
    if (r.ahead < 0.8 || r.ahead > 11) continue;
    const sharp = noise(idNum(r.id), seed) < profile.pickups;                                                 /* the driver sees the tell on a fake, or does not */
    if (r.kind === 'spot') {
      const isFake = r.tell && sharp;
      if (isFake) { if (Math.abs(r.lat - myLat) < 0.55) avoid = avoid || { lat: r.lat }; continue; }
      if (ctx.free && r.ahead < wantAt && noise(idNum(r.id) + 1, seed) < 0.3 + 0.7 * profile.pickups) { want = r.lat; wantAt = r.ahead; }
    } else if (Math.abs(r.lat - myLat) < 0.5 && r.ahead < 7) avoid = avoid || { lat: r.lat };               /* a puddle or a stone */
  }
  return { want, avoid };
}

/* whether to press FIRE this step. `memo` is the driver's own: { id, since, last } */
export function useDecision(profile, ctx, rnd, memo) {
  const h = ctx.held;
  if (!h) { memo.id = null; return false; }
  if (memo.id !== h.id) { memo.id = h.id; memo.since = ctx.t; memo.wait = (1 - profile.pickups) * 2.4 + rnd() * 0.8; memo.last = -9; }
  const held = ctx.t - memo.since;
  if (held < memo.wait || ctx.t - memo.last < 0.7) return false;
  const near = ctx.around || [], my = ctx.lat, straight = Math.abs(ctx.k) < 0.05;
  const ahead = (lo, hi, w) => near.some(c => c.ahead > lo && c.ahead < hi && Math.abs(c.lat - my) < w);
  const behind = (lo, hi) => near.some(c => c.ahead < -lo && c.ahead > -hi);
  const hurry = held > 5 + (1 - profile.pickups) * 8;                                                       /* a driver that has sat on it long enough uses it */
  let go = false;
  switch (h.id) {
    case 'rocket': go = ahead(1.5, 30, 1.4) && straight; break;
    case 'ball': go = ahead(2, 15, 0.9) && straight; break;
    case 'leads': go = near.some(c => Math.abs(c.ahead) < 3 && Math.abs(c.ahead) > 0.3); break;
    case 'freeze': go = behind(0.6, 8); break;
    case 'stone': go = behind(0.6, 6); break;
    case 'fake': go = behind(0.6, 9); break;
    case 'snow': go = ahead(3, 8, 1.1) && straight; break;
    case 'coffee': go = straight && ctx.speed > 5; break;
    case 'cut': go = ctx.place >= backFrom(ctx.n) && near.some(c => c.ahead > 0) || (hurry && ctx.place > 1); break;
    default: go = false;
  }
  if (!go && hurry) go = ctx.place > 1 || h.id === 'coffee' || h.id === 'leads';
  if (!go && rnd() < (1 - profile.pickups) * 0.004) go = true;                                              /* the odd shot a sloppy driver throws away at nothing */
  if (go) memo.last = ctx.t;
  return go;
}
