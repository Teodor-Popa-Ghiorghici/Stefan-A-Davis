/* THE VROOM GATE, the part that is only a question: is it open? Pure (no window, no machine), so Node asks it too (apps/vroom/vroom_gate_check.js).

   VROOM.EXE is a game nobody is told about. It exists in the registry, as every app does, and the machine does not let on: no icon, no GO TO entry, no terminal word, no help page, no
   Stack folder, no ledger area, until the two hundredth trophy has been earned (the gold one that is called VROOM: kernel/trophies_system2.js, `meta_200`). Then kernel/vroom_gate.js
   sets the key below and writes the icon. Every place that could give the game away asks `isOpen()` (the kernel) or `vroom().open()` (an app: apps/vroom_scope.js), and gets
   "no" for anything it cannot read: a locked gate is the safe answer.

   The key is read each time it is asked, never remembered, so a save that is carried over, a key set by a check and a key lost with the storage are all true the moment they are. */
import { handedOver } from './handed.js';

export const KEY = 'templeos.vroom.v1';
/* the trophy that opens it: its NAME is the only clue anywhere, so it is the gold one the ledger calls VROOM */
export const CLUE = 'meta_200';
export const PATH = '::/Vroom';
export const RECORD = { type: 'app', app: 'vroom', content: '', src: '' };

const store = io => io || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null) || null;

export function isOpen(io) {
  try { const s = store(io); return !!(s && s.getItem(KEY)); } catch (e) { return false; }
}
/* open it (true if it is open afterwards) */
export function openGate(io) {
  try { const s = store(io); if (!s) return false; s.setItem(KEY, '1'); return !!s.getItem(KEY); } catch (e) { return false; }
}
/* what RESTORE SYSTEM FILES is owed for it: the icon, and only once the gate is open (kernel/handed.js) */
export const owed = io => (isOpen(io) ? [{ path: PATH, ...RECORD }] : []);
/* should the gate be opened now: the clue is earned and it is not open yet. `T` is the trophy engine (T.earned). */
export const due = (T, io) => { try { return !isOpen(io) && !!(T && T.earned && T.earned(CLUE)); } catch (e) { return false; } };

/* RESTORE SYSTEM FILES brings the icon back (kernel/handed.js asks each source what the machine is owed, each time). Registered here, not in the machine's half, so Node sees the same thing. */
handedOver(() => owed());
