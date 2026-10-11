#!/usr/bin/env node
/* Dev tool, not a check: draw VROOM's menu screens (title, cups, garage, depot, single race, the board after a race) with the real code in Node and write PNGs, so a person can LOOK at them.
     node scripts/vroom_screens.mjs <outdir> [scale]       */
import { saveShot } from './vroom_shots.mjs';
const dir = process.argv[2] || 'vroom-screens', scale = +process.argv[3] || 3;
const { rig } = await import('../apps/vroom/screens_check_kit.js'), C = await import('../apps/vroom/career.js'), U = await import('../apps/vroom/cups.js');
const G = rig(), shot = n => saveShot(dir, n, G.R, scale);
G.career.tips = 1500;
G.go('title'); G.frame(1 / 60, 3); shot('title');
G.go('cups'); G.frame(1 / 60, 3); shot('cups');
G.career.cars.milkfloat = 1; G.career.cars.hornet = 1;
G.go('garage'); G.press('ArrowDown', 'ArrowDown'); G.frame(1 / 60, 2); shot('garage'); G.press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'); G.frame(1 / 60, 2); shot('garage_locked');
G.go('depot'); G.frame(1 / 60, 30); shot('depot_route'); G.press('ArrowDown'); G.frame(1 / 60, 40); shot('depot_tuning'); G.press('ArrowDown'); G.press('Enter'); G.frame(1 / 60, 30); shot('depot_looks');
G.go('single'); G.frame(1 / 60, 3); shot('single');
C.beginCup(G.career, 'rookie', 5);
G.go('race', { ev: { kind: 'cup' } }); G.input.hold('KeyW', true); G.frame(1 / 60, 60 * 8); shot('race');
/* a race driven to its end by a CPU driver, and the boards after it */
const { createDriver } = await import('../apps/vroom/ai.js'), { HUMAN } = await import('../apps/vroom/ai_profiles.js');
let d = null, rc = null;
G.input.drive = () => { const L = G.live; if (!d || rc !== L.race) { rc = L.race; d = createDriver(L.s.track, L.human.spec, HUMAN, 5); } return d.drive(L.human.car, L.human.near, [], 1 / 60); };
for (let i = 0; i < 60 * 300 && G.screens.name === 'race'; i++) G.frame(1 / 60, 1);
G.frame(1 / 60, 40); shot('finish_results'); G.press('Enter'); G.frame(1 / 60, 5); shot('finish_cup');
console.log('wrote shots to ' + dir);
void U;
