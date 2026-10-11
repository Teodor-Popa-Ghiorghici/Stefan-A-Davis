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
export const HUMAN = { name: 'HUMAN', reaction: 14, lineError: 0.3, gripUse: 0.82, brakeEarly: 1.2, aggression: 0.3, mistake: 0.04, pickups: 0.5 };
