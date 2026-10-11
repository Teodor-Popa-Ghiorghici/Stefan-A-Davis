/* THE CHALLENGE TIMES (docs/vroom/plan.md section 9: a time trial's challenge time opens the road the other way round, and then mirrored). Each road in each variant has a lap time to beat (`PAR`, in
   challenge_data.js: what a PRO driver makes of the best car of the road's rating, and a little over, measured by budget_par.js), and beating it in a time trial opens the next variant: forward opens REVERSED,
   REVERSED opens MIRRORED, MIRRORED opens REVERSED MIRRORED. The first variant of every road is open once the road is. Pure. */
import { PAR } from './challenge_data.js';
import { trackKey } from './career.js';

export const CHAIN = { f: null, r: 'f', m: 'r', rm: 'm' };               /* the variant whose challenge opens this one */
export const parOf = (track, v) => PAR[trackKey(track, v)] || null;
/* has the career beaten the challenge of this road in this variant? */
export function beaten(c, track, v) { const r = c.tt && c.tt[trackKey(track, v)], p = parOf(track, v); return !!(r && p && r.lap != null && r.lap <= p + 1e-9); }
export function variantOpen(c, track, v) { const before = CHAIN[v]; return before == null ? true : beaten(c, track, before); }
