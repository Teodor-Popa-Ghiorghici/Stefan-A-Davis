/* THE TITLE: the logo over the showroom, and the doors out of it. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, bigText, mid, menu, hint, left, right, shade, panel, tips } from './ui.js';
import { CARS } from './cars.js';
import { nav } from './input.js';
import { CUPS, cupOpen } from './cups.js';
import { starsFound, yardCount, YARD_STARS } from './career_modes.js';

export function create(G) {
  let sel = 0;
  const items = () => {
    const c = G.career, run = c.run, open = CUPS.filter(x => cupOpen(c, x.id) && c.cups[x.id].tries > 0).length;
    return [
      { id: 'cups', label: run ? 'CONTINUE THE CUP' : 'CHAMPIONSHIP', tag: run ? 'RACE ' + (run.race + 1) + '/4' : open + ' OF 4 OPEN' },
      { id: 'single', label: 'SINGLE RACE' }, { id: 'tt', label: 'TIME TRIAL' }, { id: 'practice', label: 'PRACTICE', tag: starsFound(c) + ' STARS' }, { id: 'lastmile', label: 'LAST MILE' }, { id: 'clockwork', label: 'CLOCKWORK' }, { id: 'yard', label: 'STUNT YARD', tag: yardCount(c) + '/' + YARD_STARS },
      { id: 'depot', label: 'DEPOT', tag: tips(c.tips) }, { id: 'garage', label: 'GARAGE', tag: CARS[c.car].name }, { id: 'quit', label: 'QUIT' }
    ];
  };
  return {
    enter(a) { if (a && a.sel != null) sel = a.sel; sel = Math.min(sel, items().length - 1); G.cam.snap(); },
    state: () => ({ sel }),
    update() {
      const k = nav(G.input), it = items();
      if (k.dy) sel = (sel + k.dy + it.length) % it.length;
      if (k.back) sel = it.length - 1;
      if (k.ok) { const id = it[sel].id; if (id === 'quit') { if (G.ctx && G.ctx.close) G.ctx.close(); } else if (['tt', 'practice', 'lastmile', 'clockwork'].includes(id)) G.go('modes', { mode: id }); else if (id === 'yard') G.go('race', { ev: { kind: 'yard' } }); else G.go(id); }
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), it = items();
      drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 1.0 });
      shade(R, 0, 0, R.w, 52, 0.7);
      bigText(R, 'VROOM', R.w / 2, 7, 5, C.yellow, C.black);
      mid(R, 'THE COURIER\'S CUP', R.w / 2, 44, C.dim, { outline: C.black });
      const w = 150, x = 8, y = 54;
      panel(R, x - 4, y - 5, w + 8, it.length * 11 + 8);
      menu(R, it, sel, x, y, w, { rowH: 11 });
      right(R, tips(c.tips), R.w - 6, 4, C.yellow, { outline: C.black });
      left(R, CARS[c.car].name, 6, 4, C.dim, { outline: C.black });
      hint(R, 'ARROWS  MOVE      ENTER  CHOOSE');
    }
  };
}
