/* THE GARAGE: the cars, in the order of the ratings, with the ones you have not won shown as dashed ???. The one under the cursor turns in the hall; beside it, what it is: its numbers in an event of its own
   rating with your fittings on (the bars are against the best of any rating, so a ROOKIE car's bars are short), and a line about it. ENTER takes it out. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, mid, left, right, menu, hint, head, meter, wrap, shade } from './ui.js';
import { nav } from './input.js';
import { CARS, CAR_IDS, specOf, RATINGS } from './cars.js';
import { pickCar, kitOf } from './career.js';
import { GRAVITY } from './tune.js';
import { CAR_RULES } from './unlocks.js';
import { CUP_BY_ID } from './cups.js';

const ROWS = 11;
const HOW = { 'cup-pass': c => 'PASS THE ' + CUP_BY_ID[c.cup].name, 'cup-win': c => 'WIN THE ' + CUP_BY_ID[c.cup].name, 'cup-sweep': c => 'SWEEP THE ' + CUP_BY_ID[c.cup].name + ': WIN ALL FOUR RACES', stars: c => 'FIND THE ' + CUP_BY_ID[c.cup].name + ' STARS', lastmile: () => 'DELIVER IN LAST MILE', clockwork: () => 'WIN CLOCKWORK', 'all-wins': () => 'WIN EVERY CUP', stunt: () => 'FIND ALL TWENTY STUNT STARS', start: () => '' };

export function create(G) {
  let sel = 0, top = 0;
  return {
    enter() { sel = Math.max(0, CAR_IDS.indexOf(G.career.car)); top = Math.max(0, Math.min(sel - 4, CAR_IDS.length - ROWS)); },
    update() {
      const k = nav(G.input), c = G.career;
      if (k.dy) { sel = (sel + k.dy + CAR_IDS.length) % CAR_IDS.length; top = Math.max(0, Math.min(Math.max(top, sel - ROWS + 1), Math.min(sel, CAR_IDS.length - ROWS))); if (sel < top) top = sel; }
      if (k.back) { G.go('title'); return; }
      if (k.ok && c.cars[CAR_IDS[sel]]) { pickCar(c, CAR_IDS[sel]); G.save(); G.go('title'); }
    },
    draw() {
      const R = G.R, c = G.career, id = CAR_IDS[sel], row = CARS[id], own = !!c.cars[id], look = playerLook(c.look);
      R.rect(0, 0, R.w, R.h, C.ground);
      /* the car turns in the hall, in the part of the glass that the list and the card leave free */
      const view = { x: 116, y: 18, w: R.w - 120, h: 92 };
      drawShowroom(R, { track: G.hall(), car: id, rating: row.rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 1.15, rect: view });
      if (!own) { shade(R, view.x, view.y, view.w, view.h, 0.85); mid(R, '?', view.x + view.w / 2, view.y + 30, C.mute, { big: true, heavy: true }); }
      head(R, 'GARAGE', 'ENTER TAKES IT OUT');
      const rows = CAR_IDS.slice(top, top + ROWS).map(cid => { const o = !!c.cars[cid]; return { label: o ? CARS[cid].name : '???', off: !o, tag: o ? (c.car === cid ? 'IN USE' : RATINGS[CARS[cid].rating].slice(0, 3)) : '', tagColor: c.car === cid ? C.green : undefined }; });
      panel(R, 4, 20, 108, ROWS * 12 + 8);
      menu(R, rows, sel - top, 8, 25, 100, { rowH: 12 });
      if (top > 0) mid(R, '^', 58, 19, C.dim, { outline: -1 });
      if (top + ROWS < CAR_IDS.length) mid(R, 'v', 58, 20 + ROWS * 12 + 8, C.dim, { outline: -1 });
      /* the card along the bottom */
      const x = 116, w = R.w - x - 4, y = 112, h = 58;
      panel(R, x, y, w, h);
      left(R, own ? row.name : '???', x + 6, y + 4, own ? C.yellow : C.mute, { big: true, outline: C.black });
      right(R, RATINGS[row.rating] + (row.special ? ' SPECIAL' : ''), x + w - 6, y + 6, C.dim, { outline: -1 });
      if (own) {
        const sp = specOf(id, row.rating, kitOf(c)), stat = [['SPEED', sp.vtop / 17.5], ['ACCEL', (3.4 - sp.tTop) / 2.1], ['GRIP', sp.aLat / (0.72 * GRAVITY * 1.2)], ['WEIGHT', sp.mass / 3.2], ['STABLE', Math.min(1, sp.ssf / 2.2)]];
        stat.forEach(([n, v], i) => { left(R, n, x + 6, y + 16 + i * 8, C.dim, { outline: -1 }); meter(R, x + 44, y + 17 + i * 8, 56, Math.max(0.04, Math.min(1, v)), 1, C.cyan); });
        wrap(row.blurb.toUpperCase(), w - 124).forEach((ln, i) => left(R, ln, x + 114, y + 18 + i * 8, C.white, { outline: -1 }));
      } else {
        const rule = CAR_RULES[id], how = (HOW[rule.kind] || (() => ''))(rule);
        left(R, 'NOT WON YET', x + 6, y + 18, C.mute, { outline: -1 });
        wrap(how, w - 12).forEach((ln, i) => left(R, ln, x + 6, y + 30 + i * 8, C.dim, { outline: -1 }));
      }
      hint(R, 'ARROWS  CHOOSE      ENTER  TAKE IT OUT      ESC  BACK');
    }
  };
}
