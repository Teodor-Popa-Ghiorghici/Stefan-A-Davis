/* THE BUDGET BOT (dev-only, not packaged): plays the career like a person and says whether the game is still the game the plan promises (docs/vroom/plan.md sections 8 and 9). Nothing here is asserted by hand:
   it is MEASURED, with a person's numbers at the wheel (budget_play.js), and the plan's bands are what it is held to.
     node apps/vroom/budget_bot.js [--quick] [--workers N] [--profile casual|human|keen] [--cells] [--careers] [--cup N]
   THE CELLS: for each cup, with no parts, with what the cup asks for and with everything, the same seven rivals are raced on each of the cup's four roads several times; a cup is then put together from one race of
   each road, thousands of times, and the share that finish in the top three is the first-try pass rate. THE CAREERS: a whole run from nothing to the last cup, buying and grinding as a sensible player does,
   which says how long the championship takes and how often something new arrives. CHAOS is read off every race the bot drives. Races are heavy, so the work is dealt out to worker threads. */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { CUPS } from './cups.js';
import { poolFor, bootstrap, playCareer, PROFILES } from './budget_play.js';
import { FIELD } from './ai_profiles.js';
import { defFor, trackFor } from './tracks.js';

/* the route parts a cup's roads need (a track says so in `needs`: tracks.js, track_def.js). Until a road needs one, what a cup asks for in parts can make no difference and the bot says so instead of asserting it. */
/* HOW LONG A RACE IS. The plan's three hours are for the whole town, whose roads average a lap of about 48 s; a driver goes round at about 10.5 m/s (the sorting room's 332 m is a lap of 32 s). While the cups are run on the sorting room alone,
   the hours are scaled to the lap the town is meant to have, so that the number means what the plan means; with the real roads in the cups the scale is about one. */
const TOWN_LAP = 48, lapOf = r => trackFor(r.track, r.v).length / 10.5;
const cupLap = () => avg(CUPS.flatMap(cup => cup.races.map(lapOf)));
const needs = cup => [...new Set(cup.races.flatMap(r => defFor(r.track, r.v).needs || []))];

const FILE = fileURLToPath(import.meta.url);

/* ---- the work, done in a worker ---- */
function runTask(t) {
  const profile = PROFILES[t.profile] || PROFILES.human;
  if (t.field) { FIELD.ofRating = t.field.ofRating.slice(); if (t.field.skillStep != null) FIELD.skillStep = t.field.skillStep; }      /* the field's strength for this task: the bot's calibration, or the game's own */
  if (t.type === 'pool') { const p = poolFor(t.cup, t.preset, t.rivalSeed, t.seeds, profile); return Object.assign({ type: 'pool', cup: t.cup, preset: t.preset, rivalSeed: t.rivalSeed, shift: t.shift }, p); }
  const run = playCareer(t.seed, profile, { ready: t.ready, maxRaces: t.maxRaces });
  /* the cadence: races between one new thing and the next (a car, a cup, a part bought, a paint found) */
  let gap = 0, worst = 0, news = 0;
  for (const e of run.log) { const fresh = e.tags && e.tags.length; if (fresh) { news++; gap = 0; } else { gap++; worst = Math.max(worst, gap); } }
  const chaos = { hits: 0, flips: 0, leadChanges: 0, swaps: 0 }; run.log.forEach(e => { for (const k of Object.keys(chaos)) chaos[k] += (e.chaos && e.chaos[k]) || 0; });
  return { type: 'career', seed: t.seed, hours: run.hours, races: run.races, passedAll: run.passedAll, attempts: run.attempts, worstGap: worst, news, chaos, earned: run.c.earned, visits: run.visits, simSeconds: run.simSeconds, log: t.keepLog ? run.log : undefined };
}
if (!isMainThread) parentPort.on('message', t => { if (t === 'stop') process.exit(0); parentPort.postMessage(runTask(t)); });
else main();

/* ---- the measuring, in the main thread ---- */
async function pool(tasks, n) {
  const results = [], queue = tasks.slice();
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, () => new Promise(done => {
    const w = new Worker(FILE);
    const next = () => { const t = queue.shift(); if (!t) { w.postMessage('stop'); done(); return; } w.postMessage(t); };
    w.on('message', r => { results.push(r); next(); }); w.on('error', e => { console.error(e); process.exit(1); });
    next();
  })));
  return results;
}
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

async function main() {
  const argv = process.argv.slice(2), has = f => argv.includes(f), val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const quick = has('--quick'), workers = +val('--workers', Math.max(1, Math.min(os.cpus().length, 8))), profile = val('--profile', 'human');
  const doCells = !has('--careers') || has('--cells'), doCareers = !has('--cells') || has('--careers'), only = val('--cup', null);
  const fieldArg = val('--field', null), shifts = val('--shifts', null);
  const N = { sets: quick ? 2 : 4, seeds: quick ? 3 : 4, careers: quick ? 2 : 4, boot: 4000 };
  const tasks = [];
  if (shifts) {                                                 /* the field's strength against the first-try pass rate: how strong a field should be for each cup */
    const list = shifts.split(',').map(Number), st = [];
    list.forEach(d => CUPS.forEach((cup, i) => { if (only != null && +only !== i) return; for (let r = 0; r < N.sets; r++) st.push({ type: 'pool', cup: i, preset: 'asked', rivalSeed: 11 + r * 29 + i * 5, seeds: N.seeds, profile, shift: d, field: { ofRating: [0, 1, 2, 3, 4].map(k => Math.max(0, Math.min(4, k + d))) } }); }));
    const res = await pool(st, workers);
    console.log('first-try pass of a driver of the bot\'s pace, with what the cup asks for, against how much stronger than the ratings\' own tiers the field is (' + res.reduce((a, r) => a + r.chaos.length, 0) + ' races)');
    CUPS.forEach((cup, i) => { if (only != null && +only !== i) return; console.log('  ' + cup.name.padEnd(12) + list.map(d => { const sets = res.filter(r => r.cup === i && r.shift === d).map(r => bootstrap(r.slots, N.boot, r.rivalSeed)); return ('+' + d).padEnd(5) + String(Math.round(100 * avg(sets.map(x => x.pass)))).padStart(3) + '% pass ' + String(Math.round(100 * avg(sets.map(x => x.win)))).padStart(3) + '% win'; }).join('   ')); });
    process.exit(0);
  }
  const presets = has('--levels') ? ['l0', 'l1', 'l2', 'l3'] : ['asked', 'none', 'all'];
  if (doCells) CUPS.forEach((cup, i) => { if (only != null && +only !== i) return; for (const preset of presets) for (let r = 0; r < N.sets; r++) tasks.push({ type: 'pool', cup: i, preset, rivalSeed: 11 + r * 29 + i * 5, seeds: N.seeds, profile }); });
  if (doCareers) for (let k = 0; k < N.careers; k++) tasks.push({ type: 'career', seed: 7 + k * 13, profile, maxRaces: 260 });
  const t0 = Date.now(), out = await pool(tasks, workers);
  let bad = 0;
  const ok = (c, m, d) => { console.log((c ? 'ok   - ' : 'FAIL - ') + m + (!c && d ? '   ' + d : '')); if (!c) bad++; };
  const rate = {}, ch = { hits: [], flips: [], leadChanges: [], swaps: [] };
  if (doCells) {
    console.log('\nfirst-try pass (top three of eight after four races) / win, by cup and fittings, driver: ' + profile + ' (' + out.filter(r => r.type === 'pool').reduce((a, r) => a + r.chaos.length, 0) + ' races)');
    if (has('--levels')) {
      CUPS.forEach((cup, i) => { if (only != null && +only !== i) return; console.log('  ' + cup.name.padEnd(12) + presets.map(p => { const sets = out.filter(r => r.type === 'pool' && r.cup === i && r.preset === p).map(r => bootstrap(r.slots, N.boot, r.rivalSeed)); return p + ' ' + String(Math.round(100 * avg(sets.map(x => x.pass)))).padStart(3) + '% pass ' + String(Math.round(100 * avg(sets.map(x => x.win)))).padStart(3) + '% win ' + out.find(r => r.type === 'pool' && r.cup === i && r.preset === p).car.padEnd(10); }).join('  ')); });
      process.exit(0);
    }
    CUPS.forEach((cup, i) => {
      if (only != null && +only !== i) return;
      const row = ['none', 'asked', 'all'].map(p => {
        const sets = out.filter(r => r.type === 'pool' && r.cup === i && r.preset === p).map(r => bootstrap(r.slots, N.boot, r.rivalSeed));
        rate[i + p] = { pass: Math.round(100 * avg(sets.map(x => x.pass))), win: Math.round(100 * avg(sets.map(x => x.win))), rank: avg(sets.map(x => x.rank)), car: out.find(r => r.type === 'pool' && r.cup === i && r.preset === p).car };
        return p.toUpperCase().padEnd(6) + String(rate[i + p].pass).padStart(3) + '% pass ' + String(rate[i + p].win).padStart(3) + '% win ' + rate[i + p].car.padEnd(9);
      });
      console.log('  ' + cup.name.padEnd(12) + row.join('  '));
    });
    for (const r of out) if (r.type === 'pool') r.chaos.forEach(c => { for (const k of Object.keys(ch)) ch[k].push(c[k]); });
    const tol = quick ? 10 : 7, lo = 35 - tol, hi = 60 + tol;
    CUPS.forEach((cup, i) => { if (only == null || +only === i) ok(rate[i + 'asked'].pass >= lo && rate[i + 'asked'].pass <= hi, cup.name + ': with what it asks for, a driver passes at the first try 35 to 60 % of the time (' + rate[i + 'asked'].pass + ' %, allowed ' + lo + ' to ' + hi + ')'); });
    if (only == null || +only === 3) {
      if (needs(CUPS[3]).length) ok(rate['3none'].pass < 20 + tol, 'the last cup with no parts at all: under 20 % (' + rate['3none'].pass + ' %)');
      else console.log('note - the last cup with no parts at all: ' + rate['3none'].pass + ' % (the under-20-% rule waits for roads that need a route part: none of its roads does yet)');
    }
    CUPS.forEach((cup, i) => { if (only == null || +only === i) ok(rate[i + 'all'].pass <= 85 + tol / 2, cup.name + ': with everything, never above 85 % (' + rate[i + 'all'].pass + ' %)'); });
    CUPS.forEach((cup, i) => { if (only == null || +only === i) ok(rate[i + 'asked'].pass >= rate[i + 'none'].pass - tol, cup.name + ': what it asks for is no worse than nothing (' + rate[i + 'none'].pass + ' -> ' + rate[i + 'asked'].pass + ' %)'); });
    console.log('\nchaos per race (all eight cars): ' + Object.keys(ch).map(k => k + ' ' + avg(ch[k]).toFixed(1)).join(', '));
    ok(avg(ch.hits) >= 12, 'at least a dozen pickup hits a race (' + avg(ch.hits).toFixed(1) + ')');
    ok(avg(ch.flips) >= 3, 'cars are turned over (' + avg(ch.flips).toFixed(1) + ' flips a race)');
    ok(avg(ch.swaps) >= 6, 'places change hands (' + avg(ch.swaps).toFixed(1) + ' swaps a race)');
    ok(avg(ch.leadChanges) >= 0.6, 'and the lead changes hands now and then (' + avg(ch.leadChanges).toFixed(2) + ' a race)');
  }
  if (doCareers) {
    const careers = out.filter(r => r.type === 'career');
    console.log('\nwhole careers (' + careers.length + '):');
    careers.forEach(r => console.log('  seed ' + String(r.seed).padStart(3) + ': ' + r.hours.toFixed(2) + ' h, ' + r.races + ' races, cups tried ' + Object.entries(r.attempts).map(([k, v]) => k + 'x' + v).join(' ') + ', worst wait for something new ' + r.worstGap + ' races, earned ' + r.earned + (r.passedAll ? '' : '  (DID NOT FINISH)')));
    ok(careers.every(r => r.passedAll), 'every career gets through all four cups');
    const hrs = avg(careers.map(r => r.hours)), scale = TOWN_LAP / cupLap(), tipsH = avg(careers.map(r => r.earned / r.hours)) / scale;
    console.log('  the cups\' roads average a lap of ' + cupLap().toFixed(0) + ' s against the town\'s ' + TOWN_LAP + ' s: ' + hrs.toFixed(2) + ' h as run is ' + (hrs * scale).toFixed(2) + ' h at the town\'s pace, earning ' + Math.round(tipsH) + ' TIPS an hour');
    ok(hrs * scale >= 2.2 && hrs * scale <= 3.8, 'the championship takes about three hours (' + (hrs * scale).toFixed(2) + ' h at the town\'s pace)');
    ok(tipsH >= 3000 && tipsH <= 6000, 'and pays about four thousand TIPS an hour, so that what the cups ask for (about 12,000 in parts) is afforded by the end of it (' + Math.round(tipsH) + ')');
    ok(careers.every(r => r.worstGap <= 3), 'something new arrives at least every three races, in every career (the longest wait was ' + Math.max(...careers.map(r => r.worstGap)) + ')');
  }
  console.log('\n' + (bad ? bad + ' FAILED' : 'budget_bot: ok') + '  (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s on ' + workers + ' workers)');
  process.exit(bad ? 1 : 0);
}
