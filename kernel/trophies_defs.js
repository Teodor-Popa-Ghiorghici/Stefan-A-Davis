/* Every trophy there is, in one place: the machine's own (trophies_system*.js) and each app's own list (apps/<id>/trophies.js). The kernel only imports data. The game ids
   and names below are also what a mastery seal is made from. A new app with trophies is one import and one line in APPS. */
import { SYSTEM_A } from './trophies_system.js';
import { applyRewards, masteryPay } from './trophy_rewards.js';
import { SYSTEM_B, META, GAMES, TOYS } from './trophies_system2.js';
import { TROPHIES as SWEEPER, backfill as sweeperBackfill } from '../apps/sweeper/trophies.js';
import { TROPHIES as SOLITAIRE, backfill as solitaireBackfill } from '../apps/solitaire/trophies.js';
import { TROPHIES as AFTERE, backfill as aftereBackfill } from '../apps/aftere/trophies.js';
import { TROPHIES as GARDEN, backfill as gardenBackfill } from '../apps/garden/trophies.js';
import { TROPHIES as COOK, MIRRORS as COOK_MIRRORS, backfill as cookBackfill } from '../apps/cook/trophies.js';
import { TROPHIES as MAGEN, MIRRORS as MAGEN_MIRRORS, backfill as magenBackfill } from '../apps/magen/trophies.js';
import { TROPHIES as STANDBATTLE, backfill as standbattleBackfill } from '../apps/standbattle/trophies.js';
import { TROPHIES as BEKKEDAL, backfill as bekkedalBackfill } from '../apps/bekkedal/trophies.js';
import { TROPHIES as BOTTLE, backfill as bottleBackfill } from '../apps/bottle/trophies.js';
import { TROPHIES as ELEPHANT, backfill as elephantBackfill } from '../apps/elephant/trophies.js';
import { TROPHIES as CRAYON, backfill as crayonBackfill } from '../apps/crayon/trophies.js';
import { TROPHIES as GARAGE, backfill as garageBackfill } from '../apps/garage/trophies.js';
import { TROPHIES as HIFI } from '../apps/hifi/trophies.js';
import { TROPHIES as NOTES } from '../apps/notes/trophies.js';
import { TROPHIES as TOOLS } from '../apps/tools/trophies.js';
import { TROPHIES as HOLYC, backfill as holycBackfill } from '../apps/holyc/trophies.js';
import { TROPHIES as VROOM, PAY as VROOM_PAY } from '../apps/vroom/trophies.js';
import { isOpen as vroomOpen } from './vroom_gate_core.js';

/* each app's backfill reader: (read(key) -> object|null, T) -> [trophy ids already earned] */
export const BACKFILL = [sweeperBackfill, solitaireBackfill, aftereBackfill, gardenBackfill, cookBackfill, magenBackfill, standbattleBackfill, bekkedalBackfill, bottleBackfill, elephantBackfill, crayonBackfill, garageBackfill, holycBackfill];
export const APPS = [
  /* [id, the name the ledger shows, its trophy list] */
  ['sweeper', 'DUNGEON SWEEPER', SWEEPER],
  ['solitaire', 'SOLITAIRE', SOLITAIRE],
  ['aftere', 'AFTEREGYPT', AFTERE],
  ['garden', 'THE GARDEN', GARDEN],
  ['cook', 'THE COOK', COOK.concat(COOK_MIRRORS)],
  ['magen', 'MAGEN', MAGEN.concat(MAGEN_MIRRORS)],
  ['standbattle', 'STAND BATTLE', STANDBATTLE],
  ['bekkedal', 'BEKKEDAL', BEKKEDAL],
  ['bottle', 'THE BOTTLE', BOTTLE],
  ['elephant', 'THE ELEPHANT', ELEPHANT],
  ['crayon', 'CRAYON', CRAYON],
  ['garage', 'THE GARAGE', GARAGE],
  ['hifi', 'THE STACK', HIFI],
  ['notes', 'NOTES', NOTES],
  ['tools', 'THE SMALL TOOLS', TOOLS],
  ['holyc', 'HOLYC.EXE', HOLYC]
];
export const NAMES = { system: 'THE MACHINE', meta: 'THE LEDGER', sweeper: 'DUNGEON SWEEPER', solitaire: 'SOLITAIRE', aftere: 'AFTEREGYPT', garden: 'THE GARDEN', cook: 'THE COOK', magen: 'MAGEN',
  standbattle: 'STAND BATTLE', bekkedal: 'BEKKEDAL', bottle: 'THE BOTTLE', elephant: 'THE ELEPHANT', crayon: 'CRAYON', garage: 'THE GARAGE', hifi: 'THE STACK', notes: 'NOTES', holyc: 'HOLYC.EXE', tools: 'THE SMALL TOOLS', vroom: 'VROOM.EXE' };

/* VROOM's trophies are NOT in the ledger until the gate is open (kernel/vroom_gate_core.js): not registered, so they are in no list, no count, no seal, no search and no pin -- there
   is nothing to hide. kernel/vroom_gate.js calls this when the two hundredth trophy is earned; registerAll calls it at boot on a machine where the gate already stands. `list` is for
   a check that wants to see the area appear. It does nothing twice, and nothing for an empty list (a seal of nothing is not a seal). */
export function registerVroom(T, list) {
  const own = list || VROOM;
  if (!own.length || T.apps.indexOf('vroom') >= 0) return false;
  T.register('vroom', own);
  Object.keys(VROOM_PAY).forEach(id => { const d = T.get(id); if (d) { d.pay = VROOM_PAY[id]; d.epic = true; } });
  T.finalize([{ app: 'vroom', name: NAMES.vroom }], masteryPay);
  applyRewards(T);
  return true;
}

export function registerAll(T) {
  T.register('system', SYSTEM_A.concat(SYSTEM_B));
  APPS.forEach(a => T.register(a[0], a[2]));
  T.register('meta', META);
  /* a mastery for each game, and for HOLYC.EXE (a thing to be finished) */
  T.finalize(GAMES.concat(['holyc']).map(id => ({ app: id, name: NAMES[id] })), masteryPay);
  if (vroomOpen()) registerVroom(T);
  applyRewards(T);
  void TOYS;
}
