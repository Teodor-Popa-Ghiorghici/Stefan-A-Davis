/* VROOM's music check -- `node apps/vroom/music_check.js`
 *
 * Pure Node: no audio, no window. What cannot be heard from here is held to numbers instead.
 *
 *  THE SCORE   every melody bar is exactly a bar long and has a chord; the lead sits on its chord on the strong beats; nothing is outside F minor or the chord of its bar; every instrument exists, every drum is
 *              in the kit and every pattern tiles the song; no note is unplayable or rings past the end; no track is silent.
 *  THE POOLS   six drum and bass tunes at 172 and three lo-fi at 86, each a pass of the same length (so a change of station lands on the grid), no two alike (tempo, chords, the lead's instrument), a band that is
 *              a real band (a core that is a tune on its own, and two layers with parts in them).
 *  THE LOOP    every tune ends on a chord that leads to the first, and its last note is on it.
 *  THE STINGS  a win in F major and a miss in F minor, between two and eight seconds.
 *  THE RACE    music_heat.js over real races: nothing before the light, the last lap only on the last lap, a fight for a good part of a race and not all of it, every number in 0..1, and a hit or a fuse
 *              asks for the fight.
 *  THE RADIO   the controller against a fake deck: silence with the sound off, NIGHT in the menus and RACE on a day road, a night road NIGHT, V takes the other station and is remembered, the layers ride the
 *              race in small steps and nothing restarts, a stinger takes the place of the music and gives it back, stop() leaves nothing behind.
 */
import { readFileSync } from 'node:fs';
import * as Lang from '../../kernel/songtext.js';
import { IDS, RACE_IDS, NIGHT_IDS, POOLS, LAYERS, STINGS, NAMES, song as scoreOf, sting as stingOf, passSecs, secsOf } from './score.js';
import { RACE, NIGHT, TUNES } from './tunes.js';
import { BREAKS, BASS, kit } from './breaks.js';
import { MODE, misfit } from './score_kit.js';
import { heat, lastOf, fightOf, LAYER_KEYS, FEEL, lean, NEAR, FAR } from './music_heat.js';
import { createMusic, AUTO, STATIONS, PUSH, TAIL } from './music.js';
import { suite } from './check_kit.js';
import { buildTrack } from './track_build.js';
import { TRACKS } from './track_def.js';
import { createRace } from './race.js';
import { fieldFor } from './rivals.js';

const S = suite('music_check');
const INSTRUMENTS = new Set(JSON.parse(readFileSync(new URL('../../assets/instruments/index.json', import.meta.url))).instruments.map(i => i.id).concat(['drums']));
const DRUMS = new Set(['kick', 'snare', 'stick', 'clap', 'hat', 'openhat', 'lotom', 'midtom', 'hitom', 'crash', 'ride', 'cowbell', 'tamb', 'shaker']);
const F_MAJOR = [5, 7, 9, 10, 0, 2, 4];

/* ---- the score ---- */
for (const id of IDS) {
  const d = TUNES[id], ch = d.chords.split(' '), bad = [];
  if (d.melody.length !== 16 || ch.length !== 16) bad.push('sixteen bars and sixteen chords: ' + d.melody.length + '/' + ch.length);
  d.melody.forEach((b, i) => { const len = Lang.parseNotes(b).length_; if (Math.abs(len - 4) > 1e-9) bad.push('bar ' + (i + 1) + ' is ' + len); });
  ch.forEach(c => { try { Lang.chordNotes(c, 48); } catch (e) { bad.push('chord ' + c); } });
  const sg = scoreOf(Lang, id), want = RACE[id] ? 32 : 16;
  if (sg.bars !== want || sg.beats !== 4 || sg.bpm !== d.bpm || sg.key !== 'F' || sg.scale !== 'minor') bad.push('song does not match its tune');
  S.ok(!bad.length, id + ': sixteen bars of four beats, a chord for each, the song is the tune', bad.join('; '));
}
S.ok(!misfit.length, 'every bar of every part is exactly a bar long', misfit.slice(0, 3).join(' / '));
const badNote = n => !(n[1] > 0 && n[0] >= 0 && n[2] >= 24 && n[2] <= 108 && n[3] > 0 && n[3] <= 1.0001);
for (const [id, sg] of IDS.map(i => [i, scoreOf(Lang, i)]).concat(STINGS.map(i => [i, stingOf(Lang, i)]))) {
  const len = Lang.songLength(sg);
  const wrong = sg.tracks.filter(t => (t.notes || []).some(badNote) || (t.hits || []).some(h => !(h[0] >= 0 && h[0] < len && DRUMS.has(h[1]))));
  const over = sg.tracks.filter(t => (t.notes || []).some(n => n[0] >= len || n[0] + n[1] > len + 0.5));
  const unk = sg.tracks.filter(t => !INSTRUMENTS.has(t.inst));
  const silent = sg.tracks.filter(t => (t.inst === 'drums' ? t.hits : t.notes).length === 0);
  const ids = new Set(sg.tracks.map(t => t.id));
  S.ok(!wrong.length && !over.length && !unk.length && !silent.length && ids.size === sg.tracks.length, id + ': every note playable, inside the song, an instrument that exists, no silent track', wrong.concat(over, unk, silent).map(t => t.name + ':' + t.inst).join(', '));
}
for (const id of Object.keys(BREAKS)) {
  const b = BREAKS[id], pieces = [].concat(Object.keys(b).filter(k => k !== 'fill').map(k => [k, b[k]]), Object.keys(b.fill || {}).map(k => ['fill ' + k, b.fill[k]]));
  S.ok(pieces.every(p => p[1].length === 16 && /^[xXo.]+$/.test(p[1]) && DRUMS.has(p[0].replace('fill ', ''))), 'break ' + id + ': every piece is a real drum and sixteen sixteenths', pieces.filter(p => p[1].length !== 16).map(p => p[0]).join(','));
}
for (const id of Object.keys(BASS)) S.ok(BASS[id].every(h => h[0] >= 0 && h[0] + h[1] <= 4.0001 && ['r', '5', '8'].includes(h[2])), 'bass pattern ' + id + ' fits its bar');
for (const id of IDS) { const k = kit((RACE[id] || NIGHT[id]).brk, RACE[id] ? 32 : 16); S.ok(Object.values(k).every(s => s.length === (RACE[id] ? 512 : 256)), id + ': its break tiles the song'); }

/* ---- the key ---- */
const outside = (id, sg, mode, chords) => {
  const out = new Set();
  sg.tracks.forEach(t => (t.notes || []).forEach(n => {
    const pc = n[2] % 12, bar = Math.floor(n[0] / 4);
    if (mode.includes(pc)) return;
    const sym = chords ? chords[Math.min(bar, chords.length - 1)] : null;
    if (sym && Lang.chordNotes(sym, 60).some(x => x % 12 === pc)) return;
    out.add(Lang.pcName(pc) + ' in ' + t.name + ' bar ' + (bar + 1));
  }));
  return [...out];
};
for (const id of IDS) {
  const d = TUNES[id], ch = d.chords.split(' ');
  const full = RACE[id] ? ch.concat(ch) : ch;
  const out = outside(id, scoreOf(Lang, id), MODE, full);
  S.ok(!out.length, id + ': nothing outside F minor or the chord of its bar', out.slice(0, 4).join(', '));
}
for (const id of IDS) {
  const d = TUNES[id], ch = d.chords.split(' '), mel = Lang.parseNotes(d.melody.join(' | '));
  let strong = 0, on = 0;
  mel.forEach(n => {
    const bar = Math.min(15, Math.floor(n[0] / 4)), at = n[0] - bar * 4;
    if (Math.abs(at % 1) < 1e-6 && (at === 0 || at === 2)) { strong++; if (Lang.chordNotes(ch[bar], 60).some(x => x % 12 === n[2] % 12)) on++; }
  });
  S.ok(on / strong >= 0.7, id + ': ' + on + ' of ' + strong + ' strong-beat notes of the lead are chord tones', ((on / strong) * 100).toFixed(0) + '%');
}

/* ---- the pools ---- */
S.ok(RACE_IDS.length === 6 && NIGHT_IDS.length === 3 && POOLS.race.length === 6 && POOLS.night.length === 3, 'six tunes on the race station and three on the night station');
S.ok(RACE_IDS.every(id => RACE[id].bpm === 172) && NIGHT_IDS.every(id => NIGHT[id].bpm === 86), 'the race is drum and bass at 172 and the night half of it, 86: both stations share a beat grid');
S.ok(IDS.every(id => Math.abs(passSecs(id) - passSecs(IDS[0])) < 0.01) && passSecs(IDS[0]) > 40 && passSecs(IDS[0]) < 50, 'every tune is one pass of the same length (a change of station lands on a bar), ' + passSecs(IDS[0]).toFixed(1) + ' s');
S.ok(new Set(IDS.map(id => TUNES[id].chords)).size === IDS.length, 'no two tunes have the same chords');
S.ok(new Set(RACE_IDS.map(id => RACE[id].lead)).size === RACE_IDS.length && new Set(RACE_IDS.map(id => RACE[id].brk)).size === RACE_IDS.length, 'no two race tunes share a lead instrument or a break');
S.ok(new Set(IDS.map(id => NAMES[id])).size === IDS.length && IDS.every(id => /^[A-Z ]{3,24}$/.test(NAMES[id])), 'nine names, in capitals, none alike');
for (const id of IDS) {
  const sg = scoreOf(Lang, id), have = [...new Set(sg.tracks.map(t => t.layer).filter(Boolean))].sort(), by = k => sg.tracks.filter(t => t.layer === k).length, core = sg.tracks.filter(t => t.layer == null).length;
  S.ok(JSON.stringify(have) === JSON.stringify(LAYERS.slice().sort()) && by('last') >= 2 && by('fight') >= 2 && core >= 5, id + ': a core of ' + core + ' (a tune alone) and layers last ' + by('last') + ' / fight ' + by('fight'));
}
{
  const insts = new Set(); IDS.forEach(id => scoreOf(Lang, id).tracks.forEach(t => insts.add(t.inst)));
  S.ok(insts.size >= 22, 'between them the nine use twenty-two real instruments or more', insts.size + ': ' + [...insts].sort().join(' '));
  const dens = id => { const s = scoreOf(Lang, id); return s.tracks.reduce((a, t) => a + (t.notes || t.hits || []).length, 0) / passSecs(id); };
  S.ok(dens('sender') > dens('overnight'), 'RETURN TO SENDER plays more notes a second than OVERNIGHT', dens('sender').toFixed(1) + ' > ' + dens('overnight').toFixed(1));
}

/* ---- the loop ---- */
for (const id of IDS) {
  const d = TUNES[id], ch = d.chords.split(' '), mel = Lang.parseNotes(d.melody.join(' | ')), last = mel[mel.length - 1], lastBar = mel.filter(n => n[0] >= 60);
  S.ok(/^(C|C7|Fm7?)$/.test(ch[15]) && /^(Fm7?|Bbm7?|Db|Dbmaj7)$/.test(ch[0]), id + ': it ends on a chord that leads to the first', ch[15] + ' > ' + ch[0]);
  S.ok(Lang.chordNotes(ch[15], 60).some(x => x % 12 === last[2] % 12) && lastBar.length > 0, id + ': and its last note is in that chord');
}

/* ---- the stingers ---- */
for (const id of STINGS) {
  const sg = stingOf(Lang, id), secs = secsOf(sg), mode = id === 'win' ? F_MAJOR : MODE, out = outside(id, sg, mode, null);
  S.ok(secs >= 2 && secs <= 8, id + ': ' + secs.toFixed(1) + ' s (two to eight)');
  S.ok(!out.length, id + ': in ' + (id === 'win' ? 'F major' : 'F minor'), out.join(', '));
  const lastBeat = sg.bars * 4 - 4, endPcs = new Set(); sg.tracks.forEach(t => (t.notes || []).forEach(n => { if (n[0] >= lastBeat - 0.01) endPcs.add(n[2] % 12); }));
  S.ok(endPcs.has(5) && endPcs.has(0) && (id === 'win' ? endPcs.has(9) && !endPcs.has(8) : endPcs.has(8) && !endPcs.has(9)), id + ': ends on a ' + (id === 'win' ? 'major' : 'minor') + ' chord on F', [...endPcs].join(' '));
}

/* ---- the race ---- */
const track = buildTrack(TRACKS.sorting);
function race(seed) {
  const e = fieldFor(0, 7, seed); e.push({ id: 'you', name: 'YOU', car: 'courier', tier: 0, proxy: true });
  return createRace({ track, entries: e, rating: 0, seed, laps: 3 });
}
{
  const r = race(5), me = r.field[7], per = [], seen = { early: 0, late: 0, lastBefore: 0, fightN: 0, steps: 0 };
  let ranged = true, sinceHit = 99, countClean = true, hitUp = true, over = false;
  for (let i = 0; i < 60 * 240 && r.state !== 'done'; i++) {
    r.step();
    for (const e of r.events) if (e.type === 'hit' && e.i === me.i) sinceHit = 0;
    sinceHit += 1 / 60;
    const h = heat(r, me, sinceHit);
    if (!(h.last >= 0 && h.last <= 1 && h.fight >= 0 && h.fight <= 1)) ranged = false;
    if (r.state === 'count' && (h.last || h.fight)) countClean = false;
    if (r.state === 'racing') {
      seen.steps++; if (h.fight > 0.1) seen.fightN++;
      if (me.lap < 2 && h.last > 0) seen.lastBefore++;
      if (me.lap >= 2 && h.last > 0.99) seen.late++;
    }
    if (me.lap === 2 && !over) { over = true; per.push(h.last); }
  }
  S.ok(ranged, 'both numbers are always in 0..1');
  S.ok(countClean, 'on the grid there is only the core of the tune');
  S.ok(seen.lastBefore === 0, 'the last lap is not asked for before the last lap begins');
  S.ok(seen.late > 60 * 5, 'and is all the way in for the rest of it', (seen.late / 60).toFixed(0) + ' s');
  const share = seen.fightN / seen.steps;
  S.ok(share > 0.2 && share < 0.9, 'a fight is asked for a good part of a race and not all of it', (share * 100).toFixed(0) + '% of the race');
  const live = race(6), mine = live.field[7];
  for (let i = 0; i < 60 * 8; i++) live.step();
  const dists = live.field.map(g => g.dist); live.field.forEach(g => { if (g !== mine) g.dist += 500; });          /* alone on the road: only a hit can ask for the fight */
  S.ok(live.state === 'racing' && fightOf(live, mine, 99) === 0 && fightOf(live, mine, 0.2) > 0.9 && fightOf(live, mine, 0.2) > fightOf(live, mine, 2.9) && fightOf(live, mine, 3.5) === 0, 'a hit asks for the fight at once and lets go over three seconds');
  live.field.forEach((g, i) => { g.dist = dists[i]; });
  mine.bomb = { fuse: 3 };
  S.ok(fightOf(live, mine, 99) === 1, 'a burning fuse asks for the fight');
  mine.bomb = null;
  S.ok(lastOf({ laps: 99, track: { length: 100 } }, { prog: 10, finished: false }) === 0, 'LAST MILE has no laps and so no last lap');
  S.ok(lastOf({ laps: 3, track: { length: 100 } }, { prog: 10, finished: true }) === 1, 'a car that has finished keeps the last lap (the board is a victory lap)');
  S.ok(NEAR < FAR && FEEL.last[0] > FEEL.fight[0], 'a fight comes in faster than the last lap and both go out slower than they come in', JSON.stringify(FEEL));
  S.ok(FEEL.last[1] > FEEL.last[0] && FEEL.fight[1] > FEEL.fight[0], '(slow out)');
  S.ok(Math.abs(lean(0, 1, 100, [1, 1]) - 1) < 1e-6 && lean(0.5, 0.5, 1, [1, 1]) === 0.5, 'lean goes to its target and rests there');
}

/* ---- the radio ---- */
function fakeStudio() {
  const log = [], decks = {};
  const deck = ch => decks[ch] || (decks[ch] = {
    playing: false, player: null, calls: [], lv: [],
    async play(sg, o) { this.calls.push(['play', sg.title, o]); this.playing = true; this.song = sg; this.player = fakePlayer(this); return this.player; },
    async segue(sg, o) { this.calls.push(['segue', sg.title, o]); this.song = sg; this.player = fakePlayer(this); return this.player; },
    levels(m, o) { this.lv.push(Object.assign({}, m)); this.last = m; },
    layers() {}, preload() { return Promise.resolve(); },
    stop(f) { this.calls.push(['stop', f]); this.playing = false; this.player = null; }
  });
  const fakePlayer = d => ({ remaining: () => 40, beat: () => (d.beatNow = (d.beatNow || 0)), toBar: () => 1, stop() {}, setLoop() {} });
  return { lang: Lang, deck, decks, log };
}
{
  let on = false, pref = null;
  const studio = fakeStudio(), M = createMusic({ studio: () => studio, playing: () => on, pref: { get: () => pref, set: v => { pref = v; } } });
  const D = () => studio.decks.vroom;
  const tick = async (n, S, dt) => { for (let i = 0; i < n; i++) { M.step(dt || 0.05, S || null); await Promise.resolve(); await Promise.resolve(); } };
  await tick(5);
  S.ok(!D() || D().calls.length === 0, 'with the sound off nothing plays');
  on = true; await tick(5);
  const first = D().calls.find(c => c[0] === 'play');
  S.ok(first && POOLS.night.map(i => NAMES[i]).includes(first[1]), 'in the menus the NIGHT station plays', first && first[1]);
  S.ok(first[2].levels && first[2].levels.last === 0 && first[2].levels.fight === 0, 'and it starts with both layers out');
  M.where('day'); await tick(3);
  S.ok(M.station() === 'race', 'a road by day plays the RACE station');
  const n0 = D().calls.length; await tick(5);
  const sw = D().calls.slice(n0 - 1).find(c => c[0] === 'play' || c[0] === 'segue');
  S.ok(sw && POOLS.race.map(i => NAMES[i]).includes(sw[1]), 'the change of place takes a race tune over the night one', sw && sw[1]);
  M.where('night'); S.ok(M.station() === 'night', 'a night road plays NIGHT'); M.where('day');
  const st = M.radio();
  S.ok(st === 'night' && pref === 'night' && M.station() === 'night', 'V takes the other station and keeps it', st + ' / ' + pref);
  M.where('menu'); M.where('day'); S.ok(M.station() === 'night', 'and the next race is still on it');
  M.radio(); S.ok(M.station() === 'race' && pref === 'race', 'V again goes back');
  /* the layers ride a real race */
  const r = race(9), me = r.field[7], D0 = D();
  await tick(10, { race: r, human: me, sinceHit: 99 });
  for (let i = 0; i < 60 * 60; i++) { r.step(); if (i % 3 === 0) { M.step(0.05, { race: r, human: me, sinceHit: 99 }); } }
  await tick(1, { race: r, human: me, sinceHit: 99 });
  const steps = D0.lv.length, big = D0.lv.some((m, i) => i && Math.max(Math.abs(m.last - D0.lv[i - 1].last), Math.abs(m.fight - D0.lv[i - 1].fight)) > 0.45);
  S.ok(steps > 3 && steps < 400, 'the layers are ridden with deck.levels in small steps, not every frame', steps + ' pushes');
  S.ok(!big, 'and no step is a jump');
  S.ok(D0.calls.filter(c => c[0] === 'play').length <= 4, 'riding the layers never restarts the tune', D0.calls.filter(c => c[0] === 'play').length + ' plays');
  M.end('win'); await tick(2);
  const plays = D().calls.filter(c => c[0] === 'play'), s = plays[plays.length - 1];
  S.ok(s && s[1] === 'PODIUM' && s[2].loop === false, 'the finish plays the win stinger once, not looped', s && s[1]);
  const before = D().calls.length; await tick(Math.ceil((secsOf(stingOf(Lang, 'win')) + TAIL) / 0.05) - 5); const mid = D().calls.length;
  S.ok(mid === before, 'and the radio waits while it plays');
  await tick(60);
  const after = D().calls.slice(before).filter(c => c[0] === 'play' || c[0] === 'segue');
  S.ok(after.length >= 1 && !after.some(c => c[1] === 'PODIUM'), 'then the radio comes back', after.map(c => c[1]).join(' '));
  M.stop(); S.ok(!D().playing, 'stop() leaves nothing playing');
  on = false; await tick(3);
  S.ok(AUTO.menu === 'night' && AUTO.depot === 'night' && AUTO.day === 'race' && AUTO.night === 'night' && STATIONS.length === 2 && PUSH > 0, 'the places and their stations are as the plan has them');
}
S.done(IDS.length + ' tunes');
