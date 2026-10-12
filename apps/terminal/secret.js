/* The terminal's one hidden command. It is not in HELP, not in COMMANDS (Tab never offers it) and not a `case` of the terminal's switch:
   index.js asks `secret(cmd)` before the switch and goes on if it is not this. It awards every trophy that is open and pays 300,000 SUN. */
const WORD = 'LIALIADUDULIA', SUN = 300000;

export const isSecret = cmd => cmd === WORD;

export function runSecret(print) {
  const T = window.Trophies, E = window.Economy;
  let n = 0;
  if (T && T.open) {
    /* earning some opens more (the 200th opens VROOM's gate and its trophies; the seals are derived), so go round until a pass finds nothing */
    for (let pass = 0, got = 1; got && pass < 8; pass++) {
      got = 0;
      T.open().forEach(d => { if (!T.earned(d.id) && T.award(d.id, true)) { n++; got++; } });
      if (T.evalDerived) T.evalDerived();
    }
  }
  if (E) E.earn(SUN, 'LIALIALIA');
  print([(T ? n + ' TROPHIES UNLOCKED. ' : '') + (E ? SUN.toLocaleString('en-US') + ' SUN PAID.' : '')], 'l-holy');
}
