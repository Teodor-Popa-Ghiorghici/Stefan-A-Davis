/* THE DEPOT'S GOODS (docs/vroom/plan.md section 8). Two kinds of thing hang on its wall, and they are different on purpose.
   ROUTE PARTS open roads and do nothing for speed: SNOW TYRES, HEADLIGHTS, BUMPER BAR, ICE CHAINS, ROOF RACK. They change what the car can do on the road (grip on snow or ice, seeing past the fog, breaking a gate,
   holding two pickups), which the sim already knows (`parts` on a car: sim_wheel.js surfaceGrip, race.js `cap`).
   TUNING PARTS make the car better at being the car it is, three levels each, and are held to the event: `tuned()` works out a car's numbers from its row, the levels fitted and the event's rating, and
   nothing it returns passes the rating's envelope (tune.js RATINGS), so tuning lets a weak car reach the cap and a strong one stays where it is. BALLAST is the odd one: it is a weight, bought for how far
   either way it may be set, and it is not a speed at all (a heavy car shoves, a light one is shoved, and a low weight corners flatter).
   Prices are in TIPS, the game's own money. Pure data and pure functions. */
import { TOP_SPEED, ACCEL_BEST, GRIP_MAX } from './tune.js';

export const ROUTE = {
  snowTyres: { name: 'SNOW TYRES', price: 600, blurb: 'GRIP ON PACKED AND DEEP SNOW. THE SNOWED-OVER ROADS BECOME ROADS.' },
  headlights: { name: 'HEADLIGHTS', price: 450, blurb: 'SEE TWICE AS FAR THROUGH NIGHT AND BLIZZARD.' },
  bumperBar: { name: 'BUMPER BAR', price: 900, blurb: 'BREAK THE FENCE GATES. EACH ONE IS A SHORTCUT.' },
  iceChains: { name: 'ICE CHAINS', price: 1400, blurb: 'GRIP ON ICE. THE FROZEN HARBOUR AND THE LAKE ROAD.' },
  roofRack: { name: 'ROOF RACK', price: 1100, blurb: 'CARRY TWO PICKUPS.' }
};
export const ROUTE_IDS = Object.keys(ROUTE);

/* the levels of each tuning part: what level 0 (nothing fitted) to 3 do. A multiplier on the car's own number, then held to the rating's cap. */
export const TUNING = {
  motor:   { name: 'MOTOR',         prices: [250, 600, 1100], blurb: 'A SHORTER RUN TO TOP SPEED.',          accel: [1, 0.92, 0.85, 0.79] },
  gearing: { name: 'GEARING',       prices: [250, 600, 1100], blurb: 'A HIGHER TOP SPEED, A SLOWER START.',  vtop: [1, 1.025, 1.05, 1.075], accel: [1, 1.03, 1.07, 1.12] },
  tyres:   { name: 'TYRE COMPOUND', prices: [300, 700, 1200], blurb: 'MORE GRIP, UP TO THE EVENT\'S LIMIT.', grip: [1, 1.04, 1.08, 1.12] },
  springs: { name: 'SPRINGS',       prices: [200, 500, 900],  blurb: 'STIFFER, AND DAMPED: LANDINGS SETTLE.', freq: [0, 0.6, 1.2, 1.8], zeta: [0, 0.05, 0.1, 0.15] },
  battery: { name: 'BATTERY',       prices: [200, 450, 800],  blurb: 'COFFEE LASTS LONGER. A POWER CUT BITES LESS.', coffee: [1, 1.15, 1.3, 1.45], recover: [1, 1.2, 1.4, 1.6] },
  ballast: { name: 'BALLAST',       prices: [150, 350, 600],  blurb: 'WEIGHT, BOTH WAYS: ADD IT TO SHOVE, TAKE IT OUT TO BE QUICK TO TURN.', mass: 0.07, com: 0.02 }
};
export const TUNING_IDS = Object.keys(TUNING);
export const MAX_LEVEL = 3;

/* cosmetics: paint, a bobblehead, a horn, a plate, a cab light. Index 0 of each is what the courier starts with. `price` 0 is not for sale (it is found: a star, a cup). A plate is never one of the rivals' numbers
   (rivals.js), and a paint (events.js PAINT) is never one of theirs: the player's car is the one that looks like nothing else on the grid. */
export const COSMETICS = {
  paint: { name: 'PAINT', items: [
    { id: 'cyan', name: 'HARBOUR CYAN', price: 0 }, { id: 'red', name: 'MAILBOX RED', price: 120 }, { id: 'yellow', name: 'PLOUGH YELLOW', price: 120 }, { id: 'green', name: 'PINE GREEN', price: 120 },
    { id: 'white', name: 'SNOW WHITE', price: 150 }, { id: 'orange', name: 'TRAFFIC CONE', price: 150 }, { id: 'violet', name: 'DUSK VIOLET', price: 200 }, { id: 'black', name: 'COAL', price: 200 },
    { id: 'pink', name: 'BUBBLEGUM', price: 0 }, { id: 'gold', name: 'LONG SERVICE GOLD', price: 0 }] },
  bobble: { name: 'BOBBLEHEAD', items: [
    { id: 'cat', name: 'THE CAT', price: 0 }, { id: 'goose', name: 'GOOSE', price: 150 }, { id: 'snowman', name: 'SNOWMAN', price: 150 }, { id: 'pine', name: 'PINE TREE', price: 150 },
    { id: 'parcel', name: 'LITTLE PARCEL', price: 150 }, { id: 'moose', name: 'MOOSE', price: 0 }] },
  horn: { name: 'HORN', items: [
    { id: 'beep', name: 'BEEP', price: 0 }, { id: 'honk', name: 'HONK', price: 100 }, { id: 'bell', name: 'SLEIGH BELL', price: 100 }, { id: 'ahooga', name: 'AHOOGA', price: 0 }] },
  plate: { name: 'PLATE', items: [
    { id: '01', name: '01', price: 0 }, { id: '07', name: '07', price: 80 }, { id: '13', name: '13', price: 80 }, { id: '21', name: '21', price: 80 }, { id: '88', name: '88', price: 80 }, { id: '00', name: '00', price: 0 }] },
  light: { name: 'CAB LIGHT', items: [
    { id: 'off', name: 'NONE', price: 0 }, { id: 'amber', name: 'AMBER BEACON', price: 120 }, { id: 'blue', name: 'BLUE BEACON', price: 120 }, { id: 'white', name: 'WORK LAMP', price: 0 }] }
};
export const COSMETIC_KINDS = Object.keys(COSMETICS);

/* what a loadout is: the route parts fitted, a level of each tuning part, the ballast setting and a choice from each cosmetic */
export const blankKit = () => ({ route: {}, tune: { motor: 0, gearing: 0, tyres: 0, springs: 0, battery: 0, ballast: 0 }, ballast: 0, look: { paint: 'cyan', bobble: 'cat', horn: 'beep', plate: '01', light: 'off' } });

/* the `parts` the sim is given for a car (sim_wheel.js surfaceGrip, race.js cap): route parts only. The tyre compound is a number of the car's own (tuned()), so the rating can hold it. */
export function simParts(kit) {
  const r = (kit && kit.route) || {};
  return { snowTyres: !!r.snowTyres, iceChains: !!r.iceChains, roofRack: !!r.roofRack, bumperBar: !!r.bumperBar, headlights: !!r.headlights, compound: 0, battery: (kit && kit.tune && kit.tune.battery) | 0 };
}

const lv = (kit, id) => Math.max(0, Math.min(MAX_LEVEL, ((kit && kit.tune && kit.tune[id]) | 0)));
/* A CAR'S NUMBERS WITH ITS TUNING, FOR AN EVENT OF THIS RATING. `num` is the car's own row (cars_data.js). Each part's level is applied to its number and the result is held to the rating: top speed no higher than
   TOP_SPEED, the time to top speed no shorter than ACCEL_BEST, the tyres no better than GRIP_MAX. A car that is already at a cap gains nothing in that number, which is the point: a rating is a class. */
export function tuned(num, kit, rating) {
  const n = Object.assign({}, num);
  const m = lv(kit, 'motor'), g = lv(kit, 'gearing'), t = lv(kit, 'tyres'), s = lv(kit, 'springs'), b = lv(kit, 'ballast');
  n.vtop = Math.min(TOP_SPEED[rating], n.vtop * TUNING.gearing.vtop[g]);
  n.accel = Math.max(ACCEL_BEST[rating], n.accel * TUNING.motor.accel[m] * TUNING.gearing.accel[g]);
  n.gripLat = Math.min(GRIP_MAX[rating], (n.gripLat || 1) * TUNING.tyres.grip[t]);
  if (s) { n.freq = 7 + TUNING.springs.freq[s]; n.zeta = 0.35 + TUNING.springs.zeta[s]; }
  const set = Math.max(-b, Math.min(b, (kit && kit.ballast) | 0));
  if (set) { n.mass *= 1 + TUNING.ballast.mass * set; n.comY *= 1 - TUNING.ballast.com * set; }
  return n;
}
/* the multipliers the pickups read for a car: how long COFFEE lasts and how quickly a power cut or a stun wears off */
export function batteryMods(kit) { const b = lv(kit, 'battery'); return { coffee: TUNING.battery.coffee[b], recover: TUNING.battery.recover[b] }; }

/* what a part costs to buy next: the price of its next level, or null when it is all fitted */
export function nextPrice(kit, id) {
  if (ROUTE[id]) return kit.route[id] ? null : ROUTE[id].price;
  const t = TUNING[id]; if (!t) return null;
  const l = lv(kit, id); return l >= MAX_LEVEL ? null : t.prices[l];
}
export const totalPrice = () => ROUTE_IDS.reduce((a, id) => a + ROUTE[id].price, 0) + TUNING_IDS.reduce((a, id) => a + TUNING[id].prices.reduce((x, y) => x + y, 0), 0);
