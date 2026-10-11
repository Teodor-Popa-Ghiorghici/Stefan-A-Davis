/* THE MACHINE'S MONEY (docs/vroom/plan.md section 11): SUN. The game's own money is TIPS (pay.js) and buys parts; SUN is the machine's, paid for the things that are done once and are worth a person's afternoon:
   a cup passed (more for winning it, more again for winning every race of it), the first win on a road, a hidden star, a star in the yard, a challenge time beaten, a LAST MILE won, a CLOCKWORK won. Nothing that
   can be repeated at the speed of the hand pays SUN (a single race pays TIPS and nothing else), so there is no brake to design: each of these is in the career once or not at all.
   It is paid from the career and not from what just happened: `owed(c)` is everything the career says is earned and `c.sun` does not say is paid, `settle(c, earn)` pays it and marks it. A thing paid is never
   paid twice, however it is reached and however often this is asked; a career that earned something before SUN was paid (or one the window was closed on) is paid the next time it is read. Pure but for the
   `earn` it is handed (the machine's `Economy.earn`, with the game's id so the golden eggs can raise it). scripts/check-sun.mjs holds the totals. */
import { CUPS } from './cups.js';
import { TRACK_IDS, allTracks } from './tracks.js';
import { TRACKS } from './track_def.js';
import { beaten } from './challenge.js';
import { YARD_STARS } from './career_modes.js';

export const CUP_SUN = { rookie: 500, amateur: 900, advanced: 1300, pro: 2000 };
export const CUP_WIN_K = 0.4, CUP_SWEEP_K = 0.2;        /* of the cup's pay: winning the cup, and winning every race of it */
export const VARIANT_K = 0.5;                           /* the first win on a road reversed, mirrored or both pays this much of the first win on the road as drawn */
export const roadSun = rating => Math.round(100 * (1 + rating / 2));
export const starSun = rating => Math.round(200 * (1 + rating / 2));
export const parSun = rating => Math.round(80 * (1 + rating / 2));
export const YARD_SUN = 50, YARD_ALL_SUN = 500, LM_SUN = 120, CW_SUN = 400;
const rate = track => (TRACKS[track] ? TRACKS[track].rating : 0);

/* everything earned and not paid: [{ key, label, sun }] */
export function owed(c) {
  const out = [], paid = c.sun || {}, add = (key, label, sun) => { if (!paid[key] && sun > 0) out.push({ key, label, sun: Math.round(sun) }); };
  for (const cup of CUPS) {
    const s = c.cups[cup.id], base = CUP_SUN[cup.id] || 0;
    if (!s) continue;
    if (s.passed > 0) add('cup:' + cup.id, cup.name + ' PASSED', base);
    if (s.won > 0) add('cupwin:' + cup.id, cup.name + ' WON', base * CUP_WIN_K);
    if (s.sweeps > 0) add('sweep:' + cup.id, cup.name + ' SWEPT', base * CUP_SWEEP_K);
  }
  for (const [track, v] of allTracks()) {
    const t = c.tracks[track + ':' + v];
    if (t && t.wins > 0) add('road:' + track + ':' + v, 'FIRST WIN ON ' + TRACKS[track].name + (v === 'f' ? '' : ' (' + v.toUpperCase() + ')'), roadSun(rate(track)) * (v === 'f' ? 1 : VARIANT_K));
    if (beaten(c, track, v)) add('par:' + track + ':' + v, 'CHALLENGE BEATEN: ' + TRACKS[track].name + (v === 'f' ? '' : ' (' + v.toUpperCase() + ')'), parSun(rate(track)));
  }
  for (const track of TRACK_IDS) {
    if (c.stars[track]) add('star:' + track, 'HIDDEN STAR: ' + TRACKS[track].name, starSun(rate(track)));
    if (c.lm.best[track + ':f'] > 0 || c.lm.best[track + ':r'] > 0 || c.lm.best[track + ':m'] > 0 || c.lm.best[track + ':rm'] > 0) add('lm:' + track, 'LAST MILE: ' + TRACKS[track].name, LM_SUN);
  }
  const yard = Object.keys(c.yard);
  for (const id of yard) add('yard:' + id, 'YARD STAR ' + id, YARD_SUN);
  if (yard.length >= YARD_STARS) add('yardall', 'ALL TWENTY YARD STARS', YARD_ALL_SUN);
  if (c.cw.wins > 0) add('cw', 'CLOCKWORK WON', CW_SUN);
  return out;
}
/* pay it all through `earn(sun, why)` (which answers what was really paid) and mark it: returns [[label, sun]] for the board */
export function settle(c, earn) {
  if (!c.sun) c.sun = {};
  const lines = [];
  for (const o of owed(c)) {
    c.sun[o.key] = 1;
    const got = earn ? earn(o.sun, 'VROOM: ' + o.label) : o.sun;
    lines.push([o.label, got > 0 ? got : o.sun]);
  }
  return lines;
}
