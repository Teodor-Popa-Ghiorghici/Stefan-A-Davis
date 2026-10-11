/* HOW A RIVAL DRIVES, as numbers (docs/vroom/plan.md section 8: the CPU has no cheats). A driver is the same four inputs a keyboard makes, from the same road, seeing only what a person sees and only as it was
   `reaction` steps ago. Difficulty is these few numbers and a seeded dice and nothing else: no top speed, grip or mass is ever scaled for a CPU, and the only catch-up there is is the position-weighted pickup deal.
     reaction    steps (1/60 s) between what is happening and what the driver sees of it
     lineError   metres the driver wanders from the racing line, slowly and never the same way twice
     gripUse     the share of what the tyres really give in a bend (spec.aLat) that the driver trusts, which the speed plan is built on; a bold driver asks for more and slides more
     brakeEarly  extra metres of braking before every corner (negative: later than the plan, which is how a driver ends up in the wall)
     aggression  0 to 1: how willing to go round a car ahead, close the door on one coming up, and shove
     mistake     chance a second of a slip: a stretch of 0.4 to 0.9 s of wrong steering or late braking
     pickups     how sharp a driver is for a pickup on the road and for using what it holds (phase 4)
   `TIERS` runs from the ROOKIE field to the PRO field; `HUMAN` is the budget bot's person (budget_bot.js). Pure data. */
export const TIERS = [
  { name: 'ROOKIE', reaction: 16, lineError: 0.42, gripUse: 0.78, brakeEarly: 1.6, aggression: 0.15, mistake: 0.05, pickups: 0.3 },
  { name: 'AMATEUR', reaction: 13, lineError: 0.32, gripUse: 0.84, brakeEarly: 1.0, aggression: 0.3, mistake: 0.035, pickups: 0.5 },
  { name: 'ADVANCED', reaction: 10, lineError: 0.22, gripUse: 0.90, brakeEarly: 0.5, aggression: 0.5, mistake: 0.022, pickups: 0.7 },
  { name: 'SEMI-PRO', reaction: 8, lineError: 0.14, gripUse: 0.95, brakeEarly: 0.1, aggression: 0.65, mistake: 0.012, pickups: 0.85 },
  { name: 'PRO', reaction: 6, lineError: 0.08, gripUse: 0.99, brakeEarly: -0.2, aggression: 0.8, mistake: 0.006, pickups: 1 }
];
/* a tier between two of the above: `t` runs from 0 (ROOKIE) to 4 (PRO) and need not be a whole number, so a field can be as strong as the game wants it and not only one of five steps. Every number is a straight line between
   the two neighbours (and a mistake rate is the geometric mean, since it spans a tenth to a hundredth). */
export function tierProfile(t) {
  t = Math.max(0, Math.min(TIERS.length - 1, t));
  const i = Math.min(TIERS.length - 2, Math.floor(t)), f = t - i, a = TIERS[i], b = TIERS[i + 1], lerp = (x, y) => x + (y - x) * f;
  return { name: f === 0 ? a.name : f === 1 ? b.name : a.name + '+' + f.toFixed(2), reaction: Math.round(lerp(a.reaction, b.reaction)), lineError: lerp(a.lineError, b.lineError), gripUse: lerp(a.gripUse, b.gripUse), brakeEarly: lerp(a.brakeEarly, b.brakeEarly), aggression: lerp(a.aggression, b.aggression), mistake: a.mistake * Math.pow(b.mistake / a.mistake, f), pickups: lerp(a.pickups, b.pickups) };
}
/* how strong the field of an event is: the tier a rival of ordinary skill drives at in an event of each rating, and how far a rival that is better or worse than that is from it (rivals.js `skill` is -1, 0 or 1).
   These are what the budget bot calibrates (budget_bot.js): the aim is that a driver of the bot's ordinary human pace, with what a cup asks for, gets through a cup at the first try about half the time. */
export const FIELD = { ofRating: [1.0, 1.8, 2.7, 2.35, 3.3], skillStep: 1 };
export const HUMAN = { name: 'HUMAN', reaction: 14, lineError: 0.3, gripUse: 0.82, brakeEarly: 1.2, aggression: 0.3, mistake: 0.04, pickups: 0.5 };

/* a rival's habits laid over its tier: `aggression` and `pickups` are added (and kept between 0 and 1), `mistake` and `lineError` are multiplied. Nothing that is speed, grip or mass has a place here. */
export function styled(profile, style) {
  if (!style) return profile;
  const c = v => Math.max(0, Math.min(1, v)), p = Object.assign({}, profile);
  if (style.aggression) p.aggression = c(p.aggression + style.aggression);
  if (style.pickups) p.pickups = c(p.pickups + style.pickups);
  if (style.mistake) p.mistake *= style.mistake;
  if (style.lineError) p.lineError *= style.lineError;
  return p;
}
