/* WHAT WINS WHAT (docs/vroom/plan.md sections 8 and 9: unlocking is Re-Volt's way, and something new has to arrive often). Every car but the courier is won, never bought, and every cosmetic that is not for
   sale is found. Each rule names the thing that earns it: the cup passed, the cup won, a cup swept (four wins), a cup's hidden stars found, the stunt yard emptied, and so on. The triggers a phase builds are
   the ones that fire; the rest are written down now so that nothing is orphaned (career_check.js holds that every car has a way to be had). Pure data. */
/* A cup's cars are won in the cup before it, as in Re-Volt (win the ROOKIE cup and the AMATEUR cars are yours): the field of a cup is made of cars of its rating, and a player who has to race it in a car of
   the class below is a player who has been given no chance. So passing a cup opens the cars of the next one, winning it gives one more, sweeping it a rare one, and the last cup's cars are the ones that
   the cup before it gave. The ROOKIE cars that are not the courier come from playing (a first win, five podiums, twenty-five hits with a pickup), because the first cup is raced in the courier. */
export const CAR_RULES = {
  courier: { kind: 'start' },
  snowbug: { kind: 'stat', stat: 'wins', n: 1 }, milkfloat: { kind: 'stat', stat: 'podiums', n: 5 }, paperboy: { kind: 'stat', stat: 'hits', n: 25 },
  postie: { kind: 'cup-pass', cup: 'rookie' }, tofu: { kind: 'cup-pass', cup: 'rookie' }, tunatruck: { kind: 'cup-win', cup: 'rookie' }, ploughboy: { kind: 'stars', cup: 'rookie' },
  damrunner: { kind: 'cup-pass', cup: 'amateur' }, rattler: { kind: 'cup-pass', cup: 'amateur' }, noodlebar: { kind: 'cup-win', cup: 'amateur' }, sled: { kind: 'stars', cup: 'amateur' },
  minx: { kind: 'cup-pass', cup: 'advanced' }, vector: { kind: 'cup-pass', cup: 'advanced' }, hornet: { kind: 'cup-win', cup: 'advanced' }, logger: { kind: 'stars', cup: 'advanced' },
  freezer: { kind: 'cup-sweep', cup: 'advanced' }, nightbus: { kind: 'cup-sweep', cup: 'amateur' },
  warden: { kind: 'cup-pass', cup: 'pro' }, kestrel: { kind: 'cup-win', cup: 'pro' },
  phonebox: { kind: 'lastmile' }, snowman: { kind: 'clockwork' }, curlingstone: { kind: 'all-wins' }, thecat: { kind: 'stunt' }
};
/* found cosmetics (price 0 in parts.js): [kind, id] and what finds it */
export const GIFT_RULES = [
  { item: ['paint', 'pink'], kind: 'cup-pass', cup: 'amateur' },
  { item: ['bobble', 'moose'], kind: 'cup-win', cup: 'advanced' },
  { item: ['horn', 'ahooga'], kind: 'cup-pass', cup: 'advanced' },
  { item: ['plate', '00'], kind: 'cup-win', cup: 'pro' },
  { item: ['light', 'white'], kind: 'cup-pass', cup: 'pro' },
  { item: ['paint', 'gold'], kind: 'all-wins' }
];
/* the cars and gifts a trigger earns: `t` is { kind, cup? } */
export const carsFor = t => Object.keys(CAR_RULES).filter(id => CAR_RULES[id].kind === t.kind && (CAR_RULES[id].cup || null) === (t.cup || null));
/* the cars earned by a count that has just reached a number: `stat` is 'wins', 'podiums' or 'hits' and `n` how many there are now */
export const carsForStat = (stat, n) => Object.keys(CAR_RULES).filter(id => CAR_RULES[id].kind === 'stat' && CAR_RULES[id].stat === stat && n >= CAR_RULES[id].n);
export const giftsFor = t => GIFT_RULES.filter(g => g.kind === t.kind && (g.cup || null) === (t.cup || null)).map(g => g.item);
