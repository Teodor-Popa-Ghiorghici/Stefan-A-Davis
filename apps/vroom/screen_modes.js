/* THE OTHER MODES' MENU (docs/vroom/plan.md section 9): TIME TRIAL, PRACTICE, LAST MILE and CLOCKWORK. One screen, four modes: a road (the roads of the cups that are open), a variant of it (the challenge times open REVERSED, then MIRRORED: a variant that is shut is hollow
   and dashed and cannot be started), the car (and for LAST MILE how many are racing), and START. A time trial shows the lap to beat; practice says how many stars have been found without saying where. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, mid, menu, hint, head, wrap, fit } from './ui.js';
import { nav } from './input.js';
import { openRoads } from './open_roads.js';
import { CARS } from './cars.js';
import { defFor, TRACK_IDS, isUserId } from './tracks.js';
import { VARIANTS } from './track_variant.js';
import { variantOpen, parOf } from './challenge.js';
import { starsFound } from './career_modes.js';
import { fmtTime } from './hud.js';
import { trackKey } from './career.js';

export const MODES = {
  tt: { title: 'TIME TRIAL', sub: 'YOU AGAINST YOUR BEST RUN. BEAT THE CHALLENGE TO OPEN THE ROAD THE OTHER WAY.' },
  practice: { title: 'PRACTICE', sub: 'NO RIVALS. THERE IS A STAR ON EVERY ROAD, SOMEWHERE YOU HAVE TO DRIVE TO.' },
  lastmile: { title: 'LAST MILE', sub: 'DELIVER SIX PARCELS TO THE LIT DOORS. KEEP THEM IN THE BED.' },
  clockwork: { title: 'CLOCKWORK', sub: 'SIXTEEN WIND-UP TRUCKS, NO PICKUPS, ALL ELBOWS.' }
};
export function create(G) {
  const S = { mode: 'tt', track: 0, v: 'f', row: 0, n: 6 };
  const roads = () => openRoads(G.career, S.mode === 'tt' ? G.userRoads : null);        /* a road of the player's own is for a single race and a time trial, not for the modes that look for what a road has hidden or put in it */
  const rows = () => {
    const c = G.career, r = roads(), id = r[S.track % r.length], open = variantOpen(c, id, S.v), best = isUserId(id) ? G.userBest[id] : c.tt[trackKey(id, S.v)];
    const out = [{ label: 'ROAD', val: defFor(id, 'f').name }, { label: 'VARIANT', val: open ? defFor(id, S.v).name.replace(defFor(id, 'f').name, '').trim() || 'AS DRAWN' : 'SHUT', valColor: open ? undefined : C.mute }];
    if (S.mode === 'lastmile') out.push({ label: 'CARS', val: S.n });
    if (S.mode !== 'clockwork') out.push({ label: 'YOUR CAR', val: CARS[c.car].name });
    out.push({ label: 'START', tag: '', off: !open });
    return { out, id, open, best };
  };
  return {
    enter(a) { S.mode = (a && a.mode) || S.mode; S.row = 0; S.v = 'f'; G.refreshRoads(); },
    state: () => ({ S }),
    update() {
      const k = nav(G.input), m = rows(), n = m.out.length, r = roads();
      if (k.dy) S.row = (S.row + k.dy + n) % n;
      const lab = m.out[S.row].label;
      if (k.dx) {
        if (lab === 'ROAD') { S.track = (S.track + k.dx + r.length) % r.length; S.v = 'f'; }
        else if (lab === 'VARIANT') S.v = VARIANTS[(VARIANTS.indexOf(S.v) + k.dx + VARIANTS.length) % VARIANTS.length];
        else if (lab === 'CARS') S.n = Math.max(2, Math.min(8, S.n + k.dx));
        else if (lab === 'YOUR CAR') { const ids = Object.keys(CARS).filter(id => G.career.cars[id]); G.career.car = ids[(ids.indexOf(G.career.car) + k.dx + ids.length) % ids.length]; }
      }
      if (k.back) { G.go('title'); return; }
      if (k.ok && lab === 'START' && m.open) {
        const ev = { kind: S.mode, track: m.id, v: S.v, n: S.n, rating: defFor(m.id, 'f').rating || 0, seed: (G.t * 1000 | 0) + G.career.stats.races * 13 + 1 };
        if (S.mode === 'tt') G.loadGhost(trackKey(m.id, S.v)).then(g => G.go('race', { ev: Object.assign(ev, { ghost: g }) })); else G.go('race', { ev });
      }
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), M = MODES[S.mode], m = rows();
      drawShowroom(R, { track: G.hall(), car: S.mode === 'clockwork' ? 'courier' : c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.8 });
      head(R, M.title, 'PICK A ROAD');
      const out = m.out.map(r => (r.val != null ? Object.assign({}, r, { val: fit(r.val, 160) }) : r));
      panel(R, 20, 32, 280, out.length * 15 + 8);
      menu(R, out, S.row, 25, 36, 270, { rowH: 15 });
      const y = 32 + out.length * 15 + 12;
      panel(R, 20, y, 280, 38);
      let line;
      if (S.mode === 'tt') { const par = parOf(m.id, S.v); line = par ? 'CHALLENGE ' + fmtTime(par) + '    YOUR BEST ' + fmtTime(m.best ? m.best.lap : null) : 'NO CHALLENGE TIME HERE'; }
      else if (S.mode === 'practice') line = 'STARS FOUND ' + starsFound(c) + ' OF ' + TRACK_IDS.length;
      else if (S.mode === 'lastmile') line = 'BEST ' + (c.lm.best[trackKey(m.id, S.v)] || 0) + ' TIPS    PARCELS DELIVERED ' + c.lm.delivered;
      else line = 'WON ' + c.cw.wins + ' OF ' + c.cw.races + '    A WIN GIVES THE SNOWMAN';
      mid(R, line, R.w / 2, y + 5, C.yellow, { heavy: true });
      if (!m.open) mid(R, 'BEAT THE CHALLENGE ON THE ROAD BEFORE IT, IN A TIME TRIAL.', R.w / 2, y + 16, C.red);
      wrap(M.sub, 264).slice(0, 2).forEach((ln, i) => mid(R, ln, R.w / 2, y + (m.open ? 18 : 26) + i * 8 - (m.open ? 0 : 2), C.dim));
      hint(R, 'UP DOWN  ROW      LEFT RIGHT  CHANGE      ENTER  GO      ESC  BACK');
    }
  };
}
