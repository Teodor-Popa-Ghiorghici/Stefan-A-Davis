/* SCREENS CHECK (dev-only, not packaged): the menus walked with scripted keys, in plain Node, against the real screens and the real career. The title leads where it says; the cups screen shows what is open and
   starts a cup; the depot buys what it is asked to and no more, and the dial and the looks do what the bottom strip says; the garage takes out only a car that is won; a single race can be started with the
   changes made on its rows; a race driven to its end ends in the board after it, with the pay, and the board leads on to the next race of the cup or back to the menu; leaving a cup costs a try; and every
   screen draws every frame with nothing but palette bytes.      node apps/vroom/screens_check.js */
import { suite } from './check_kit.js';
import { rig } from './screens_check_kit.js';
import * as C from './career.js';
import { createDriver } from './ai.js';
import { HUMAN } from './ai_profiles.js';
import { PAL } from './palette.js';

const S = suite('screens_check'), { ok } = S;
const clean = G => { const b = G.R.buf; for (let i = 0; i < b.length; i++) if (b[i] >= PAL.length) return false; return true; };

/* a cursor moved with real key presses until the screen says it is where it should be */
const steer = (G, want, keys) => { for (let i = 0; i < 24; i++) { const s = G.screens.screen.state(); if (Object.keys(want).every(k => s[k] === want[k])) return true; const k = Object.keys(want).find(x => s[x] !== want[x]); G.press(keys[k][want[k] > s[k] ? 1 : 0]); } return false; };
const DEPOT = { row: ['ArrowUp', 'ArrowDown'], col: ['ArrowLeft', 'ArrowRight'] };

/* ---- the title ---- */
{
  const G = rig();
  G.go('title'); G.frame(1 / 60, 2);
  ok(G.screens.name === 'title' && clean(G), 'the title draws');
  G.press('Enter'); ok(G.screens.name === 'cups', 'ENTER on the first row goes to the championship');
  G.press('Escape'); ok(G.screens.name === 'title', 'and ESC comes back');
  G.go('title', { sel: 0 }); G.press('ArrowDown'); G.press('Enter'); ok(G.screens.name === 'single', 'the second row is a single race');
  G.go('title', { sel: 0 }); G.press('ArrowDown', 'ArrowDown'); G.press('Enter'); ok(G.screens.name === 'depot', 'the third is the depot');
  G.go('title', { sel: 0 }); G.press('ArrowDown', 'ArrowDown', 'ArrowDown'); G.press('Enter'); ok(G.screens.name === 'garage', 'the fourth is the garage');
  G.go('title', { sel: 0 }); G.press('ArrowUp'); ok(G.screens.screen.state().sel === 4, 'UP from the top wraps to QUIT (which closes the window; here there is none to close)');
}
/* ---- the cups ---- */
{
  const G = rig(); G.go('cups'); G.frame(1 / 60, 2);
  ok(clean(G), 'the championship screen draws');
  G.press('ArrowDown'); G.press('Enter'); ok(G.screens.name === 'cups' && !G.career.run, 'a cup that is not open does not start');
  G.press('ArrowUp'); G.press('Enter');
  ok(G.screens.name === 'race' && G.career.run && G.career.run.cup === 'rookie' && G.career.run.race === 0 && G.saved.length >= 1, 'ENTER on the open cup starts it (the career is saved)');
  G.frame(1 / 60, 30); ok(G.live && G.live.race.state === 'count', 'the race is counting down');
  G.press('Escape'); ok(G.live.paused, 'ESC pauses it');
  G.press('ArrowDown'); G.press('Enter');
  ok(G.screens.name === 'cups' && G.career.run === null && G.career.cups.rookie.tries === 2, 'quitting a cup from the pause menu costs a try (' + G.career.cups.rookie.tries + ' left)');
}
/* ---- the depot ---- */
{
  const c = C.fresh(); c.tips = 700; const G = rig(c); G.go('depot'); G.frame(1 / 60, 20);
  ok(clean(G), 'the depot draws');
  G.press('Enter'); ok(c.own.route.snowTyres === 1 && c.tips === 100, 'ENTER on a part buys it (SNOW TYRES, 600 TIPS)');
  G.press('Enter'); ok(c.tips === 100, 'and a second ENTER on it buys nothing more');
  steer(G, { col: 3 }, DEPOT); G.press('Enter'); ok(c.tips === 100 && !c.own.route.bumperBar, 'a part you cannot afford is not bought and the money is not touched');
  steer(G, { row: 1, col: 0 }, DEPOT); G.frame(1 / 60, 5); G.press('Enter'); ok(c.own.tune.motor === 0 && c.tips === 100, 'a tuning part you cannot afford waits (250 > 100)');
  c.tips = 5000; G.press('Enter', 'Enter'); ok(c.own.tune.motor === 2 && c.tips === 5000 - 250 - 600, 'a tuning part is bought a level at a time');
  /* the weight: buy a level, open the dial, turn it */
  steer(G, { col: 5 }, DEPOT); G.frame(1 / 60, 3);
  G.press('Enter'); ok(c.own.tune.ballast === 1, 'the weight is bought like any part (the sixth of the tuning row)');
  G.press('Enter'); ok(G.screens.screen.state().mode === 'dial', 'ENTER on it, now it is owned, opens the dial'); G.press('ArrowRight'); ok(c.ballast === 1, 'and RIGHT turns it up');
  G.press('ArrowLeft', 'ArrowLeft', 'ArrowLeft'); ok(c.ballast === -1, 'the dial stops at what is owned (minus one)');
  G.press('Enter'); ok(G.screens.screen.state().mode === null, 'ENTER closes it');
  /* the looks */
  steer(G, { row: 2, col: 0 }, DEPOT); G.frame(1 / 60, 5);
  G.press('Enter'); G.press('ArrowRight'); G.press('KeyB'); ok(c.own.look.paint.red === 1 && c.look.paint === 'cyan', 'on a look, B buys it but does not wear it');
  G.press('Enter'); ok(c.look.paint === 'red', 'and ENTER wears it');
  const saves = G.saved.length; G.press('Escape'); ok(G.screens.name === 'title' && saves >= 3, 'the depot saved the career as it went (' + saves + ' saves) and ESC leaves it');
}
/* ---- the garage ---- */
{
  const c = C.fresh(); c.cars.postie = 1; const G = rig(c); G.go('garage'); G.frame(1 / 60, 4);
  ok(clean(G), 'the garage draws');
  G.press('ArrowDown'); G.press('Enter'); ok(G.screens.name === 'garage' && c.car === 'courier', 'a car that is not won cannot be taken out');
  G.go('garage'); for (let i = 0; i < 4; i++) G.press('ArrowDown'); G.frame(1 / 60, 3); G.press('Enter');
  ok(c.car === 'postie' && G.screens.name === 'title', 'a car that is won can: ENTER takes the postie out and goes back to the title');
}
/* ---- a single race ---- */
{
  const G = rig(); G.go('single'); G.frame(1 / 60, 3);
  ok(clean(G), 'the single race screen draws');
  G.press('ArrowDown', 'ArrowDown'); G.press('ArrowLeft'); G.press('ArrowDown'); G.press('ArrowLeft', 'ArrowLeft');
  G.press('ArrowDown', 'ArrowDown'); G.press('Enter');
  ok(G.screens.name === 'race' && G.live.s.laps === 2 && G.live.s.n === 6 && G.live.race.field.length === 6, 'the rows are changed with LEFT and RIGHT and START starts what they say (two laps, six cars)');
}
/* ---- a race to its end, the board after it, the next race ---- */
{
  const c = C.fresh(); const G = rig(c); G.go('cups'); G.press('Enter');
  const drive = () => { const L = G.live, f = L.human; if (!drive.d || drive.race !== L.race) { drive.race = L.race; drive.d = createDriver(L.s.track, f.spec, HUMAN, 5); } const o = drive.d.drive(f.car, f.near, [], 1 / 60); return o; };
  G.input.drive = drive;
  let frames = 0; while (G.screens.name === 'race' && frames++ < 60 * 400) G.frame(1 / 60, 1);
  ok(G.screens.name === 'finish', 'a race driven to its end leads to the board after it (after ' + (frames / 60).toFixed(0) + ' s)');
  G.frame(1 / 60, 40);
  ok(clean(G) && c.stats.races === 1 && c.tips > 0 && c.run && c.run.race === 1 && G.saved.length >= 2, 'it was paid (' + c.tips + ' TIPS), counted, the cup moved on to its second race, and the career saved');
  G.press('Enter'); ok(G.screens.name === 'finish', 'ENTER on the results goes to the cup\'s points');
  G.frame(1 / 60, 4); G.press('Enter'); ok(G.screens.name === 'race' && G.live.s.cup.index === 1, 'and ENTER on the points starts the second race');
  for (let i = 0; i < 3; i++) {
    drive.d = null; frames = 0; while (G.screens.name === 'race' && frames++ < 60 * 400) G.frame(1 / 60, 1);
    G.frame(1 / 60, 40); if (G.screens.name !== 'finish') break;
    G.press('Enter'); G.frame(1 / 60, 40); G.press('Enter'); G.frame(1 / 60, 3);
  }
  ok(G.screens.name === 'cups' && c.run === null && c.stats.races === 4 && c.cups.rookie.runs === 1 && (c.cups.rookie.passed === 1 || c.cups.rookie.tries === 2), 'after the fourth race the cup is over and you are back at the cups: ' + (c.cups.rookie.passed ? 'passed' : 'missed, ' + c.cups.rookie.tries + ' tries left'));
}
S.done();
