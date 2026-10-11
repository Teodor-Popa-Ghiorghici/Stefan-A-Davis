/* VROOM's tunes as they were written: a tempo, the instruments, a chord for every bar and a melody a bar to a string (the text notation of kernel/songtext.js; a bar is exactly four beats, which
   music_check.js holds them to). Who plays what, and what lies under it, is band_race.js and band_night.js. The plan (docs/vroom/plan.md section 10) wants drum and bass for the race, the shared ground
   of both parent games, and a lo-fi pool for the night roads and the depot; the radio (V) chooses between them.
     chords   sixteen of them, one a bar: the first eight are the A section, the second eight the B section; a song of thirty-two bars is A B A B, the lead holding back through the first A
     melody   sixteen bars to match
   THE RACE   RACE POOL, 172 bpm, thirty-two bars (45 s a pass), F minor
     SPECIAL DELIVERY   liquid, bright: epiano, strings, a vibraphone on the tune
     DEAD LETTER        dark and rolling, a synth on a synth bass
     SECOND CLASS       jump-up: a sax, trombone stabs, an organ
     FRAGILE            a breakbeat, a glockenspiel and a vibraphone, high and quick
     OVERNIGHT          atmospheric: choir, a violin, a long bass
     RETURN TO SENDER   hard: trumpet, power guitar, the busiest drums
   THE NIGHT  NIGHT POOL, 86 bpm (half the race's), sixteen bars (45 s a pass), the same key
     LAMP POST          epiano and a muffled beat
     CLOSED SIGN        a nylon guitar
     SNOWED IN          a music box and a piano: the depot's */
export const RACE = {
  special: {
    title: 'SPECIAL DELIVERY', bpm: 172, lead: 'vibes', pad: 'strings', comp: 'epiano', stab: 'trumpet', arp: 'harp', gtr: 'nylon', brk: 'step', bass: 'bass', bassPat: 'roll', stabAt: [0, 1.5, 3],
    chords: 'Fm Db Ab Eb Fm Db Eb C Db Ab Eb Cm Db Ab Bbm C',
    melody: ['C5:q F5:e G5 Ab5:q G5:e F5', 'Db5:q. C5:e Db5:q F5', 'Eb5:q Ab5 C6:h', 'Bb5:q. Ab5:e G5:q Eb5', 'F5:q. G5:e Ab5:q C6', 'Db6:h C6:q Ab5', 'G5:q Bb5 G5:e F5 Eb5:q', 'E5:q G5 C6:h',
             'F5:e Ab5 Db6:q C6:e Ab5 F5:q', 'Eb5:q C5 Eb5:h', 'G5:q. Bb5:e G5:h', 'C5:e Eb5 G5 C6 Bb5:q G5', 'Ab5:q F5 Db5:h', 'C6:q. Bb5:e Ab5:q Eb5', 'F5:q Bb5 Db6 C6:e Bb5', 'G5:q E5 C5:h']
  },
  dead: {
    title: 'DEAD LETTER', bpm: 172, lead: 'synthlead', pad: 'synthpad', comp: 'epiano', stab: 'frenchhorn', arp: 'pizz', gtr: 'distgtr', brk: 'roll', bass: 'synthbass', bassPat: 'neuro', stabAt: [0.5, 2, 3.5],
    chords: 'Fm Fm Db Db Fm Fm Eb C Bbm Bbm Fm Fm Db Eb Fm C',
    melody: ['F4:e r F4 r Ab4:q C5', 'Ab4:q. G4:e F4:h', 'Db5:e r Db5 r F5:q Ab4', 'Db5:q. C5:e Ab4:h', 'F4:e r F4 r Ab4:q C5', 'C5:q. Ab4:e F4:h', 'Eb5:e r Eb5 r G5:q Bb4', 'E5:q G5 C6:q. Bb5:e',
             'Bb4:e r Bb4 r Db5:q F5', 'Db5:q. C5:e Bb4:h', 'C5:e r C5 r F5:q Ab5', 'G5:q. F5:e C5:h', 'Db5:e r Db5 r F5:q Ab5', 'G5:q. Bb5:e G5:q Eb5', 'C5:q F5 Ab5 C6', 'C6:h. G5:q']
  },
  second: {
    title: 'SECOND CLASS', bpm: 172, lead: 'sax', pad: 'organ', comp: 'organ', stab: 'trombone', arp: 'marimba', gtr: 'eguitar', brk: 'jump', bass: 'bass', bassPat: 'jump', stabAt: [1.5, 2.5, 3.5],
    chords: 'Fm Fm Bbm Bbm Fm Db Eb Eb Db Db Ab Ab Bbm Fm C C',
    melody: ['C5:q F5:e F5 Ab5:q F5', 'G5:q. F5:e C5:h', 'Bb4:e Db5 F5 Db5 Bb4:q F4', 'Db5:q. C5:e Bb4:h', 'C5:q F5:e F5 Ab5:q C6', 'Db6:q. C6:e Ab5:q F5', 'G5:e Bb5 G5 Eb5 G5:q Bb5', 'Eb5:h r:q Bb4',
             'F5:q Ab5 F5:e Db5 F5:q', 'Ab5:q. F5:e Db5:h', 'Eb5:q C5 Eb5 Ab5', 'C6:q. Bb5:e Ab5:h', 'Bb4:e Db5 F5 Bb5 Db6:q C6', 'Ab5:q F5 C5:h', 'E5:q G5 C6 G5', 'C6:h r:h']
  },
  fragile: {
    title: 'FRAGILE', bpm: 172, lead: 'glock', pad: 'musicbox', comp: 'vibes', stab: 'marimba', arp: 'kalimba', gtr: 'steelgtr', brk: 'amen', bass: 'bass', bassPat: 'break', stabAt: [0, 0.75, 2.5],
    chords: 'Fm Ab Db Eb Fm Ab Eb C Db Eb Fm Ab Db Eb C C',
    melody: ['F5:e Ab5 C6 Ab5 F5 Ab5 C6:q', 'Eb6:e C6 Ab5 C6 Eb6:q C6', 'F6:e Db6 Ab5 Db6 F6:q Ab5', 'G5:e Bb5 Eb6 Bb5 G5:q Bb5', 'F5:e Ab5 C6 Ab5 F5 Ab5 C6 F6', 'Eb6:q. C6:e Ab5:h', 'Bb5:e G5 Eb5 G5 Bb5:q G5', 'C6:e G5 E5 G5 C6:h',
             'Db6:q. Ab5:e F5:q Ab5', 'Bb5:q. G5:e Eb5:q G5', 'C6:q. Ab5:e F5:q Ab5', 'C6:e Eb6 C6 Ab5 Eb5:h', 'F6:q Db6 Ab5 F5', 'G5:q Bb5 Eb6 Bb5', 'G5:e C6 E6 C6 G6:h', 'C6:q r:q C6:h']
  },
  overnight: {
    title: 'OVERNIGHT', bpm: 172, lead: 'violin', pad: 'choir', comp: 'piano', stab: 'cello', arp: 'piano', gtr: 'nylon', brk: 'skip', bass: 'bass', bassPat: 'deep', stabAt: [0, 2],
    chords: 'Fm Db Ab Eb Fm Db Bbm C Db Eb Fm Ab Db Eb Fm C',
    melody: ['C5:h. Ab4:q', 'F5:h. Db5:q', 'Eb5:h C5:h', 'Bb4:h. G4:q', 'Ab4:h C5:h', 'Db5:q. F5:q. Ab5:q', 'F5:h Db5:q Bb4', 'G4:h E5:h',
             'Ab5:h. F5:q', 'G5:h Bb5:h', 'C6:h. Ab5:q', 'Eb5:q. Ab5:q. C6:q', 'Db6:h. C6:q', 'Bb5:q G5 Eb5:h', 'F5:q. Ab5:e C6:h', 'E5:q G5 C6:h']
  },
  sender: {
    title: 'RETURN TO SENDER', bpm: 172, lead: 'trumpet', pad: 'strings', comp: 'eguitar', stab: 'frenchhorn', arp: 'xylophone', gtr: 'distgtr', brk: 'hard', bass: 'bass', bassPat: 'hard', stabAt: [0, 0.5, 2, 2.5],
    chords: 'Fm Fm Db Eb Fm Fm Eb C Bbm Bbm Db Db Eb Eb C C',
    melody: ['C5:e F5 F5 Ab5 Ab5:q F5', 'Ab5:q C6 Ab5:e F5 C5:q', 'Db5:e F5 Db5 F5 Ab5:q F5', 'G5:e Bb5 G5 Bb5 Eb6:h', 'C5:e F5 F5 Ab5 Ab5:q C6', 'Ab5:e F5 C5 F5 Ab5:q F5', 'Bb5:q G5 Eb5 G5', 'G5:e E5 C5 E5 G5:q C6',
             'F5:e Bb5 Bb5 Db6 Db6:q Bb5', 'F5:q Db5 Bb4:h', 'Ab5:q F5 Db5 F5', 'Db6:h. C6:q', 'Bb5:e G5 Bb5 Eb6 Bb5:q G5', 'G5:q Bb5 Eb6:h', 'E5:e G5 C6 E6 G6:h', 'C6:q r:q G5:h']
  }
};
export const NIGHT = {
  lamp: {
    title: 'LAMP POST', bpm: 86, lead: 'epiano', pad: 'strings', comp: 'epiano', arp: 'musicbox', brk: 'dust', bass: 'upright', bassPat: 'low',
    chords: 'Fm7 Dbmaj7 Ab Eb Fm7 Dbmaj7 Bbm7 C7 Db Eb Fm7 Cm7 Dbmaj7 Eb Fm7 C',
    melody: ['C5:q. Ab4:e C5:h', 'F5:h. Db5:q', 'Eb5:q C5 Eb5:h', 'Bb4:h. G4:q', 'Ab4:q C5 Eb5:q. C5:e', 'Db5:h F5:q Ab5', 'F5:q. Db5:e Bb4:h', 'E5:h G5:h',
             'Ab5:q. F5:e Db5:h', 'Bb5:h G5:h', 'C6:q. Ab5:e F5:h', 'G5:h Eb5:h', 'F5:q Ab5 C6 Ab5', 'G5:q. Bb5:e G5:h', 'Ab5:h. F5:q', 'G4:h. E4:q']
  },
  closed: {
    title: 'CLOSED SIGN', bpm: 86, lead: 'nylon', pad: 'strings', comp: 'piano', arp: 'harp', brk: 'dust', bass: 'upright', bassPat: 'walk',
    chords: 'Bbm7 Fm7 Db Ab Bbm7 Fm7 Eb C Dbmaj7 Cm7 Bbm7 Fm7 Db Eb Fm7 C',
    melody: ['F5:q Db5 Bb4:h', 'C5:q. Ab4:e C5:h', 'F5:h. Ab5:q', 'C6:q Ab5 Eb5:h', 'Db5:q F5 Ab5:h', 'Ab5:q. F5:e C5:h', 'G5:q Bb5 G5:h', 'E5:q G5 C6:h',
             'C6:q Ab5 F5:h', 'Eb5:q G5 Bb5:h', 'Bb5:q. Ab5:e F5:h', 'C5:h Ab4:h', 'Db5:q F5 Ab5 F5', 'G5:q Bb5 Eb6:h', 'C6:q Ab5 F5 C5', 'G4:h. r:q']
  },
  snowed: {
    title: 'SNOWED IN', bpm: 86, lead: 'musicbox', pad: 'choir', comp: 'piano', arp: 'harp', brk: 'hush', bass: 'upright', bassPat: 'low',
    chords: 'Fm Eb Db Eb Fm Db Ab Eb Bbm Fm Db C Bbm Db Eb Fm',
    melody: ['C6:h. Ab5:q', 'Bb5:h G5:h', 'F5:h. Db5:q', 'G5:q Bb5 G5 Eb5', 'Ab5:h C6:h', 'Db6:h. C6:q', 'Eb6:h C6:h', 'Bb5:h. G5:q',
             'Db6:h Bb5:h', 'Ab5:q. F5:e C5:h', 'F5:q Ab5 F5 Db5', 'E5:h G5:h', 'F5:q. Db5:e Bb4:h', 'Ab4:q Db5 F5:h', 'G5:q Bb5 G5:h', 'F5:w']
  }
};
export const TUNES = Object.assign({}, RACE, NIGHT);
