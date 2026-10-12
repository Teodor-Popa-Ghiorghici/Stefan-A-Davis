/* THE GARAGE: the cars, in the order of the ratings, with the ones you have not won shown as dashed ???. The one under the cursor turns in the hall; beside it, what it is: its numbers in an event of its own
   rating with your fittings on (the bars are against the best of any rating, so a ROOKIE car's bars are short), and a line about it. ENTER takes it out. */
import { drawShowroom } from './showroom.js'; import { playerLook } from './events.js'; import { C, panel, band, left, right, menu, hint, head, meter, wrap, bigText, fit, arrow } from './ui.js'; import { nav } from './input.js';
import { CARS, CAR_IDS, specOf, RATINGS } from './cars.js'; import { pickCar, kitOf } from './career.js'; import { GRAVITY } from './tune.js'; import { CAR_RULES } from './unlocks.js'; import { CUP_BY_ID } from './cups.js';

const ROWS = 10;
const HOW = { 'cup-pass': c => 'PASS THE ' + CUP_BY_ID[c.cup].name, 'cup-win': c => 'WIN THE ' + CUP_BY_ID[c.cup].name, 'cup-sweep': c => 'SWEEP THE ' + CUP_BY_ID[c.cup].name + ': WIN ALL FOUR RACES', stars: c => 'FIND THE ' + CUP_BY_ID[c.cup].name + ' STARS', lastmile: () => 'DELIVER IN LAST MILE', clockwork: () => 'WIN CLOCKWORK', 'all-wins': () => 'WIN EVERY CUP', stunt: () => 'FIND ALL TWENTY STUNT STARS', start: () => '' };

export function create(G) { let sel = 0, top = 0; return { enter() { sel = Math.max(0, CAR_IDS.indexOf(G.career.car)); top = Math.max(0, Math.min(sel - 4, CAR_IDS.length - ROWS)); },
    update() { const k = nav(G.input), c = G.career; if (k.dy) { sel = (sel + k.dy + CAR_IDS.length) % CAR_IDS.length; top = Math.max(0, Math.min(Math.max(top, sel - ROWS + 1), Math.min(sel, CAR_IDS.length - ROWS))); if (sel < top) top = sel; }
      if (k.back) { G.go('title'); return; } if (k.ok && c.cars[CAR_IDS[sel]]) { pickCar(c, CAR_IDS[sel]); G.save(); G.go('title'); } },
    draw() { const R = G.R, c = G.career, id = CAR_IDS[sel], row = CARS[id], own = !!c.cars[id], look = playerLook(c.look); R.rect(0, 0, R.w, R.h, C.black);
      /* the car turns in the hall, in a window of its own; a car not won is a plain "?" on a plate, not a picture dimmed */
      const view = { x: 119, y: 31, w: 196, h: 67 }; if (own) drawShowroom(R, { track: G.hall(), car: id, rating: row.rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 1.5, rect: view });
      else { band(R, view.x, view.y, view.w, view.h, C.ground); bigText(R, '?', view.x + view.w / 2, view.y + 16, 5, C.mute, C.black); } head(R, 'GARAGE', 'ENTER TAKES IT OUT');
      const rows = CAR_IDS.slice(top, top + ROWS).map(cid => { const o = !!c.cars[cid]; return { label: o ? CARS[cid].name : '???', off: !o, tag: o ? (c.car === cid ? 'IN USE' : RATINGS[CARS[cid].rating].slice(0, 3)) : '', tagSmall: true, tagColor: c.car === cid ? C.green : C.dim }; });
      panel(R, 4, 30, 112, ROWS * 12 + 7); menu(R, rows, sel - top, 8, 33, 104, { rowH: 12, heavy: false }); if (top > 0) arrow(R, 110, 31, -1); if (top + ROWS < CAR_IDS.length) arrow(R, 110, 30 + ROWS * 12 + 2, 1);
      /* the card along the bottom */
      const x = 118, w = R.w - x - 4, y = 102, h = 63; panel(R, x, y, w, h); left(R, own ? fit(row.name, 110, { heavy: true }) : '???', x + 6, y + 5, own ? C.yellow : C.mute, { heavy: true });
      right(R, RATINGS[row.rating] + (row.special ? ' SPECIAL' : ''), x + w - 6, y + 5, C.dim); if (own) {
        const sp = specOf(id, row.rating, kitOf(c)), stat = [['SPEED', sp.vtop / 17.5], ['ACCEL', (3.4 - sp.tTop) / 2.1], ['GRIP', sp.aLat / (0.72 * GRAVITY * 1.2)], ['WEIGHT', sp.mass / 3.2], ['STABLE', Math.min(1, sp.ssf / 2.2)]];
        stat.forEach(([n, v], i) => { left(R, n, x + 6, y + 17 + i * 9, C.dim); meter(R, x + 50, y + 18 + i * 9, 56, Math.max(0.04, Math.min(1, v)), 1, C.cyan); });
        wrap(row.blurb.toUpperCase(), w - 122, { small: true }).slice(0, 8).forEach((ln, i) => left(R, ln, x + 114, y + 18 + i * 6, C.white, { small: true })); } else { const rule = CAR_RULES[id], how = (HOW[rule.kind] || (() => ''))(rule);
        left(R, 'NOT WON YET', x + 6, y + 19, C.dim); wrap(how, w - 12).slice(0, 3).forEach((ln, i) => left(R, ln, x + 6, y + 31 + i * 9, C.white)); } hint(R, 'ARROWS  CHOOSE      ENTER  TAKE IT OUT      ESC  BACK'); } }; }
