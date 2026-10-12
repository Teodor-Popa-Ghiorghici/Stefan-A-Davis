/* VROOM.EXE's props: the pictures the game is made of, as files, for the folder a mastered game leaves on the desktop (kernel/trophy_props.js; apps/prop_kit.js is how). Every car of the roster stands in the
   sorting room's light twice, once from the side and once three quarters from behind (the way the chase camera sees it), in the paint it was built with; the eleven rivals' liveries are on the KEI COURIER;
   the player's own is the last. They are the game's own frames, 320 x 180 in the sixteen-by-eight ramps of its palette, enlarged three times. A prop is drawn by the real renderer (raster.js) and the real car
   (car_art.js): nothing is a second drawing of anything. */
import { prop, doc } from '../prop_kit.js';
import { createRaster, W, H } from './raster.js';
import { drawShowroom } from './showroom.js';
import { trackFor } from './tracks.js';
import { CAR_IDS, CARS } from './cars.js';
import { RIVALS } from './rivals.js';
import { liveryFor, liveryOf, PLAYER } from './livery.js';

export const NAME = 'VROOM.EXE';
export const FOLDER = 'VroomProps';
const AT = 14, TURN = 0.12 * Math.PI;                          /* where on the start straight the car stands (showroom.js) and how far the car is turned from the road */
const fname = s => String(s).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

/* the camera angle of the showroom (a = t * 0.18 + 0.4) that looks at the car from its side (+ half a turn) or from behind and above to the side: t for a car turned `yaw` from the road */
const tFor = (yaw, off) => (yaw + off - 0.4) / 0.18;

export async function props() {
  const T = trackFor('sorting', 'f'), R = createRaster(), p = T.line.at(T.startS + AT), yaw = p.yaw + TURN;
  const shot = (g, o) => {
    drawShowroom(R, Object.assign({ track: T, at: AT, spin: false, zoom: 1.15 }, o));
    const img = g.createImageData(W, H);
    R.present(img); g.putImageData(img, 0, 0);
  };
  const L = [];
  for (const id of CAR_IDS) {
    const c = CARS[id], base = { car: id, rating: c.rating, paint: undefined, livery: undefined, num: undefined };
    L.push(prop('CAR_' + fname(c.name) + '_SIDE', W, H, g => shot(g, Object.assign({}, base, { t: tFor(yaw, Math.PI / 2) })), 3));
    L.push(prop('CAR_' + fname(c.name) + '_REAR', W, H, g => shot(g, Object.assign({}, base, { t: tFor(yaw, Math.PI + 0.7) })), 3));
  }
  for (const r of RIVALS) {
    const lv = liveryFor(r);
    L.push(prop('LIVERY_' + fname(r.name) + '_' + r.num, W, H, g => shot(g, { car: 'courier', rating: 0, paint: r.paint, livery: lv, num: r.num, t: tFor(yaw, Math.PI / 2), zoom: 1.4 }), 3));
  }
  const mine = liveryOf(PLAYER);
  L.push(prop('LIVERY_YOU_01', W, H, g => shot(g, { car: 'courier', rating: 0, paint: PLAYER.paint, livery: mine, num: PLAYER.num, t: tFor(yaw, Math.PI / 2), zoom: 1.4 }), 3));
  L.push(doc('README.TXT', 'VROOM.EXE: THE PROPS\n\nEvery car of the roster, from the side and from behind, in the sorting room; the eleven rivals\' liveries on the KEI COURIER; yours.\nThey are the game\'s own frames, 320 x 180, enlarged three times. You earned every trophy VROOM has.\n'));
  return L;
}
