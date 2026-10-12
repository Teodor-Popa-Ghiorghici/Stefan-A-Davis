/* How an app asks how drunk the person at the machine is (kernel/drunk.js, the Jäger) without importing the kernel: `drunk().stage()` is 0 for SOBER up to 6 for ABOUT TO GO (the
   STAGES of kernel/drunk_bac.js, in order), `drunk().out()` is true while the lights are out (a faint or a blackout). Anything it cannot read is sober and awake: a machine with no bottle
   in it, a check in Node. */
const NAMES = ['SOBER', 'WARM', 'TIPSY', 'LOOSE', 'SLOSHED', 'HAMMERED', 'ABOUT TO GO'];
export const STAGE_NAMES = NAMES;
export function drunk() {
  const D = () => { try { return window.Drunk || null; } catch (e) { return null; } };
  return {
    stage: () => { try { const d = D(); const i = d ? NAMES.indexOf(d.stage()) : 0; return i < 0 ? 0 : i; } catch (e) { return 0; } },
    out: () => { try { const d = D(); return !!(d && d.blackedOut()); } catch (e) { return false; } }
  };
}
