/* THE 24 CARS AS A TABLE (docs/vroom/plan.md section 5): five ratings of four, and four specials. A row is what a car IS:
     num   the few numbers `chassis()` (sim_spec.js) works a whole car out from -- mass in kg, size in metres, where its weight sits (comY high is a car that rolls, comZ behind the axles is one that wheelies),
           its top speed (m/s) and the time its engine takes to get to 95 % of it, which wheels are driven, the grip of its tyres (gripLat, held to the rating's GRIP_MAX) and whether its tail steps out first
           (latBias below 1), and the odd extra: `wheels: 3` is a trike, `ice` the grip a sled's runners have on ice, `steer` the lock of a bus
     noRival  a car the CPU is not given to: it is hard on a driver who is not a person (a trike that comes down off the jump on its tail, a open-wheeler that touches a wall at its first bend), and a field with
            one of them in it is a field with a gift in it. The player may drive them, and they are the more fun for it.
   look  what it is drawn as (car_shells_*.js): the shell, its paint and its second colour, and the extras. `wheel` is the tyre: { w: width, kind }. `engine` is how it sounds.
   A rating's four are a heavy one, a light one, a grippy one and a drifty one, and none is the best of its four at more than two of speed, acceleration, grip and weight: cars_check.js holds both, and that every
   top speed is within a tenth of the rating's cap. Nothing in here may pass the rating's envelope (tune.js): `numbersFor` clamps it again whatever is written. Pure data. */
import { ix, CYAN, RED, BROWN, GREEN, BLUE, MAGENTA, GREY, COOL } from './palette.js';

const t = (ramp, level) => ix(ramp, level);
export const ROWS = {
  /* ---- ROOKIE ---- */
  courier: {
    name: 'KEI COURIER', rating: 0, blurb: 'a kei pickup with a parcel in the bed. it is fine.',
    num: { mass: 1.5, length: 0.42, width: 0.22, height: 0.10, comY: 0.058, comZ: 0, vtop: 13, accel: 2.4, drive: 'fwd' },
    look: { shell: 'pickup', paint: t(CYAN, 8), trim: t(GREY, 14), extra: ['parcel', 'bobble'], engine: 'electric' }
  },
  milkfloat: {
    name: 'MILK FLOAT', rating: 0, blurb: 'tall, slow, and heavy enough to shove.',
    num: { mass: 2.1, length: 0.4, width: 0.2, height: 0.19, comY: 0.066, comZ: 0.0, vtop: 12.9, accel: 2.1, drive: 'fwd', gripLat: 1.0 },
    look: { shell: 'box', paint: t(GREY, 14), trim: t(BLUE, 8), extra: ['crates'], engine: 'electric' }
  },
  snowbug: {
    name: 'SNOWBUG', rating: 0, blurb: 'a tiny bubble car. it will not forgive a kerb.',
    num: { mass: 1.15, length: 0.34, width: 0.20, height: 0.115, comY: 0.062, comZ: -0.01, vtop: 12.6, accel: 2.1, drive: 'rwd', latBias: 1.04, gripLat: 0.96 },
    look: { shell: 'bubble', paint: t(RED, 8), trim: t(GREY, 15), extra: [], engine: 'electric' }
  },
  paperboy: {
    name: 'PAPERBOY', rating: 0, noRival: true, blurb: 'three wheels and a sack of papers. the back end has opinions.',
    num: { mass: 1.2, length: 0.38, width: 0.22, height: 0.12, comY: 0.048, comZ: -0.03, vtop: 13, accel: 1.95, drive: 'rwd', latBias: 0.96, gripLat: 0.91, wheels: 3, track: 0.2, wheelbase: 0.26 },
    look: { shell: 'trike', paint: t(BROWN, 12), trim: t(GREEN, 8), extra: ['sack'], engine: 'electric', wheel: { w: 0.034 } }
  },
  /* ---- AMATEUR ---- */
  postie: {
    name: 'POSTIE', rating: 1, blurb: 'the mail van. a lot of roof, and a lot of grip for it.',
    num: { mass: 1.9, length: 0.5, width: 0.23, height: 0.145, comY: 0.07, comZ: 0, vtop: 13.6, accel: 2.7, drive: 'fwd', gripLat: 1.05 },
    look: { shell: 'van', paint: t(RED, 9), trim: t(BROWN, 13), extra: ['beacon'], engine: 'electric' }
  },
  tunatruck: {
    name: 'TUNA TRUCK', rating: 1, blurb: 'a box of fish on rear drive. you will feel it in the corners.',
    num: { mass: 2.5, length: 0.52, width: 0.25, height: 0.18, comY: 0.08, comZ: -0.02, vtop: 13.6, accel: 2.3, drive: 'rwd', gripLat: 1.03, latBias: 1.1, radius: 0.045 },
    look: { shell: 'fishbox', paint: t(BLUE, 8), trim: t(GREY, 14), extra: ['fin'], engine: 'glow', wheel: { w: 0.04 } }
  },
  ploughboy: {
    name: 'PLOUGHBOY', rating: 1, blurb: 'a blade on the front. it does not go round you.',
    num: { mass: 2.2, length: 0.48, width: 0.24, height: 0.12, comY: 0.07, comZ: 0.02, vtop: 13.0, accel: 2.6, drive: 'awd', gripLat: 1.0 },
    look: { shell: 'plough', paint: t(BROWN, 13), trim: t(GREY, 3), extra: ['beacon'], engine: 'glow' }
  },
  tofu: {
    name: 'TOFU', rating: 1, blurb: 'a light coupe with the engine in the wrong place. drifty.',
    num: { mass: 1.25, length: 0.46, width: 0.19, height: 0.08, comY: 0.047, comZ: -0.012, vtop: 14.2, accel: 1.9, drive: 'rwd', latBias: 0.96, gripLat: 0.92 },
    look: { shell: 'wedge', paint: t(GREY, 15), trim: t(RED, 7), extra: ['spoiler'], engine: 'electric' }
  },
  /* ---- ADVANCED ---- */
  damrunner: {
    name: 'DAM RUNNER', rating: 2, blurb: 'a lifted four by four. it goes where the others do not.',
    num: { mass: 2.0, length: 0.44, width: 0.24, height: 0.13, comY: 0.092, comZ: 0, vtop: 14.2, accel: 2.2, drive: 'awd', gripLat: 1.1, radius: 0.055, clearance: 0.055, travel: 0.065, rest: 0.07 },
    look: { shell: 'truck4', paint: t(BROWN, 9), trim: t(GREY, 3), extra: ['bullbar', 'rack'], engine: 'glow', wheel: { w: 0.05, kind: 'knob' } }
  },
  noodlebar: {
    name: 'NOODLE BAR', rating: 2, blurb: 'a food van that is mostly kitchen. heavy, and warm inside.',
    num: { mass: 2.4, length: 0.48, width: 0.28, height: 0.17, comY: 0.082, comZ: -0.01, vtop: 14.2, accel: 2.3, drive: 'rwd', gripLat: 0.98, latBias: 1.1 },
    look: { shell: 'foodvan', paint: t(RED, 7), trim: t(GREY, 15), extra: ['sign'], engine: 'glow' }
  },
  rattler: {
    name: 'RATTLER', rating: 2, blurb: 'a buggy on long springs. it lands everything.',
    num: { mass: 1.5, length: 0.4, width: 0.17, height: 0.09, comY: 0.062, comZ: -0.02, vtop: 15.0, accel: 1.7, drive: 'rwd', gripLat: 1.0, latBias: 1.06, radius: 0.05, track: 0.22, travel: 0.07, rest: 0.075, clearance: 0.04 },
    look: { shell: 'buggy', paint: t(GREEN, 9), trim: t(BROWN, 13), extra: ['cage'], engine: 'glow', wheel: { w: 0.048, kind: 'knob' } }
  },
  sled: {
    name: 'SLED', rating: 2, blurb: 'a wedge on skis. at home on ice, and nowhere else.',
    num: { mass: 1.3, length: 0.42, width: 0.2, height: 0.07, comY: 0.04, comZ: -0.02, vtop: 14.5, accel: 1.8, drive: 'rwd', latBias: 0.98, gripLat: 0.95, ice: 0.42 },
    look: { shell: 'sled', paint: t(CYAN, 11), trim: t(GREY, 14), extra: [], engine: 'electric', ski: true }
  },
  /* ---- SEMI-PRO ---- */
  freezer: {
    name: 'FREEZER', rating: 3, blurb: 'a refrigerated truck. the heaviest thing on the grid.',
    num: { mass: 3.0, length: 0.62, width: 0.25, height: 0.2, comY: 0.095, comZ: -0.03, vtop: 16.0, accel: 2.4, drive: 'rwd', gripLat: 0.98, latBias: 1.1, radius: 0.05 },
    look: { shell: 'reefer', paint: t(GREY, 15), trim: t(BLUE, 9), extra: ['stack'], engine: 'glow', wheel: { w: 0.044 } }
  },
  minx: {
    name: 'MINX', rating: 3, blurb: 'a rally hatch on four driven wheels. it stops being polite at 100 kph.',
    num: { mass: 1.7, length: 0.36, width: 0.25, height: 0.09, comY: 0.052, comZ: 0.0, vtop: 16.0, accel: 1.6, drive: 'awd', gripLat: 1.15, radius: 0.045 },
    look: { shell: 'hatch', paint: t(BLUE, 9), trim: t(BROWN, 14), extra: ['wing', 'lamps'], engine: 'electric' }
  },
  logger: {
    name: 'LOGGER', rating: 3, blurb: 'a crane truck. everything about the centre of it is too high.',
    num: { mass: 2.6, length: 0.54, width: 0.26, height: 0.14, comY: 0.1, comZ: -0.02, vtop: 15.9, accel: 2.3, drive: 'rwd', gripLat: 0.97, latBias: 1.0, radius: 0.05 },
    look: { shell: 'crane', paint: t(BROWN, 14), trim: t(GREY, 3), extra: ['logs'], engine: 'glow', wheel: { w: 0.044 } }
  },
  nightbus: {
    name: 'NIGHT BUS', rating: 3, blurb: 'long and stable and slow to turn. every window is lit.',
    num: { mass: 2.5, length: 0.64, width: 0.21, height: 0.13, comY: 0.06, comZ: 0, vtop: 16.6, accel: 2.2, drive: 'fwd', gripLat: 1.05, steer: 0.34, radius: 0.036 },
    look: { shell: 'bus', paint: t(BLUE, 5), trim: t(BROWN, 14), extra: [], engine: 'electric', wheel: { w: 0.032 } }
  },
  /* ---- PRO ---- */
  vector: {
    name: 'VECTOR', rating: 4, blurb: 'never the best at one thing and never bad at any. the one to beat.',
    num: { mass: 1.6, length: 0.46, width: 0.24, height: 0.072, comY: 0.045, comZ: 0, vtop: 17.0, accel: 1.5, drive: 'awd', gripLat: 1.14, latBias: 1.1 },
    look: { shell: 'gt', paint: t(GREY, 9), trim: t(RED, 9), extra: ['lip'], engine: 'electric' }
  },
  hornet: {
    name: 'HORNET', rating: 4, noRival: true, blurb: 'an open-wheel racer. fastest, and it knows it.',
    num: { mass: 1.15, length: 0.4, width: 0.16, height: 0.07, comY: 0.05, comZ: -0.012, vtop: 17.5, accel: 1.45, drive: 'rwd', gripLat: 1.12, latBias: 1.08, radius: 0.05, track: 0.21 },
    look: { shell: 'openwheel', paint: t(BROWN, 14), trim: t(GREY, 1), extra: ['wings'], engine: 'electric', wheel: { w: 0.05 } }
  },
  warden: {
    name: 'WARDEN', rating: 4, blurb: 'an armoured van. it was not built to lose a shoving match.',
    num: { mass: 3.0, length: 0.46, width: 0.28, height: 0.12, comY: 0.07, comZ: 0, vtop: 16.2, accel: 2.3, drive: 'awd', gripLat: 1.05, latBias: 0.98, radius: 0.045 },
    look: { shell: 'armoured', paint: t(GREY, 5), trim: t(GREY, 13), extra: ['bullbar', 'beacon'], engine: 'glow', wheel: { w: 0.044 } }
  },
  kestrel: {
    name: 'KESTREL', rating: 4, blurb: 'a low prototype that hugs the road. nothing else holds a bend like it.',
    num: { mass: 1.4, length: 0.46, width: 0.2, height: 0.065, comY: 0.04, comZ: -0.01, vtop: 17.0, accel: 1.5, drive: 'awd', gripLat: 1.15, latBias: 1.12 },
    look: { shell: 'proto', paint: t(MAGENTA, 8), trim: t(GREY, 15), extra: ['fin'], engine: 'electric' }
  },
  /* ---- SPECIAL: won, not bought (STUNT YARD, stars, cups) ---- */
  phonebox: {
    name: 'PHONE BOX', rating: 1, special: true, blurb: 'a phone box on wheels. it is not meant to be a car.',
    num: { mass: 2.0, length: 0.3, width: 0.2, height: 0.3, comY: 0.09, comZ: 0, vtop: 13.2, accel: 2.6, drive: 'fwd', gripLat: 0.92, radius: 0.036, track: 0.19 },
    look: { shell: 'phonebox', paint: t(RED, 8), trim: t(BROWN, 14), extra: [], engine: 'electric', wheel: { w: 0.03 } }
  },
  snowman: {
    name: 'SNOWMAN', rating: 0, special: true, blurb: 'a snowman on a skateboard. nobody asked for this to be fast.',
    num: { mass: 1.0, length: 0.28, width: 0.16, height: 0.3, comY: 0.085, comZ: 0, vtop: 12.8, accel: 2.2, drive: 'rwd', gripLat: 0.9, latBias: 1.0, radius: 0.03, wheelbase: 0.2, track: 0.17 },
    look: { shell: 'snowman', paint: t(COOL, 15), trim: t(BROWN, 12), extra: [], engine: 'electric', wheel: { w: 0.03 } }
  },
  curlingstone: {
    name: 'CURLING STONE', rating: 2, special: true, blurb: 'literally a curling stone. it does not corner. it travels.',
    num: { mass: 3.2, length: 0.3, width: 0.3, height: 0.09, comY: 0.045, comZ: 0, vtop: 14.0, accel: 2.4, drive: 'awd', gripLat: 0.55, latBias: 0.9, radius: 0.03 },
    look: { shell: 'stone', paint: t(GREY, 6), trim: t(RED, 9), extra: [], engine: 'electric', wheel: { w: 0.03 } }
  },
  thecat: {
    name: 'THE CAT', rating: 3, special: true, blurb: 'the courier\'s own cat, as a car. it lands on its wheels.',
    num: { mass: 1.1, length: 0.44, width: 0.2, height: 0.1, comY: 0.052, comZ: 0, vtop: 15.6, accel: 1.6, drive: 'awd', gripLat: 1.05 },
    look: { shell: 'cat', paint: t(BROWN, 11), trim: t(BROWN, 5), extra: ['tail'], engine: 'electric' }
  }
};
