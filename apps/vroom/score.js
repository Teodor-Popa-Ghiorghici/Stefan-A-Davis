/* VROOM's score: nine tunes in two pools and two stingers, all for the studio's real instruments (docs/vroom/plan.md section 10). All of them are in F minor, so any tune may follow any other on a bar line.
     RACE POOL   six drum and bass tunes at 172 bpm, thirty-two bars each: SPECIAL DELIVERY, DEAD LETTER, SECOND CLASS, FRAGILE, OVERNIGHT, RETURN TO SENDER
     NIGHT POOL  three lo-fi tunes at 86 bpm, sixteen bars each (the same length of time): LAMP POST, CLOSED SIGN, SNOWED IN
   Every tune is a core that is a tune on its own and two layers the race switches while it plays (music.js, music_heat.js): `last` for the last lap and `fight` for a car close by. See tunes.js (the tunes),
   band.js (who plays them) and breaks.js (the drums). The stingers are `sting('win' | 'miss')`. */
import { memo } from '../scorekit.js';
import { raceSong, nightSong } from './band.js';
import { STINGERS } from './stingers.js';
import { RACE, NIGHT } from './tunes.js';
import { secsOf } from './score_kit.js';

export const RACE_IDS = Object.keys(RACE);
export const NIGHT_IDS = Object.keys(NIGHT);
export const IDS = RACE_IDS.concat(NIGHT_IDS);
export const POOLS = { race: RACE_IDS, night: NIGHT_IDS };
export const NAMES = Object.assign({}, ...IDS.map(k => ({ [k]: (RACE[k] || NIGHT[k]).title })));
export const LAYERS = ['last', 'fight'];
export const STINGS = ['win', 'miss'];
/* TheStack presses a tune with both layers in */
export const DISC_LAYERS = { last: true, fight: true };

const make = memo((L, id) => (RACE[id] ? raceSong(L, id) : nightSong(L, id)));
const makeSting = memo((L, id) => STINGERS[id](L));
export const song = (L, id) => make(L, id);
export const sting = (L, id) => makeSting(L, id);
export { secsOf };
/* seconds one pass of a tune lasts */
export const passSecs = id => { const d = RACE[id] || NIGHT[id]; return (RACE[id] ? 32 : 16) * 4 * 60 / d.bpm; };
