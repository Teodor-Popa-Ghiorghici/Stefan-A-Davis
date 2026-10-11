/* THE TRACKS THE GAME KNOWS, and the way to ask for one: `trackFor('sorting', 'r')` is the sorting room driven the other way, built (track_build.js) and kept. A built track is a few thousand faces of picture and
   collision, so only the last few are kept and the rest are built again when asked for (about a tenth of a second). Everything that wants a track -- a race, the garage's preview, the budget bot, the
   checks -- asks here and never builds one itself. Pure. */
import { TRACKS } from './track_def.js';
import { variantOf, VARIANTS } from './track_variant.js';
import { buildTrack } from './track_build.js';

export const TRACK_IDS = Object.keys(TRACKS);
export const hasTrack = id => !!TRACKS[id];
/* the data of a track in a variant */
export const defFor = (id, v) => variantOf(TRACKS[id], v || 'f');
/* every track in every variant, as [id, variant] pairs, in the order of the town */
export const allTracks = () => { const out = []; for (const id of TRACK_IDS) for (const v of VARIANTS) out.push([id, v]); return out; };

const KEEP = 6, cache = [];
export function trackFor(id, v) {
  v = v || 'f';
  const key = id + ':' + v, hit = cache.findIndex(c => c.key === key);
  if (hit >= 0) { const c = cache.splice(hit, 1)[0]; cache.push(c); return c.track; }
  const track = buildTrack(defFor(id, v));
  cache.push({ key, track });
  if (cache.length > KEEP) cache.shift();
  return track;
}
