# VROOM.EXE: the trophies (design record)

None of these is in the ledger until the gate is open (`kernel/vroom_gate_core.js`; see `docs/vroom/plan.md` section 2): `registerVroom` in `kernel/trophies_defs.js` puts them, and a mastery seal of their own, in the ledger when the two hundredth trophy (called VROOM) is earned. `node apps/vroom/trophy_check.js` earns every one of them with a witness and holds the other way too (a fourth place is not a win, four hits are not five). `node scripts/check-trophies.mjs` holds them to the ledger's rules in a ledger of their own, and `node scripts/check-trophy-wires.mjs` that each has something that can reach it.

**46 trophies, 3 of them secret, and a seal (500 and a hundred a trophy).** Tier pays 15 / 40 / 100 SUN; the long ones (`PAY` in `apps/vroom/trophies.js`) pay like hours.

How they are told: an *event* where it happens (a race ends, a car comes down, a gate breaks, a parcel passes) or a *scan* of the career each time it is saved (cars owned, parts bought, stars found, challenges beaten, cups won), both from `apps/vroom/trophy_calls.js`.

| id | name | tier | kind | exactly | SUN |
|---|---|---|---|---|---|
| vr_first | FIRST OFF THE GRID | bronze | progress | Finish a race. | 15 |
| vr_win | FIRST PARCEL HOME | bronze | progress | Win a race against at least three rivals. | 15 |
| vr_cup1 | THE PARCEL CUP | bronze | progress | Pass the PARCEL CUP. | 15 |
| vr_cup2 | THE FREIGHT CUP | silver | progress | Pass the FREIGHT CUP. | 40 |
| vr_cup3 | THE BLIZZARD CUP | silver | progress | Pass the BLIZZARD CUP. | 40 |
| vr_cup4 | THE FINAL CUP | gold | progress | Pass the GRAND TOUR. | 100 |
| vr_cupwin | FIRST ON POINTS | silver | progress | Win a cup, finishing first on points. | 40 |
| vr_cupall | FOUR CUPS, FOUR GOLDS | gold | progress | Win all four cups. | 1200 |
| vr_sweep | EVERY RACE OF A CUP | gold | skill | Win all four races of one cup. | 100 |
| vr_firstrun | ON THE FIRST RUN | bronze | skill | Pass a cup on the first run you make at it. | 15 |
| vr_route | OPEN ROADS | silver | progress | Own all five route parts. | 40 |
| vr_depot | NOTHING LEFT TO BUY | gold | progress | Own every part, at every level, and every look the depot has. | 1500 |
| vr_cars | ALL TWENTY-FOUR | gold | explore | Own all twenty-four cars. | 1500 |
| vr_look | LOOKING SHARP | bronze | creative | Wear a paint, a bobblehead, a horn, a plate and a cab light that the courier did not start with. | 15 |
| vr_radio | YOUR STATION | bronze | creative | Tune the radio to the other station. | 15 |
| vr_roads | THE WHOLE TOWN | silver | explore | Race on all eight roads. | 40 |
| vr_rev | THE WRONG WAY ROUND | bronze | explore | Race on a reversed road. | 15 |
| vr_both | REVERSED AND MIRRORED | silver | explore | Race on a road that is both reversed and mirrored. | 40 |
| vr_star | A STAR ON A SHELF | bronze | explore | Pick up a hidden star in PRACTICE. | 15 |
| vr_stars | EVERY ROAD'S STAR | gold | explore | Find the hidden star of all eight roads. | 800 |
| vr_yard5 | THE SKATE PARK | bronze | explore | Catch five stars in the STUNT YARD. | 15 |
| vr_yard20 | TWENTY IN THE AIR | gold | skill | Catch all twenty stars in the STUNT YARD. | 800 |
| vr_cut | THE SHORT WAY ROUND | bronze | explore | Drive a shortcut from one end to the other. | 15 |
| vr_gate | BREAK THE FENCE | bronze | explore | Break a fence gate with the BUMPER BAR. | 15 |
| vr_arsenal | THE WHOLE ARSENAL | silver | explore | Use all ten pickups. | 40 |
| vr_modes | SIX WAYS TO DRIVE | silver | explore | Finish a race, a time trial, PRACTICE, the STUNT YARD, LAST MILE and CLOCKWORK. | 40 |
| vr_rivals | KNOWS EVERYONE | silver | explore | Finish ahead of each of the eleven rivals in a race. | 40 |
| vr_wheelie | ON THE BACK WHEELS | bronze | explore | Pop a wheelie. | 15 |
| vr_par | BEAT THE CHALLENGE | silver | skill | Beat a road's challenge time. | 40 |
| vr_pars | THE FASTEST IN TOWN | gold | skill | Beat the challenge time of every road in all four versions. | 2000 |
| vr_ghost | RACING YOURSELF | bronze | skill | Beat your own ghost in a time trial. | 15 |
| vr_clean | A CLEAN RACE | silver | skill | Finish a race of three laps or more without a hard hit on a wall and without being put back. | 40 |
| vr_comeback | LAST TO FIRST | gold | skill | Win a race of eight cars after being in last place. | 100 |
| vr_wire | WIRE TO WIRE | silver | skill | Win a race of eight cars having been first at the end of every lap. | 40 |
| vr_air | BIG AIR | silver | skill | Land a jump after more than a second in the air. | 40 |
| vr_hits5 | HANDS FULL | silver | skill | Hit rivals with pickups five times in one race. | 40 |
| vr_hot | HOT POTATO (secret) | silver | skill | Pass the HOT PARCEL on three times in one race. | 40 |
| vr_lm | THE LAST MILE | silver | progress | Win a LAST MILE race. | 40 |
| vr_lmclean | SIX FOR SIX | gold | skill | Win a LAST MILE race without the parcel ever leaving the bed. | 100 |
| vr_scratch | NOT A SCRATCH (secret) | silver | skill | Make a LAST MILE delivery that pays 90 or more. | 40 |
| vr_cw | SIXTEEN TRUCKS | bronze | progress | Finish a CLOCKWORK race. | 15 |
| vr_cwwin | WOUND UP AND WON | silver | skill | Win a CLOCKWORK race. | 40 |
| vr_boom | IT WAS ALWAYS YOU | bronze | joke | Have the HOT PARCEL go off on your car. | 15 |
| vr_flip3 | TUMBLE DRYER | bronze | joke | Flip over three times in one race. | 15 |
| vr_roof | ROOFTOP FINISH (secret) | silver | joke | Cross the finish line upside down. | 40 |
| vr_honk | HONK HONK | bronze | joke | Sound the horn twenty-five times. | 15 |

## Numbers behind the thresholds

- **A clean race** is no wall hit of 3 m/s or more (`HARD_WALL` in `tally.js`) and no repositioning over three laps or more. A CPU in a field of eight scrapes a wall five to fifteen times a race, but a hit that hard is none to three in a race for a PRO driver.
- **Big air** is a landing after a second in the air or more: a CPU's longest on the eight roads runs from 0.47 s (the factory) to 1.75 s (MAIN STREET).
- **Not a scratch** is a LAST MILE delivery that pays 90 or more (`SCRATCH_TIP`, `lm_tip.js`): a tip is 100 less 1.6 a second carried, 14 a drop and 4 a hit, and the doors of a road are 28 to 112 m apart, so it is a quick, clean stop at one of the closer doors. (It was 95 and could not be reached: 28 m from a standing start is more than three seconds.)
- **Hot potato** is the HOT PARCEL passed on three times in one race; **hands full** is five hits given with pickups in one race (a race of eight is about 38 hits among all the cars).
