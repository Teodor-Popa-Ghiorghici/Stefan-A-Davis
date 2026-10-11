/* WHAT HAPPENED TO ONE CAR IN A RACE, counted from the race's events (race.js `events`, rebuilt every step). The pay after a race, the career's statistics, the budget bot's measure of the chaos and (phase 7)
   the trophies all read the same count, so a hit is a hit wherever it is asked about. `who` is the car's index in the field. Call `eat(race)` once after every `race.step()`. Pure. */
export function createTally(who) {
  const T = {
    who, hitsDelivered: 0, hitsTaken: 0, flips: 0, repos: 0, wallHits: 0, picks: 0, uses: 0, passes: 0, booms: 0, wheelies: 0, landings: 0, bigAir: 0, laps: 0, bestLap: null,
    passedBack: 0, lastPlace: 0, leadSteps: 0, steps: 0
  };
  T.eat = race => {
    T.steps++;
    for (const e of race.events) {
      switch (e.type) {
        case 'hit': if (e.i === who && e.by !== who) T.hitsTaken++; else if (e.by === who && e.i !== who) T.hitsDelivered++; break;
        case 'flip': if (e.car === who) T.flips++; break;
        case 'repo': if (e.car === who) T.repos++; break;
        case 'hit-wall': if (e.car === who) T.wallHits++; break;
        case 'pick': if (e.i === who) T.picks++; break;
        case 'use': if (e.i === who) T.uses++; break;
        case 'pass': if (e.to === who) T.passes++; else if (e.from === who) T.passedBack++; break;
        case 'boom': if (e.i === who) T.booms++; break;
        case 'wheelie': if (e.car === who) T.wheelies++; break;
        case 'land': if (e.car === who) { T.landings++; if (e.airtime > 0.6) T.bigAir++; } break;
        case 'lap': if (e.i === who) { T.laps++; if (T.bestLap == null || e.time < T.bestLap) T.bestLap = e.time; } break;
        case 'finish': if (e.i === who) { T.lastPlace = e.place; if (T.bestLap == null) T.bestLap = null; } break;
        default: break;
      }
    }
    if (race.state === 'racing' && race.field[who] && race.field[who].place === 1) T.leadSteps++;
  };
  return T;
}
