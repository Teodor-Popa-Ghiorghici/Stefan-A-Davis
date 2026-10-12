/* THE CHAMPIONSHIP SCREEN: four cups down the left (what is open, what is passed, how many tries are left), and on the right what the one under the cursor asks of you -- its four races, the parts it wants
   (with a tick for each one in the garage and a cross for each one that is not) and the standings if you are part of the way through it. */
import { drawShowroom } from './showroom.js'; import { playerLook } from './events.js'; import { C, panel, mid, left, right, menu, hint, head, meter, tips, fit, wrap } from './ui.js'; import { nav } from './input.js';
import { CUPS, askKit, cupOpen, standings, TRIES, CUP_BY_ID, readiness } from './cups.js'; import { ROUTE, TUNING } from './parts.js'; import { CARS, RATINGS } from './cars.js'; import { quitCup, beginCup, carFor } from './career.js';
import { defFor } from './tracks.js'; import { RIVAL_BY_ID } from './rivals.js';

export function create(G) { let sel = 0, ask = false; const state = (c, cup) => { const s = c.cups[cup.id], open = cupOpen(c, cup.id); return { open, s, run: c.run && c.run.cup === cup.id }; }; return {
    enter() { const c = G.career; const first = CUPS.findIndex(x => cupOpen(c, x.id) && !c.cups[x.id].passed); sel = c.run ? CUPS.findIndex(x => x.id === c.run.cup) : Math.max(0, first); ask = false; },
    update() { const k = nav(G.input), c = G.career, cup = CUPS[sel], st = state(c, cup);
      if (ask) {                                             /* the question: leave the cup you are in? */
        if (k.back) ask = false; if (k.ok) { quitCup(c); G.save(); ask = false; } return; } if (k.dy) sel = (sel + k.dy + CUPS.length) % CUPS.length; if (k.back) { G.go('title'); return; } if (k.alt && st.run) { ask = true; return; }
      if (k.ok && st.open && st.s.tries > 0) { if (!st.run) beginCup(c, cup.id, (G.t * 1000 | 0) + sel * 7919 + c.stats.races * 31); G.save(); G.go('race', { ev: { kind: 'cup' } }); } },
    draw() { const R = G.R, c = G.career, cup = CUPS[sel], st = state(c, cup), look = playerLook(c.look);
      if (ask) {                                                    /* the question is a page of its own: nothing is left on the glass to be half covered by it */
        R.rect(0, 0, R.w, R.h, C.black); head(R, 'CHAMPIONSHIP', cup.name);
        panel(R, 50, 56, 220, 56, { edge: C.yellow }); mid(R, 'LEAVE THIS CUP? IT COSTS A TRY.', R.w / 2, 66, C.white); mid(R, 'YOUR RACES SO FAR ARE KEPT, THE CUP IS NOT.', R.w / 2, 78, C.dim, { small: true });
        hint(R, 'ENTER  LEAVE THE CUP      ESC  STAY'); return; } drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.7, spin: false });
      R.rect(0, 0, R.w, R.h, C.black); head(R, 'CHAMPIONSHIP', 'FOUR RACES A CUP. TOP THREE OF EIGHT GO ON.');
      /* the cups, down the left */
      const tag = (cu, s) => (!s.open ? 'LOCKED' : s.s.passed ? 'PASSED' : s.s.tries <= 0 ? 'NO TRY' : s.run ? 'R ' + (c.run.race + 1) + '/4' : TRIES - s.s.tries ? s.s.tries + ' LEFT' : 'OPEN');
      const rows = CUPS.map(cu => { const s = state(c, cu); return { label: cu.name, off: !s.open, tag: tag(cu, s), tagSmall: true, tagColor: s.s.passed ? C.green : s.open ? C.yellow : C.dim }; }); panel(R, 4, 30, 120, rows.length * 15 + 7);
      menu(R, rows, sel, 8, 33, 112, { rowH: 15, heavy: false });
      /* under them: the standings of the cup being run, or the car it will be raced in */
      const y1 = 30 + rows.length * 15 + 11, h1 = 165 - y1; panel(R, 4, y1, 120, h1); const top = cup.races[0].rating, out = carFor(c, top), swapped = out !== c.car; if (st.run) { const sd = standings(c.run), me = sd.findIndex(s => s.id === 'you');
        left(R, 'STANDINGS', 10, y1 + 5, C.dim, { small: true });
        sd.slice(0, 4).forEach((s, i) => { const y = y1 + 13 + i * 9, you = s.id === 'you'; left(R, s.rank + '', 10, y, C.dim); left(R, you ? 'YOU' : RIVAL_BY_ID[s.id].name, 24, y, you ? C.yellow : C.white); right(R, s.pts + '', 118, y, you ? C.yellow : C.white); });
        if (me > 3) left(R, (me + 1) + '  YOU  ' + sd[me].pts, 10, y1 + h1 - 12, C.yellow); } else { left(R, 'YOU RACE THE', 10, y1 + 5, C.dim, { small: true });
        left(R, fit(CARS[out].name, 108, { heavy: true }), 10, y1 + 13, swapped ? C.yellow : C.white, { heavy: true }); if (swapped) left(R, 'THE CLASS RULE', 10, y1 + 24, C.yellow, { small: true });
        if (st.s.passed) left(R, 'BEST ' + st.s.best + ' POINTS', 10, y1 + h1 - 12, C.green); }
      /* the cup under the cursor, on the right */
      const x = 128, w = R.w - x - 4, ix0 = x + 6, iw = w - 12; panel(R, x, 30, w, 135); mid(R, cup.name, x + w / 2, 35, C.yellow, { heavy: true });
      wrap(cup.blurb, iw, { small: true }).slice(0, 3).forEach((ln, i) => mid(R, ln, x + w / 2, 46 + i * 6, C.dim, { small: true })); let y = 66; left(R, 'THE RACES', ix0, y, C.dim, { small: true }); y += 8; cup.races.forEach((r, i) => {
        const done = st.run && i < c.run.race, now = st.run && i === c.run.race, d = defFor(r.track, r.v); left(R, fit(d.name, iw - 40), ix0, y, done ? C.green : now ? C.yellow : C.white);
        right(R, RATINGS[r.rating], ix0 + iw, y + 1, C.dim, { small: true }); y += 9; }); y += 3; left(R, 'IT ASKS FOR', ix0, y, C.dim, { small: true }); y += 8; const want = askKit(cup), parts = Object.keys(want.route);
      parts.forEach(id => { const have = !!c.own.route[id]; left(R, (have ? '+ ' : '- ') + ROUTE[id].name, ix0, y, have ? C.green : C.red); y += 9; });
      if (cup.ask.tune) { const lv = Math.min(...['motor', 'gearing', 'tyres', 'springs', 'battery'].map(id => c.own.tune[id])); left(R, (lv >= cup.ask.tune ? '+ ' : '- ') + 'TUNING TO LEVEL ' + cup.ask.tune, ix0, y, lv >= cup.ask.tune ? C.green : C.red); right(R, 'YOURS ' + lv, ix0 + iw, y + 1, C.dim, { small: true }); y += 9; }
      if (!parts.length && !cup.ask.tune) { left(R, 'NOTHING BUT A STEADY HAND', ix0, y, C.green); y += 9; } left(R, 'READY', ix0, 150, C.dim, { small: true }); meter(R, ix0 + 26, 150, iw - 26, readiness(c, cup), 1, C.green);
      void CUP_BY_ID; void TUNING; void tips;
      hint(R, !st.open ? 'PASS THE CUP BEFORE IT TO OPEN THIS ONE      ESC  BACK' : st.run ? 'ENTER  CONTINUE      TAB  LEAVE THE CUP      ESC  BACK' : st.s.tries <= 0 ? 'OUT OF TRIES: A PODIUM IN A SINGLE RACE GIVES ONE BACK' : 'ENTER  START THE CUP      ESC  BACK');
    } }; }
