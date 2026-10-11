/* The machine's own trophies, part two: time, boot and the calendar; what is hidden in the machine; and the trophies about the trophies (the meta set). The mastery seals
   (MASTER OF <GAME>) are not here: kernel/trophies_defs.js generates one for each game from that game's own list, which is why a list can grow without anyone telling its seal.
   Legacy mirrors (Cook's twenty-four, Magen's ninety-eight) are shown in the ledger but never counted: not in these totals, not in a mastery. */
import { t, secret, rule } from '../apps/trophy_kit.js';
import { BIRTHDAY } from './trophies_system.js';
const on = rule.on;

export const GAMES = ['sweeper', 'solitaire', 'aftere', 'garden', 'cook', 'magen', 'standbattle', 'bekkedal', 'bottle'];
export const TOYS = ['elephant', 'crayon', 'garage', 'hifi', 'notes', 'holyc'];
/* the apps whose opening counts as starting a game */
export const GAME_APPS = { sweeper: 1, solitaire: 1, aftere: 1, garden: 1, cook: 1, magen: 1, standbattle: 1, bekkedal: 1, bottle: 1 };

export const SYSTEM_B = [
  /* ---- time, boot and the calendar ---- */
  secret('sys_wrongkey', 'WRONG KEY', 'B', 'J', 'The prompt asks for one key. Try all the others.', 'Press ten keys other than ~ at the boot prompt.', on('boot', p => p.wrongKeys >= 10)),
  t('sys_longboot', 'THE LONG WAY IN', 'B', 'E', 'Sit through the long boot: the fan, the bad block, the song through the wall.', on('boot', p => p.kind === 'long' && p.completed)),
  t('sys_3am', 'THREE IN THE MORNING', 'B', 'J', 'Be at the desktop at 03:00.', on('clock', p => p.hour === 3)),
  t('sys_days3', 'COMING BACK', 'B', 'P', 'Open the machine on three days in a row.', rule.stat('dayStreak', 3)),
  t('sys_days7', 'A WEEK IN THE TEMPLE', 'S', 'P', 'Open it on seven days in a row.', rule.stat('dayStreak', 7)),
  t('sys_days30', 'A MONTH OF MORNINGS', 'G', 'P', 'Open it on thirty days in a row (one missed day a week is forgiven).', rule.stat('dayStreak', 30)),
  t('sys_apps10', 'OPEN HOUSE', 'B', 'E', 'Open ten different apps.', rule.sets('apps', 10)),
  t('sys_apps_all', 'EVERY DOOR', 'S', 'E', 'Open every app that has a window.', rule.sets('apps', T => T.appCount())),
  t('sys_games5', 'A BIT OF EVERYTHING', 'B', 'E', 'Start five different games.', rule.sets('games', 5)),
  t('sys_games9', 'THE NINE ROOMS', 'S', 'E', 'Start all nine games: Sweeper, Solitaire, AfterEgypt, Garden, Cook, Magen, Stand Battle, Bekkedal and the Bottle.', rule.sets('games', 9)),
  secret('sys_birthday', 'THE DAY', 'G', 'E', 'There is one day the machine has been waiting for.', 'Open the machine on the owner\'s birthday: the 23rd of July.', on('open', p => p.month === BIRTHDAY.m && p.dom === BIRTHDAY.d)),

  /* ---- hidden in the machine ---- */
  secret('sys_konami', 'THE TEN KEYS', 'B', 'E', 'The old code. Ten of them.', 'Enter the Konami code.', on('konami')),
  t('sys_eden', 'IT WAS ENOUGH', 'S', 'C', 'Run Eden.HC from the garden the ten keys opened.', on('holyc', p => p.file === 'Eden.HC'))
];

/* ---- the trophies about the trophies ---- */
const tierCount = (T, tier) => T.count(d => d.tier === tier);
const kindCount = (T, kind) => T.count(d => d.kind === kind);
const hasIn = (T, app) => T.earnedList(d => d.app === app && !d.legacy).length > 0;
export const META = [
  t('meta_view', 'VIEWING ACHIEVEMENTS!', 'B', 'J', 'Open TROPHIES.EXE.', on('view')),
  secret('meta_remember', 'THE MACHINE REMEMBERS', 'B', 'J', 'It keeps more than you think.', 'Be told about trophies you had earned before they existed.', on('remember', p => p.n > 0)),
  t('meta_10', 'FIRST TEN', 'B', 'M', 'Earn 10 trophies.', rule.count(10)),
  t('meta_25', 'TWENTY-FIVE', 'B', 'M', 'Earn 25 trophies.', rule.count(25)),
  t('meta_50', 'HALF A HUNDRED', 'S', 'M', 'Earn 50 trophies.', rule.count(50)),
  t('meta_100', 'A HUNDRED', 'S', 'M', 'Earn 100 trophies.', rule.count(100)),
  /* THE CLUE. The name is the only hint anywhere that the two hundredth trophy opens something (kernel/vroom_gate.js): the id, the tier, the pay and the shelf reward are what they always were. */
  t('meta_200', 'VROOM', 'G', 'M', 'Earn 200 trophies.', rule.count(200)),
  t('meta_tiers', 'BRONZE, SILVER, GOLD', 'B', 'M', 'Earn one trophy of each tier.', rule.derive(T => tierCount(T, 'B') > 0 && tierCount(T, 'S') > 0 && tierCount(T, 'G') > 0)),
  t('meta_kinds', 'ONE OF EVERYTHING', 'B', 'M', 'Earn one trophy of each kind: progression, skill, explore, creative and joke.', rule.derive(T => ['progress', 'skill', 'explore', 'creative', 'joke'].every(k => kindCount(T, k) > 0))),
  t('meta_each', 'A LITTLE OF EVERYTHING', 'S', 'M', 'Earn a trophy in every game and every toy.', rule.derive(T => GAMES.concat(TOYS).every(a => hasIn(T, a)))),
  t('meta_gold10', 'GOLD STANDARD', 'S', 'M', 'Earn ten gold trophies.', rule.count(10, d => d.tier === 'G')),
  t('meta_secret3', 'KEEPING SECRETS', 'S', 'M', 'Find three secret trophies.', rule.count(3, d => d.secret)),
  t('meta_secret10', 'THE SECRET LIFE', 'G', 'M', 'Find ten secret trophies.', rule.count(10, d => d.secret)),
  t('meta_grand', 'THE GRAND TOUR', 'G', 'M', 'Earn a progression trophy in every one of the nine games.', rule.derive(T => GAMES.every(a => T.earnedList(d => d.app === a && !d.legacy && d.kind === 'progress').length > 0))),
  t('meta_all', 'THE LEDGER IS FULL', 'G', 'M', 'Earn every trophy that can still be earned.', rule.derive(T => { const o = T.open().filter(d => !d.legacy && d.id !== 'meta_all'); return o.length > 0 && o.every(d => T.earned(d.id)); }))
];
