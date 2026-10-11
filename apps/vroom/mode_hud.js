/* WHAT THE OTHER MODES ADD TO THE RACE SCREEN: a toast for what just happened, the ghost's gap and the challenge in a time trial, the stars found in practice, the parcel, the tip and the lit door in LAST MILE. And what
   each of them does to the career when it is over (career_modes.js): the board's lines and news are made here, in the shape finishRace's are, so the finish screen can show them. Pure but for the raster and the game it is given. */
import { C, left, mid, right } from './ui.js';
import { fmtTime } from './hud.js';
import { starFound, yardStar, yardCount, YARD_STARS, ttFinish, lastMileDone, clockworkDone } from './career_modes.js';
import { parOf } from './challenge.js';
import { racePay } from './pay.js';
import { trackKey } from './career.js';

const say = (G, S, text, long) => { S.toast = { text, until: G.t + (long ? 4 : 2.4) }; };
/* called after every sim step: what the step did that the career or the screen must hear about */
export function modeEvents(G, S) {
  const r = S.race, k = S.s.kind;
  for (const e of r.events) {
    if (e.type === 'star' && k === 'yard') { const res = yardStar(G.career, e.id); say(G, S, res.first ? 'STAR ' + yardCount(G.career) + '/' + YARD_STARS + '  +' + res.tips + ' TIPS' : 'THE STAR IS YOURS ALREADY', true); res.news.slice(1).forEach(n => say(G, S, n, true)); G.save(); }
    if (e.type === 'star' && k === 'practice') { const res = starFound(G.career, S.s.trackId); say(G, S, res.first ? 'STAR FOUND!  +' + res.tips + ' TIPS' : 'THE STAR IS YOURS ALREADY', true); res.news.slice(1).forEach(n => say(G, S, n, true)); G.save(); }
  }
  if (k === 'lastmile' && r.lm) for (const e of r.lm.events) {
    if (e.i !== S.human.i) continue;
    if (e.type === 'drop') say(G, S, 'PARCEL OUT!  STOP ON IT');
    else if (e.type === 'pickup') say(G, S, 'GOT IT');
    else if (e.type === 'delivered') say(G, S, 'DELIVERED  +' + e.tip + (e.tip >= 95 ? '  NOT A SCRATCH' : ''));
    else if (e.type === 'lost') say(G, S, 'THE PARCEL FELL OFF THE WORLD');
  }
}
export function drawModeHud(R, G, S) {
  const r = S.race, k = S.s.kind, h = S.human, cx = R.w / 2;
  if (S.toast && G.t < S.toast.until) mid(R, S.toast.text, cx, 34, C.yellow, { big: true, outline: C.black });
  if (k === 'tt') {
    const par = parOf(S.s.trackId, S.s.v);
    if (par) mid(R, 'CHALLENGE ' + fmtTime(par), cx, 3, C.dim, { outline: C.black });
    if (S.solo && S.solo.ghostRace) { const g = S.solo.ghostRace.field[0], d = h.prog - g.prog; mid(R, d >= 0 ? 'GHOST ' + d.toFixed(1) + ' M BEHIND' : 'GHOST ' + (-d).toFixed(1) + ' M AHEAD', cx, 10, d >= 0 ? C.green : C.red, { outline: C.black }); }
  } else if (k === 'yard') {
    mid(R, 'STUNT YARD   STARS ' + yardCount(G.career) + '/' + YARD_STARS + '   (ESC TO LEAVE)', cx, 3, C.dim, { outline: C.black });
    const n = S.solo && S.solo.nearest && S.solo.nearest();
    if (n) mid(R, 'NEAREST STAR  ' + (Math.abs(n.a) < 0.5 ? 'AHEAD' : n.a > 0 ? 'TO THE RIGHT' : 'TO THE LEFT') + '  ' + Math.round(n.d) + ' M', cx, 11, C.yellow, { outline: C.black });
  } else if (k === 'practice') mid(R, 'STARS FOUND ' + Object.keys(G.career.stars).length + '   (ESC TO LEAVE)', cx, 3, C.dim, { outline: C.black });
  else if (k === 'lastmile' && r.lm) {
    const lm = r.lm, s = lm.st[h.i], tgt = lm.target(h.i), d = tgt >= 0 ? r.track.doors[tgt] : null, P = s.parcel;
    mid(R, 'DOOR ' + Math.min(s.k + 1, lm.n) + '/' + lm.n + '   TIP ' + lm.tip(h.i) + '   ' + (P.state === 'bed' ? 'PARCEL IN THE BED' : 'PARCEL OUT'), cx, 3, P.state === 'bed' ? C.white : C.red, { outline: C.black });
    if (d) {
      const dx = d.x - h.car.p[0], dz = d.z - h.car.p[2], yaw = Math.atan2(h.car.R[2], h.car.R[8]); let a = Math.atan2(dx, dz) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
      mid(R, (Math.abs(a) < 0.5 ? 'AHEAD' : a > 0 ? 'TO THE RIGHT' : 'TO THE LEFT') + '  ' + Math.round(Math.hypot(dx, dz)) + ' M', cx, 11, C.yellow, { outline: C.black });
    }
    if (s.hold > 0) mid(R, 'HOLD STILL', cx, 60, C.green, { big: true, outline: C.black });
    left(R, 'DELIVERED ' + s.delivered, 5, 24, C.dim, { outline: C.black }); void right;
  }
}
/* the career is told, and the board's numbers are made */
export function modeConclude(G, S, rows, mine) {
  const c = G.career, s = S.s, k = s.kind, h = S.human, lines = [], news = [];
  let pay = 0, record = false, lap = h.best;
  if (k === 'tt') {
    const res = ttFinish(c, { track: s.trackId, v: s.v, lap: h.best, time: mine.time, car: S.solo.car });
    pay = res.tips; record = res.record; news.push(...res.news);
    if (res.record) { const rr = S.solo.result(); G.saveGhost(trackKey(s.trackId, s.v), { lap: rr.lap, car: rr.car, kit: rr.kit, text: rr.text }); news.push('NEW BEST: THE GHOST IS THIS RUN'); }
    if (res.par != null) lines.push(['CHALLENGE ' + fmtTime(res.par), res.tips]);
  } else if (k === 'practice') news.push(Object.keys(c.stars).length + ' STARS FOUND SO FAR');
  else if (k === 'lastmile') {
    const lm = S.race.lm.result(), res = lastMileDone(c, { track: s.trackId, v: s.v, delivered: lm.delivered, perfect: lm.perfect, tips: lm.tips, win: lm.win });
    pay = res.tips; news.push(...res.news); lines.push([lm.delivered + ' PARCELS DELIVERED', lm.tips - (lm.win ? 150 : 0)]); if (lm.win) lines.push(['FIRST HOME', 150]); if (lm.perfect) news.push(lm.perfect + ' AT FULL TIP');
  } else if (k === 'clockwork') {
    const p = racePay({ place: mine.place, n: rows.length, rating: 0, laps: s.laps, hits: S.tally.hitsDelivered, repos: S.tally.repos, record: false }), res = clockworkDone(c, { place: mine.place, n: rows.length, tips: p.total });
    pay = res.tips; news.push(...res.news); lines.push(...p.lines);
  }
  return { pay, lines, news, cup: null, record, lap };
}
