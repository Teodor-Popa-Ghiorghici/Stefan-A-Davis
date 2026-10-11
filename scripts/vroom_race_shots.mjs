#!/usr/bin/env node
/* Dev tool, not a check: run VROOM's race with the real code (the race, the CPU drivers, the chase camera, the scene, the HUD) in Node and write PNGs of chosen moments, so a person can LOOK at the game.
     node scripts/vroom_race_shots.mjs <outdir> [track] [seconds,seconds,...] [scale]
   The human car is driven by a CPU driver here (a clone of the one the rivals use) so the camera has somewhere to go. */
import { saveShot } from './vroom_shots.mjs';
const dir = process.argv[2] || 'vroom-race', id = process.argv[3] || 'sorting', times = (process.argv[4] || '0,3.5,8,15,30').split(',').map(Number), scale = +process.argv[5] || 3;
const { createRaster } = await import('../apps/vroom/raster.js'), { buildTrack } = await import('../apps/vroom/track_build.js'), { TRACKS } = await import('../apps/vroom/track_def.js');
const { createRace } = await import('../apps/vroom/race.js'), { carModel } = await import('../apps/vroom/car_art.js'), { fieldFor } = await import('../apps/vroom/rivals.js'), { PLAYER, liveryFor } = await import('../apps/vroom/livery.js');
const { createCamera } = await import('../apps/vroom/camera.js'), { drawView } = await import('../apps/vroom/scene.js'), { drawHud, drawResults } = await import('../apps/vroom/hud.js');
const { createDriver } = await import('../apps/vroom/ai.js'), { TIERS } = await import('../apps/vroom/ai_profiles.js');
const T = buildTrack(TRACKS[id]), R = createRaster();
const entries = fieldFor(0, 7, 5).concat([{ id: 'you', name: 'YOU', car: 'courier', human: true, tier: 0, paint: PLAYER.paint, livery: liveryFor(PLAYER), num: PLAYER.num }]);
const race = createRace({ track: T, entries, laps: T.laps, seed: 5 }), me = race.field[7], drv = createDriver(T, me.spec, TIERS[0], 99), cam = createCamera();
race.field.forEach(f => { f.model = carModel(f.entry.car, f.entry.paint, f.entry.livery); });
const full = { x: 0, y: 0, w: 320, h: 180 }, want = times.slice().sort((a, b) => a - b);
let k = 0;
for (let i = 0; i < 60 * 400 && k < want.length; i++) {
  const t = race.t;
  race.step(drv.drive(me.car, me.near, [], 1 / 60));
  const spec = cam.update(me.car, 1 / 60, T.col);
  if (race.t >= want[k] - 1e-6 || (want[k] < -3 && i === 0)) {
    drawView(R, full, T, race.field, spec, { pickups: { P: race.pickups, t: race.t } }); drawHud(R, race, me, {}); if (race.state === 'done') drawResults(R, race, {});
    saveShot(dir, 't' + String(want[k]).replace('.', '_').replace('-', 'm'), R, scale); k++;
  }
  void t;
}
console.log('wrote ' + k + ' shots to ' + dir + ' (' + T.name + ')');
