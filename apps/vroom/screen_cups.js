/* THE CHAMPIONSHIP SCREEN: four cups down the left (what is open, what is passed, how many tries are left), and on the right what the one under the cursor asks of you -- its four races, the parts it wants
   (with a tick for each one in the garage and a cross for each one that is not) and the standings if you are part of the way through it. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, mid, left, right, menu, hint, head, meter, tips } from './ui.js';
import { nav } from './input.js';
import { CUPS, askKit, cupOpen, standings, TRIES, CUP_BY_ID, readiness } from './cups.js';
import { ROUTE, TUNING } from './parts.js';
import { CARS, RATINGS } from './cars.js';
import { quitCup, beginCup, carFor } from './career.js';
import { defFor } from './tracks.js';
import { RIVAL_BY_ID } from './rivals.js';

export function create(G) {
  let sel = 0, ask = false;
  const state = (c, cup) => { const s = c.cups[cup.id], open = cupOpen(c, cup.id); return { open, s, run: c.run && c.run.cup === cup.id }; };
  return {
    enter() { const c = G.career; const first = CUPS.findIndex(x => cupOpen(c, x.id) && !c.cups[x.id].passed); sel = c.run ? CUPS.findIndex(x => x.id === c.run.cup) : Math.max(0, first); ask = false; },
    update() {
      const k = nav(G.input), c = G.career, cup = CUPS[sel], st = state(c, cup);
      if (ask) {                                             /* the question: leave the cup you are in? */
        if (k.back) ask = false;
        if (k.ok) { quitCup(c); G.save(); ask = false; }
        return;
      }
      if (k.dy) sel = (sel + k.dy + CUPS.length) % CUPS.length;
      if (k.back) { G.go('title'); return; }
      if (k.alt && st.run) { ask = true; return; }
      if (k.ok && st.open && st.s.tries > 0) {
        if (!st.run) beginCup(c, cup.id, (G.t * 1000 | 0) + sel * 7919 + c.stats.races * 31);
        G.save();
        G.go('race', { ev: { kind: 'cup' } });
      }
    },
    draw() {
      const R = G.R, c = G.career, cup = CUPS[sel], st = state(c, cup), look = playerLook(c.look);
      drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.7, spin: false });
      head(R, 'CHAMPIONSHIP', 'FOUR RACES A CUP. TOP THREE OF EIGHT GO ON.');
      const rows = CUPS.map(cu => { const s = state(c, cu); return { label: cu.name, off: !s.open, tag: !s.open ? 'LOCKED' : s.s.passed ? 'PASSED' : s.s.tries <= 0 ? 'NO TRIES' : s.run ? 'RACE ' + (c.run.race + 1) + '/4' : TRIES - s.s.tries ? (s.s.tries + ' LEFT') : 'OPEN', tagColor: s.s.passed ? C.green : undefined }; });
      panel(R, 6, 22, 128, rows.length * 12 + 8);
      menu(R, rows, sel, 10, 27, 120, { rowH: 12 });
      /* the right-hand side: the cup under the cursor */
      const x = 140, w = R.w - x - 6;
      panel(R, x, 22, w, 140);
      mid(R, cup.name, x + w / 2, 26, C.yellow, { big: true, outline: C.black });
      mid(R, cup.blurb, x + w / 2, 36, C.dim, { outline: -1 });
      let y = 46;
      left(R, 'THE RACES', x + 6, y, C.dim, { outline: -1 }); y += 8;
      cup.races.forEach((r, i) => {
        const done = st.run && i < c.run.race, now = st.run && i === c.run.race, d = defFor(r.track, r.v);
        left(R, (i + 1) + '  ' + d.name, x + 8, y, done ? C.green : now ? C.yellow : C.white, { outline: -1 });
        right(R, RATINGS[r.rating], x + w - 6, y, C.dim, { outline: -1 }); y += 8;
      });
      y += 3;
      left(R, 'IT ASKS FOR', x + 6, y, C.dim, { outline: -1 }); y += 8;
      const want = askKit(cup), parts = Object.keys(want.route);
      parts.forEach(id => { const have = !!c.own.route[id]; left(R, (have ? '+ ' : '- ') + ROUTE[id].name, x + 8, y, have ? C.green : C.red, { outline: -1 }); y += 7; });
      if (cup.ask.tune) { const lv = Math.min(...['motor', 'gearing', 'tyres', 'springs', 'battery'].map(id => c.own.tune[id])); left(R, (lv >= cup.ask.tune ? '+ ' : '- ') + 'TUNING TO LEVEL ' + cup.ask.tune, x + 8, y, lv >= cup.ask.tune ? C.green : C.red, { outline: -1 }); right(R, 'YOURS ' + lv, x + w - 6, y, C.dim, { outline: -1 }); y += 7; }
      if (!parts.length && !cup.ask.tune) { left(R, 'NOTHING BUT A STEADY HAND', x + 8, y, C.green, { outline: -1 }); y += 7; }
      meter(R, x + 8, y + 2, w - 16, readiness(c, cup), 1, C.green); right(R, 'READY', x + w - 6, y - 5, C.dim, { outline: -1 }); y += 9;
      if (st.run) {
        const sd = standings(c.run), me = sd.findIndex(s => s.id === 'you'); y += 1;
        left(R, 'STANDINGS', x + 6, y, C.dim, { outline: -1 }); y += 8;
        sd.slice(0, 4).forEach(s => { left(R, s.rank + '  ' + (s.id === 'you' ? 'YOU' : RIVAL_BY_ID[s.id].name), x + 8, y, s.id === 'you' ? C.yellow : C.white, { outline: -1 }); right(R, s.pts + ' PTS', x + w - 6, y, C.dim, { outline: -1 }); y += 7; });
        if (me > 3) { left(R, (me + 1) + '  YOU', x + 8, y, C.yellow, { outline: -1 }); right(R, sd[me].pts + ' PTS', x + w - 6, y, C.dim, { outline: -1 }); }
      } else if (st.s.passed) mid(R, 'BEST: ' + st.s.best + ' POINTS', x + w / 2, 140, C.green, { outline: -1 });
      /* the car that goes out: yours if the class allows it, or the best that it does (career.js carFor) */
      const top = cup.races[0].rating, out = carFor(c, top), swapped = out !== c.car;
      left(R, 'YOU RACE THE', x + 6, 150, C.dim, { outline: -1 }); right(R, CARS[out].name + (swapped ? ' (CLASS RULE)' : ''), x + w - 6, 150, swapped ? C.yellow : C.white, { outline: -1 });
      void CUP_BY_ID; void TUNING; void tips;
      if (ask) { panel(R, 70, 66, 180, 40, { edge: C.yellow }); mid(R, 'LEAVE THIS CUP? IT COSTS A TRY.', R.w / 2, 74, C.white, { outline: -1 }); mid(R, 'ENTER  LEAVE        ESC  STAY', R.w / 2, 90, C.dim, { outline: -1 }); }
      hint(R, !st.open ? 'PASS THE CUP BEFORE IT TO OPEN THIS ONE      ESC  BACK' : st.run ? 'ENTER  CONTINUE     TAB  LEAVE THE CUP     ESC  BACK' : st.s.tries <= 0 ? 'OUT OF TRIES: A PODIUM IN A SINGLE RACE GIVES ONE BACK' : 'ENTER  START THE CUP      ESC  BACK');
    }
  };
}
