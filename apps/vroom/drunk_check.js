#!/usr/bin/env node
/* node apps/vroom/drunk_check.js -- DRINK AND DRIVE (pure Node): the ten trophies are well formed, each one is earned by the events a drunk race makes and by nothing it should not
   be, and the watch only listens. Registered the way the gate does it (registerVroom), so the ledger of a machine whose gate is shut is untouched. */
import { createTrophies } from '../../kernel/trophies_core.js';
import { registerAll, registerVroom } from '../../kernel/trophies_defs.js';
import { TROPHIES } from './trophies.js';
import { watch } from './drunk_drive.js';

let bad = 0, checks = 0;
const ok = (c, m, x) => { checks++; if (!c) { bad++; console.log('FAIL ' + m + (x ? ' -- ' + x : '')); } };
const ledger = () => { const T = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} }); registerAll(T); return T; };

const dd = TROPHIES.filter(d => d.id.startsWith('vr_dd_'));
ok(dd.length === 10 && TROPHIES.length === 10, 'ten drink-and-drive trophies', String(dd.length));
ok(dd.every(d => d.id.startsWith('vr_')), 'every id begins vr_');
ok(dd.filter(d => d.secret).length === 2, 'two are secret');

{ const T = ledger(); ok(T.get('vr_dd_go') == null && T.apps.indexOf('vroom') < 0, 'shut gate: not in the ledger'); }

/* a pretend race: events the human's car makes, stepped through the watch */
function run(script, human) {
  const T = ledger(); registerVroom(T);
  const sc = T.scope('vroom'), emit = (n, p) => sc.emit(n, p);
  const obs = watch(emit), r = { state: 'racing', events: [] }, h = Object.assign({ i: 3, wrong: 0 }, human || {});
  for (const s of script) {
    if (s.state) r.state = s.state;
    r.events = s.ev || [];
    if (s.wrong != null) h.wrong = s.wrong;
    obs(r, h, { stage: s.stage || 0, out: !!s.out });
  }
  return T;
}
const has = (T, id) => T.earned(id);
const fin = (place, stage, extra) => ({ stage, ev: [{ type: 'finish', i: 3, place }], ...(extra || {}) });

{ const T = run([{ state: 'count', stage: 1, ev: [{ type: 'count', n: 0 }] }]); ok(has(T, 'vr_dd_go'), 'WARM at the green light: ONE FOR THE ROAD'); }
{ const T = run([{ state: 'count', stage: 0, ev: [{ type: 'count', n: 0 }] }]); ok(!has(T, 'vr_dd_go'), 'sober at the green light: nothing'); }
{ const T = run([{ stage: 0, ev: [{ type: 'flip', car: 3 }] }]); ok(!has(T, 'vr_dd_flip'), 'a sober flip is only a flip'); }
{ const T = run([{ stage: 2, ev: [{ type: 'flip', car: 3 }] }]); ok(has(T, 'vr_dd_flip'), 'BOTTLE FLIP'); }
{ const T = run([{ stage: 2, ev: [{ type: 'flip', car: 1 }] }]); ok(!has(T, 'vr_dd_flip'), 'a rival\'s flip is not yours'); }
{ const T = run([fin(1, 2)]); ok(has(T, 'vr_dd_win'), 'TIPSY TURISMO'); }
{ const T = run([fin(2, 5)]); ok(!has(T, 'vr_dd_win'), 'second place is not a win'); }
{ const T = run([fin(1, 1)]); ok(!has(T, 'vr_dd_win'), 'a win at WARM is not TIPSY'); }
{ const T = run([{ stage: 3, ev: [{ type: 'lap', i: 3, lap: 1 }] }]); ok(has(T, 'vr_dd_line'), 'WALK THE LINE: a clean lap at LOOSE'); }
{ const T = run([{ stage: 3, ev: [{ type: 'hit-wall', car: 3, speed: 5 }] }, { stage: 3, ev: [{ type: 'lap', i: 3, lap: 1 }] }]); ok(!has(T, 'vr_dd_line'), 'a wall spoils the lap'); }
{ const T = run([{ stage: 1, ev: [] }, { stage: 4, ev: [{ type: 'lap', i: 3, lap: 1 }] }]); ok(!has(T, 'vr_dd_line'), 'a lap that began at WARM does not count'); }
{ const T = run([{ stage: 4, wrong: 1 }, { stage: 4, wrong: 4.1 }]); ok(has(T, 'vr_dd_wrong'), 'THE OTHER WAY IS SHORTER'); }
{ const T = run([{ stage: 2, wrong: 5 }]); ok(!has(T, 'vr_dd_wrong'), 'the wrong way at TIPSY is only wrong'); }
{ const T = run([{ stage: 5, ev: [{ type: 'land', car: 3, airtime: 0.4 }] }]); ok(!has(T, 'vr_dd_air'), 'a hop is not a jump'); }
{ const T = run([{ stage: 5, ev: [{ type: 'land', car: 3, airtime: 0.8 }] }]); ok(has(T, 'vr_dd_air'), 'DOUBLE VISION'); }
{ const repo = { stage: 3, ev: [{ type: 'repo', car: 3 }] };
  const T = run([repo, repo, repo, repo]); ok(!has(T, 'vr_dd_taxi'), 'four rides is not five');
  const U = run([repo, repo, repo, repo, repo]); ok(has(U, 'vr_dd_taxi'), 'CALL ME A TAXI');
  const low = { stage: 2, ev: [{ type: 'repo', car: 3 }] }; ok(!has(run([low, low, low, low, low, low]), 'vr_dd_taxi'), 'being put back at TIPSY does not count'); }
{ const T = run([{ state: 'count', stage: 6, out: false }, { state: 'count', stage: 6, out: true }]); ok(has(T, 'vr_dd_grid'), 'PASSED OUT ON THE GRID'); }
{ const T = run([{ state: 'racing', stage: 6, out: true }]); ok(!has(T, 'vr_dd_grid'), 'a blackout in the race is not the grid'); }
{ const T = run([{ out: true, stage: 5 }, { out: false, stage: 4 }, fin(5, 4)]); ok(has(T, 'vr_dd_auto'), 'WHO IS DRIVING?'); }
{ const T = run([fin(1, 4)]); ok(!has(T, 'vr_dd_auto'), 'awake all race: not it'); }
{ const T = run([fin(1, 6)]); ok(has(T, 'vr_dd_clean'), 'ABOUT TO GO, ABOUT TO WIN'); }
{ const T = run([{ stage: 6, ev: [{ type: 'hit-wall', car: 3, speed: 3 }] }, fin(1, 6)]); ok(!has(T, 'vr_dd_clean'), 'a scratch spoils it'); }
{ const T = run([fin(1, 5)]); ok(!has(T, 'vr_dd_clean'), 'HAMMERED is not ABOUT TO GO'); }
/* a new race starts afresh */
{ const T = ledger(); registerVroom(T); const sc = T.scope('vroom'), obs = watch((n, p) => sc.emit(n, p)), h = { i: 3, wrong: 0 };
  const a = { state: 'racing', events: [{ type: 'hit-wall', car: 3, speed: 4 }] }; obs(a, h, { stage: 6, out: false });
  const b = { state: 'racing', events: [{ type: 'finish', i: 3, place: 1 }] }; obs(b, h, { stage: 6, out: false });
  ok(has(T, 'vr_dd_clean'), 'a wall in the last race is forgiven in the next'); }

console.log(bad ? bad + ' FAILED (of ' + checks + ')' : 'drunk_check: ok (' + checks + ' checks)');
process.exit(bad ? 1 : 0);
