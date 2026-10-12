/* THE ELEVEN RIVALS (docs/vroom/plan.md sections 5 and 8). A rival is a name, a number, a livery of its own (a paint, a second colour, a pattern, a logo: livery.js) and a way of driving that is a few numbers on top
   of the tier the event sets (ai_profiles.js): `skill` is how many tiers above or below the event's rating it drives (-1, 0, 1), and `style` nudges a few of the driver's numbers (more bold, more sloppy, keener on
   pickups). Nothing here is a speed, a grip or a mass: a rival is a person with habits, and the only catch-up there is is the deal of the pickups. The cars are the event's: a rival drives the cars of the rating
   it is racing in, which is how a field is mixed (`fieldFor`). Eight race at a time, the human and seven of these, in a block of the eleven that moves on with the seed so no two cups meet the same seven. Pure. */
import { ix, GREY, RED, BROWN, GREEN, BLUE, MAGENTA, COOL } from './palette.js';
import { rivalCars } from './cars.js';
import { liveryFor } from './livery.js';
import { FIELD } from './ai_profiles.js';

export const RIVALS = [
  { id: 'nils', name: 'NILS', num: '03', paint: ix(BROWN, 9), stripe: ix(GREY, 15), pattern: 'band', logo: 'fish', skill: -1, style: { aggression: -0.1, pickups: 0.1 } },
  { id: 'greta', name: 'GRETA', num: '17', paint: ix(MAGENTA, 9), stripe: ix(GREY, 15), pattern: 'twin', logo: 'star', skill: 0, style: { aggression: 0.15, mistake: 1.4 } },
  { id: 'otto', name: 'OTTO', num: '24', paint: ix(GREEN, 8), stripe: ix(BROWN, 14), pattern: 'diag', logo: 'bolt', skill: 1, style: { pickups: 0.2 } },
  { id: 'ivar', name: 'IVAR', num: '08', paint: ix(RED, 9), stripe: ix(GREY, 15), pattern: 'chevron', logo: 'flame', skill: -1, style: { aggression: 0.2, mistake: 1.2 } },
  { id: 'astrid', name: 'ASTRID', num: '31', paint: ix(BLUE, 9), stripe: ix(BROWN, 14), pattern: 'checks', logo: 'snow', skill: 0, style: { mistake: 0.7 } },
  { id: 'knut', name: 'KNUT', num: '66', paint: ix(GREY, 6), stripe: ix(RED, 10), pattern: 'band', logo: 'skull', skill: 1, style: { aggression: 0.2 } },
  { id: 'sigrid', name: 'SIGRID', num: '12', paint: ix(COOL, 12), stripe: ix(BLUE, 7), pattern: 'wave', logo: 'heart', skill: -1, style: { pickups: -0.1, mistake: 0.8 } },
  { id: 'lars', name: 'LARS', num: '77', paint: ix(BROWN, 14), stripe: ix(GREY, 1), pattern: 'twin', logo: 'wheel', skill: 0, style: { aggression: 0.1, pickups: 0.1 } },
  { id: 'helga', name: 'HELGA', num: '05', paint: ix(GREEN, 12), stripe: ix(GREY, 15), pattern: 'dots', logo: 'paw', skill: 1, style: { mistake: 0.6 } },
  { id: 'tor', name: 'TOR', num: '42', paint: ix(RED, 5), stripe: ix(BROWN, 14), pattern: 'twin', logo: 'crown', skill: 0, style: { aggression: -0.05, pickups: 0.15 } },
  { id: 'maja', name: 'MAJA', num: '99', paint: ix(MAGENTA, 13), stripe: ix(GREEN, 10), pattern: 'diag', logo: 'anchor', skill: 1, style: { aggression: 0.1, pickups: 0.1 } }
];
export const RIVAL_BY_ID = Object.fromEntries(RIVALS.map(r => [r.id, r]));

/* the entries for rivals of an event of this rating, named by id: each in a car of the rating (the four of it in turn from `start`, so the first four are four different cars and the rest are twins in other paint)
   and at the tier the rating and their own skill give. The entry is what createRace takes. A cup keeps its seven ids and its start, so the same people meet you four races running. */
export function entriesFor(ids, rating, start) {
  const cars = rivalCars(rating);
  return ids.map((id, k) => {
    const r = RIVAL_BY_ID[id];
    return { id: r.id, name: r.name, car: cars[(k + start) % cars.length], tier: Math.max(0, Math.min(4, FIELD.ofRating[rating] + r.skill * FIELD.skillStep)), paint: r.paint, style: r.style, livery: liveryFor(r), num: r.num };
  });
}
/* `n` rivals of an event of this rating: a block of the eleven starting where the seed says */
export function fieldFor(rating, n, seed) {
  const start = (seed >>> 0) % RIVALS.length, ids = [];
  for (let k = 0; k < n; k++) ids.push(RIVALS[(start + k) % RIVALS.length].id);
  return entriesFor(ids, rating, start);
}
