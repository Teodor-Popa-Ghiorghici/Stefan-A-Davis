/* THE 2P SPLIT'S MENU (docs/vroom/plan.md section 9): two people, one keyboard. A road (the roads of the cups that are open, and the player's own), a rating, laps, how many CPU cars come too (0 to 6) and the car of each person
   (any the garage has: P1 and P2 may choose the same). P1 drives with W A S D and fires with SPACE, E or SHIFT; P2 with the arrows and fires with ENTER, RIGHT SHIFT or 0 on the pad. A split race pays nothing and keeps
   nothing: it is a game between two people, not the garage's. */
import { drawShowroom } from './showroom.js'; import { playerLook } from './events.js'; import { C, panel, mid, menu, hint, head, fit } from './ui.js'; import { nav } from './input.js'; import { CUPS, cupOpen } from './cups.js';
import { CARS, RATINGS } from './cars.js'; import { defFor } from './tracks.js'; import { openRoads } from './open_roads.js';

export function create(G) { const S = { track: 0, rating: 0, laps: 3, rivals: 4, row: 0, car1: null, car2: null }; const roads = () => openRoads(G.career, G.userRoads);
  const top = () => { let m = 0; CUPS.forEach(cup => { if (cupOpen(G.career, cup.id)) m = Math.max(m, cup.races[cup.races.length - 1].rating); }); return m; }; const cars = () => Object.keys(CARS).filter(id => G.career.cars[id]);
  const pick = (cur, dx) => { const l = cars(); return l[(Math.max(0, l.indexOf(cur)) + dx + l.length) % l.length]; }; return {
    enter() { G.refreshRoads(); S.row = 0; S.rating = Math.min(S.rating, top()); S.car1 = S.car1 && G.career.cars[S.car1] ? S.car1 : G.career.car; S.car2 = S.car2 && G.career.cars[S.car2] ? S.car2 : G.career.car; },
    state: () => ({ S }),
    update() { const k = nav(G.input), r = roads(); if (k.dy) S.row = (S.row + k.dy + 7) % 7; if (k.dx) { if (S.row === 0) S.track = (S.track + k.dx + r.length) % r.length; else if (S.row === 1) S.rating = (S.rating + k.dx + top() + 1) % (top() + 1);
        else if (S.row === 2) S.laps = Math.max(1, Math.min(5, S.laps + k.dx)); else if (S.row === 3) S.rivals = Math.max(0, Math.min(6, S.rivals + k.dx)); else if (S.row === 4) S.car1 = pick(S.car1, k.dx); else if (S.row === 5) S.car2 = pick(S.car2, k.dx); }
      if (k.back) { G.go('title'); return; }
      if (k.ok && S.row === 6) G.go('split', { ev: { kind: 'split', track: r[S.track % r.length], v: 'f', rating: S.rating, laps: S.laps, rivals: S.rivals, car1: S.car1, car2: S.car2, seed: (G.t * 1000 | 0) + G.career.stats.races * 13 + 3 } }); },
    draw() { const R = G.R, c = G.career, look = playerLook(c.look), r = roads(); drawShowroom(R, { track: G.hall(), car: S.car1 || c.car, rating: CARS[S.car1 || c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.8 });
      head(R, '2P SPLIT', 'TWO PEOPLE, ONE KEYBOARD. NOTHING IS PAID OR KEPT.'); const rows = [
        { label: 'ROAD', val: fit(defFor(r[S.track % r.length], 'f').name, 150) }, { label: 'RATING', val: RATINGS[S.rating] }, { label: 'LAPS', val: S.laps },
        { label: 'CPU CARS', val: S.rivals }, { label: 'P1 CAR', val: fit(CARS[S.car1].name, 150) }, { label: 'P2 CAR', val: fit(CARS[S.car2].name, 150) }, { label: 'START THE RACE' }
      ]; panel(R, 20, 32, 280, rows.length * 13 + 8); menu(R, rows, S.row, 25, 36, 270, { rowH: 13 }); panel(R, 20, 134, 280, 31); mid(R, 'P1   W A S D   SPACE E SHIFT FIRES   R BACK', R.w / 2, 138, C.white);
      mid(R, 'P2   ARROWS   ENTER R-SHIFT FIRES   / BACK', R.w / 2, 148, C.yellow); mid(R, 'A CAR IS HELD TO THE RATING: SLOWER, NEVER FASTER.', R.w / 2, 157, C.dim, { small: true });
      hint(R, 'UP DOWN  ROW      LEFT RIGHT  CHANGE      ENTER  GO      ESC  BACK'); } }; }
