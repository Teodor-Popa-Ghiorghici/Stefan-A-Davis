/* Who plays VROOM's tunes (tunes.js has the tunes themselves, breaks.js the drums and the bass lines).
   A RACE tune (drum and bass, 172 bpm, thirty-two bars) is A B A B of its sixteen chords. The first A is the room before the drop: the break, the bass, a pad and a comp, and the tune only teased on a
   music box an octave up. The lead comes in on the first B and stays. Two layers ride on top, switched by the race (music_heat.js):
     last    the last lap: horn stabs on the off-beats, a choir over the pad, the tune doubled an octave up, a crash every four bars
     fight   a car close by, a hit, a fuse burning: a ride and open hats, an arpeggio, a guitar on every off-beat
   A NIGHT tune (lo-fi, 86 bpm, sixteen bars) is its chords once through, the tune from the first bar, the beat swung; its `last` is a string section and the tune an octave up, its `fight` a shaker and
   a ride and a music-box arpeggio. Everything is in F minor (score_kit.js), so any tune follows any other. */
import { bars, later, soft, within, up, stabs, bassOn, track, layer, drums, trim } from './score_kit.js';
import { kit, BASS } from './breaks.js';
import { RACE, NIGHT } from './tunes.js';

const every = (n, k, ch) => Array.from({ length: n }, (_, i) => (i % k === 0 ? ch : '.'.repeat(16))).join('');

export function raceSong(L, id) {
  const d = RACE[id], c16 = d.chords.split(' '), ch = c16.concat(c16), n = 32, len = n * 4;
  const m16 = bars(L, d.melody, 4), all = m16.concat(later(m16, 64, 0)), lead = within(all, 32, len), tease = within(all, 0, 32);
  return L.buildSong({ title: d.title, bpm: d.bpm, key: 'F', scale: 'minor', bars: n, beats: 4, tracks: trim([
    drums('BREAK', kit(d.brk, n, [8, 24]), { vol: 0.9, reverb: 0.08 }),
    track('BASS', d.bass, bassOn(L, ch, BASS[d.bassPat], 40), { vol: 0.85, reverb: 0.02 }),
    track('PAD', d.pad, soft(L.chordLine(ch, 4, 'pad', 53), 0.55), { vol: 0.4, reverb: 0.45 }),
    track('COMP', d.comp, stabs(L, ch, d.stabAt, 57, 0.4, 0.62), { vol: 0.5, reverb: 0.2, pan: -0.25 }),
    track('TEASE', 'musicbox', up(soft(tease, 0.7), 100), { vol: 0.42, reverb: 0.5, pan: 0.3 }),
    track('LEAD', d.lead, soft(lead, 1.05), { vol: 0.75, reverb: 0.3, pan: 0.1 }),
    layer(track('HORNS', d.stab, stabs(L, ch, [0.5, 2.5], 60, 0.4, 0.8), { vol: 0.5, reverb: 0.25, pan: 0.3 }), 'last'),
    layer(track('CHOIR', 'choir', soft(L.chordLine(ch, 4, 'pad', 65), 0.4), { vol: 0.34, reverb: 0.6 }), 'last'),
    layer(track('LEAD UP', d.lead, up(soft(lead, 0.8), 100), { vol: 0.5, reverb: 0.35, pan: -0.2 }), 'last'),
    layer(drums('CRASH', { crash: every(n, 4, 'X...............') }, { vol: 0.5, reverb: 0.3 }), 'last'),
    layer(drums('RIDE', { ride: 'x.x.x.x.x.x.x.x.', openhat: '..x...x...x...x.', shaker: 'oooooooooooooooo' }, { vol: 0.42, reverb: 0.15 }), 'fight'),
    layer(track('ARP', d.arp, soft(L.chordLine(ch, 4, 'arp', 60), 0.55), { vol: 0.46, reverb: 0.3, pan: -0.35 }), 'fight'),
    layer(track('GUITAR', d.gtr, stabs(L, ch, [0.5, 1.5, 2.5, 3.5], 52, 0.3, 0.6), { vol: 0.46, reverb: 0.15, pan: 0.35 }), 'fight')], 1) });
}

export function nightSong(L, id) {
  const d = NIGHT[id], ch = d.chords.split(' '), n = 16, mel = bars(L, d.melody, 4);
  return L.buildSong({ title: d.title, bpm: d.bpm, key: 'F', scale: 'minor', bars: n, beats: 4, swing: 0.12, tracks: trim([
    drums('BEAT', kit(d.brk, n), { vol: 0.72, reverb: 0.1 }),
    track('BASS', d.bass, bassOn(L, ch, BASS[d.bassPat], 38), { vol: 0.7, reverb: 0.05 }),
    track('PAD', d.pad, soft(L.chordLine(ch, 4, 'pad', 53), 0.4), { vol: 0.34, reverb: 0.55 }),
    track('COMP', d.comp, stabs(L, ch, [0, 1.5, 2.5], 53, 1.3, 0.5), { vol: 0.5, reverb: 0.3, pan: -0.25 }),
    track('LEAD', d.lead, soft(mel, 0.95), { vol: 0.62, reverb: 0.4, pan: 0.15 }),
    layer(track('STRINGS', 'strings', soft(L.chordLine(ch, 4, 'pad', 58), 0.45), { vol: 0.4, reverb: 0.55 }), 'last'),
    layer(track('LEAD UP', d.lead, up(soft(mel, 0.7), 100), { vol: 0.4, reverb: 0.45, pan: -0.2 }), 'last'),
    layer(drums('SHAKER', { shaker: 'x.x.x.x.x.x.x.x.', ride: '..o...o...o...o.' }, { vol: 0.4, reverb: 0.12 }), 'fight'),
    layer(track('ARP', d.arp, soft(L.chordLine(ch, 4, 'arp', 62), 0.5), { vol: 0.4, reverb: 0.4, pan: 0.35 }), 'fight')], 1) });
}
