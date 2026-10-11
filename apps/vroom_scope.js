/* How an app asks whether VROOM's gate is open (kernel/vroom_gate_core.js) without importing the kernel: `vroom().open()` is window.VroomGate.open(), and is false for anything it cannot
   read -- a locked gate is the safe answer, so an app that is run without the machine (a check in Node, a page with the kernel gone) shows nothing of the game.
   `vroom().on(fn)` calls fn when the gate opens while the app is open (it returns what to call to stop listening). */
export function vroom() {
  return {
    open: () => { try { return !!(window.VroomGate && window.VroomGate.open()); } catch (e) { return false; } },
    on: fn => {
      if (typeof window === 'undefined') return () => {};
      const h = () => { try { fn(); } catch (e) { /* the app's own business */ } };
      window.addEventListener('vroom-opened', h);
      return () => window.removeEventListener('vroom-opened', h);
    }
  };
}
