/* THE TEN PICKUPS AND HOW THEY ARE DEALT (docs/vroom/plan.md section 7). A pickup lies on the road as a small parcel and is dealt when a car drives through it: WHAT it is depends on where the car is in the field, which is
   the only catch-up the game has. The leader draws from ANTIFREEZE, CURLING STONE, FAKE PARCEL and SNOWBALLS, the things that hold a race back from behind. The middle draws everything but POWER CUT. Last place draws
   ROCKETS (often a pack of three), the STATIC BALL and the HOT PARCEL more than the rest, and POWER CUT can only be dealt to the back half of the field (positions 5 to 8 of eight). Between the three the weights are
   blended by how far down the field a car is, so second place draws a little like the leader and seventh a little like the last. Pure and seeded: `deal` takes the race's dice, never Math.random, so a race is the same race. */

/* what each is: the name on the glass, a line about it (the HUD and the help page), and how many a pickup gives */
export const PICKUPS = {
  ball: { name: 'STATIC BALL', blurb: 'rolls ahead down the road and flips every car it touches', count: 1 },
  rocket: { name: 'BOTTLE ROCKET', blurb: 'flies ahead, bends a little toward a car, bursts on the first thing it meets', count: 1 },
  leads: { name: 'JUMP LEADS', blurb: 'crackle round you for five seconds: a car that comes close loses its power', count: 1 },
  parcel: { name: 'HOT PARCEL', blurb: 'the fuse is your antenna: touch a car and it is theirs; it blows up whoever has it', count: 1 },
  freeze: { name: 'ANTIFREEZE', blurb: 'a puddle behind you: a tyre in it has no grip for two seconds', count: 1 },
  snow: { name: 'SNOWBALLS', blurb: 'three, thrown ahead: a splash means less grip for a car near it', count: 3 },
  stone: { name: 'CURLING STONE', blurb: 'a heavy stone dropped behind you: it knocks aside what it meets', count: 1 },
  fake: { name: 'FAKE PARCEL', blurb: 'looks like a pickup, and bursts on whoever takes it', count: 1 },
  coffee: { name: 'COFFEE', blurb: 'a tenth more top speed for six seconds', count: 1 },
  cut: { name: 'POWER CUT', blurb: 'every car ahead of you loses its power for two seconds', count: 1 }
};
export const IDS = Object.keys(PICKUPS);

/* the weights at three places in the field: the leader, the middle and the last. Nothing here is a number a car is given; it is how often a thing is dealt. */
const LEAD = { freeze: 3, stone: 3, fake: 3, snow: 3 };
const MID = { leads: 2, ball: 2, rocket: 3, parcel: 1, freeze: 2, snow: 2, stone: 1, fake: 2, coffee: 2 };
const LAST = { rocket: 5, ball: 3.5, parcel: 3, cut: 1.2, coffee: 2, leads: 1, snow: 1, fake: 0.5, freeze: 0.5 };

/* the first position POWER CUT may be dealt to in a field of n: the back half (5 of 8) */
export const backFrom = n => Math.floor(n / 2) + 1;
/* how often a rocket is a pack of three, by how far down the field: the leader never, the last mostly */
export const packChance = (place, n) => (n < 2 ? 0 : 0.7 * Math.pow((place - 1) / (n - 1), 1.3));

/* the weights for a place in a field of n (an object id -> weight, zero left out); `not` removes pickups (a second HOT PARCEL while one is alight) */
export function weights(place, n, not) {
  const q = n < 2 ? 0 : Math.max(0, Math.min(1, (place - 1) / (n - 1))), out = {};
  const mix = (a, b, t) => { for (const id of IDS) { const w = (a[id] || 0) * (1 - t) + (b[id] || 0) * t; if (w > 0) out[id] = (out[id] || 0) + w; } };
  if (place <= 1) mix(LEAD, LEAD, 0);
  else if (q <= 0.5) mix(LEAD, MID, q * 2);
  else mix(MID, LAST, (q - 0.5) * 2);
  if (place < backFrom(n)) delete out.cut;
  if (not) for (const id of not) delete out[id];
  return out;
}

/* a pickup for this place: { id, count }. `rnd` is the race's seeded dice. */
export function deal(place, n, rnd, not) {
  const w = weights(place, n, not), ids = Object.keys(w);
  let total = 0; for (const id of ids) total += w[id];
  let r = rnd() * total, id = ids[ids.length - 1];
  for (const k of ids) { r -= w[k]; if (r < 0) { id = k; break; } }
  let count = PICKUPS[id].count;
  if (id === 'rocket' && rnd() < packChance(place, n)) count = 3;
  return { id, count };
}
