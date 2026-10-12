/* VROOM props check -- `node apps/vroom/props_check.js`: the pictures a mastered VROOM leaves on the desktop (props.js) are drawn by the real renderer and the real cars, in Node, through a stand-in canvas.
   Every car twice and the twelve liveries are listed, each name is a file name and none is used twice, every picture has something in it, no two cars look alike from the side, and the player's livery is not a
   rival's. (The shell run, `npm run check:props`, makes the folder for real.) */
import { props, FOLDER, NAME } from './props.js';
import { CAR_IDS } from './cars.js';
import { RIVALS } from './rivals.js';
import { suite } from './check_kit.js';

const S = suite('props_check');
const list = await props();
const pics = list.filter(p => p.draw), docs = list.filter(p => p.text != null);
S.ok(FOLDER === 'VroomProps' && NAME === 'VROOM.EXE', 'the folder is VroomProps, of VROOM.EXE');
S.ok(pics.length === CAR_IDS.length * 2 + RIVALS.length + 1 && docs.length === 1, 'two pictures of each of the ' + CAR_IDS.length + ' cars, a livery for each of the ' + RIVALS.length + ' rivals, the player\'s, and a README', pics.length + ' pictures');
S.ok(new Set(list.map(p => p.name)).size === list.length && list.every(p => /^[A-Z0-9_.]+$/.test(p.name)), 'every file has a name of capitals, digits and underscores, and none is used twice');
const hash = d => { let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h ^= d[i] | (d[i + 1] << 8) | (d[i + 2] << 16); h = Math.imul(h, 16777619) >>> 0; } return h; };
const seen = new Map();
for (const p of pics) {
  let img = null;
  const g = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData: i => { img = i; } };
  p.draw(g);
  const d = img && img.data;
  let lit = 0; if (d) for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
  S.ok(d && img.width === 320 && img.height === 180 && lit > 6000 && p.k === 3, p.name + ': a 320 x 180 picture with something in it, enlarged three times', 'lit ' + lit);
  seen.set(p.name, hash(d));
}
const sides = pics.filter(p => /_SIDE$/.test(p.name)).map(p => seen.get(p.name));
S.ok(new Set(sides).size === sides.length, 'no two cars look the same from the side');
const liv = pics.filter(p => /^LIVERY_/.test(p.name)).map(p => seen.get(p.name));
S.ok(new Set(liv).size === liv.length, 'and no two liveries are the same picture (the player\'s is not a rival\'s)');
S.done(pics.length + ' pictures');
