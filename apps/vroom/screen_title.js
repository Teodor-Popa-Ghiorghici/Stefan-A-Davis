/* THE TITLE: the logo over the showroom, and the doors out of it, in two columns of six (the cursor goes down the left one and on into the right, and LEFT and RIGHT cross over), with what the one under the cursor
   is on a line of its own. Everything that is read stands on a plate (ui.js). */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, bigText, mid, menu, hint, left, right, panel, band, tips, fit, wrap } from './ui.js';
import { CARS } from './cars.js';
import { nav } from './input.js';
import { CUPS, cupOpen } from './cups.js';
import { starsFound, yardCount, YARD_STARS } from './career_modes.js';
import { ix, BROWN } from './palette.js';

const ROW = 13, PER = 6;                         /* a row of the menu, and how many to a column */
const WHAT = {
  cups: 'FOUR CUPS OF FOUR RACES. THE TOP THREE OF EIGHT GO ON.', single: 'PICK A ROAD, A RATING AND A FIELD, AND GO.', tt: 'YOU AGAINST YOUR BEST LAP, AND ITS GHOST.',
  practice: 'NO RIVALS. THERE IS A STAR ON EVERY ROAD TO FIND.', lastmile: 'DELIVER SIX PARCELS TO THE LIT DOORS.', clockwork: 'SIXTEEN WIND-UP TRUCKS. ALL ELBOWS.',
  splitmenu: 'TWO PEOPLE, ONE KEYBOARD, ONE SPLIT SCREEN.', maker: 'BUILD A ROAD OUT OF TILES, AND RACE IT.', yard: 'AN OPEN YARD OF RAMPS WITH TWENTY STARS IN THE AIR.',
  depot: 'SPEND TIPS ON ROUTE PARTS, TUNING AND LOOKS.', garage: 'CHOOSE THE CAR YOU RACE.', quit: 'CLOSE VROOM.'
};
export function create(G) {
  let sel = 0;
  const items = () => {
    const c = G.career, run = c.run, open = CUPS.filter(x => cupOpen(c, x.id) && c.cups[x.id].tries > 0).length;
    return [
      { id: 'cups', label: run ? 'CONTINUE CUP' : 'CHAMPIONSHIP', tag: run ? 'RACE ' + (run.race + 1) + '/4' : open + '/4 OPEN' },
      { id: 'single', label: 'SINGLE RACE' }, { id: 'tt', label: 'TIME TRIAL' }, { id: 'practice', label: 'PRACTICE', tag: starsFound(c) + ' STARS' }, { id: 'lastmile', label: 'LAST MILE' }, { id: 'clockwork', label: 'CLOCKWORK' },
      { id: 'splitmenu', label: '2P SPLIT' }, { id: 'maker', label: 'TRACK MAKER' }, { id: 'yard', label: 'STUNT YARD', tag: yardCount(c) + '/' + YARD_STARS },
      { id: 'depot', label: 'DEPOT' }, { id: 'garage', label: 'GARAGE' }, { id: 'quit', label: 'QUIT' }
    ];
  };
  return {
    enter(a) { if (a && a.sel != null) sel = a.sel; sel = Math.min(sel, items().length - 1); G.cam.snap(); },
    state: () => ({ sel }),
    update() {
      const k = nav(G.input), it = items();
      if (k.dy) sel = (sel + k.dy + it.length) % it.length;
      if (k.dx) sel = (sel + k.dx * PER + it.length) % it.length;
      if (k.back) sel = it.length - 1;
      if (k.ok) { const id = it[sel].id; if (id === 'quit') { if (G.ctx && G.ctx.close) G.ctx.close(); } else if (['tt', 'practice', 'lastmile', 'clockwork'].includes(id)) G.go('modes', { mode: id }); else if (id === 'yard') G.go('race', { ev: { kind: 'yard' } }); else G.go(id); }
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), it = items();
      /* the picture first: the hall and the car turning in it, in a window on the right; then the plates over the rest */
      const view = { x: 212, y: 56, w: 104, h: 86 };
      R.rect(0, 0, R.w, R.h, C.black);
      drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 1.5, rect: view });
      band(R, 0, 0, R.w, 52); R.rect(0, 52, R.w, 1, C.rule);
      bigText(R, 'VROOM', R.w / 2, 5, 5, C.yellow, ix(BROWN, 5));
      mid(R, 'THE COURIER\'S CUP', R.w / 2, 43, C.white);
      left(R, fit(CARS[c.car].name, 110), 5, 3, C.dim, { small: true });
      right(R, tips(c.tips), R.w - 5, 3, C.yellow, { small: true });
      /* the two columns, left of the car */
      const x0 = 8, w = 96, y0 = 60;
      panel(R, 4, y0 - 4, 204, PER * ROW + 7);
      for (let col = 0; col < 2; col++) {
        const rows = it.slice(col * PER, col * PER + PER).map(r => ({ label: r.label })), s = sel >= col * PER && sel < col * PER + PER ? sel - col * PER : -1;
        menu(R, rows, s, x0 + col * (w + 4), y0, w, { rowH: ROW });
      }
      /* the car's own frame, and what the row under the cursor is, with its count */
      R.rect(view.x - 1, view.y - 1, view.w + 2, 1, C.edge); R.rect(view.x - 1, view.y + view.h, view.w + 2, 1, C.edge); R.rect(view.x - 1, view.y - 1, 1, view.h + 2, C.edge); R.rect(view.x + view.w, view.y - 1, 1, view.h + 2, C.edge);
      panel(R, 4, 144, R.w - 8, 22);
      const lines = wrap(WHAT[it[sel].id], 232), tag = it[sel].tag;
      lines.slice(0, 2).forEach((ln, i) => left(R, ln, 10, 148 + i * 8 + (lines.length < 2 ? 3 : 0), C.white));
      if (tag) right(R, tag, R.w - 10, 151, C.yellow, { heavy: true });
      hint(R, 'ARROWS  MOVE      ENTER  CHOOSE');
    }
  };
}
