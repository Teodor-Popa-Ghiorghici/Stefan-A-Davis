/* The first time the ledger loads: what a person already did, found in the saves they already have, awarded silently and in one go (no SUN, because the SUN those games paid at the time
   was paid; no fanfare), with one card: THE MACHINE REMEMBERED N THINGS YOU ALREADY DID. Every reader is wrapped, so a save in a shape it does not expect costs nothing. Each app's own
   reader lives in its apps/<id>/trophies.js as `backfill(read)`, handed a function that returns a parsed localStorage key (or null). */
import { BACKFILL } from './trophies_defs.js';
import { shopCatchUp } from './trophies_catchup.js';

export const BACKFILL_VERSION = 1;
const read = key => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };

/* Runs at every boot, not once. The first time it is a silent backfill (no SUN: the games paid at the time). Every time after, whatever the saves prove that the ledger does not
   hold yet is a trophy the player passed before it could be reached (a shelf bought out before the trophy existed, a bench with nothing left to sell): it is granted now and pays
   what it is worth. The readers only say what is true in the save, so a trophy already earned is never touched. */
export function backfill(T) {
  const first = (T.st.seen.backfilled || 0) < BACKFILL_VERSION;
  const ids = [];
  BACKFILL.forEach(f => { try { (f(read, T) || []).forEach(id => ids.push(id)); } catch (e) { /* somebody else's save */ } });
  try { shopCatchUp().forEach(id => ids.push(id)); } catch (e) { /* no shop yet */ }
  const seeds = ids.filter(id => /^(stat|set):/.test(String(id))), n = T.backfill(ids.filter(id => !/^(stat|set):/.test(String(id))), !first);
  seeds.forEach(sd => { const p = sd.split(':'); if (p[0] === 'stat') T.seed(p[1], p[2], +p[3]); else T.seedSet(p[1], p[2], p.slice(3).join(':')); });
  T.st.seen.backfilled = BACKFILL_VERSION; T.save();
  return n;
}
