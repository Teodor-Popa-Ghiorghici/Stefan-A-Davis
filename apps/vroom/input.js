/* THE KEYBOARD (docs/vroom/plan.md section 9): WASD or the arrows to drive, SPACE the brake, R to be put back on the road, V the radio, ESC to pause, ENTER to go on. Reads key state from window events and hands the
   sim the same four numbers a CPU driver makes: throttle, brake, steer, repo. Both halves of the keyboard can be one driver or two (the 2P split uses `sides`). The listeners are the game's: `dispose()`
   takes them all off, and a window that loses focus lets go of every key (a stuck key is how a car drives itself into a wall). */
export function createInput(target, hooks) {
  hooks = hooks || {};
  const down = new Set(), pressed = [];
  const key = e => e.code;
  const GAME = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyV', 'Escape', 'Enter', 'KeyP', 'KeyC', 'Digit1', 'Digit2', 'Digit3']);
  const onDown = e => { if (!GAME.has(key(e)) || e.ctrlKey || e.metaKey || e.altKey) return; e.preventDefault(); if (!down.has(key(e))) pressed.push(key(e)); down.add(key(e)); };
  const onUp = e => { down.delete(key(e)); };
  const onBlur = () => { down.clear(); if (hooks.blur) hooks.blur(); };
  target.addEventListener('keydown', onDown); target.addEventListener('keyup', onUp); target.addEventListener('blur', onBlur); window.addEventListener('blur', onBlur);
  const I = {
    down, pressed,
    /* the driving input of one set of keys */
    drive(side) {
      const k = c => down.has(c);
      const up = side === 'right' ? k('ArrowUp') : (k('KeyW') || (side == null && k('ArrowUp'))), dn = side === 'right' ? k('ArrowDown') : (k('KeyS') || (side == null && k('ArrowDown')));
      const lf = side === 'right' ? k('ArrowLeft') : (k('KeyA') || (side == null && k('ArrowLeft'))), rt = side === 'right' ? k('ArrowRight') : (k('KeyD') || (side == null && k('ArrowRight')));
      return { throttle: up ? 1 : 0, brake: dn || (side == null && k('Space')) ? 1 : 0, steer: (rt ? 1 : 0) - (lf ? 1 : 0), repo: k('KeyR') };
    },
    /* a key that went down since the last call (each press once) */
    take(code) { const i = pressed.indexOf(code); if (i < 0) return false; pressed.splice(i, 1); return true; },
    clear() { pressed.length = 0; },
    dispose() { target.removeEventListener('keydown', onDown); target.removeEventListener('keyup', onUp); target.removeEventListener('blur', onBlur); window.removeEventListener('blur', onBlur); down.clear(); pressed.length = 0; }
  };
  return I;
}
