/* VROOM's folder in THE STACK (apps/hifi/library.js), there only while the gate is open (apps/vroom_scope.js). Its discs are the game's own tunes, lifted out of apps/vroom/score.js the way every other
   game's are: `disc(song, tint, artist, layers)` is the library's own press (handed in, so this file imports nothing from it) and `L` the song language. The six drum and bass tunes are amber, the three lo-fi
   ones cyan, and every disc is pressed with both layers in (the last lap and the fight are the race's to ask for, not a disc's). */
import { IDS, RACE_IDS, NAMES, song, DISC_LAYERS } from './score.js';

export function vroomFolder(disc, L) {
  return ['VROOM', 'amber', IDS.map(k => [NAMES[k], disc(song(L, k), RACE_IDS.indexOf(k) >= 0 ? 'amber' : 'cyan', RACE_IDS.indexOf(k) >= 0 ? 'THE DRIVE' : 'THE NIGHT STATION', DISC_LAYERS)])];
}
