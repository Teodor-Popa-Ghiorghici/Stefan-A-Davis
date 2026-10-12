/* VROOM.EXE's trophies. None of them is in the ledger until the gate is open (kernel/trophies_defs.js `registerVroom`: not registered, so in no list, count, seal, search or pin), so this list is only data until then.
   Data only; the calls are in trophy_calls.js, which tells the ledger two kinds of thing: EVENTS where they happen (a race ends, a car comes down, a gate breaks, a delivery is made) and a SCAN of the career every
   time it is saved (cars owned, parts bought, stars found, challenges beaten), which is how a collection is counted whatever order it was collected in.
   Events: race-end { kind, finished, place, n, rivals, rating, track, v, laps, wallHits, hardWalls, repos, wasLast, ledAll }, cup-end { cup, passed, won, sweep, runs }, air { airtime }, wheelie, gate, cut,
   boom-me, flip3, hits5, hot3, roof, ghost, delivered { tip }, lm-end { win, drops }, cw-end { won }, radio. Counters: honks. Sets: roads (the eight), uses (the ten pickups), beat (the eleven rivals), modes (six),
   stars (the eight roads), yard (the twenty), pars (a road in a version: thirty-two). Counters from the scan: cars, route, looks, depot. */
import { t, secret, rule } from '../trophy_kit.js';
import { SCRATCH_TIP } from './lm_tip.js';
const on = rule.on;
const cup = id => p => p.passed && p.cup === id;
const raced = p => p.finished && (p.kind === 'cup' || p.kind === 'single');

export const TROPHIES = [
  /* the races and the cups */
  t('vr_first', 'FIRST OFF THE GRID', 'B', 'P', 'Finish a race.', on('race-end', p => p.finished)),
  t('vr_win', 'FIRST PARCEL HOME', 'B', 'P', 'Win a race against at least three rivals.', on('race-end', p => raced(p) && p.place === 1 && p.rivals >= 3)),
  t('vr_cup1', 'THE PARCEL CUP', 'B', 'P', 'Pass the PARCEL CUP.', on('cup-end', cup('rookie'))),
  t('vr_cup2', 'THE FREIGHT CUP', 'S', 'P', 'Pass the FREIGHT CUP.', on('cup-end', cup('amateur'))),
  t('vr_cup3', 'THE BLIZZARD CUP', 'S', 'P', 'Pass the BLIZZARD CUP.', on('cup-end', cup('advanced'))),
  t('vr_cup4', 'THE FINAL CUP', 'G', 'P', 'Pass the GRAND TOUR.', on('cup-end', cup('pro'))),
  t('vr_cupwin', 'FIRST ON POINTS', 'S', 'P', 'Win a cup, finishing first on points.', on('cup-end', p => p.passed && p.won)),
  t('vr_cupall', 'FOUR CUPS, FOUR GOLDS', 'G', 'P', 'Win all four cups.', rule.sets('cupwins', 4)),
  t('vr_sweep', 'EVERY RACE OF A CUP', 'G', 'S', 'Win all four races of one cup.', on('cup-end', p => p.passed && p.sweep), { scope: 'run' }),
  t('vr_firstrun', 'ON THE FIRST RUN', 'B', 'S', 'Pass a cup on the first run you make at it.', on('cup-end', p => p.passed && p.runs === 1)),
  /* the garage and the depot */
  t('vr_route', 'OPEN ROADS', 'S', 'P', 'Own all five route parts.', rule.stat('route', 5)),
  t('vr_depot', 'NOTHING LEFT TO BUY', 'G', 'P', 'Own every part, at every level, and every look the depot has.', rule.stat('depot', 1)),
  t('vr_cars', 'ALL TWENTY-FOUR', 'G', 'E', 'Own all twenty-four cars.', rule.stat('cars', 24)),
  t('vr_look', 'LOOKING SHARP', 'B', 'C', 'Wear a paint, a bobblehead, a horn, a plate and a cab light that the courier did not start with.', rule.stat('looks', 5)),
  t('vr_radio', 'YOUR STATION', 'B', 'C', 'Tune the radio to the other station.', on('radio')),
  /* the town */
  t('vr_roads', 'THE WHOLE TOWN', 'S', 'E', 'Race on all eight roads.', rule.sets('roads', 8)),
  t('vr_rev', 'THE WRONG WAY ROUND', 'B', 'E', 'Race on a reversed road.', on('race-end', p => p.finished && (p.v === 'r' || p.v === 'rm'))),
  t('vr_both', 'REVERSED AND MIRRORED', 'S', 'E', 'Race on a road that is both reversed and mirrored.', on('race-end', p => p.finished && p.v === 'rm')),
  t('vr_star', 'A STAR ON A SHELF', 'B', 'E', 'Pick up a hidden star in PRACTICE.', rule.sets('stars', 1)),
  t('vr_stars', "EVERY ROAD'S STAR", 'G', 'E', 'Find the hidden star of all eight roads.', rule.sets('stars', 8)),
  t('vr_yard5', 'THE SKATE PARK', 'B', 'E', 'Catch five stars in the STUNT YARD.', rule.sets('yard', 5)),
  t('vr_yard20', 'TWENTY IN THE AIR', 'G', 'S', 'Catch all twenty stars in the STUNT YARD.', rule.sets('yard', 20)),
  t('vr_cut', 'THE SHORT WAY ROUND', 'B', 'E', 'Drive a shortcut from one end to the other.', on('cut')),
  t('vr_gate', 'BREAK THE FENCE', 'B', 'E', 'Break a fence gate with the BUMPER BAR.', on('gate')),
  t('vr_arsenal', 'THE WHOLE ARSENAL', 'S', 'E', 'Use all ten pickups.', rule.sets('uses', 10)),
  t('vr_modes', 'SIX WAYS TO DRIVE', 'S', 'E', 'Finish a race, a time trial, PRACTICE, the STUNT YARD, LAST MILE and CLOCKWORK.', rule.sets('modes', 6)),
  t('vr_rivals', 'KNOWS EVERYONE', 'S', 'E', 'Finish ahead of each of the eleven rivals in a race.', rule.sets('beat', 11)),
  t('vr_wheelie', 'ON THE BACK WHEELS', 'B', 'E', 'Pop a wheelie.', on('wheelie')),
  /* driving */
  t('vr_par', 'BEAT THE CHALLENGE', 'S', 'S', "Beat a road's challenge time.", rule.sets('pars', 1)),
  t('vr_pars', 'THE FASTEST IN TOWN', 'G', 'S', 'Beat the challenge time of every road in all four versions.', rule.sets('pars', 32)),
  t('vr_ghost', 'RACING YOURSELF', 'B', 'S', 'Beat your own ghost in a time trial.', on('ghost')),
  t('vr_clean', 'A CLEAN RACE', 'S', 'S', 'Finish a race of three laps or more without a hard hit on a wall and without being put back.', on('race-end', p => raced(p) && p.laps >= 3 && p.hardWalls === 0 && p.repos === 0), { scope: 'run' }),
  t('vr_comeback', 'LAST TO FIRST', 'G', 'S', 'Win a race of eight cars after being in last place.', on('race-end', p => raced(p) && p.n >= 8 && p.place === 1 && p.wasLast), { scope: 'run' }),
  t('vr_wire', 'WIRE TO WIRE', 'S', 'S', 'Win a race of eight cars having been first at the end of every lap.', on('race-end', p => raced(p) && p.n >= 8 && p.place === 1 && p.ledAll), { scope: 'run' }),
  t('vr_air', 'BIG AIR', 'S', 'S', 'Land a jump after more than a second in the air.', on('air', p => p.airtime >= 1)),
  t('vr_hits5', 'HANDS FULL', 'S', 'S', 'Hit rivals with pickups five times in one race.', on('hits5'), { scope: 'run' }),
  secret('vr_hot', 'HOT POTATO', 'S', 'S', 'Something that burns is better passed than kept.', 'Pass the HOT PARCEL on three times in one race.', on('hot3'), { scope: 'run' }),
  /* the other modes */
  t('vr_lm', 'THE LAST MILE', 'S', 'P', 'Win a LAST MILE race.', on('lm-end', p => p.win)),
  t('vr_lmclean', 'SIX FOR SIX', 'G', 'S', 'Win a LAST MILE race without the parcel ever leaving the bed.', on('lm-end', p => p.win && p.drops === 0), { scope: 'run' }),
  secret('vr_scratch', 'NOT A SCRATCH', 'S', 'S', 'A door pays best to a truck that has not been touched.', 'Make a LAST MILE delivery that pays 90 or more.', on('delivered', p => p.tip >= SCRATCH_TIP), { scope: 'run' }),
  t('vr_cw', 'SIXTEEN TRUCKS', 'B', 'P', 'Finish a CLOCKWORK race.', on('cw-end', p => p.finished)),
  t('vr_cwwin', 'WOUND UP AND WON', 'S', 'S', 'Win a CLOCKWORK race.', on('cw-end', p => p.won)),
  /* jokes */
  t('vr_boom', 'IT WAS ALWAYS YOU', 'B', 'J', 'Have the HOT PARCEL go off on your car.', on('boom-me')),
  t('vr_flip3', 'TUMBLE DRYER', 'B', 'J', 'Flip over three times in one race.', on('flip3'), { scope: 'run' }),
  secret('vr_roof', 'ROOFTOP FINISH', 'S', 'J', 'It counts if the line is crossed. It does not say which way up.', 'Cross the finish line upside down.', on('roof')),
  t('vr_honk', 'HONK HONK', 'B', 'J', 'Sound the horn twenty-five times.', rule.stat('honks', 25)),
  /* drink and drive: THE BOTTLE's Jäger and a race together (drunk_drive.js; stages SOBER 0 .. ABOUT TO GO 6) */
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

/* what the long ones pay (SUN), the way kernel/trophy_rewards.js COMPLETION does it for the rest of the ledger: the whole of a collection is hours, so it is paid like hours. Kept here and not there
   because these trophies are not in the ledger until the gate is open, and that table is held to name only trophies that are (registerVroom applies it). */
export const PAY = { vr_cupall: 1200, vr_cars: 1500, vr_stars: 800, vr_yard20: 800, vr_pars: 2000, vr_depot: 1500 };

/* a machine that has played before is credited from its career by the scan (trophy_calls.js), not from here: VROOM's trophies do not exist until the gate has opened, so nothing could have been earned. */
export function backfill() { return []; }
