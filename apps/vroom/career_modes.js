/* WHAT THE OTHER MODES DO TO A CAREER (docs/vroom/plan.md section 9): a time trial's best lap and the challenge it may beat, a hidden star found in PRACTICE, one of the stunt yard's twenty, a LAST MILE delivered, a CLOCKWORK
   race run. Each is a function of the career and what happened, changes it, and says what it did (`news`, and the tips paid), as the functions of career.js do. Pure. */
import { grant } from './career.js';
import { CUPS } from './cups.js';
import { parOf, beaten, CHAIN } from './challenge.js';
import { trackKey } from './career.js';
import { CARS } from './cars.js';
import { TRACK_IDS } from './tracks.js';

export const STAR_TIPS = 80, YARD_TIPS = 40, YARD_STARS = 20, PAR_TIPS = 220;
const pay = (c, n) => { c.tips += n; c.earned += n; };
const NAME = { f: 'THE ROAD AS DRAWN', r: 'REVERSED', m: 'MIRRORED', rm: 'REVERSED MIRRORED' };

/* a time trial lap set: `o` is { track, v, lap, time, car }. A better lap is kept (and is the ghost's); beating the road's challenge for the first time opens the next variant and pays. */
export function ttFinish(c, o) {
  const key = trackKey(o.track, o.v), prev = c.tt[key], news = [], par = parOf(o.track, o.v), was = beaten(c, o.track, o.v);
  const record = !prev || o.lap < prev.lap - 1e-6;
  if (record) c.tt[key] = { lap: o.lap, time: o.time, car: o.car };
  let tips = 0;
  if (par != null && !was && beaten(c, o.track, o.v)) {
    tips += PAR_TIPS * (1 + (CARS[o.car] ? CARS[o.car].rating : 0)); news.push('CHALLENGE BEATEN');
    const next = Object.keys(CHAIN).find(v => CHAIN[v] === o.v); if (next) news.push(NAME[next] + ' IS OPEN');
  }
  pay(c, tips); c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { record, tips, news, par, beaten: par != null && c.tt[key] && c.tt[key].lap <= par };
}

/* a hidden star picked up in PRACTICE on a road: once only. Finding every road's star in a cup gives that cup's car (unlocks.js `stars`). */
export function starFound(c, track) {
  if (c.stars[track]) return { first: false, tips: 0, news: [] };
  c.stars[track] = 1; pay(c, STAR_TIPS);
  const news = ['STAR FOUND'];
  for (const cup of CUPS) {
    const roads = [...new Set(cup.races.map(r => r.track))];
    if (roads.includes(track) && roads.every(r => c.stars[r])) news.push(...grant(c, { kind: 'stars', cup: cup.id }));
  }
  c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { first: true, tips: STAR_TIPS, news };
}
export const starsFound = c => TRACK_IDS.filter(t => c.stars[t]).length;

/* one of the stunt yard's twenty stars (ids 0 to 19); all twenty give THE CAT */
export function yardStar(c, id) {
  const k = String(id);
  if (c.yard[k] || !(id >= 0 && id < YARD_STARS)) return { first: false, tips: 0, news: [] };
  c.yard[k] = 1; pay(c, YARD_TIPS);
  const news = ['YARD STAR ' + Object.keys(c.yard).length + '/' + YARD_STARS];
  if (Object.keys(c.yard).length >= YARD_STARS) news.push(...grant(c, { kind: 'stunt' }));
  c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { first: true, tips: YARD_TIPS, news };
}
export const yardCount = c => Object.keys(c.yard).length;

/* a LAST MILE run: `o` is { track, v, delivered, perfect, tips, win }. Tips are the parcels' (lastmile.js); a run that wins on a road for the first time gives the PHONE BOX (the first win anywhere). */
export function lastMileDone(c, o) {
  const key = trackKey(o.track, o.v), news = [];
  c.lm.runs++; c.lm.delivered += o.delivered; c.lm.perfect += o.perfect;
  if (o.tips > (c.lm.best[key] || 0)) c.lm.best[key] = o.tips;
  pay(c, o.tips);
  if (o.win && c.lm.runs >= 1) news.push(...grant(c, { kind: 'lastmile' }));
  c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { news, tips: o.tips };
}

/* a CLOCKWORK race: `o` is { place, n, tips }; winning one gives the SNOWMAN */
export function clockworkDone(c, o) {
  c.cw.races++; const news = [];
  if (o.place === 1) { c.cw.wins++; news.push(...grant(c, { kind: 'clockwork' })); }
  c.cw.best = Math.max(c.cw.best, o.n - o.place + 1);
  pay(c, o.tips);
  c.news.push(...news); if (c.news.length > 20) c.news.splice(0, c.news.length - 20);
  return { news, tips: o.tips };
}
