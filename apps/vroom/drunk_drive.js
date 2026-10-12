/* DRINK AND DRIVE: what the Jäger's journey (apps/drunk_scope.js) and a race (race.js) say together, as events for the ledger. Pure: `watch(emit)` returns `observe(race, human, d)`, called once a
   step with the race, the human's entry in its field and `d` = { stage: 0..6, out }. The stage is SOBER 0, WARM 1, TIPSY 2, LOOSE 3, SLOSHED 4, HAMMERED 5, ABOUT TO GO 6.
   Events (all carry `stage`): drive-go (the lights go green), drive-lap { low, clean } (the lowest stage of the lap, and whether no wall was touched in it), drive-finish { place, clean, out }
   (clean: no wall all race; out: the lights went out at some point in it), drive-flip, drive-wrong (four seconds the wrong way, once per spell), drive-land { air }, drive-taxi (the fifth time put
   back on the road at LOOSE or worse in one race), drive-grid (the lights went out during the countdown). Nothing here changes the race: it only listens. */
export const WRONG_SECS = 4, TAXI_AT = 5, TAXI_STAGE = 3;

export function watch(emit) {
  let race = null, S = null;
  const fresh = () => ({ repos: 0, wall: false, lapWall: false, lapLow: 9, out: false, outLast: false, wrongTold: false, taxiTold: false });
  return function observe(r, human, d) {
    if (r !== race) { race = r; S = fresh(); }
    const stage = d.stage | 0, out = !!d.out, me = human.i;
    if (out && !S.outLast && r.state === 'count') emit('drive-grid', { stage });
    if (out) S.out = true;
    S.outLast = out;
    if (r.state === 'racing' || r.state === 'over') S.lapLow = Math.min(S.lapLow, stage);
    for (const e of r.events) {
      if (e.type === 'count' && e.n === 0) emit('drive-go', { stage });
      if (e.car === me) {
        if (e.type === 'hit-wall') { S.wall = true; S.lapWall = true; }
        else if (e.type === 'flip') emit('drive-flip', { stage });
        else if (e.type === 'land') emit('drive-land', { stage, air: e.airtime });
        else if (e.type === 'repo' && stage >= TAXI_STAGE && ++S.repos === TAXI_AT && !S.taxiTold) { S.taxiTold = true; emit('drive-taxi', { stage }); }
      }
      if (e.i === me && e.type === 'lap') { emit('drive-lap', { stage, low: S.lapLow, clean: !S.lapWall }); S.lapWall = false; S.lapLow = 9; }
      if (e.i === me && e.type === 'finish') emit('drive-finish', { stage, place: e.place, clean: !S.wall, out: S.out });
    }
    if (human.wrong >= WRONG_SECS) { if (!S.wrongTold) { S.wrongTold = true; emit('drive-wrong', { stage }); } } else if (human.wrong <= 0) S.wrongTold = false;
  };
}
