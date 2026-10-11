/* THE VROOM GATE, the machine's side (the question itself is kernel/vroom_gate_core.js). Modelled on kernel/trophy_box.js: when the trophy called VROOM -- the two hundredth -- is
   earned, or at boot on a machine that had already earned it, the gate is opened ONCE:
     1. the key is set (templeos.vroom.v1), so everything that asks the gate now hears "open";
     2. VROOM's own trophies and its mastery seal are put in the ledger (kernel/trophies_defs.js `registerVroom`; until now the ledger did not know them);
     3. `::/Vroom` is written to the desktop, an app record, and the desktop shows it in the games' corner;
     4. one toast says so, after the trophy's own card has had its moment.
   If the icon is thrown away it is the bin's to give back, and RESTORE SYSTEM FILES makes it again from the key (the source is registered in vroom_gate_core.js, so Node sees it too); it is not written a second time. */
import { fs } from './vfs.js';
import { toast } from './wm.js';
import { PATH, RECORD, openGate, due } from './vroom_gate_core.js';
import { registerVroom } from './trophies_defs.js';

export const TOAST = 'SOMETHING IN THE GARAGE STARTED ITS ENGINE. ' + PATH;
const CARD_MS = 4800;                         /* the trophy's card is up for 4.2 s: the toast waits for it to go */

async function hand(T) {
  if (!openGate()) return false;
  try { registerVroom(T); } catch (e) { /* a ledger that will not take it: the game still opens */ }
  try { await fs.write(PATH, RECORD); } catch (e) { /* the disk is full: RESTORE will make it */ }
  try { window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: '::' } })); } catch (e) { /* no window */ }
  try { window.dispatchEvent(new CustomEvent('vroom-opened')); } catch (e) { /* no window */ }
  setTimeout(() => toast(TOAST), CARD_MS);
  return true;
}

export function startGate(T) {
  const look = () => { if (due(T)) hand(T); };
  window.addEventListener('trophy-earned', look);
  window.addEventListener('trophies-changed', look);     /* a trophy found in an old save is credited without a card: this is the event it makes */
  look();
}
