/* What the ledger shows, as plain data (no DOM): the areas down the left side with how far each is, and the cards of one area in the order worth reading them in. Pure, so
   scripts/check-trophies.mjs holds it. `T` is the engine (kernel/trophies_core.js). A card's state is one of: done, open, closed. A mirror (a game's own achievement, shown but
   never counted) is listed apart, under its game. */
import { vroom } from '../vroom_scope.js';
export const ORDER = ['system', 'sweeper', 'solitaire', 'aftere', 'garden', 'cook', 'magen', 'standbattle', 'bekkedal', 'bottle', 'vroom', 'elephant', 'crayon', 'garage', 'hifi', 'notes', 'holyc', 'tools', 'meta'];
/* the areas to show: VROOM's is not there until its gate is open (kernel/vroom_gate_core.js), whatever the engine has registered. Its trophies are not registered before then either (kernel/trophies_defs.js): two locks, one door. */
export const shown = () => ORDER.filter(id => id !== 'vroom' || vroom().open());
export const state = (T, d) => T.earned(d.id) ? 'done' : T.closed(d) ? 'closed' : 'open';

/* [have, need] as a fraction in 0..1, or -1 when the trophy is an event with nothing to count */
export function ratio(T, d) { const p = T.progressOf(d); return p && p[1] > 0 ? p[0] / p[1] : -1; }

export function areas(T) {
  const out = [];
  shown().forEach(id => {
    const all = [...T.defs.values()].filter(d => d.app === id);
    if (!all.length) return;
    const own = all.filter(d => !d.legacy), live = own.filter(d => !T.closed(d) || T.earned(d.id));
    const done = own.filter(d => T.earned(d.id)).length, total = own.filter(d => !T.closed(d)).length;
    const mirrors = all.filter(d => d.legacy), mdone = mirrors.filter(d => T.earned(d.id)).length;
    const seal = T.defs.get('mastery_' + id);
    out.push({ id: id, done: done, total: total, mirrors: mirrors.length, mirrorsDone: mdone, mastered: !!(seal && T.earned(seal.id)), sealed: !!seal, open: live.length });
  });
  return out;
}

/* nearest to completion first, so the card at the top is always the next thing worth doing; finished ones after, the newest first; closed ones last */
export function sorted(T, list) {
  const rank = d => { const s = state(T, d); return s === 'open' ? 0 : s === 'done' ? 1 : 2; };
  return list.slice().sort((a, b) => {
    const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
    if (ra === 0) { const xa = ratio(T, a), xb = ratio(T, b); if (xa !== xb) return xb - xa; return a.secret - b.secret; }
    if (ra === 1) return (T.st.earned[b.id] || 0) - (T.st.earned[a.id] || 0);
    return 0;
  });
}

/* the cards of one area ('all' is every area's nearest ones), through the filter (all / open / done), the kinds switched on and a search */
export function cards(T, area, o) {
  o = o || {}; const q = (o.query || '').trim().toUpperCase(), kinds = o.kinds || null;
  const hideV = !vroom().open();
  let list = [...T.defs.values()].filter(d => (area === 'all' ? !d.legacy : d.app === area) && !(hideV && d.app === 'vroom'));
  if (o.filter === 'open') list = list.filter(d => state(T, d) === 'open');
  else if (o.filter === 'done') list = list.filter(d => state(T, d) === 'done');
  if (kinds && kinds.length) list = list.filter(d => kinds.indexOf(d.kind) >= 0);
  if (q) list = list.filter(d => (T.plainName(d) + ' ' + T.plainDesc(d)).toUpperCase().indexOf(q) >= 0 || (T.earned(d.id) || !d.secret ? false : T.hintOf(d).toUpperCase().indexOf(q) >= 0));
  list = sorted(T, list);
  if (area === 'all') list = list.slice(0, 60);
  return { own: list.filter(d => !d.legacy), mirrors: list.filter(d => d.legacy) };
}

export function totals(T) {
  const live = [...T.defs.values()].filter(d => !d.legacy && !T.closed(d));
  const by = tier => ({ done: live.filter(d => d.tier === tier && T.earned(d.id)).length, total: live.filter(d => d.tier === tier).length });
  return { done: T.count(), total: T.total(), B: by('B'), S: by('S'), G: by('G'),
    secrets: live.filter(d => d.secret && !T.earned(d.id)).length, secretsDone: live.filter(d => d.secret && T.earned(d.id)).length };
}

/* ---- what the lively ledger needs besides the lists ---------------------------------------------------------------------------------------------------- */
const DAY = 86400000;
/* earned in the last two days: a card says NEW */
export const isNew = (T, d, now) => !!T.earned(d.id) && (now == null ? Date.now() : now) - T.st.earned[d.id] < 2 * DAY;
/* the trophy worth doing next: of those still open and not secret, the one nearest to done (a counter with some of it counted), else the cheapest of the rest */
export function nextUp(T) {
  const open = [...T.defs.values()].filter(d => !d.legacy && !d.secret && state(T, d) === 'open');
  if (!open.length) return null;
  const counted = open.filter(d => ratio(T, d) > 0 && ratio(T, d) < 1).sort((a, b) => ratio(T, b) - ratio(T, a));
  if (counted.length) return counted[0];
  return open.slice().sort((a, b) => (a.pay || 0) - (b.pay || 0))[0];
}
/* the whole ledger as one fraction, for the ring: 0..1 of the trophies there are */
export const doneFraction = T => { const t = totals(T); return t.total ? t.done / t.total : 0; };
/* which app the area is, so a card can say GO PLAY (the machine and the ledger itself are not an app to play) */
export const APP_OF = { system: null, meta: null, tools: null };
export const appOf = area => (area in APP_OF ? APP_OF[area] : area);
