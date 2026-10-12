/* TROPHIES, the engine: pure (no window, no storage, no sound), so scripts/check-trophies.mjs can run all of it in Node. `createTrophies(env)` is handed what the
   machine does for it (read and write the one saved object, pay SUN, tell the rest of the machine) and gives back the evaluator.
   A trophy is a definition (apps/<id>/trophies.js, kernel/trophies_system.js) with one of five ways to be earned:
     on + when     an event with a payload and a predicate over it          T.emit('win', { maskLoss: 0 })
     stat          a counter reaching a number (add, max)                   T.add('flags'), T.max('chain', 25)
     sets          how many different things have been marked              T.mark('benches', 'cross')
     streak        consecutive successes, a failure resets                  T.streak('hiveWins', true)
     poll          a question the game asks at a checkpoint                 T.check('rack')
     derive        a rule over the other trophies (the meta set, the masteries)
   Everything an app does is `scope(app)`; every call catches its own exceptions, so a broken rule can never reach a person's run. The save is one object
   (templeos.trophies.v1): earned (id -> time), stats, sets, streaks, days, seen. Nothing in it belongs to a game's own save, so starting a game again takes nothing away. */
export const TIER_PAY = { B: 15, S: 40, G: 100 };
export const MASTERY_PAY = 150;
export const TIERS = ['B', 'S', 'G'];
export const KIND_CHIP = { progress: 'P', skill: 'S', explore: 'E', creative: 'C', meta: 'M', joke: 'J' };
const GRACE_DAYS = 1;

export function createTrophies(env) {
  const fresh = () => ({ v: 1, earned: {}, stats: {}, sets: {}, streaks: {}, days: [], seen: { near: {}, revealed: {} }, recent: [], pinned: null, pins: [], lang: 'en' });
  let st = fresh();
  try { const r = env.read && env.read(); if (r && typeof r === 'object' && r.v === 1) st = Object.assign(fresh(), r, { seen: Object.assign({ near: {}, revealed: {} }, r.seen || {}) }); } catch (e) { /* a save that will not read: start clean, the host keeps a copy */ }
  const defs = new Map(), byEvent = {}, byStat = {}, bySet = {}, byStreak = {}, byPoll = {}, derived = [];
  const apps = [];                                  /* app ids in the order they were registered, for the ledger's list */
  const subs = [];
  let held = 0, depth = 0;
  const T = { st: st, defs: defs, apps: apps };

  const save = () => { try { if (env.write) env.write(st); } catch (e) { /* storage full: the trophy still counts this session */ } };
  const tell = (evt, detail) => { try { if (env.announce) env.announce(evt, detail); } catch (e) { /* nobody listening */ } subs.forEach(f => { try { f(evt, detail); } catch (e) { /* a view that is gone */ } }); };
  T.onChange = f => { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; };
  const bag = (o, app) => o[app] || (o[app] = {});

  /* ---- definitions ------------------------------------------------------------------------------------------------------------------ */
  T.register = (app, list) => {
    if (apps.indexOf(app) < 0) apps.push(app);
    list.forEach(d => {
      if (defs.has(d.id)) throw new Error('trophy id used twice: ' + d.id);
      const def = Object.assign({ tier: 'B', kind: 'progress', secret: false, hint: null, scope: null, legacy: false, retired: false, until: null, progress: null }, d, { app: app });
      def.pay = def.pay !== undefined ? def.pay : (def.legacy ? 0 : TIER_PAY[def.tier]);
      defs.set(def.id, def);
      const on = Array.isArray(def.on) ? def.on : def.on ? [def.on] : [];
      on.forEach(e => { (byEvent[app + ':' + e] = byEvent[app + ':' + e] || []).push(def); });
      if (def.stat) (byStat[app + ':' + def.stat.key] = byStat[app + ':' + def.stat.key] || []).push(def);
      if (def.sets) (bySet[app + ':' + def.sets.key] = bySet[app + ':' + def.sets.key] || []).push(def);
      if (def.streak) (byStreak[app + ':' + def.streak.key] = byStreak[app + ':' + def.streak.key] || []).push(def);
      if (def.poll) (byPoll[app + ':' + def.poll.name] = byPoll[app + ':' + def.poll.name] || []).push(def);
      if (def.derive) derived.push(def);
    });
  };
  /* a game's mastery seal: derived, so a list that grows never needs its seal told */
  T.masteries = [];
  T.finalize = (masteryOf, payOf) => {
    masteryOf.forEach(m => {
      const own = () => [...defs.values()].filter(d => d.app === m.app && !d.legacy && !d.retired);
      const d = { id: 'mastery_' + m.app, app: 'meta', tier: 'S', kind: 'meta', mastery: m.app, name: 'MASTER OF ' + m.name, desc: 'Earn every trophy of ' + m.name + ' that is not a secret or a mirror.',
        pay: MASTERY_PAY, size: () => own().filter(x => !x.secret && !closed(x)).length, derive: () => { const l = own().filter(x => !x.secret && !closed(x)); return l.length > 0 && l.every(x => st.earned[x.id]); },
        progress: () => { const l = own().filter(x => !x.secret && !closed(x)); return [l.filter(x => st.earned[x.id]).length, l.length]; } };
      /* a seal's pay may be a function of how many trophies it asks for (kernel/trophy_rewards.js): a longer game is a bigger seal */
      if (payOf) d.pay = payOf(d.size());
      T.register('meta', [d]); T.masteries.push(d);
    });
    evalDerived();
  };

  /* ---- state the rules may read ------------------------------------------------------------------------------------------------------ */
  const closed = d => !!(d.retired || (d.until && safe(() => d.until(api(d.app)), null)));
  const safe = (f, dflt) => { try { return f(); } catch (e) { return dflt; } };
  const api = app => ({
    stat: k => (st.stats[app] && st.stats[app][k]) || 0,
    set: k => (st.sets[app] && st.sets[app][k]) || [],
    has: (k, v) => ((st.sets[app] && st.sets[app][k]) || []).indexOf(v) >= 0,
    streak: k => (st.streaks[app] && st.streaks[app][k]) || 0,
    earned: id => !!st.earned[id], days: st.days
  });
  T.api = api;
  T.earned = id => !!st.earned[id];
  T.closed = closed;
  T.open = () => [...defs.values()].filter(d => !closed(d));
  /* what counts: a trophy that is earned, new (not a mirror of one the game already had) */
  const counts = d => !d.legacy;
  T.count = (filter) => [...defs.values()].filter(d => st.earned[d.id] && counts(d) && (!filter || filter(d))).length;
  T.total = filter => [...defs.values()].filter(d => counts(d) && !closed(d) && (!filter || filter(d))).length;
  T.earnedList = filter => [...defs.values()].filter(d => st.earned[d.id] && (!filter || filter(d)));
  T.appCount = () => 30;                                   /* how many apps have a window: the host says (EVERY DOOR) */
  T.get = id => defs.get(id) || null;
  T.plainName = d => d.name && typeof d.name === 'object' ? d.name.en : String(d.name);
  T.hintOf = d => d.hint && typeof d.hint === 'object' ? d.hint.en : String(d.hint || '');
  T.plainDesc = d => d.desc && typeof d.desc === 'object' ? d.desc.en : String(d.desc);
  /* [have, need] for the bar on a card, or null */
  T.progressOf = d => {
    if (d.progress) return safe(() => d.progress(api(d.app), T), null);
    const a = api(d.app);
    if (d.stat) return [Math.min(a.stat(d.stat.key), d.stat.n), d.stat.n];
    if (d.sets) { const need = typeof d.sets.size === 'function' ? d.sets.size(T) : d.sets.size; return [Math.min(a.set(d.sets.key).length, need), need]; }
    if (d.streak) return [Math.min(a.streak(d.streak.key), d.streak.n), d.streak.n];
    return null;
  };

  /* ---- earning ---------------------------------------------------------------------------------------------------------------------- */
  const queue = [];
  T.pendingCards = []; T.cardsLive = false;       /* what was earned before the card could be shown (the long boot): the toast takes them when it mounts */
  function earn(d, quiet) {
    if (st.earned[d.id] || closed(d)) return false;
    st.earned[d.id] = env.now ? env.now() : Date.now();
    st.recent.unshift({ t: st.earned[d.id], kind: 'earn', id: d.id }); st.recent.length = Math.min(st.recent.length, 14);
    if (!quiet && d.pay > 0 && env.pay) safe(() => env.pay(d.pay, 'TROPHY: ' + d.name), 0);
    save();
    if (!quiet) { queue.push(d.id); if (!T.cardsLive) T.pendingCards.push(d.id); tell('trophy-earned', { id: d.id, app: d.app, tier: d.tier, name: d.name, secret: d.secret, kind: d.kind, mastery: !!d.mastery, epic: !!d.epic, pay: d.pay, held: held > 0 }); }
    tell('trophies-changed', {});
    evalDerived();
    return true;
  }
  function evalDerived() {
    if (depth > 4) return; depth++;
    try { derived.forEach(d => { if (!st.earned[d.id] && safe(() => d.derive(T), false)) earn(d); }); } finally { depth--; }
  }
  T.evalDerived = evalDerived;
  /* the ids earned since the last time this was asked (an end screen lists them: TROPHY: <NAME>) */
  T.drain = () => queue.splice(0);
  T.hold = () => { held++; };
  T.release = () => { held = Math.max(0, held - 1); tell('trophy-release', { held: held }); };
  T.held = () => held;

  /* a counter, a set or a streak moved: say how close the ones that are not earned yet have come (once each, at four fifths) */
  function near(d) {
    if (st.earned[d.id] || st.seen.near[d.id]) return;
    const p = T.progressOf(d); if (!p || p[1] < 3 || p[0] / p[1] < 0.8 || p[0] >= p[1]) return;
    st.seen.near[d.id] = 1;
    st.recent.unshift({ t: Date.now(), kind: 'near', id: d.id, have: p[0], need: p[1] }); st.recent.length = Math.min(st.recent.length, 14);
  }
  function judge(list) {
    (list || []).forEach(d => {
      if (st.earned[d.id]) return;
      const p = T.progressOf(d);
      if (p && p[0] >= p[1]) earn(d); else near(d);
    });
  }

  /* ---- what an app calls ------------------------------------------------------------------------------------------------------------ */
  T.emit = (app, name, payload) => {
    const got = [];
    try {
      (byEvent[app + ':' + name] || []).forEach(d => {
        if (st.earned[d.id]) return;
        if (safe(() => d.when ? d.when(payload || {}, api(app)) : true, false) && earn(d)) got.push(d.id);
      });
    } catch (e) { /* never into the game */ }
    return got;
  };
  T.add = (app, key, n) => { try { const s = bag(st.stats, app); s[key] = (s[key] || 0) + (n == null ? 1 : n); judge(byStat[app + ':' + key]); save(); } catch (e) { /* never into the game */ } };
  T.max = (app, key, v) => { try { const s = bag(st.stats, app); if (v > (s[key] || 0)) { s[key] = v; judge(byStat[app + ':' + key]); save(); } } catch (e) { /* never into the game */ } };
  T.mark = (app, key, v) => {
    try { const s = bag(st.sets, app); const a = s[key] || (s[key] = []); if (a.indexOf(v) < 0) { a.push(v); judge(bySet[app + ':' + key]); save(); } } catch (e) { /* never into the game */ }
  };
  T.streak = (app, key, ok) => { try { const s = bag(st.streaks, app); s[key] = ok ? (s[key] || 0) + 1 : 0; judge(byStreak[app + ':' + key]); save(); } catch (e) { /* never into the game */ } };
  T.check = (app, name) => { try { (byPoll[app + ':' + name] || []).forEach(d => { if (!st.earned[d.id] && safe(() => d.poll.fn(api(app)), false)) earn(d); }); } catch (e) { /* never into the game */ } };
  T.award = (id, quiet) => { try { const d = defs.get(id); return d ? earn(d, quiet) : false; } catch (e) { return false; } };
  T.scope = app => ({
    emit: (name, p) => T.emit(app, name, p), add: (k, n) => T.add(app, k, n), max: (k, v) => T.max(app, k, v), mark: (k, v) => T.mark(app, k, v),
    streak: (k, ok) => T.streak(app, k, ok), check: n => T.check(app, n), award: id => T.award(id), hold: T.hold, release: T.release, drain: T.drain,
    stat: k => api(app).stat(k), has: (k, v) => api(app).has(k, v), set: k => api(app).set(k)
  });

  /* ---- the calendar: the days the machine was opened, and how many in a row (a flat tyre does not end a streak: one missed day in seven is forgiven) -- */
  const dayNum = s => { const p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); };
  T.openDay = (day, month, dom) => {
    try {
      const last = st.days.length ? st.days[st.days.length - 1] : null;
      if (last && dayNum(day) < dayNum(last)) return T.dayStreak();                         /* the clock went backwards: ignore the day */
      if (last !== day) { st.days.push(day); if (st.days.length > 400) st.days.splice(0, st.days.length - 400); save(); }
      T.emit('system', 'open', { day: day, month: month, dom: dom, streak: T.dayStreak() });
      judgeDays();
    } catch (e) { /* never into the machine */ }
    return T.dayStreak();
  };
  T.dayStreak = () => {
    if (!st.days.length) return 0;
    let run = 1, missed = [];
    for (let i = st.days.length - 1; i > 0; i--) {
      const gap = dayNum(st.days[i]) - dayNum(st.days[i - 1]);
      if (gap === 1) { run++; continue; }
      if (gap === 2 && missed.filter(m => dayNum(st.days[i]) - m < 7).length < GRACE_DAYS) { missed.push(dayNum(st.days[i - 1]) + 1); run += 2; continue; }
      break;
    }
    return run;
  };
  function judgeDays() { const s = T.dayStreak(); bag(st.stats, 'system').dayStreak = Math.max(s, bag(st.stats, 'system').dayStreak || 0); judge(byStat['system:dayStreak']); }

  /* ---- backfill: what a person already did, found in their saves the first time the ledger loads (silent, no SUN, one card) -------------------------- */
  /* `pay`: a catch-up (a thing passed before its trophy could be reached) pays what the trophy is worth, quietly, because that SUN was never paid; the first backfill pays nothing */
  T.backfill = (ids, pay) => {
    let n = 0;
    ids.forEach(id => { const d = defs.get(id); if (d && !st.earned[id] && !closed(d)) { st.earned[id] = Date.now(); n++; if (pay && d.pay > 0 && env.pay) safe(() => env.pay(d.pay, 'TROPHY: ' + d.name), 0); } });
    if (n) { save(); tell('trophies-changed', {}); evalDerived(); }
    return n;
  };
  T.setStat = (app, key, v) => { try { const s = bag(st.stats, app); if (v > (s[key] || 0)) { s[key] = v; judge(byStat[app + ':' + key]); save(); } } catch (e) { /* never into the game */ } };
  /* a counter found in an old save: set silently, nothing earned by it (the ids the save proves were awarded already) */
  T.seed = (app, key, v) => { try { const s = bag(st.stats, app); if (v > (s[key] || 0)) { s[key] = v; save(); } } catch (e) { /* never into the game */ } };
  T.seedSet = (app, key, v) => { try { const s = bag(st.sets, app); const a = s[key] || (s[key] = []); if (a.indexOf(v) < 0) { a.push(v); save(); } } catch (e) { /* never into the game */ } };
  /* pins: any number (up to PIN_MAX) are kept; pinning one that is pinned lets it go. `pinned` is the newest, for the title bar. */
  const PIN_MAX = 12;
  const pinList = () => { if (!Array.isArray(st.pins)) st.pins = st.pinned ? [st.pinned] : []; return st.pins; };
  T.isPinned = id => pinList().indexOf(id) >= 0;
  T.pinsList = () => pinList().map(id => defs.get(id)).filter(Boolean);
  T.pin = id => {
    const a = pinList();
    if (!id) { st.pins = []; st.pinned = null; }
    else if (a.indexOf(id) >= 0) { a.splice(a.indexOf(id), 1); st.pinned = a[a.length - 1] || null; }
    else { a.push(id); if (a.length > PIN_MAX) a.shift(); st.pinned = id; }
    save(); tell('trophies-changed', {});
  };
  T.reset = () => { st = fresh(); T.st = st; save(); };
  T.save = save;
  return T;
}
