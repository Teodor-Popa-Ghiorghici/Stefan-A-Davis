/* VROOM.EXE's trophies. None is in the ledger until the gate is open (kernel/trophies_defs.js `registerVroom`), so this list is only data until then.
   Ten of them are DRINK AND DRIVE: the Jäger's journey (THE BOTTLE) and a race, together -- a joke the game tells with a straight face. The Jäger acts on the whole screen, so the
   person at the wheel is as drunk as the picture; drunk_drive.js turns "how drunk" and "what the car did" into the events below. Stages: SOBER 0, WARM 1, TIPSY 2, LOOSE 3,
   SLOSHED 4, HAMMERED 5, ABOUT TO GO 6. Events: drive-go, drive-lap, drive-finish, drive-flip, drive-wrong, drive-land, drive-taxi, drive-grid. */
import { t, secret, rule } from '../trophy_kit.js';
const on = rule.on;

export const TROPHIES = [
  t('vr_dd_go', 'ONE FOR THE ROAD', 'B', 'J', 'Leave the grid with a glow on: WARM or worse when the lights go green.', on('drive-go', p => p.stage >= 1)),
  t('vr_dd_flip', 'BOTTLE FLIP', 'B', 'J', 'Land on your roof with anything in your blood.', on('drive-flip', p => p.stage >= 1)),
  t('vr_dd_win', 'TIPSY TURISMO', 'S', 'S', 'Win a race at TIPSY or worse.', on('drive-finish', p => p.place === 1 && p.stage >= 2)),
  t('vr_dd_line', 'WALK THE LINE', 'S', 'S', 'Drive a whole lap at LOOSE or worse without touching a wall.', on('drive-lap', p => p.low >= 3 && p.clean)),
  t('vr_dd_wrong', 'THE OTHER WAY IS SHORTER', 'S', 'J', 'Drive the wrong way for four seconds at SLOSHED or worse.', on('drive-wrong', p => p.stage >= 4)),
  t('vr_dd_air', 'DOUBLE VISION', 'S', 'S', 'Land a jump of half a second or more in the air at HAMMERED or worse.', on('drive-land', p => p.stage >= 5 && p.air >= 0.5)),
  t('vr_dd_taxi', 'CALL ME A TAXI', 'S', 'J', 'Be put back on the road five times in one race at LOOSE or worse.', on('drive-taxi')),
  t('vr_dd_auto', 'WHO IS DRIVING?', 'S', 'J', 'Pass out in the middle of a race and still cross the finish line.', on('drive-finish', p => p.out)),
  secret('vr_dd_grid', 'PASSED OUT ON THE GRID', 'B', 'J', 'Some people never reach the green light.', 'Black out during the countdown, before the race has started.', on('drive-grid')),
  secret('vr_dd_clean', 'ABOUT TO GO, ABOUT TO WIN', 'G', 'S', 'The very top of the glass, and not one scratch on the car.', 'Win a race at ABOUT TO GO without touching a wall.', on('drive-finish', p => p.place === 1 && p.stage >= 6 && p.clean))
];
export function backfill() { return []; }
