/* Where VROOM tells the trophies what happened (the list is trophies.js). Two kinds of fact reach the ledger from here:
     EVENTS    where they happen: a step of the race (a car comes down, a gate breaks, a parcel passes, a flip), its end (the finish and what the cup made of it), the horn, the radio;
     THE SCAN  of the career every time it is saved (`career(c)`): cars owned, parts bought, looks worn, stars found, challenges beaten, cups won. A collection counts however it was collected, and a
               machine that has played before is credited the first time its career is read.
   A card waits while a race is on (`hold` at the start, `release` when it ends or the window goes). None of it can throw into the game, and it does nothing, quietly, if the ledger is gone
   (apps/trophy_scope.js). Pure but for that. */
import { trophies } from '../trophy_scope.js';
import { COSMETICS, ROUTE, TUNING, MAX_LEVEL } from './parts.js';
import { CUPS } from './cups.js';
import { allTracks } from './tracks.js';
import { beaten } from './challenge.js';
import { CARS } from './cars.js';
import { RIVAL_BY_ID } from './rivals.js';

const TR = trophies('vroom');
const guard = f => { try { return f(); } catch (e) { return undefined; } };
export const CAR_COUNT = Object.keys(CARS).length;

/* the cosmetic of each kind that is the car's own when it leaves the showroom: index 0 of every list (parts.js) */
const STARTING = Object.fromEntries(Object.keys(COSMETICS).map(k => [k, COSMETICS[k].items[0].id]));
/* has the garage got everything the depot has: every route part, every tuning part at its top level, every look */
export function depotComplete(c) {
  if (!Object.keys(ROUTE).every(id => c.own.route[id])) return false;
  if (!Object.keys(TUNING).every(id => (c.own.tune[id] | 0) >= MAX_LEVEL)) return false;
  return Object.keys(COSMETICS).every(k => COSMETICS[k].items.every(it => c.own.look[k] && c.own.look[k][it.id]));
}

export function createCalls() {
  let holding = false, st = null;
  const free = () => { if (holding) { holding = false; TR.release(); } };
  const C = {
    /* a race is on screen; S is what screen_race.js keeps */
    begin(S) {
      guard(() => {
        TR.drain();
        st = { me: S.human.i, flips: 0, hitsOut: 0, passed: 0, uses: 0, lapPlaces: [], wasLast: false, cutT: 0, told: {} };
        if (!holding) { holding = true; TR.hold(); }
      });
    },
    /* once a step of the sim: what the race says happened to the player's car */
    step(race) {
      guard(() => {
        if (!st) return;
        const me = race.field[st.me];
        for (const e of race.events) {
          switch (e.type) {
            case 'land': if (e.car === st.me) TR.emit('air', { airtime: e.airtime }); break;
            case 'wheelie': if (e.car === st.me) TR.emit('wheelie', {}); break;
            case 'gate': if (e.car === st.me) TR.emit('gate', {}); break;
            case 'boom': if (e.i === st.me) TR.emit('boom-me', {}); break;
            case 'flip': if (e.car === st.me && ++st.flips === 3) TR.emit('flip3', {}); break;
            case 'use': if (e.i === st.me) TR.mark('uses', e.id); break;
            case 'pass': if (e.from === st.me && ++st.passed === 3) TR.emit('hot3', {}); break;
            case 'hit': if (e.by === st.me && e.i !== st.me && ++st.hitsOut === 5) TR.emit('hits5', {}); break;
            case 'lap': if (e.i === st.me) st.lapPlaces.push(me.place); break;
            case 'finish': if (e.i === st.me && me.car.upside) TR.emit('roof', {}); break;
            default: break;
          }
        }
        if (race.lm && race.lm.events) for (const e of race.lm.events) if (e.i === st.me && e.type === 'delivered') TR.emit('delivered', { tip: e.tip });
        if (race.state === 'racing' && race.t > 3 && race.field.length >= 8 && me.place === race.field.length) st.wasLast = true;
        /* a shortcut driven from one end to the other: in the slip lane for most of a second, and out of it again */
        if (me.inCut >= 0) st.cutT += 1 / 60; else { if (st.cutT > 0.8) TR.emit('cut', {}); st.cutT = 0; }
      });
    },
    /* the race is over. `info`: { S, rows, mine, cup (finishRace's, or null), run (the cup run it was part of, or null), career, lm (LAST MILE's result), ghost (a ghost was beaten) } */
    end(info) {
      guard(() => {
        const S = info.S, s = S.s, mine = info.mine, kind = s.kind, tally = S.tally, rows = info.rows;
        const finished = mine.time != null, raced = kind === 'cup' || kind === 'single';
        const rivals = rows.filter(r => !r.human);
        const led = st && st.lapPlaces.length >= 2 && st.lapPlaces.every(p => p === 1) && mine.place === 1;
        if (finished && kind !== 'yard') TR.mark('roads', s.trackId);
        TR.emit('race-end', { kind, finished, place: mine.place, n: rows.length, rivals: rivals.length, rating: s.rating, track: s.trackId, v: s.v, laps: s.laps, wallHits: tally.wallHits, hardWalls: tally.hardWalls, repos: tally.repos, wasLast: !!(st && st.wasLast), ledAll: !!led });
        if (finished) {
          TR.mark('modes', raced ? 'race' : kind);
          if (raced) rivals.forEach(r => { if (r.place > mine.place && RIVAL_BY_ID[r.id]) TR.mark('beat', r.id); });
        }
        if (info.cup && info.cup.over && info.run) {
          const run = info.run, cs = info.career.cups[run.cup];
          TR.emit('cup-end', { cup: run.cup, passed: info.cup.passed, won: info.cup.won, sweep: run.places.every(p => p === 1), runs: cs ? cs.runs : 0 });
        }
        if (kind === 'lastmile' && info.lm) TR.emit('lm-end', { win: !!info.lm.win, drops: S.race.lm ? S.race.lm.st[S.human.i].parcel.drops : 0 });
        if (kind === 'clockwork') TR.emit('cw-end', { finished, won: mine.place === 1 });
        if (kind === 'tt' && info.ghost) TR.emit('ghost', {});
      });
      free(); st = null;
    },
    /* the career, every time it is saved (and once when the window opens) */
    career(c) {
      guard(() => {
        TR.max('cars', Object.keys(c.cars).length);
        TR.max('route', Object.keys(ROUTE).filter(id => c.own.route[id]).length);
        TR.max('looks', Object.keys(STARTING).filter(k => c.look[k] && c.look[k] !== STARTING[k]).length);
        if (depotComplete(c)) TR.max('depot', 1);
        for (const id of Object.keys(c.stars)) TR.mark('stars', id);
        const yard = Object.keys(c.yard);
        for (const id of yard) TR.mark('yard', id);
        if (yard.length) TR.mark('modes', 'yard');
        for (const cup of CUPS) if (c.cups[cup.id] && c.cups[cup.id].won > 0) TR.mark('cupwins', cup.id);
        for (const [track, v] of allTracks()) if (beaten(c, track, v)) TR.mark('pars', track + ':' + v);
      });
    },
    honk() { guard(() => TR.add('honks', 1)); },
    radio() { guard(() => TR.emit('radio', {})); },
    leave() { st = null; free(); },
    stop() { st = null; free(); }
  };
  return C;
}
