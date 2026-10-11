/* AFTER THE RACE: the order with the times, what it paid and why (a line for each thing), anything that came with it (a car, a cup, a part found), and for a cup the points. ENTER goes on: to the next race of
   the cup, or back to the menu it came from. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, mid, left, right, hint, head, tips } from './ui.js';
import { nav } from './input.js';
import { fmtTime } from './hud.js';
import { CARS } from './cars.js';
import { standings, POINTS } from './cups.js';
import { RIVAL_BY_ID } from './rivals.js';

export function create(G) {
  let A = null, page = 0, t0 = 0;
  const pages = () => (A.res.cup ? 2 : 1);
  const leave = () => { if (A.kind === 'cup') G.go('cups'); else if (['tt', 'practice', 'lastmile', 'clockwork'].includes(A.kind)) G.go('modes', { mode: A.kind }); else G.go('title'); };
  return {
    enter(args) { A = args; page = 0; t0 = G.t; },
    update() {
      const k = nav(G.input);
      if (G.t - t0 < 0.5) return;                              /* a key held down through the end of the race does not skip the board */
      if (k.ok) {
        if (page + 1 < pages()) { page++; return; }
        const cup = A.res.cup;
        if (A.kind === 'cup' && cup && !cup.over) G.go('race', { ev: { kind: 'cup' } });
        else leave();
      }
      if (k.back) leave();
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), res = A.res;
      drawShowroom(R, { track: G.hall(), car: A.mine.car, rating: CARS[A.mine.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.9, at: 24 });
      const placeName = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'][A.mine.place - 1];
      head(R, A.kind === 'tt' ? 'TIME TRIAL' : A.kind === 'practice' ? 'PRACTICE' : A.mine.place === 1 ? 'YOU WON' : 'YOU FINISHED ' + (placeName || A.mine.place + 'TH'), A.s.track.name);
      if (page === 0) {
        panel(R, 6, 22, 150, A.rows.length * 9 + 12);
        A.rows.forEach((r, i) => { const y = 27 + i * 9, me = r.human; left(R, String(r.place), 11, y, C.dim, { outline: -1 }); left(R, r.name, 22, y, me ? C.yellow : C.white, { outline: -1 }); right(R, r.time != null ? fmtTime(r.time) : r.laps + ' LAPS', 152, y, me ? C.yellow : C.dim, { outline: -1 }); });
        if (res.sun && res.sun.length) {                                          /* the machine's SUN (sun.js): a line each if the board has room under the order, else the total */
          const y0 = 22 + A.rows.length * 9 + 16, n = res.sun.length, total = res.sun.reduce((a, l) => a + l[1], 0);
          if (y0 + 8 * (n + 1) + 4 <= R.h - 14) {
            panel(R, 6, y0, 150, 8 * (n + 1) + 6);
            left(R, 'SUN', 11, y0 + 3, C.yellow, { outline: -1 }); right(R, '+' + total, 152, y0 + 3, C.yellow, { outline: -1 });
            res.sun.forEach((l, i) => { left(R, l[0], 11, y0 + 11 + i * 8, C.white, { outline: -1 }); right(R, '+' + l[1], 152, y0 + 11 + i * 8, C.green, { outline: -1 }); });
          } else { panel(R, 6, R.h - 28, 150, 12); left(R, 'SUN', 11, R.h - 25, C.yellow, { outline: -1 }); right(R, '+' + total, 152, R.h - 25, C.yellow, { outline: -1 }); }
        }
        const x = 164, w = R.w - x - 6;
        panel(R, x, 22, w, 120);
        mid(R, 'TIPS', x + w / 2, 26, C.yellow, { big: true, outline: C.black });
        res.lines.forEach((l, i) => { left(R, l[0], x + 6, 38 + i * 8, C.white, { outline: -1 }); right(R, '+' + l[1], x + w - 6, 38 + i * 8, C.green, { outline: -1 }); });
        const yb = 38 + res.lines.length * 8 + 3;
        R.rect(x + 6, yb - 1, w - 12, 1, C.edge);
        left(R, 'EARNED', x + 6, yb + 3, C.yellow, { outline: -1 }); right(R, '+' + res.pay, x + w - 6, yb + 3, C.yellow, { outline: -1 });
        left(R, 'YOU HAVE', x + 6, yb + 11, C.dim, { outline: -1 }); right(R, tips(c.tips), x + w - 6, yb + 11, C.white, { outline: -1 });
        res.news.slice(0, 5).forEach((n, i) => mid(R, n, x + w / 2, yb + 24 + i * 8, C.green, { outline: -1 }));
        if (A.res.record) mid(R, 'LAP RECORD ' + fmtTime(res.lap), x + w / 2, 132, C.yellow, { outline: -1 });
      } else {
        const cup = res.cup, sd = cup.standings;
        panel(R, 70, 22, 180, 110);
        mid(R, cup.over ? (cup.passed ? (cup.won ? 'CUP WON' : 'CUP PASSED') : 'NOT THIS TIME') : 'THE CUP SO FAR', R.w / 2, 26, cup.over && !cup.passed ? C.red : C.yellow, { big: true, outline: C.black });
        sd.forEach((s, i) => { const y = 40 + i * 9, me = s.id === 'you'; left(R, String(s.rank), 78, y, C.dim, { outline: -1 }); left(R, me ? 'YOU' : RIVAL_BY_ID[s.id].name, 90, y, me ? C.yellow : C.white, { outline: -1 }); right(R, '+' + (POINTS[A.rows.find(r => r.id === s.id).place - 1]), 190, y, C.dim, { outline: -1 }); right(R, s.pts + ' PTS', 242, y, me ? C.yellow : C.white, { outline: -1 }); });
        if (cup.over) res.news.slice(0, 3).forEach((n, i) => mid(R, n, R.w / 2, 116 + i * 7, C.green, { outline: -1 }));
        void standings;
      }
      hint(R, page + 1 < pages() ? 'ENTER  NEXT' : (A.kind === 'cup' && A.res.cup && !A.res.cup.over ? 'ENTER  NEXT RACE' : 'ENTER  CONTINUE'));
    }
  };
}
