/* THE TRACKS THE GAME KNOWS, and the way to ask for one: `trackFor('sorting', 'r')` is the sorting room driven the other way, built (track_build.js) and kept. A built track is a few thousand faces of picture and
   collision, so only the last few are kept and the rest are built again when asked for (about a tenth of a second). Everything that wants a track -- a race, the garage's preview, the budget bot, the
   checks -- asks here and never builds one itself. Pure. */
import { TRACKS } from './track_def.js';
import { variantOf, VARIANTS } from './track_variant.js';
import { buildTrack } from './track_build.js';

export const TRACK_IDS = Object.keys(TRACKS);
/* THE ROADS OF THE PLAYER'S OWN (the track maker, maker_io.js) are known by an id that begins `user:` and are kept apart from the town's: they are in no list the career, the cups, the trophies or the checks walk (TRACK_IDS
   and allTracks are the town's eight and nothing else), and they are asked for by name in a single race, a time trial and the 2P split. */
const USER = new Map();
export const isUserId = id => typeof id === 'string' && id.indexOf('user:') === 0;
export const hasTrack = id => !!TRACKS[id] || USER.has(id);
export const userIds = () => Array.from(USER.keys());
/* the data of a track in a variant */
export const defFor = (id, v) => variantOf(TRACKS[id] || USER.get(id), v || 'f');
/* every track in every variant, as [id, variant] pairs, in the order of the town */
export const allTracks = () => { const out = []; for (const id of TRACK_IDS) for (const v of VARIANTS) out.push([id, v]); return out; };

const KEEP = 6, cache = [];
/* a road of the player's own is known from now on (a road of that name already known is replaced, and so is the track that was built from it) */
export function registerTrack(def) {
  if (!def || !isUserId(def.id) || !Array.isArray(def.controls)) throw new Error('registerTrack: a road of your own has an id that begins user: and a line');
  USER.set(def.id, def);
  for (let i = cache.length - 1; i >= 0; i--) if (cache[i].key.indexOf(def.id + ':') === 0) cache.splice(i, 1);
}
export function unregisterTrack(id) {
  USER.delete(id);
  for (let i = cache.length - 1; i >= 0; i--) if (cache[i].key.indexOf(id + ':') === 0) cache.splice(i, 1);
}
export function trackFor(id, v) {
  v = v || 'f';
  const key = id + ':' + v, hit = cache.findIndex(c => c.key === key);
  if (hit >= 0) { const c = cache.splice(hit, 1)[0]; cache.push(c); return c.track; }
  const track = buildTrack(defFor(id, v));
  cache.push({ key, track });
  if (cache.length > KEEP) cache.shift();
  return track;
}
