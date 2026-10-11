/* TIPS: WHAT A RACE PAYS (docs/vroom/plan.md section 8). Races, cups and stars pay TIPS, the game's own money; the machine's SUN is separate (phase 7). The pay is built to do three things at once: a place always
   pays something (a last place is not a wasted race), the better places pay a lot more (so a part is a few good races, not a few races), and the later ratings pay more because their parts cost more. A little
   extra for the things that make a race worth watching (hitting someone with a pickup, a clean race, a lap record) and nothing for staying out of the way. The numbers are the budget bot's to hold. Pure. */
export const PLACE_TIPS = [150, 115, 85, 62, 46, 34, 24, 17];         /* by place in a field of eight */
export const RATING_MULT = [1, 1.25, 1.6, 2.0, 2.5];
export const HIT_TIPS = 8, HIT_MAX = 6, CLEAN_TIPS = 25, RECORD_TIPS = 35;
export const CUP_PASS = 260, CUP_WIN_MULT = 1.5;                       /* a passed cup pays this much times (1 + its rating); first place pays half as much again */

/* one race. o: { place (1-based), n (cars), rating, laps, hits (delivered), repos, record (a new best lap on this road), kind } -> { total, lines: [[label, tips]] } */
export function racePay(o) {
  const n = Math.max(2, o.n || 8), idx = Math.max(0, Math.min(7, Math.round((o.place - 1) * 7 / (n - 1))));
  const field = 0.4 + 0.6 * (n - 1) / 7, laps = Math.max(1, o.laps || 3) / 3, mult = RATING_MULT[o.rating == null ? 0 : o.rating];
  const lines = [];
  const base = Math.round(PLACE_TIPS[idx] * field * mult * (0.6 + 0.4 * laps));
  lines.push(['PLACE ' + o.place, base]);
  const hits = Math.min(HIT_MAX, o.hits | 0);
  if (hits > 0) lines.push([hits + ' HIT' + (hits > 1 ? 'S' : ''), Math.round(hits * HIT_TIPS * mult)]);
  if (!(o.repos > 0) && o.place <= Math.ceil(n / 2)) lines.push(['CLEAN', Math.round(CLEAN_TIPS * mult)]);
  if (o.record) lines.push(['LAP RECORD', Math.round(RECORD_TIPS * mult)]);
  return { total: lines.reduce((a, l) => a + l[1], 0), lines };
}
/* a cup passed (top three of eight after four races) and, if it was won, the extra */
export function cupPay(rating, rank) {
  if (rank > 3) return { total: 0, lines: [] };
  const base = Math.round(CUP_PASS * (1 + rating) * (rank === 1 ? CUP_WIN_MULT : rank === 2 ? 1.2 : 1));
  return { total: base, lines: [[rank === 1 ? 'CUP WON' : 'CUP PASSED', base]] };
}
