/* VROOM.EXE, a secret racing game. The design record is docs/vroom/plan.md and the brief that builds it is docs/vroom/prompt.md.
   The gate (kernel/vroom_gate_core.js) is checked here first and last: shut, the window is the black picture of locked.js and nothing else is made. */
import { vroom } from '../vroom_scope.js';
import { mountLocked } from './locked.js';

let stop = null, closed = false;

export default {
  id: 'vroom',
  title: 'VROOM.EXE',
  icon: '',
  width: 680,
  height: 420,
  resizable: true,
  fluid: true,
  async mount(root, ctx) {
    closed = false;
    if (!vroom().open()) { mountLocked(root); return; }
    const { mountGame } = await import('./game.js');
    if (closed) return;                                  /* the window was closed while the game was loading */
    stop = mountGame(root, ctx);
  },
  unmount() {
    closed = true;
    if (stop) { try { stop(); } catch (e) { /* the window is going anyway */ } stop = null; }
  }
};
