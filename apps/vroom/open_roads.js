/* THE ROADS A PLAYER MAY CHOOSE (docs/vroom/plan.md section 9), for the menus of a single race, a time trial and the 2P split: the roads of the cups that are open, as drawn (the first road of the town if none is
   yet), and after them the roads of the player's own that the track maker has saved (maker.js; `mine` is a list of { id, name } the window keeps). The other versions of a road are a time trial's to open. Pure. */
import { CUPS, cupOpen } from './cups.js';
import { TRACK_IDS } from './tracks.js';

export function openRoads(c, mine) {
  const out = [];
  for (const cup of CUPS) if (cupOpen(c, cup.id)) for (const r of cup.races) if (r.v === 'f' && out.indexOf(r.track) < 0) out.push(r.track);
  if (!out.length) out.push(TRACK_IDS[0]);
  for (const m of mine || []) out.push(m.id);
  return out;
}
