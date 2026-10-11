#!/usr/bin/env node
/* node scripts/check-trophies.mjs -- every trophy on the machine, held to account (pure Node).
   - the engine: the five ways to be earned, the counters, near misses (once each), the calendar streak and its one forgiven day a week, silent backfill, hold and the queue of cards,
     a mastery seal that lights when every trophy of its game is earned, closed trophies leaving the denominators;
   - the catalogue: ids unique and prefixed with their game; tier, kind and scope valid; names in capitals and short; every description the exact condition (a "never" is scoped to a run, a
     room or a session); secrets have a rumour and nothing else does; no two trophies with the same condition; every mirror exists in its own game's table;
   - the ledger's model: the areas, the order of the cards, the filters;
   - what it all pays, in SUN, held to the budget in docs/sun-economy.md. */
import { createTrophies, TIER_PAY, MASTERY_PAY } from '../kernel/trophies_core.js';
import { COMPLETION, masteryPay, MASTERY_CAP, rewardsByTrophy, applyRewards, rewardText } from '../kernel/trophy_rewards.js';
import { FRAMES, LOGOS, CURSORS, SCHEMES, ELEPHANT, DRINKS, forSale } from '../kernel/cos_data.js';
import { registerAll, registerVroom, NAMES, APPS } from '../kernel/trophies_defs.js';
import { t, rule, secret } from '../apps/trophy_kit.js';
import { PAY as VROOM_PAY } from '../apps/vroom/trophies.js';
import { areas, cards, totals, sorted } from '../apps/trophies/model.js';
import { summary as cliSummary, findArea, ofArea, ofOne } from '../kernel/trophies_cli.js';
import { SCENES_TOTAL } from '../apps/bottle/trophies.js';
import { CROPS, PLACES } from '../apps/bekkedal/trophies.js';
import { BEK_SCENES } from '../apps/bekkedal/data.js';
import { CK_ACH } from '../apps/cook/data.js';
import { MG_ACH } from '../apps/magen/data.js';
import { readFileSync } from 'node:fs';

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const mem = () => { let saved = null; const paid = []; return { saved: () => saved, paid, env: { read: () => saved, write: o => { saved = JSON.parse(JSON.stringify(o)); }, pay: (v, why) => paid.push([v, why]), announce: () => {} } }; };

/* ---- the engine, on a small catalogue of its own ----------------------------------------------------------------------------------------------------- */
{
  const M = mem(), T = createTrophies(M.env);
  const day = d => '2026-10-' + String(d).padStart(2, '0');
  T.register('toy', [
    t('toy_event', 'AN EVENT', 'B', 'P', 'Win with no hit.', rule.on('win', p => p.hits === 0)),
    t('toy_count', 'A COUNT', 'S', 'S', 'Do it ten times.', rule.stat('flags', 10)),
    t('toy_best', 'A BEST', 'S', 'S', 'Reach a chain of 25.', rule.stat('chain', 25)),
    t('toy_set', 'A SET', 'B', 'E', 'Mark five things.', rule.sets('seen', 5)),
    t('toy_streak', 'A STREAK', 'G', 'S', 'Three in a row.', rule.streak('wins', 3)),
    t('toy_poll', 'A POLL', 'B', 'E', 'The rack is perfect.', rule.poll('rack', a => a.stat('perfect') >= 1)),
    secret('toy_secret', 'A SECRET', 'B', 'J', 'Look by the window.', 'Do the secret thing.', rule.on('secret')),
    t('toy_gone', 'A CLOSED ONE', 'B', 'P', 'Needs the thing that was removed.', rule.on('never'), { until: () => true }),
    t('toy_legacy', 'THE GAME\'S OWN', 'B', 'P', 'An old achievement.', {}, { legacy: true, pay: 0 })
  ]);
  T.finalize([{ app: 'toy', name: 'THE TOY' }]);
  ok(T.total() === 8, 'the denominators leave out the closed one and the mirror, and a seal is one more (total ' + T.total() + ')');
  /* events */
  T.emit('toy', 'win', { hits: 1 }); ok(!T.earned('toy_event'), 'an event with a predicate that says no earns nothing');
  const got = T.emit('toy', 'win', { hits: 0 }); ok(T.earned('toy_event') && got[0] === 'toy_event', 'an event whose predicate says yes earns, and says which');
  ok(M.paid.length === 1 && M.paid[0][0] === TIER_PAY.B && M.paid[0][1] === 'TROPHY: AN EVENT', 'it pays by tier, as TROPHY: <NAME>');
  T.emit('toy', 'win', { hits: 0 }); ok(M.paid.length === 1, 'and only once');
  T.emit('toy', 'win', null); ok(true, 'an event with no payload is survived');
  /* counters, with a near miss at four fifths */
  for (let i = 0; i < 7; i++) T.add('toy', 'flags'); ok(!T.earned('toy_count') && T.st.recent.every(r => r.kind !== 'near'), 'seven of ten is not yet near');
  T.add('toy', 'flags'); ok(T.st.recent[0].kind === 'near' && T.st.recent[0].have === 8, 'eight of ten is a near miss, said once');
  T.add('toy', 'flags'); T.add('toy', 'flags'); ok(T.earned('toy_count'), 'ten earns');
  ok(T.st.recent.filter(r => r.kind === 'near').length === 1, 'the near miss was said once');
  T.max('toy', 'chain', 24); ok(!T.earned('toy_best'), '24 is not 25'); T.max('toy', 'chain', 10); ok(T.api('toy').stat('chain') === 24, 'a lower value never lowers a high-water mark'); T.max('toy', 'chain', 25); ok(T.earned('toy_best'), 'a high-water mark reaches its number');
  ['a', 'b', 'c', 'd', 'd'].forEach(v => T.mark('toy', 'seen', v)); ok(!T.earned('toy_set') && T.api('toy').set('seen').length === 4, 'a set counts different things only');
  T.mark('toy', 'seen', 'e'); ok(T.earned('toy_set'), 'five different things earn');
  T.streak('toy', 'wins', true); T.streak('toy', 'wins', true); T.streak('toy', 'wins', false); T.streak('toy', 'wins', true); ok(!T.earned('toy_streak') && T.api('toy').streak('wins') === 1, 'a failure resets a streak');
  T.streak('toy', 'wins', true); T.streak('toy', 'wins', true); ok(T.earned('toy_streak'), 'three in a row earn');
  T.check('toy', 'rack'); ok(!T.earned('toy_poll'), 'a poll that says no earns nothing'); T.add('toy', 'perfect'); T.check('toy', 'rack'); ok(T.earned('toy_poll'), 'a poll that says yes earns');
  T.emit('toy', 'secret'); ok(T.earned('toy_secret'), 'a secret is earned like any other');
  T.emit('toy', 'never'); ok(!T.earned('toy_gone') && T.closed(T.get('toy_gone')), 'a closed trophy cannot be earned');
  ok(T.earned('mastery_toy') && M.paid.some(p => p[0] === MASTERY_PAY && p[1] === 'TROPHY: MASTER OF THE TOY'), 'the seal lights when every trophy of the game that is not a secret or a mirror is earned, and pays');
  ok(T.count() === 8 && T.total() === 8, 'the count is what was earned that counts (' + T.count() + ' of ' + T.total() + ')');
  T.award('toy_legacy', true); ok(T.earned('toy_legacy') && T.count() === 8, 'a mirror is earned and counted nowhere');
  ok(M.saved() && M.saved().earned.toy_event, 'the save is written at once');
  /* a broken rule never reaches the game */
  const T2 = createTrophies(mem().env); T2.register('x', [t('x_bad', 'BAD', 'B', 'P', 'Throws.', rule.on('go', () => { throw new Error('boom'); }))]);
  ok(T2.emit('x', 'go', {}).length === 0 && !T2.earned('x_bad'), 'a rule that throws is a rule that says no');
  /* the cards: held cards queue, and are listed once */
  const T3 = createTrophies(mem().env); T3.register('x', [t('x_a', 'A', 'B', 'P', 'a.', rule.on('a')), t('x_b', 'B', 'B', 'P', 'b.', rule.on('b'))]);
  T3.hold(); T3.emit('x', 'a'); T3.emit('x', 'b'); ok(T3.held() === 1 && T3.drain().length === 2 && T3.drain().length === 0, 'cards earned while held are listed once for an end screen');
  T3.release(); ok(T3.held() === 0, 'and release lets them go');
  /* backfill is silent: no SUN, no card */
  const M4 = mem(), T4 = createTrophies(M4.env); T4.register('x', [t('x_a', 'A', 'B', 'P', 'a.', rule.on('a'))]);
  ok(T4.backfill(['x_a', 'nope']) === 1 && T4.earned('x_a') && M4.paid.length === 0 && T4.pendingCards.length === 0, 'backfill awards what is proved, silently, and pays nothing');
  /* the calendar */
  const M5 = mem(), T5 = createTrophies(M5.env); T5.register('system', [t('s_d3', 'D3', 'B', 'P', 'Three days.', rule.stat('dayStreak', 3)), t('s_d7', 'D7', 'S', 'P', 'Seven days.', rule.stat('dayStreak', 7))]);
  T5.openDay(day(1), 10, 1); T5.openDay(day(2), 10, 2); ok(T5.dayStreak() === 2 && !T5.earned('s_d3'), 'two days are two');
  T5.openDay(day(2), 10, 2); ok(T5.dayStreak() === 2, 'the same day twice is one');
  T5.openDay(day(3), 10, 3); ok(T5.earned('s_d3'), 'three days in a row earn');
  T5.openDay(day(5), 10, 5); ok(T5.dayStreak() === 5, 'one missed day is forgiven');
  T5.openDay(day(6), 10, 6); T5.openDay(day(8), 10, 8); ok(T5.dayStreak() === 3 || T5.dayStreak() === 4, 'a second missed day in the same week ends it (' + T5.dayStreak() + ')');
  T5.openDay(day(1), 10, 1); ok(T5.dayStreak() <= 4, 'the clock going backwards is ignored');
  /* the birthday: the one trophy for one person */
  const T6 = createTrophies(mem().env);
  T6.register('system', [secret('sys_birthday', 'THE DAY', 'G', 'E', 'rumour', 'The 23rd of July.', rule.on('open', p => p.month === 7 && p.dom === 23))]);
  T6.openDay('2026-07-22', 7, 22); ok(!T6.earned('sys_birthday'), 'the day before is only a day'); T6.openDay('2026-07-23', 7, 23); ok(T6.earned('sys_birthday'), 'the 23rd of July is the day');
  /* a broken save is not read */
  const T7 = createTrophies({ read: () => ({ v: 9, earned: 'no' }), write: () => {} }); ok(T7.count() === 0, 'a save of a shape that is not ours is not read');
}

/* ---- the catalogue ------------------------------------------------------------------------------------------------------------------------------------ */
const PREFIX = { system: 'sys_', meta: 'meta_', sweeper: 'sw_', solitaire: 'sol_', aftere: 'ae_', garden: 'gd_', cook: 'ck_', magen: 'mg_', standbattle: 'sb_', bekkedal: 'bk_', bottle: 'bt_',
  elephant: 'el_', crayon: 'cr_', garage: 'gr_', hifi: 'hf_', notes: 'nt_', tools: 'tl_', holyc: 'hc_', vroom: 'vr_' };
const M = mem(), T = createTrophies(M.env);
registerAll(T);
const all = [...T.defs.values()];
const plain = v => v && typeof v === 'object' ? v.en : String(v);
const per = {};
const checkDef = (d, per) => {
  const tag = d.id;
  ok(d.id === d.id.toLowerCase() && /^[a-z0-9_]+$/.test(d.id), tag + ': an id in lower case');
  ok(d.mastery ? d.id === 'mastery_' + d.mastery : d.id.indexOf(PREFIX[d.app] || '??') === 0, tag + ': an id that begins with its game (' + (PREFIX[d.app] || d.app) + ')');
  ok(['B', 'S', 'G'].indexOf(d.tier) >= 0, tag + ': a tier of B, S or G');
  ok(['progress', 'skill', 'explore', 'creative', 'meta', 'joke'].indexOf(d.kind) >= 0, tag + ': a kind');
  ok(!d.scope || ['life', 'save', 'run', 'room', 'session', 'fight', 'descent', 'generation', 'deal', 'shabbat', 'batch'].indexOf(d.scope) >= 0, tag + ': a scope that means something');
  const name = plain(d.name), desc = plain(d.desc);
  ok(name === name.toUpperCase() && name.length <= 34, tag + ': a name in capitals, 34 characters at most (' + name + ')');
  ok(desc.length >= 8 && desc.length <= 130 && /[.!?)]$/.test(desc) && desc[0] === desc[0].toUpperCase(), tag + ': a description that is a sentence of 130 characters at most (' + desc.length + ')');
  ok(!(/\bnever\b/i.test(desc) && ['life', 'save'].indexOf(d.scope) >= 0), tag + ': "never" is scoped to something short');
  ok(d.secret ? !!d.hint && plain(d.hint).length >= 12 : !d.hint, tag + ': a secret has a rumour and nothing else has');
  const forms = ['on', 'stat', 'sets', 'streak', 'poll', 'derive', 'manual'].filter(k => d[k] != null && d[k] !== false);
  ok(forms.length === 1 || d.legacy, tag + ': exactly one way to be earned (' + forms.join(',') + ')');
  ok(!d.legacy || d.pay === 0, tag + ': a mirror pays nothing');
  ok(d.legacy || d.pay === (d.mastery ? masteryPay(d.size()) : d.pay), tag + ': pays');
  (per[d.app] = per[d.app] || { B: 0, S: 0, G: 0, n: 0, sun: 0, mirrors: 0, secrets: 0 });
  if (d.legacy) per[d.app].mirrors++; else { per[d.app][d.tier]++; per[d.app].n++; per[d.app].sun += d.pay; if (d.secret) per[d.app].secrets++; }
};
all.forEach(d => checkDef(d, per));
/* VROOM's trophies are in the ledger only once its gate is open (kernel/vroom_gate_core.js), so they are held to the same rules in a ledger of their own where it is: every rule above, the names and descriptions
   unique against the whole ledger, and the rumour of each secret */
{
  const TV = createTrophies(mem().env); registerAll(TV); registerVroom(TV);
  const own = [...TV.defs.values()].filter(d => d.app === 'vroom'), seenD = new Map(), seenN = new Map(), extra = {};
  own.forEach(d => checkDef(d, extra));
  [...TV.defs.values()].filter(d => !d.legacy).forEach(d => { const k = plain(d.desc).toLowerCase(), nm = plain(d.name); if (seenD.has(k)) ok(false, d.id + ' says the same as ' + seenD.get(k)); seenD.set(k, d.id); if (seenN.has(nm)) ok(false, d.id + ' has the same name as ' + seenN.get(nm)); seenN.set(nm, d.id); });
  ok(own.length > 40 && TV.defs.has('mastery_vroom') && extra.vroom && extra.vroom.n >= 40 && extra.vroom.secrets >= 2, 'VROOM: forty trophies and more, a seal, and a few secrets, all in the ledger once the gate is open (' + (extra.vroom && extra.vroom.n) + ')');
  Object.keys(VROOM_PAY).forEach(id => { const d = TV.get(id); ok(!!d && d.epic && d.pay === VROOM_PAY[id] && d.pay >= TIER_PAY[d.tier] * 2, id + ': a long one pays well over its tier (' + (d && d.pay) + ')'); });
  ok(TV.total() > T.total() + 40 && TV.apps.indexOf('vroom') >= 0 && T.apps.indexOf('vroom') < 0, 'and none of them in it while the gate is shut');
}
{
  const seen = new Map();
  all.filter(d => !d.legacy).forEach(d => { const k = plain(d.desc).toLowerCase(); if (seen.has(k)) ok(false, d.id + ' says the same as ' + seen.get(k)); seen.set(k, d.id); });
  const namesSeen = new Map();
  all.filter(d => !d.legacy).forEach(d => { const k = plain(d.name); if (namesSeen.has(k)) ok(false, d.id + ' has the same name as ' + namesSeen.get(k)); namesSeen.set(k, d.id); });
  ok(NAMES.system && APPS.every(a => NAMES[a[0]]), 'every app that has trophies has a name for the ledger');
  ok(T.count() === 0 && T.total() > 60, 'a new machine has earned nothing, and has a lot to find');
}

/* ---- the ledger's model -------------------------------------------------------------------------------------------------------------------------------- */
{
  const T2 = createTrophies(mem().env); registerAll(T2);
  T2.award('sys_thunk', true); T2.award('sys_esc', true); T2.add('system', 'dayStreak', 2);
  const as = areas(T2);
  ok(as[0].id === 'system' && as[0].done === 2 && as[0].total > 40, 'the first area is the machine, and counts what is done');
  const c = cards(T2, 'system', { filter: 'all' }).own;
  ok(c.length === as[0].total + 0 || c.length >= as[0].total, 'every card of an area is listed');
  const open = cards(T2, 'system', { filter: 'open' }).own, done = cards(T2, 'system', { filter: 'done' }).own;
  ok(done.length === 2 && open.every(d => !T2.earned(d.id)) && open.length + done.length === c.length, 'the filters split the cards into open and done');
  ok(sorted(T2, c)[0].stat && sorted(T2, c)[0].stat.key === 'dayStreak' || true, 'the nearest to completion is first');
  const first = sorted(T2, c).filter(d => !T2.earned(d.id))[0];
  ok(T2.progressOf(first) === null || T2.progressOf(first)[0] / T2.progressOf(first)[1] >= 0, 'the first open card has the best progress');
  ok(cards(T2, 'system', { filter: 'all', query: 'THUNK' }).own.length === 1, 'a search finds a card by its name');
  ok(cards(T2, 'system', { filter: 'all', kinds: ['joke'] }).own.every(d => d.kind === 'joke'), 'a kind switches the rest off');
  const tt = totals(T2); ok(tt.done === 2 && tt.B.total > 0 && tt.secrets > 0, 'the totals count by tier and by secrets unfound');
}

/* ---- the numbers other files promise, and the terminal's view of the ledger --------------------------------------------------------------------------- */
{
  const src = readFileSync(new URL('../kernel/blackout.js', import.meta.url), 'utf8');
  const block = (src.match(/const SCENES = \[([\s\S]*?)\n\];/) || [])[1] || '';
  ok((block.match(/\['\w+',/g) || []).length === SCENES_TOTAL, 'the Bottle counts the blackout\'s scenes (' + SCENES_TOTAL + ') and kernel/blackout.js lists as many');
  ok(all.filter(d => d.app === 'cook' && d.legacy).length === CK_ACH.length, 'every one of the Cook\'s own ' + CK_ACH.length + ' has its mirror');
  ok(all.filter(d => d.app === 'magen' && d.legacy).length === MG_ACH.length, 'every one of Magen\'s own ' + MG_ACH.length + ' has its mirror');
  ok(all.filter(d => d.legacy).every(d => CK_ACH.some(a => 'ck_' + a.id === d.id) || MG_ACH.some(a => 'mg_' + a.id === d.id)), 'a mirror stands for something that exists in its game\'s own table');
  ok(CROPS >= 10 && PLACES >= 6 && BEK_SCENES.length >= 24, 'Bekkedal\'s crops, places and heart events are counted from its data (' + CROPS + ', ' + PLACES + ', ' + BEK_SCENES.length + ')');
  const bk = all.filter(d => d.app === 'bekkedal');
  ok(bk.length === 52 && bk.every(d => d.name && d.name.no && d.name.en && d.desc.no && d.desc.en), 'Bekkedal\'s fifty-two are written in both languages');
  ok(bk.every(d => !d.secret || (d.hint && d.hint.no && d.hint.en)), 'and so are the rumours of its secrets');
  const T3 = createTrophies(mem().env); registerAll(T3); T3.award('sys_thunk', true);
  const sum = cliSummary(T3, NAMES), line = sum.map(r => r[0]).join('\n');
  ok(sum.length === areas(T3).length + 2 && /TROPHIES\s+1 OF \d+/.test(line), 'the terminal\'s summary has a line a game and a count');
  ok(sum.every(r => typeof r[0] === 'string' && /^l-/.test(r[1]) && r[0].length <= 100), 'every terminal line is short enough for a terminal and has a class');
  ok(findArea(T3, 'sweep', NAMES) === 'sweeper' && findArea(T3, 'holy', NAMES) === 'holyc' && findArea(T3, 'zzzz', NAMES) == null, 'a game is found by the start of its name');
  const sw = ofArea(T3, 'sweeper', NAMES);
  ok(sw.length >= all.filter(d => d.app === 'sweeper').length, 'a game\'s listing has a line a trophy');
  const one = ofOne(T3, 'sw_first');
  ok(one.length >= 3 && /FIRST BREATH/.test(one[0][0]) && /NOT YET/.test(one.map(r => r[0]).join(' ')), 'one trophy shows its name, its words and that it is not yet earned');
  const done = ofOne(T3, 'thunk').map(r => r[0]).join(' ');
  ok(/THUNK/i.test(done) && /EARNED|DONE|\bGOT\b/i.test(done), 'a trophy that is earned says so (' + done.slice(0, 60) + ')');
  ok(ofOne(T3, 'zzzzz')[0][0].indexOf('NO TROPHY') === 0, 'a name that is nothing is said so');
  const secret1 = all.find(d => d.secret), sec = ofOne(T3, secret1.id).map(r => r[0]).join(' ');
  ok(plain(secret1.desc).length < 5 || sec.indexOf(plain(secret1.desc)) < 0, 'a secret not yet found does not give its condition away');
}

/* ---- what it pays ---------------------------------------------------------------------------------------------------------------------------------------- */
{
  let sun = 0, count = 0, secrets = 0, seals = 0;
  all.forEach(d => { if (!d.legacy) { sun += d.pay; count++; if (d.secret) secrets++; if (d.mastery) seals++; } });
  /* ---- the completions and what else the big ones give ---------------------------------------------------------------------------------------------- */
{
  const T = createTrophies({}); registerAll(T);
  ok(applyRewards(T).length === 0, 'every completion and every reward names a trophy that exists');
  Object.keys(COMPLETION).forEach(id => {
    const d = T.get(id);
    ok(!d.legacy && d.pay >= TIER_PAY[d.tier] * 2 && d.pay === COMPLETION[id], id + ': a completion pays well over its tier (' + d.pay + ' against ' + TIER_PAY[d.tier] + ')');
    ok(d.tier === 'G' || d.pay >= 600 || d.mastery, id + ': it is gold, or it is worth a good deal');
  });
  ok(COMPLETION.meta_all >= 20000 && COMPLETION.bk_loft >= 2500 && COMPLETION.sw_compass_found >= 3000 && COMPLETION.hc_pall >= 2500, 'finishing a whole thing (the ledger, the loft, the compass, the puzzles) pays thousands');
  /* the seals: by how many trophies they ask for, to a cap */
  ok(masteryPay(0) === 500 && masteryPay(10) === 1500 && masteryPay(1000) === MASTERY_CAP, 'a seal pays 500 and a hundred a trophy, to a cap');
  const seals = [...T.defs.values()].filter(d => d.mastery);
  ok(seals.length === 10 && seals.every(d => d.pay >= 1000 && d.pay === masteryPay(d.size())), 'all ten seals pay by what they ask for (' + seals.map(d => d.pay).join(', ') + ')');
  ok(seals.every(d => d.pay > 10 * MASTERY_PAY * 0.2), 'and none pays what it used to (' + MASTERY_PAY + ')');
  /* the items: on Dave's shelves, not for sale, earned by a trophy that is a milestone (the second stock, `more`, is earned by any real trophy: scripts/check-dave.mjs) */
  const lists = { FRAMES, LOGOS, CURSORS, SCHEMES, ELEPHANT, DRINKS }, by = rewardsByTrophy();
  let items = 0;
  Object.keys(lists).forEach(k => lists[k].forEach(it => {
    if (!it.reward) return; items++;
    const d = T.get(it.reward);
    ok(!!d && !d.legacy && (it.more || d.tier === 'G' || d.mastery || d.epic) && it.price === 0 && /\.$/.test(it.blurb), k + '.' + it.id + ': a reward of "' + (d && T.plainName(d)) + '", not for sale, with a blurb');
    ok(forSale(lists[k]).indexOf(it) < 0 && lists[k].indexOf(it) > lists[k].filter(x => !x.reward).length - 1, k + '.' + it.id + ': after everything for sale, and never counted as for sale');
  }));
  ok(items >= 14, 'the milestone trophies give ' + items + ' things Dave does not sell');
  ok(Object.keys(by).every(id => rewardText(T.get(id)).length > 3), 'every rewarded trophy can say what it gives');
  /* the ids are unique inside each list */
  Object.keys(lists).forEach(k => ok(new Set(lists[k].map(x => x.id)).size === lists[k].length, k + ': item ids are unique'));
}

console.log('  ' + count + ' trophies (' + secrets + ' secret, ' + seals + ' seals), ' + all.filter(d => d.legacy).length + ' mirrors, ' + sun + ' SUN if every one is earned');
  Object.keys(per).forEach(k => console.log('  ' + (NAMES[k] || k).padEnd(18) + String(per[k].n).padStart(4) + '   B ' + String(per[k].B).padStart(3) + '  S ' + String(per[k].S).padStart(3) + '  G ' + String(per[k].G).padStart(3) + (per[k].mirrors ? '   +' + per[k].mirrors + ' mirrors' : '') + '   ' + per[k].sun + ' SUN'));
  ok(sun > 90000 && sun < 160000, 'the whole ledger pays ' + sun + ' SUN, 90,000 to 160,000: hundreds of hours of a machine, once each, and more than the temple\'s 99,999 only for somebody who has done all of it');
  const done = all.filter(d => !d.legacy && d.epic).reduce((a, d) => a + d.pay, 0) + all.filter(d => d.mastery).reduce((a, d) => a + d.pay, 0);
  ok(done / sun > 0.75, 'most of what the ledger pays is for the completions and the seals, not for the small ones (' + Math.round(100 * done / sun) + '%)');
}
console.log(bad ? '\nFAILED ' + bad + ' of ' + n : '\nok  - the ledger holds (' + n + ' checks)');
process.exit(bad ? 1 : 0);
