/* A ROAD OF THE PLAYER'S OWN IN A RACE (docs/vroom/plan.md section 9, the track maker): what is different about a race on a road somebody made, and nothing else. It is raced like any other (a single race, a time trial, the
   2P split) but it is the player's toy and not the garage's: nothing is paid, no record is written to the career, the trophies are not told (a road with one straight and a lot of parcels must not be a way to a
   thousand flips), and the cars on it wear what it needs, because a road of snow that nobody could race on without the right tyres would be a road nobody finished. The only thing kept is the best lap of a time trial
   (`G.userBest`, kept apart from the career) and the ghost that made it. Pure but for the game state it is given. */
import { isUserId } from './tracks.js';
import { trackKey } from './career.js';

export { isUserId };
/* the entry with the parts the road needs fitted for this race (the kit in the garage is not touched) */
export function fitted(T, entry) {
  if (!T.def || !T.def.user) return entry;
  const parts = Object.assign({}, entry.parts);
  for (const n of T.needs || []) parts[n] = true;
  return Object.assign({}, entry, { parts });
}
/* the end of a single race or a time trial on such a road: the same shape as career.js hands the board (pay, lines, news, cup, record, lap), with nothing paid */
export function userConclude(G, S, rows, mine) {
  const s = S.s, h = S.human, id = s.trackId, news = ['YOUR OWN ROAD: NOTHING IS PAID'];
  let record = false;
  if (s.kind === 'tt' && h.best != null) {
    const prev = G.userBest[id];
    if (!prev || h.best < prev.lap) {
      record = true; G.userBest[id] = { lap: h.best, time: mine.time };
      const rr = S.solo.result(); G.saveGhost(trackKey(id, 'f'), { lap: rr.lap, car: rr.car, kit: rr.kit, text: rr.text });
      news.push('NEW BEST: THE GHOST IS THIS RUN');
    }
  }
  return { pay: 0, lines: [], news, cup: null, record, lap: h.best };
}
