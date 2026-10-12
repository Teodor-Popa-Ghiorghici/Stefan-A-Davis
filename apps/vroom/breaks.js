/* The drums of VROOM's tunes: a break is one bar of sixteenths for each piece of the kit (kernel/songtext.js: x a hit, X an accent, o a soft one), and a `fill` that takes the place of the bar before a section
   changes. `kit(name, bars)` lays a break over a whole song, a piece to a string, so a fill falls on the last bar of every eight and a crash on the first bar of every B section.
     step   the two-step of liquid drum and bass: kick on one and the "and" of three, snare on two and four, ghost notes in between
     roll   a rolling, ghosted hat and a kick that stumbles
     jump   a jump-up: a hard kick on the downbeat, the snare cracking with a late ghost, a busy hat
     amen   the old break: kick pairs, the snare sprinkled between its backbeats
     skip   sparse and wide, for the long bass
     hard   the kick on every other eighth, the fastest hat
     dust   the lo-fi pool: a lazy kick and a soft snare, a hat on the off-beats
     hush   the quietest: a kick, a rim and a shaker */
export const BREAKS = {
  step: { kick: 'x.........x.....', snare: '....x..o....x..o', hat: 'x.x.x.x.x.x.x.x.', fill: { snare: '..x.x.x.xxxxxxxx', kick: 'x.......x.x.....' } },
  roll: { kick: 'x..x......x.x...', snare: '....x.......x...', hat: 'xoxoxoxoxoxoxoxo', fill: { snare: '....x...x.x.xxxx', kick: 'x..x....x.x.x...' } },
  jump: { kick: 'x.......x.x.....', snare: '....x.......x..o', hat: 'x.xxx.xxx.xxx.xx', fill: { snare: '....x.x.x.x.xxxx', kick: 'x...x...x.x.x...' } },
  amen: { kick: 'x.x.......xx....', snare: '....x..o.o..x..o', hat: 'x.x.x.x.x.x.x.x.', fill: { snare: '....x..xx.x.xxxx', kick: 'x.x.....x.xx....' } },
  skip: { kick: 'x.....x.....x...', snare: '....x.......x...', hat: '..x...x...x...x.', fill: { snare: '....x.......xxxx', kick: 'x.....x...x.x.x.' } },
  hard: { kick: 'x.x...x...x.x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', fill: { snare: '..x.x.x.xxxxxxxx', kick: 'x.x...x.x.x.x.x.' } },
  dust: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.' },
  hush: { kick: 'x.......x.......', stick: '....x.......x...', shaker: 'x.x.x.x.x.x.x.x.' }
};
/* the pieces a break plays, laid over `n` bars: a piece to a string that kernel/songtext.js tiles to the song. Every eighth bar is the fill's (if the break has one), and a crash opens each section
   but the first. */
export function kit(name, n, crashAt) {
  const b = BREAKS[name], out = {}, pieces = Object.keys(b).filter(k => k !== 'fill').concat(b.fill ? Object.keys(b.fill) : []);
  for (const p of new Set(pieces)) {
    let s = '';
    for (let i = 0; i < n; i++) s += b.fill && i % 8 === 7 && b.fill[p] ? b.fill[p] : (b[p] || '.'.repeat(16));
    out[p] = s;
  }
  if (crashAt) { let s = ''; for (let i = 0; i < n; i++) s += crashAt.indexOf(i) >= 0 ? 'X...............' : '.'.repeat(16); out.crash = s; }
  return out;
}
/* bass patterns: [beat, length, 'r' root | '5' fifth | '8' octave, velocity] in a bar, on the root of each chord */
export const BASS = {
  roll: [[0, 1.5, 'r', 0.85], [1.75, 0.5, 'r', 0.6], [2.5, 1, 'r', 0.8], [3.5, 0.5, '5', 0.6]],
  neuro: [[0, 0.75, 'r', 0.9], [0.75, 0.25, '8', 0.6], [1.5, 0.75, 'r', 0.85], [2.5, 0.5, 'r', 0.7], [3, 0.5, '5', 0.7], [3.5, 0.5, '8', 0.6]],
  jump: [[0, 0.5, 'r', 0.9], [0.75, 0.25, 'r', 0.7], [1.5, 0.5, '8', 0.8], [2, 0.5, 'r', 0.9], [2.75, 0.25, 'r', 0.7], [3.25, 0.75, '5', 0.8]],
  break: [[0, 0.75, 'r', 0.9], [1, 0.5, 'r', 0.7], [2.5, 0.5, '8', 0.75], [3, 1, 'r', 0.85]],
  deep: [[0, 3, 'r', 0.85], [3, 1, '5', 0.55]],
  hard: [[0, 0.5, 'r', 0.95], [0.5, 0.5, 'r', 0.7], [1, 0.5, 'r', 0.8], [1.5, 0.5, 'r', 0.7], [2, 0.5, '8', 0.85], [2.5, 0.5, 'r', 0.7], [3, 0.5, '5', 0.85], [3.5, 0.5, 'r', 0.7]],
  low: [[0, 1.5, 'r', 0.75], [2, 1, '5', 0.6], [3, 0.5, 'r', 0.5]],
  walk: [[0, 1, 'r', 0.75], [1, 1, '5', 0.6], [2, 1, '8', 0.62], [3, 1, '5', 0.55]]
};
