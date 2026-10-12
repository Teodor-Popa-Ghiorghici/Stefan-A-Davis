/* A SINGLE RACE: a road, a car, a rating, laps and rivals. Left and right change the row under the cursor. The roads are the ones in the cups you have opened; the ratings are the ones up to the highest cup
   you have opened (a PRO event in the first week would only be a flat tyre waiting to happen). A podium here gives a cup that has run out of tries one back. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, mid, left, right, menu, hint, head } from './ui.js';
import { nav } from './input.js';
import { CUPS, cupOpen } from './cups.js';
import { openRoads } from './open_roads.js';
import { CARS, RATINGS } from './cars.js';
import { defFor, TRACK_IDS } from './tracks.js';

export function create(G) {
  const S = { track: 0, v: 'f', rating: 0, laps: 3, n: 8, row: 0 };
  /* the roads of the cups that are open (forward only, until a time trial opens the others) */
  const roads = () => openRoads(G.career, G.userRoads);
  const top = () => { let m = 0; CUPS.forEach((cup, i) => { if (cupOpen(G.career, cup.id)) m = Math.max(m, cup.races[cup.races.length - 1].rating); }); return m; };
  return {
    enter() { G.refreshRoads(); S.row = 0; S.track = 0; S.rating = Math.min(S.rating, top()); },
    update() {
      const k = nav(G.input), r = roads();
      if (k.dy) S.row = (S.row + k.dy + 6) % 6;
      if (k.dx) {
        if (S.row === 0) S.track = (S.track + k.dx + r.length) % r.length;
        else if (S.row === 1) S.rating = (S.rating + k.dx + top() + 1) % (top() + 1);
        else if (S.row === 2) S.laps = Math.max(2, Math.min(5, S.laps + k.dx));
        else if (S.row === 3) S.n = Math.max(2, Math.min(8, S.n + k.dx));
        else if (S.row === 4) { const ids = G.career.cars, list = Object.keys(CARS).filter(id => ids[id]); G.career.car = list[(list.indexOf(G.career.car) + k.dx + list.length) % list.length]; }
      }
      if (k.back) { G.go('title'); return; }
      if (k.ok && S.row === 5) G.go('race', { ev: { kind: 'single', track: r[S.track % r.length], v: S.v, rating: S.rating, laps: S.laps, n: S.n, seed: (G.t * 1000 | 0) + G.career.stats.races * 13 + 1 } });
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), r = roads();
      drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.8 });
      head(R, 'SINGLE RACE', 'PICK A ROAD AND GO');
      const rows = [
        { label: 'ROAD', tag: '< ' + defFor(r[S.track % r.length], S.v).name + ' >' }, { label: 'RATING', tag: '< ' + RATINGS[S.rating] + ' >' }, { label: 'LAPS', tag: '< ' + S.laps + ' >' },
        { label: 'CARS', tag: '< ' + S.n + ' >' }, { label: 'YOUR CAR', tag: '< ' + CARS[c.car].name + ' >' }, { label: 'START THE RACE', tag: '' }
      ];
      panel(R, 40, 40, 240, rows.length * 13 + 10);
      menu(R, rows, S.row, 46, 46, 228, { rowH: 13 });
      mid(R, 'A CAR IS HELD TO THE RATING: IT CAN BE SLOWER, NEVER FASTER.', R.w / 2, 140, C.dim, { outline: C.black });
      mid(R, 'A PODIUM GIVES BACK A CUP\'S SPENT TRIES.', R.w / 2, 148, C.dim, { outline: C.black });
      hint(R, 'UP DOWN  ROW      LEFT RIGHT  CHANGE      ENTER  GO      ESC  BACK');
      void left; void right;
    }
  };
}
