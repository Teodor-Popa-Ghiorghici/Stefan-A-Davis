/* TRACK MAKER SCREEN CHECK (dev-only, pure Node): the maker walked with real key presses against a disk in a table. A ring painted with the pen, a jump placed and a place refused, a tile taken out and the problem named at it,
 * SAVE (the name box, the file, the road registered and offered by the menus, the replace guard), NEW and OPEN, ESC with something unsaved, TEST DRIVE to the end of a race on a road of your own (nothing paid, nothing
 * in the career, no trophy told, back in the maker with the road as it was), a SINGLE RACE and a TIME TRIAL on it (a best lap and a ghost kept apart from the career), and that the town's lists never hold it.
 *   node apps/vroom/maker_screen_check.js */
import { suite } from './check_kit.js';
import { rig } from './screens_check_kit.js';
import { createDriver } from './ai.js';
import { HUMAN } from './ai_profiles.js';
import { PAL } from './palette.js';
import { TRACK_IDS, allTracks, hasTrack, trackFor, defFor, isUserId, userIds } from './tracks.js';
import { DIR } from './maker_io.js';
import { openRoads } from './open_roads.js';

const S = suite('maker_screen_check'), { ok } = S;
const clean = G => { const b = G.R.buf; for (let i = 0; i < b.length; i++) if (b[i] >= PAL.length) return false; return true; };
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0)); };
const G = rig(), career0 = JSON.stringify(G.career);
const keys = (...ms) => { for (const [k, n] of ms) for (let i = 0; i < (n || 1); i++) G.press(k); };
const st = () => G.screens.screen.state().S;
const driverFor = () => { const s = {}; return () => { const L = G.live, f = L.human; if (s.race !== L.race) { s.race = L.race; s.d = createDriver(L.s.track, f.spec, HUMAN, 5); } return s.d.drive(f.car, f.near, [], 1 / 60); }; };
const runOut = max => { let n = 0; while (G.screens.name === 'race' && n++ < 60 * (max || 600)) G.frame(1 / 60, 1); return n; };
const calls = { begin: 0, step: 0, end: 0 };
for (const k of Object.keys(calls)) { const f = G.trophy[k]; G.trophy[k] = (...a) => { calls[k]++; return f.apply(G.trophy, a); }; }
const msgOf = () => (G.t - st().msgT < 3 ? st().msg : '');

G.go('title', { sel: 7 }); G.press('Enter'); G.frame(1 / 60, 2);
ok(G.screens.name === 'maker' && clean(G) && st().focus === 'grid' && st().tool === 'road', 'TRACK MAKER is the eighth row of the title, and it draws');
ok(!st().an.ok && st().an.problems[0].text === 'PAINT SOME ROAD', 'with nothing painted it says so');

/* ---- a ring, painted with the pen: ENTER puts it down, the road follows the cursor, ENTER lifts it ---- */
keys(['ArrowLeft', 3], ['ArrowUp', 2]);
ok(st().cx === 2 && st().cy === 1, 'the cursor moves over the grid with the arrows (to 2,1)');
G.press('Enter'); keys(['ArrowRight', 6], ['ArrowDown', 4], ['ArrowLeft', 6], ['ArrowUp', 4]); G.press('Enter');
ok(st().pen === null && Object.keys(st().t.road).length === 20 && st().an.ok && st().an.info.cells === 20, 'a lap of the pen is a ring of twenty tiles, and the pen is lifted by ENTER (' + Object.keys(st().t.road).length + ')');
ok(st().an.info.length > 250 && st().an.info.length < 520, 'and it is a road of a sensible length (' + st().an.info.length.toFixed(0) + ' m)');
G.frame(1 / 60, 2); ok(clean(G), 'the ring draws with nothing but palette bytes');
keys(['ArrowUp', 1]); ok(st().cy === 0, 'the cursor stops at the edge of the grid');

/* ---- a jump, a place refused, a tile taken out and the problem named ---- */
keys(['ArrowDown', 1], ['ArrowRight', 3], ['Digit2', 1]); G.press('Enter');
ok(st().tool === 'jump' && st().t.mods['5,1'] === 'jump' && st().an.ok, '2 is the jump: ENTER stands one on a straight tile (5,1) and the road is still a road');
keys(['ArrowDown', 1]); G.press('Enter');
ok(!st().t.mods['5,2'] && /PAINT ROAD THERE FIRST/.test(msgOf()), 'a module on a tile with no road is refused, with the reason');
keys(['ArrowUp', 1], ['Digit9', 1], ['ArrowRight', 1]); G.press('Enter');
ok(!st().t.road['6,1'] && !st().an.ok && st().an.problems.length === 2 && st().an.problems.every(p => p.text === 'A DEAD END' && p.at), 'the eraser takes a tile out of the ring: two dead ends, each at its tile');
G.frame(1 / 60, 2); ok(clean(G), 'and the picture, with the red boxes, is still the palette');
keys(['Digit1', 1]); G.press('Enter'); G.press('Enter');
ok(st().t.road['6,1'] && st().an.ok && st().pen === null, 'the road tool puts it back, and the ring is whole');
keys(['ArrowLeft', 1], ['Digit2', 1]); G.press('Enter');
ok(st().cx === 5 && !st().t.mods['5,1'], 'the same module on the same tile again takes it off');
G.press('Enter'); ok(st().t.mods['5,1'] === 'jump' && st().an.ok, 'and ENTER again puts it back');

/* ---- SAVE: the name box, the file, the road offered by the menus ---- */
const R = { theme: 9, laps: 10, name: 11, save: 12, open: 13, new: 14, test: 15, back: 16 };
const panelRow = n => { if (st().focus !== 'panel') G.press('Tab'); let g = 0; while (st().row !== n && g++ < 20) G.press(st().row < n ? 'ArrowDown' : 'ArrowUp'); };
const gridAt = (x, y) => { if (st().focus !== 'grid') G.press('Tab'); st().cx = x; st().cy = y; };
const ring = () => { gridAt(2, 1); G.press('Digit1'); G.press('Enter'); keys(['ArrowRight', 6], ['ArrowDown', 4], ['ArrowLeft', 6], ['ArrowUp', 4]); G.press('Enter'); };
G.press('Tab'); ok(st().focus === 'panel', 'TAB goes to the menu on the right');
panelRow(R.save); G.press('Enter');
ok(G.asked && G.asked.title === 'NAME YOUR ROAD', 'SAVE on a road with no name asks for one');
G.asked.cb('loop de loop'); await tick();
const path = DIR + '/LOOP_DE_LOOP.TRK', fs = G.ctx.fs;
ok(fs.files.has(path) && /^VROOM ROAD 1\nNAME LOOP DE LOOP\n/.test(fs.files.get(path).content) && /\nJUMP 5,1\n/.test(fs.files.get(path).content), 'it is kept as ::/Home/Vroom/LOOP_DE_LOOP.TRK, as text');
ok(G.userRoads.some(r => r.id === 'user:LOOP_DE_LOOP' && r.name === 'LOOP DE LOOP') && hasTrack('user:LOOP_DE_LOOP') && !st().dirty && /SAVED/.test(msgOf()), 'and from then on it is a road the menus offer, the screen says it is saved, and it is no longer unsaved');
ok(!TRACK_IDS.includes('user:LOOP_DE_LOOP') && allTracks().every(([id]) => !isUserId(id)) && userIds().includes('user:LOOP_DE_LOOP'), 'the town\'s lists (the cups, the trophies, the checks) never hold it');
G.asked = null; panelRow(R.save); G.press('Enter'); await tick();
ok(G.asked === null && /SAVED/.test(msgOf()), 'saving again goes quietly over the same file (no name box)');
/* the replace guard: a different road with the same name asks to be said twice */
panelRow(R.new); G.press('Enter');
ok(Object.keys(st().t.road).length === 0 && st().file === null, 'NEW ROAD is a blank sheet');
panelRow(R.name); G.press('Enter'); G.asked.cb('Loop de Loop');
ok(st().t.name === 'LOOP DE LOOP', 'NAME takes the words typed, as capitals');
gridAt(3, 3); G.press('Digit1'); G.press('Enter'); keys(['ArrowRight', 3], ['ArrowDown', 2], ['ArrowLeft', 3], ['ArrowUp', 2]); G.press('Enter');
ok(st().an.ok && Object.keys(st().t.road).length === 10, 'a smaller ring of ten');
panelRow(R.save); G.press('Enter'); await tick();
ok(/IS THERE/.test(msgOf()) && /\nJUMP 5,1\n/.test(fs.files.get(path).content), 'a name that is another road\'s file is not written over at the first SAVE');
G.press('Enter'); await tick();
ok(!/\nJUMP 5,1\n/.test(fs.files.get(path).content) && /SAVED/.test(msgOf()), 'and is at the second');
/* OPEN gives the road back */
panelRow(R.new); G.press('Enter');
ok(Object.keys(st().t.road).length === 0, 'NEW again: blank');
panelRow(R.open); G.press('Enter');
ok(st().t.name === 'LOOP DE LOOP' && Object.keys(st().t.road).length === 10 && st().file === 'LOOP_DE_LOOP.TRK' && st().focus === 'grid', 'OPEN reads a saved road back into the maker');

/* ---- ESC with something unsaved ---- */
G.press('Digit9'); gridAt(3, 3); G.press('Enter');
ok(st().dirty, 'an edit makes the road unsaved');
G.press('Escape'); ok(G.screens.name === 'maker' && /NOT SAVED/.test(msgOf()), 'the first ESC on an unsaved road only warns');
G.press('Escape'); ok(G.screens.name === 'title', 'the second leaves');

/* ---- a better road to drive: the whole 20-tile ring again, saved ---- */
G.go('maker'); panelRow(R.new); G.press('Enter');
panelRow(R.name); G.press('Enter'); G.asked.cb('Ring Road');
ring();
panelRow(R.theme); keys(['ArrowRight', 4]);
ok(st().t.theme === 'snow', 'LEFT and RIGHT on THEME go through the themes (snow after four)');
gridAt(5, 1); G.press('Digit2'); G.press('Enter'); gridAt(8, 3); G.press('Digit3'); G.press('Enter'); gridAt(2, 3); G.press('Digit5'); G.press('Enter'); gridAt(5, 5); G.press('Digit4'); G.press('Enter');
ok(Object.values(st().t.mods).sort().join() === 'belt,counter,jump,pinch' && st().an.ok, 'a jump, a belt, a counter and a pinch (digits 2, 3, 5, 4) and the road is still a road');
panelRow(R.save); G.press('Enter'); await tick();
ok(fs.files.has(DIR + '/RING_ROAD.TRK') && G.userRoads.some(r => r.id === 'user:RING_ROAD'), 'a second road is saved: ::/Home/Vroom/RING_ROAD.TRK');
ok(JSON.stringify(G.career) === career0, 'nothing of all this is in the career');

/* ---- TEST DRIVE ---- */
const tips0 = G.career.tips; calls.begin = calls.step = calls.end = 0;
panelRow(R.test); G.press('Enter');
ok(G.screens.name === 'race' && G.live.s.kind === 'single' && G.live.s.trackId === 'user:RING_ROAD' && G.live.s.track.def.user && G.live.s.laps === 3 && G.live.race.field.length === 4, 'TEST DRIVE races it: a single race of four on the road, three laps');
ok(G.live.race.field.every(f => f.entry.parts.snowTyres), 'on a road of snow every car wears snow tyres: it is raced in what it needs');
G.frame(1 / 60, 30); ok(clean(G), 'the race draws');
G.input.drive = driverFor(); const n = runOut(900);
ok(G.screens.name === 'finish' && n < 60 * 900, 'the race runs to the board (' + (n / 60).toFixed(0) + ' s)');
G.frame(1 / 60, 40); ok(clean(G), 'the board draws');
ok(G.career.tips === tips0 && JSON.stringify(G.career) === career0, 'nothing was paid and the career is exactly what it was');
ok(calls.begin === 0 && calls.step === 0 && calls.end === 0, 'and the trophies were not told a thing');
G.press('Enter'); G.frame(1 / 60, 40); G.press('Enter');
ok(G.screens.name === 'maker' && st().t.name === 'RING ROAD' && st().an.ok, 'ENTER goes back to the maker, with the road as it was');

/* ---- the menus offer it ---- */
G.go('single'); await tick(); G.frame(1 / 60, 2);
ok(clean(G) && G.userRoads.length === 2 && G.userRoads.map(r => r.name).join() === 'LOOP DE LOOP,RING ROAD', 'a single race is offered the town\'s first road and then the two of your own (' + G.userRoads.map(r => r.name).join(', ') + ')');
const idx = openRoads(G.career, G.userRoads).indexOf('user:RING_ROAD');
ok(idx >= 1 && openRoads(G.career, G.userRoads).slice(idx - 1).join() === 'user:LOOP_DE_LOOP,user:RING_ROAD', 'the list is the roads of the open cups and then yours, last (' + openRoads(G.career, G.userRoads).length + ' in all)');
keys(['ArrowRight', idx], ['ArrowDown', 5]); G.press('Enter');
ok(G.screens.name === 'race' && G.live.s.kind === 'single' && G.live.s.trackId === 'user:RING_ROAD' && G.live.race.field.length === 8, 'and starts a single race on the last of them, eight cars');
G.frame(1 / 60, 20); G.go('title');
G.go('modes', { mode: 'tt' }); await tick(); G.frame(1 / 60, 2);
keys(['ArrowRight', idx]);
ok(G.screens.name === 'modes' && G.screens.screen.state().S.track === idx && clean(G), 'the time trial menu has them too');
keys(['ArrowDown', 3]); G.press('Enter'); await tick(); G.frame(1 / 60, 2);
const kind = G.screens.name === 'race' ? G.live.s : null;
ok(kind && kind.kind === 'tt' && kind.trackId === 'user:RING_ROAD' && G.live.race.field.length === 1, 'START begins a time trial on a road of your own, one car');
G.input.drive = driverFor(); runOut(900);
const id = kind.trackId;
ok(G.screens.name === 'finish' && G.userBest[id] && G.userBest[id].lap > 3 && G.ghosts[id + ':f'] && G.ghosts[id + ':f'].text, 'its best lap is kept (' + (G.userBest[id] && G.userBest[id].lap.toFixed(2)) + ' s) and so is the ghost, apart from the career');
ok(JSON.stringify(G.career) === career0 && !Object.keys(G.career.tt).length, 'the career has no time trial in it');

/* ---- a registered road is a track like any other, and is let go when its file is ---- */
const T1 = trackFor('user:RING_ROAD', 'f'), T2 = trackFor('user:RING_ROAD', 'f');
ok(T1 === T2 && T1.def.user === true && defFor('user:RING_ROAD', 'f').name === 'RING ROAD' && T1.features.jumps.length === 1 && T1.features.belts.length === 1, 'trackFor builds it once and keeps it');
fs.files.delete(DIR + '/RING_ROAD.TRK'); await G.refreshRoads();
ok(!hasTrack('user:RING_ROAD') && !G.userRoads.some(r => r.id === 'user:RING_ROAD'), 'a road whose file is gone is gone from the game');
S.done();
