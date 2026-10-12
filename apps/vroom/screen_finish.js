/* AFTER THE RACE: the order with the times, what it paid and why (a line for each thing), anything that came with it (a car, a cup, a part found), and for a cup the points. ENTER goes on: to the next race of
   the cup, or back to the menu it came from. */
import { drawShowroom } from './showroom.js'; import { playerLook } from './events.js'; import { C, panel, mid, left, right, hint, head, tips, fit } from './ui.js'; import { nav } from './input.js'; import { fmtTime } from './hud.js';
import { CARS } from './cars.js'; import { standings, POINTS } from './cups.js'; import { RIVAL_BY_ID } from './rivals.js';

export function create(G) { let A = null, page = 0, t0 = 0; const pages = () => (A.res.cup ? 2 : 1);
  const leave = () => { if (A.ev && A.ev.back) G.go(A.ev.back); else if (A.kind === 'cup') G.go('cups'); else if (['tt', 'practice', 'lastmile', 'clockwork'].includes(A.kind)) G.go('modes', { mode: A.kind }); else G.go('title'); }; return {
    enter(args) { A = args; page = 0; t0 = G.t; },
    update() { const k = nav(G.input);
      if (G.t - t0 < 0.5) return;                              /* a key held down through the end of the race does not skip the board */
      if (k.ok) { if (page + 1 < pages()) { page++; return; } const cup = A.res.cup; if (A.kind === 'cup' && cup && !cup.over) G.go('race', { ev: { kind: 'cup' } }); else leave(); } if (k.back) leave(); },
    draw() { const R = G.R, c = G.career, look = playerLook(c.look), res = A.res; drawShowroom(R, { track: G.hall(), car: A.mine.car, rating: CARS[A.mine.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.9, at: 24 });
      R.rect(0, 0, R.w, R.h, C.black); const placeName = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'][A.mine.place - 1];
      head(R, A.kind === 'tt' ? 'TIME TRIAL' : A.kind === 'practice' ? 'PRACTICE' : A.mine.place === 1 ? 'YOU WON' : 'YOU FINISHED ' + (placeName || A.mine.place + 'TH'), A.s.track.name); if (page === 0) {
        /* the order, on the left */
        const ph = A.rows.length * 10 + 8; panel(R, 4, 30, 158, ph);
        A.rows.forEach((r, i) => { const y = 34 + i * 10, me = r.human; left(R, String(r.place), 10, y, C.dim); left(R, fit(r.name, 70), 22, y, me ? C.yellow : C.white); right(R, r.time != null ? fmtTime(r.time) : r.laps + ' LAPS', 156, y, me ? C.yellow : C.white); });
        if (res.sun && res.sun.length) {                                          /* the machine's SUN (sun.js): a line each if the board has room under the order, else the total */
          const y0 = 30 + ph + 4, n = res.sun.length, total = res.sun.reduce((a, l) => a + l[1], 0); if (y0 + 10 * (n + 1) + 6 <= 165) { panel(R, 4, y0, 158, 10 * (n + 1) + 6);
            left(R, 'SUN', 10, y0 + 4, C.yellow, { heavy: true }); right(R, '+' + total, 156, y0 + 4, C.yellow, { heavy: true });
            res.sun.forEach((l, i) => { left(R, fit(l[0], 118, { small: true }), 10, y0 + 15 + i * 10, C.white, { small: true }); right(R, '+' + l[1], 156, y0 + 14 + i * 10, C.green); });
          } else { panel(R, 4, 148, 158, 17); left(R, 'SUN', 10, 153, C.yellow, { heavy: true }); right(R, '+' + total, 156, 153, C.yellow, { heavy: true }); } }
        /* what it paid, on the right */
        const x = 166, w = R.w - x - 4; panel(R, x, 30, w, 135); mid(R, 'TIPS', x + w / 2, 35, C.yellow, { heavy: true });
        res.lines.slice(0, 7).forEach((l, i) => { left(R, fit(l[0], w - 40), x + 6, 47 + i * 9, C.white); right(R, '+' + l[1], x + w - 6, 47 + i * 9, C.green); }); const yb = 47 + Math.min(7, res.lines.length) * 9 + 3; R.rect(x + 6, yb - 1, w - 12, 1, C.rule);
        left(R, 'EARNED', x + 6, yb + 4, C.yellow, { heavy: true }); right(R, '+' + res.pay, x + w - 6, yb + 4, C.yellow, { heavy: true }); left(R, 'YOU HAVE', x + 6, yb + 14, C.dim); right(R, tips(c.tips), x + w - 6, yb + 14, C.white);
        const news = (A.res.record ? ['LAP RECORD ' + fmtTime(res.lap)] : []).concat(res.news).slice(0, 4); news.forEach((n, i) => mid(R, fit(n, w - 8), x + w / 2, yb + 28 + i * 9, i === 0 && A.res.record ? C.yellow : C.green)); } else {
        const cup = res.cup, sd = cup.standings; panel(R, 60, 30, 200, 135); mid(R, cup.over ? (cup.passed ? (cup.won ? 'CUP WON' : 'CUP PASSED') : 'NOT THIS TIME') : 'THE CUP SO FAR', R.w / 2, 35, cup.over && !cup.passed ? C.red : C.yellow, { heavy: true });
        sd.slice(0, 8).forEach((s, i) => { const y = 49 + i * 10, me = s.id === 'you'; left(R, String(s.rank), 70, y, C.dim); left(R, me ? 'YOU' : RIVAL_BY_ID[s.id].name, 84, y, me ? C.yellow : C.white); right(R, '+' + (POINTS[A.rows.find(r => r.id === s.id).place - 1]), 196, y, C.dim); right(R, s.pts + ' PTS', 250, y, me ? C.yellow : C.white); });
        if (cup.over) res.news.slice(0, 3).forEach((n, i) => mid(R, fit(n, 188), R.w / 2, 135 + i * 9, C.green)); void standings; }
      hint(R, page + 1 < pages() ? 'ENTER  NEXT' : (A.kind === 'cup' && A.res.cup && !A.res.cup.over ? 'ENTER  NEXT RACE' : 'ENTER  CONTINUE')); } }; }
