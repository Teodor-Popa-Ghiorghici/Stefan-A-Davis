/* CAREER CHECK (dev-only, not packaged): the rules of the career in plain Node. A career survives being saved and read back, and survives being read wrongly; what is for sale is bought at its price and no cheaper, a part can
   be bought only as far as it goes and a found thing never; every tuning part is held to the event's rating on every car at every rating (nothing passes the cap, and a car that is under it can reach it); a race
   pays more for a better place and a higher rating and never nothing; a cup is passed in the top three and costs a try when it is missed; every car has a way to be won; the rivals have bought what a rival of that
   rating would; and a whole one-lap race run through `finishRace` pays, records and counts.      node apps/vroom/career_check.js */
import { suite } from './check_kit.js';
import * as C from './career.js';
import * as P from './parts.js';
import { CARS, CAR_IDS, numbersFor, specOf, RATINGS } from './cars.js';
import { TOP_SPEED, ACCEL_BEST, GRIP_MAX } from './tune.js';
import { CUPS, POINTS, TRIES, startCup, scoreRace, refill, standings, cupOpen, askKit, rivalIds, readiness } from './cups.js';
import { racePay, cupPay } from './pay.js';
import { CAR_RULES, GIFT_RULES, carsFor, carsForStat } from './unlocks.js';
import { setup, rivalParts, playerLook, PAINT } from './events.js';
import { createRace } from './race.js';
import { createTally } from './tally.js';
import { HUMAN } from './ai_profiles.js';
import { RIVALS } from './rivals.js';
import { liveryDiff, PLAYER } from './livery.js';
import { trackFor } from './tracks.js';

const S = suite('career_check'), { ok } = S;
const max = () => { const c = C.fresh(); for (const id of P.ROUTE_IDS) c.own.route[id] = 1; for (const id of P.TUNING_IDS) c.own.tune[id] = 3; c.ballast = 3; return c; };

/* ---- saving ---- */
{
  const c = C.fresh();
  ok(c.tips === 0 && c.car === 'courier' && c.cars.courier === 1 && Object.keys(c.cars).length === 1, 'a new career has nothing but the courier and no money');
  ok(CUPS.every(u => c.cups[u.id].tries === TRIES && !c.cups[u.id].passed), 'and every cup with its three tries, none passed');
  const m = max(); m.tips = 1234; m.cars.hornet = 1; m.car = 'hornet'; m.own.look.paint.red = 1; m.look.paint = 'red'; m.tracks['sorting:f'] = { best: 91.5, lap: 30.2, races: 4, wins: 1 }; m.stats.races = 9; m.cups.rookie.passed = 1;
  const back = C.sanitize(JSON.parse(JSON.stringify(m)));
  ok(JSON.stringify(back) === JSON.stringify(m), 'a career saved and read back is the same career');
  const junk = C.sanitize({ tips: -50, car: 'zeppelin', cars: { hornet: 1, nonsense: 1 }, own: { route: { snowTyres: 1, laser: 1 }, tune: { motor: 99, ballast: 2 }, look: { paint: { red: 1, mauve: 1 } } }, ballast: 50, look: { paint: 'mauve', horn: 'honk' }, cups: { rookie: { tries: 77, passed: 'x' } }, run: { cup: 'moon', race: 1, pts: {} }, tracks: { 'a:f': { best: 'slow', races: -3 } }, stats: { races: 'many' }, news: [1, 'ok'] });
  ok(junk.tips === 0 && junk.car === 'courier' && junk.cars.hornet === 1 && !junk.cars.nonsense && !junk.cars.zeppelin, 'a damaged save is read as far as it can be: money floored, unknown cars and cars unwon dropped');
  ok(junk.own.route.snowTyres === 1 && !junk.own.route.laser && junk.own.tune.motor === 3 && junk.own.look.paint.red === 1 && !junk.own.look.paint.mauve, 'parts clamped to their levels, unknown things dropped');
  ok(junk.ballast === 2 && junk.look.paint === 'cyan' && junk.look.horn === 'beep' && junk.cups.rookie.tries === TRIES && junk.run === null, 'the dial held to what is owned, a look that is not yours ignored, tries held to three, a run for no cup dropped');
  ok(junk.news.length === 1 && junk.tracks['a:f'].best === null && junk.tracks['a:f'].races === 0 && junk.stats.races === 0, 'and the little things (a news line that is not text, a time that is not a number) are made safe');
  ok(JSON.stringify(C.sanitize(null)) === JSON.stringify(C.fresh()) && JSON.stringify(C.sanitize('garbage')) === JSON.stringify(C.fresh()), 'nothing at all, or nonsense, is a new career');
}

/* ---- buying ---- */
{
  const c = C.fresh();
  ok(C.buy(c, { kind: 'route', id: 'snowTyres' }).why === 'NEED 600 MORE TIPS', 'a part you cannot afford says how much more you need');
  c.tips = 2000;
  const r = C.buy(c, { kind: 'route', id: 'snowTyres' });
  ok(r.ok && c.tips === 1400 && c.own.route.snowTyres === 1, 'a route part is bought at its price');
  ok(!C.buy(c, { kind: 'route', id: 'snowTyres' }).ok && c.tips === 1400, 'and only once');
  let spent = 0, n = 0; c.tips = 1e6;
  for (let i = 0; i < 5; i++) { const b = C.buy(c, { kind: 'tune', id: 'motor' }); if (b.ok) { spent += b.price; n++; } }
  ok(n === 3 && spent === 250 + 600 + 1100 && c.own.tune.motor === 3, 'a tuning part is bought a level at a time at three prices, and stops at three (' + spent + ' TIPS)');
  ok(C.buy(c, { kind: 'look', of: 'paint', id: 'pink' }).why === 'NOT FOR SALE: IT IS FOUND' && !c.own.look.paint.pink, 'a found look is never for sale');
  ok(C.buy(c, { kind: 'look', of: 'paint', id: 'red' }).ok && c.look.paint === 'cyan' && c.own.look.paint.red === 1, 'a paint is bought but not put on until chosen');
  ok(C.setLook(c, 'paint', 'red') && c.look.paint === 'red' && !C.setLook(c, 'paint', 'gold') && c.look.paint === 'red', 'and chosen only if it is yours');
  ok(C.setBallast(c, 2) === 0 && C.buy(c, { kind: 'tune', id: 'ballast' }).ok && C.setBallast(c, 5) === 1 && C.setBallast(c, -9) === -1, 'the weight dial turns only as far as the ballast bought allows (1 level = plus or minus 1)');
  ok(C.buy(c, { kind: 'route', id: 'laser' }).why === 'NO SUCH THING', 'a thing that does not exist says so');
  ok(P.totalPrice() >= 13000 && P.totalPrice() <= 17000, 'everything in the depot costs about fifteen thousand TIPS (' + P.totalPrice() + ')');
}

/* ---- tuning is held to the rating ---- */
{
  let worst = '', lim = 0, gained = 0, checks = 0;
  const kit = C.kitOf(max()), none = C.kitOf(C.fresh());
  for (const id of CAR_IDS) for (let r = 0; r < 5; r++) {
    const n = numbersFor(id, r, kit), n0 = numbersFor(id, r, none);
    checks++;
    if (n.vtop > TOP_SPEED[r] + 1e-9) worst = id + ' vtop ' + n.vtop + ' at ' + RATINGS[r];
    if (n.accel < ACCEL_BEST[r] - 1e-9) worst = id + ' accel ' + n.accel + ' at ' + RATINGS[r];
    if (n.gripLat > GRIP_MAX[r] + 1e-9) worst = id + ' grip ' + n.gripLat + ' at ' + RATINGS[r];
    if (n.vtop > n0.vtop + 1e-9 || n.accel < n0.accel - 1e-9 || (n.gripLat || 1) > (n0.gripLat || 1) + 1e-9) gained++;
    lim = Math.max(lim, n.vtop / TOP_SPEED[r]);
  }
  ok(!worst, 'every car in every rating, with every part at its top level, is inside the rating\'s envelope (' + checks + ' cars and ratings tried)', worst);
  ok(gained > checks * 0.5, 'and tuning does make most of them better where there is room under the cap (' + gained + ' of ' + checks + ')');
  const weak = numbersFor('snowbug', 0, { tune: { motor: 3, tyres: 3 } }), weak0 = numbersFor('snowbug', 0, none);
  ok(weak.accel < weak0.accel * 0.95 && weak.gripLat > weak0.gripLat, 'a weak car can reach the cap: the snowbug\'s start and grip come on (' + weak0.accel.toFixed(2) + ' s -> ' + weak.accel.toFixed(2) + ' s)');
  const c = numbersFor('courier', 0, kit), c0 = numbersFor('courier', 0, none);
  ok(c.vtop === c0.vtop && c.vtop === TOP_SPEED[0], 'a car already at the cap gains no top speed: the courier is at ROOKIE\'s ' + TOP_SPEED[0] + ' m/s with or without gears');
  const g3 = P.tuned(CARS.courier.num, { tune: { gearing: 3 } }, 4), g0 = P.tuned(CARS.courier.num, { tune: {} }, 4);
  ok(g3.vtop > g0.vtop * 1.07 && g3.accel > g0.accel * 1.1, 'gearing is a trade: higher top speed, a slower start (' + g0.vtop + ' -> ' + g3.vtop.toFixed(2) + ' m/s, ' + g0.accel + ' -> ' + g3.accel.toFixed(2) + ' s)');
  const heavy = P.tuned(CARS.courier.num, { tune: { ballast: 3 }, ballast: 3 }, 0), light = P.tuned(CARS.courier.num, { tune: { ballast: 3 }, ballast: -3 }, 0);
  ok(heavy.mass > CARS.courier.num.mass * 1.2 && light.mass < CARS.courier.num.mass * 0.8 && heavy.comY < light.comY, 'ballast is weight both ways: heavier and lower, or lighter and higher (' + light.mass.toFixed(2) + ' to ' + heavy.mass.toFixed(2) + ' kg)');
  ok(specOf('courier', 0, kit) !== specOf('courier', 0, none) && specOf('courier', 0, none) === specOf('courier', 0), 'a plain kit shares the car\'s plain spec and a tuned one is its own');
  const sp3 = specOf('courier', 0, { tune: { springs: 3 } }), sp0 = specOf('courier', 0);
  ok(sp3.wheels[0].k > sp0.wheels[0].k, 'stiffer springs are stiffer (' + sp0.wheels[0].k.toFixed(0) + ' -> ' + sp3.wheels[0].k.toFixed(0) + ' N/m a wheel)');
  const bm = P.batteryMods({ tune: { battery: 3 } });
  ok(bm.coffee > 1.4 && bm.recover > 1.5 && P.batteryMods({ tune: { battery: 0 } }).coffee === 1, 'a battery makes coffee last longer and a power cut wear off sooner');
}

/* ---- a spare every third race ---- */
{
  const c = C.fresh(); const rows = [{ id: 'you', place: 4, human: true, car: 'courier' }];
  const run = n => { for (let i = 0; i < n; i++) C.finishRace(c, { kind: 'single', track: 'sorting', v: 'f', rating: 0, laps: 3, n: 8, place: 6, time: 100, tally: null, rows }); };
  run(2); ok(!c.news.some(s => /SPARE/.test(s)), 'two races give no spare');
  run(1); ok(c.news.filter(s => /SPARE/.test(s)).length === 1 && c.own.look.paint.red === 1 || c.own.look.plate['07'] === 1 || Object.values(c.own.look).some(k => Object.keys(k).length > 1), 'the third gives the cheapest look that is not yours');
  run(30); ok(c.news.filter(s => /SPARE/.test(s)).length >= 5 && C.spare(C.fresh()) !== null, 'and so on every third race');
  const d = C.fresh(); let n = 0; while (C.spare(d)) n++;
  ok(n === P.COSMETIC_KINDS.reduce((a, k) => a + P.COSMETICS[k].items.filter(x => x.price > 0).length, 0) && C.spare(d) === null, 'every look that is for sale can be turned up this way, and then there are no more (' + n + ')');
}

/* ---- the pay ---- */
{
  let up = true; for (let p = 1; p < 8; p++) if (racePay({ place: p, n: 8, rating: 0, laps: 3 }).total <= racePay({ place: p + 1, n: 8, rating: 0, laps: 3 }).total) up = false;
  ok(up, 'a better place pays more, all the way down the field of eight');
  ok(racePay({ place: 8, n: 8, rating: 0, laps: 3 }).total >= 12, 'and last place still pays something (' + racePay({ place: 8, n: 8, rating: 0, laps: 3 }).total + ' TIPS)');
  ok(racePay({ place: 1, n: 8, rating: 4, laps: 3 }).total > racePay({ place: 1, n: 8, rating: 0, laps: 3 }).total * 2, 'a higher rating pays about twice or more (' + racePay({ place: 1, n: 8, rating: 0, laps: 3 }).total + ' to ' + racePay({ place: 1, n: 8, rating: 4, laps: 3 }).total + ')');
  ok(racePay({ place: 1, n: 3, rating: 0, laps: 3 }).total < racePay({ place: 1, n: 8, rating: 0, laps: 3 }).total * 0.7, 'a race of three pays less than a race of eight');
  const lines = racePay({ place: 2, n: 8, rating: 1, laps: 3, hits: 9, repos: 0, record: true }).lines;
  ok(lines.some(l => /HIT/.test(l[0])) && lines.some(l => l[0] === 'CLEAN') && lines.some(l => l[0] === 'LAP RECORD') && racePay({ place: 2, n: 8, rating: 1, hits: 9 }).lines.find(l => /HIT/.test(l[0]))[0] === '6 HITS', 'hits (six at most), a clean race and a lap record are each a line of their own');
  ok(cupPay(0, 4).total === 0 && cupPay(0, 3).total === 260 && cupPay(0, 1).total === 390 && cupPay(3, 1).total === 1560, 'a cup pays when it is passed, more when it is won, and more in a higher rating');
}

/* ---- a cup ---- */
{
  const c = C.fresh();
  ok(cupOpen(c, 'rookie') && !cupOpen(c, 'amateur') && !cupOpen(c, 'moon'), 'the first cup is open and the second is not');
  const run = startCup(c, 'rookie', 7);
  ok(run && run.rivals.length === 7 && new Set(run.rivals).size === 7 && Object.keys(run.pts).length === 8, 'a cup has you and seven different rivals');
  ok(startCup(c, 'amateur', 1) === null, 'a cup that is not open does not start');
  const rowsFor = place => Object.keys(run.pts).map((id, k) => ({ id, place: id === 'you' ? place : (k + 1 >= place ? k + 2 : k + 1) })).sort((a, b) => a.place - b.place);
  rowsFor(1).forEach((r, i) => { r.place = i + 1; });
  for (let i = 0; i < 3; i++) { const rows = Object.keys(run.pts).map(id => id).map((id, k) => ({ id, place: 0 })); const others = Object.keys(run.pts).filter(x => x !== 'you'); rows[0].id = 'you'; rows[0].place = 1; others.forEach((id, k) => { rows[k + 1].id = id; rows[k + 1].place = k + 2; }); const out = scoreRace(c, run, rows); ok(out.gained.you === POINTS[0], 'a win scores ' + POINTS[0] + ' points'); }
  const rows4 = Object.keys(run.pts).map(id => ({ id, place: 0 })); const others4 = Object.keys(run.pts).filter(x => x !== 'you'); rows4[0].id = 'you'; rows4[0].place = 5; others4.forEach((id, k) => { rows4[k + 1].id = id; rows4[k + 1].place = k < 4 ? k + 1 : k + 2; });
  const end = scoreRace(c, run, rows4);
  ok(end.over && end.passed && end.rank === 1 && end.won && c.cups.rookie.passed === 1 && c.cups.rookie.won === 1 && c.cups.rookie.sweeps === 0, 'three wins and a fifth place win the cup on points, and it is not a sweep');
  ok(cupOpen(c, 'amateur'), 'a cup passed opens the next');
  /* a cup lost: three tries, then none, and a podium in a single race gives one back */
  const d = C.fresh();
  for (let t = 0; t < TRIES; t++) {
    const r2 = startCup(d, 'rookie', 3 + t);
    for (let i = 0; i < 4; i++) { const ids = Object.keys(r2.pts), rows = ids.map(id => ({ id, place: 0 })); const them = ids.filter(x => x !== 'you'); rows[0].id = 'you'; rows[0].place = 8; them.forEach((id, k) => { rows[k + 1].id = id; rows[k + 1].place = k + 1; }); scoreRace(d, r2, rows); }
    d.run = null;
    ok(d.cups.rookie.tries === TRIES - 1 - t && !d.cups.rookie.passed, 'a cup missed costs a try (' + d.cups.rookie.tries + ' left)');
  }
  ok(startCup(d, 'rookie', 9) === null, 'with no tries a cup will not start');
  refill(d);
  ok(d.cups.rookie.tries === 1 && startCup(d, 'rookie', 9) !== null, 'a podium in a single race gives back a try');
  const kit = askKit(CUPS[3]);
  ok(Object.keys(kit.route).length === 4 && kit.tune.motor === 3, 'the last cup asks for four route parts and tuning at level three');
  ok(readiness(C.fresh(), CUPS[0]) === 1 && readiness(C.fresh(), CUPS[3]) === 0 && readiness(max(), CUPS[3]) === 1, 'readiness runs from nothing to everything');
  const sd = standings({ pts: { you: 20, a: 20, b: 5 }, wins: { you: 1, a: 2, b: 0 }, last: { you: 2, a: 5, b: 3 } });
  ok(sd[0].id === 'a' && sd[1].id === 'you', 'equal points are decided by wins, then the last race');
  ok(new Set(rivalIds(5)).size === 7 && rivalIds(5).join() !== rivalIds(6).join(), 'the seed moves the rivals on');
}

/* ---- what wins what ---- */
{
  const ids = Object.keys(CAR_RULES);
  ok(ids.length === 24 && CAR_IDS.every(id => CAR_RULES[id]) && ids.every(id => CARS[id]), 'all twenty-four cars are in the table of wins, and nothing else');
  ok(Object.values(CAR_RULES).every(r => ['start', 'stat', 'cup-pass', 'cup-win', 'cup-sweep', 'stars', 'stunt', 'lastmile', 'clockwork', 'all-wins'].includes(r.kind) && (!r.cup || CUPS.some(u => u.id === r.cup))), 'each rule is a kind that is built or planned, naming a cup that exists');
  ok(['rookie', 'amateur', 'advanced'].every(u => carsFor({ kind: 'cup-pass', cup: u }).length >= 2 && carsFor({ kind: 'cup-win', cup: u }).length === 1), 'each of the first three cups passed gives two cars and each won gives one');
  const rate = id => CARS[id].rating, at = (kind, cup) => carsFor({ kind, cup });
  ok(at('cup-pass', 'rookie').every(id => rate(id) === 1) && at('cup-pass', 'amateur').every(id => rate(id) === 2) && at('cup-pass', 'advanced').map(rate).sort().join() === '3,4', 'a cup\'s cars are won in the cup before it: ROOKIE gives AMATEUR cars, AMATEUR gives ADVANCED cars, ADVANCED gives a SEMI-PRO car and a PRO one for the last cup');
  ok(at('cup-win', 'advanced').every(id => rate(id) === 4), 'and winning the third cup gives a second PRO car');
  ok(GIFT_RULES.every(g => P.COSMETICS[g.item[0]].items.find(x => x.id === g.item[1] && x.price === 0)), 'every found look is one that is not for sale, and every look that is not for sale is found');
  const unfound = []; for (const k of P.COSMETIC_KINDS) for (const it of P.COSMETICS[k].items) if (it.price === 0 && it.id !== P.COSMETICS[k].items[0].id && !GIFT_RULES.some(g => g.item[0] === k && g.item[1] === it.id)) unfound.push(k + '/' + it.id);
  ok(!unfound.length, 'no look is both free and unobtainable', unfound.join());
  const c = C.fresh(); const got = C.grant(c, { kind: 'cup-pass', cup: 'rookie' });
  ok(got.length === 2 && c.cars.postie && c.cars.tofu && !c.cars.tunatruck, 'passing the first cup gives the postie and the tofu');
  const d = C.fresh(); d.stats.wins = 1; d.stats.podiums = 5; d.stats.hits = 24;
  ok(carsForStat('wins', 1).join() === 'snowbug' && carsForStat('podiums', 5).join() === 'milkfloat' && carsForStat('hits', 25).join() === 'paperboy' && carsForStat('hits', 24).length === 0, 'a first win, five podiums and twenty-five hits each give a ROOKIE car');
  ok(C.grant(c, { kind: 'cup-pass', cup: 'rookie' }).length === 0, 'and nothing twice');
}

/* ---- from a career to a race ---- */
{
  const c = C.fresh(); c.cars.hornet = 1;
  startCup(c, 'rookie', 3);
  const s = setup(c, { kind: 'cup' });
  ok(s.entries.length === 8 && s.entries.filter(e => e.human).length === 1 && s.entries.every(e => e.id) && new Set(s.entries.map(e => e.id)).size === 8, 'a cup race has eight cars, one of them yours, each with a name');
  ok(s.entries.findIndex(e => e.id === 'you') === 5 && s.laps === 3 && s.rating === 0, 'in the first race you start sixth, three laps, ROOKIE');
  const you = s.entries.find(e => e.id === 'you');
  ok(you.kit && you.parts && you.mods && you.car === 'courier', 'your entry carries your garage: the kit, the sim\'s parts, the battery');
  c.run.race = 1; c.run.places.push(5); c.run.pts.you = 10; c.run.pts[c.run.rivals[0]] = 20;
  const s2 = setup(c, { kind: 'cup' });
  ok(s2.entries[0].id === c.run.rivals[0] && s2.entries.findIndex(e => e.id === 'you') === 1, 'after the first race the grid is the standings: the leader on pole, you where you are');
  const k = C.fresh(); k.cars.vector = 1; k.cars.minx = 1; k.cars.postie = 1; k.car = 'vector';
  ok(C.carFor(k, 4) === 'vector' && C.carFor(k, 3) === 'minx' && C.carFor(k, 1) === 'postie' && C.carFor(k, 0) === 'courier', 'the class rule: the car in the garage is used where it is allowed, and the best car that is allowed where it is not (' + [4, 3, 1, 0].map(r => C.carFor(k, r)).join(', ') + ')');
  startCup(k, 'rookie', 2); ok(setup(k, { kind: 'cup' }).swapped && setup(k, { kind: 'cup' }).entries.find(e => e.id === 'you').car === 'courier', 'a PRO car taken to the ROOKIE cup is swapped for the courier, and the race is told');
  ok(setup(k, { kind: 'single', track: 'sorting', v: 'f', rating: 0, n: 3, seed: 1 }).entries.find(e => e.id === 'you').car === 'vector', 'in a single race any car is allowed');
  const rp = [0, 1, 2, 3, 4].map(r => rivalParts(r, 1));
  ok(!rp[0].snowTyres && rp[2].snowTyres && !rp[2].iceChains && rp[3].iceChains && rp[0].headlights === false && rp[1].headlights, 'rivals have bought what a rival of the rating would: snow tyres from ADVANCED, chains from SEMI-PRO');
  const one = setup(C.fresh(), { kind: 'single', track: 'sorting', v: 'f', rating: 2, n: 3, seed: 5 });
  ok(one.entries.length === 3 && one.rating === 2, 'a single race of three cars');
  /* the player's livery is never a rival\'s, whatever is bought */
  let worst = 1, tried = 0;
  for (const paint of Object.keys(PAINT)) for (const plate of P.COSMETICS.plate.items.map(x => x.id)) {
    const look = playerLook({ paint, plate }); tried++;
    for (const r of RIVALS) { const d = liveryDiff({ num: look.num, stripe: look.stripe, pattern: 'band', logo: 'parcel', paint: look.paint }, { num: r.num, stripe: r.stripe, pattern: r.pattern, logo: r.logo, paint: r.paint }); worst = Math.min(worst, d); if (look.paint === r.paint || look.num === r.num) worst = 0; }
  }
  ok(worst >= 0.3, 'whatever paint and plate you buy, your car shares no paint or number with any rival and differs by at least 30 % of its pictures (' + (worst * 100).toFixed(0) + ' % at the nearest of ' + tried + ' looks)');
  void PLAYER;
}

/* ---- a whole race through the career ---- */
{
  const c = C.fresh();
  const s = setup(c, { kind: 'single', track: 'sorting', v: 'f', rating: 0, n: 4, seed: 11, laps: 1 }, { profile: HUMAN });
  const race = createRace({ track: s.track, entries: s.entries, laps: s.laps, rating: s.rating, seed: s.seed });
  const me = race.field.findIndex(f => f.entry.id === 'you'), tally = createTally(me);
  for (let i = 0; i < 60 * 120 && race.state !== 'done'; i++) { race.step(); tally.eat(race); }
  const rows = race.results(), mine = rows.find(r => r.id === 'you');
  ok(race.state === 'done' && rows.length === 4 && rows.every(r => r.id), 'a one-lap race of four runs to its end with every row named');
  const before = c.tips, res = C.finishRace(c, { kind: 'single', track: 'sorting', v: 'f', rating: 0, laps: 1, n: 4, place: mine.place, time: mine.time, tally, rows });
  ok(res.pay > 0 && c.tips === before + res.pay && c.earned === res.pay && res.lines.length >= 1, 'the race paid: ' + res.lines.map(l => l[0] + ' ' + l[1]).join(', ') + ' = ' + res.pay + ' TIPS');
  ok(c.stats.races === 1 && c.tracks['sorting:f'].races === 1 && c.tracks['sorting:f'].best === mine.time && c.tracks['sorting:f'].lap === tally.bestLap, 'and was counted, with its time and its best lap kept');
  const again = C.finishRace(c, { kind: 'single', track: 'sorting', v: 'f', rating: 0, laps: 1, n: 4, place: 1, time: mine.time - 1, tally: Object.assign({}, tally, { bestLap: tally.bestLap - 0.5 }), rows });
  ok(again.record && c.tracks['sorting:f'].best < mine.time, 'a faster time is a record the second time (and the first time is not)');
  const t = trackFor('sorting', 'r');
  ok(t.name === 'SORTING ROOM REVERSED', 'the reversed road is asked for by name and built (' + t.name + ')');
}
S.done();
