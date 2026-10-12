/* VROOM's score kit: the small amount of bookkeeping its tunes share. The language is kernel/songtext.js (handed to every function here as `L`, the way the studio hands it to a game); the helpers that every
   game's score wants are in apps/scorekit.js. Everything is in F minor (the notes of F G Ab Bb C Db Eb, and the C major chord that leads home to F), so any tune of either pool can follow any other on a bar
   line without a seam, and the DRUM AND BASS pool (172 bpm) and the LO-FI pool (86, half of it) share a beat grid.
   A part is written a bar to a string; `bars` puts the strings in place and writes down, in `misfit`, any that is not exactly a bar long (music_check.js holds that list empty: a short bar slides every bar after it). */
export const MODE = [5, 7, 8, 10, 0, 1, 3];                 /* F minor, as pitch classes (F = 5) */
export const misfit = [];

export function bars(L, texts, bpb, from) {
  const out = [];
  (texts || []).forEach((t, i) => {
    if (!t) return;
    const ns = L.parseNotes(t);
    if (Math.abs(ns.length_ - bpb) > 1e-9) misfit.push(t + ' = ' + ns.length_ + ' beats, not ' + bpb);
    ns.forEach(n => out.push([n[0] + ((from || 0) + i) * bpb, n[1], n[2], n[3]]));
  });
  return out;
}
/* notes later in time and/or higher, with every velocity times k */
export const later = (notes, beats, semis, k) => notes.map(n => [n[0] + beats, n[1], n[2] + (semis || 0), k == null ? n[3] : Math.max(0.05, Math.min(1, n[3] * k))]);
export const soft = (notes, k) => later(notes, 0, 0, k);
/* only what starts inside [from, to) beats */
export const within = (notes, from, to) => notes.filter(n => n[0] >= from && n[0] < to);
/* the notes that start inside the song, each cut off where the song ends */
export const clip = (notes, len) => notes.filter(n => n[0] < len).map(n => (n[0] + n[1] > len ? [n[0], len - n[0], n[2], n[3]] : n));
/* a part of `n` bars played `times` times over, one after another */
export const again = (notes, len, times) => { let out = []; for (let i = 0; i < times; i++) out = out.concat(later(notes, len * i, 0)); return out; };
/* a hit on beat 1 of the bars named (0-based): a crash at the top of a phrase */
export const at = (barList, bpb, dur, midi, vel) => barList.map(b => [b * bpb, dur, midi, vel]);
/* every note of a part an octave up where there is room for it */
export const up = (notes, top, k) => notes.map(n => [n[0], n[1], n[2] + 12 <= top ? n[2] + 12 : n[2], Math.min(1, n[3] * (k == null ? 1 : k))]);
/* stabs: every chord of `ch` struck on the beats named (beats into the bar) */
export function stabs(L, ch, beats, base, len, vel) {
  const out = [];
  ch.forEach((c, b) => L.chordNotes(c, base).forEach(n => beats.forEach(k => out.push([b * 4 + k, len, n, vel]))));
  return out;
}
/* a bass line from a pattern of [beat, length, 'r' | '5' | '8', velocity] on the root of each chord */
export function bassOn(L, ch, pat, low) {
  const out = [];
  ch.forEach((c, b) => {
    const r = L.chordNotes(c, low)[0];
    pat.forEach(h => out.push([b * 4 + h[0], h[1], h[2] === '5' ? r + 7 : h[2] === '8' ? r + 12 : r, h[3] == null ? 0.8 : h[3]]));
  });
  return out;
}
/* the track a tune is made of; `layer` names the layer the race switches it with (music_heat.js) */
export const track = (name, inst, notes, o) => Object.assign({ name, inst, notes }, o);
export const layer = (t, name) => Object.assign(t, { layer: name });
export const drums = (name, hits, o) => Object.assign({ name, drums: hits }, o);
export const trim = (tracks, k) => tracks.map(t => Object.assign(t, { vol: Math.round(t.vol * k * 1000) / 1000 }));
/* seconds a song lasts */
export const secsOf = s => s.bars * s.beats * 60 / s.bpm;
