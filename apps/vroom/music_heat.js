/* What the race is asking of the music, as two numbers from 0 to 1, read off a race (race.js) and never written to it. Pure: no clock, no audio. `music_check.js` runs races in Node and holds the numbers;
   `music.js` rides the two layers of the tune with them (kernel/deck.js `levels`), so a click of the game never restarts or re-cues the tune: the band leans in.
     last    the last lap: it begins at the line that starts it and is all the way in a few seconds after; a car that has finished keeps it (the finish board is a victory lap)
     fight   a car close by along the road (the nearer, the more), a pickup that hit this car lately, a fuse burning in this car's antenna
   Events that are not on the road and so have no gap (LAST MILE, which has no laps) ask for `fight` only. `FEEL` is how quickly each comes in and goes out, in seconds: the last lap arrives over a second
   and a bit and stays, a fight arrives at once and goes slowly so it is one swell and not a stutter. */
export const LAYER_KEYS = ['last', 'fight'];
export const FEEL = { last: [1.2, 3], fight: [0.45, 2.4] };
export const NEAR = 3, FAR = 15;                  /* metres along the road: a car this close is a whole fight, this far off none */
export const HIT_MEMORY = 3;                      /* seconds a hit is remembered */
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

/* the last lap, 0 to 1: the fraction of the race run, once it is past the line of the last lap */
export function lastOf(r, f) {
  if (r.laps > 90 || r.laps < 1) return 0;
  if (f.finished) return 1;
  const L = r.track.length, frac = f.prog / (r.laps * L);
  if (r.laps === 1) return smooth((frac - 0.7) / 0.1);
  return smooth((frac - (1 - 1 / r.laps)) / (0.08 / r.laps));
}
/* the fight, 0 to 1: the gap to the nearest car still running (either way), a recent hit, a burning fuse */
export function fightOf(r, f, sinceHit) {
  let m = Infinity;
  for (const g of r.field) { if (g === f || g.finished) continue; const d = Math.abs(g.dist - f.dist); if (d < m) m = d; }
  let v = m === Infinity ? 0 : 1 - clamp01((m - NEAR) / (FAR - NEAR));
  if (sinceHit != null && sinceHit < HIT_MEMORY) v = Math.max(v, 1 - sinceHit / HIT_MEMORY);
  if (f.bomb) v = 1;
  return r.state === 'racing' || r.state === 'over' ? v : 0;
}
/* both at this moment; before the green light there is only the core of the tune */
export function heat(r, f, sinceHit) {
  if (r.state === 'count') return { last: 0, fight: 0 };
  return { last: lastOf(r, f), fight: fightOf(r, f, sinceHit) };
}
/* one step of a level coming in (fast) or going out (slow) toward what it is asked for, `dt` seconds */
export const lean = (e, target, dt, feel) => e + (target - e) * (1 - Math.exp(-dt / (target > e ? feel[0] : feel[1])));
