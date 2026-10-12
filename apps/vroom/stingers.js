/* The two short pieces the finish board plays over the top of the race's music once, on the same channel: a win (the podium: F major, the one chord in the game that is not F minor, which is what makes it a
   win) and a miss (the field has gone by: F minor, a falling line, a held chord with nothing on top). Neither loops (music.js plays them once and gives the radio back after their last bar). */
const song = (L, title, bpm, bars, tracks) => L.buildSong({ title, bpm, key: 'F', scale: 'minor', bars, beats: 4, tracks });

export const STINGERS = {
  win: L => song(L, 'PODIUM', 132, 3, [
    { name: 'TRUMPET', inst: 'trumpet', vol: 0.8, reverb: 0.3, notes: 'F4:e A4 C5 F5 A5:q C6 | Bb5:q. A5:e G5:q A5 | F5+A5+C6:w' },
    { name: 'STRINGS', inst: 'strings', vol: 0.6, reverb: 0.4, notes: 'F3+C4+F4:w | Bb3+D4+F4:h C4+E4+G4:h | F3+A3+C4+F4:w' },
    { name: 'HORNS', inst: 'frenchhorn', vol: 0.5, reverb: 0.3, notes: 'r:w | r:q F4:q A4:h | F4+A4+C5:w' },
    { name: 'TIMPANI', inst: 'timpani', vol: 0.7, reverb: 0.3, notes: 'F2:q F2 F2:h | C2:q C2 F2:h | F2:w' },
    { name: 'BELLS', inst: 'bells', vol: 0.4, reverb: 0.6, notes: 'r:w | r:w | F6:w' }]),
  miss: L => song(L, 'ALSO RAN', 100, 3, [
    { name: 'PIANO', inst: 'piano', vol: 0.8, reverb: 0.4, notes: 'C5:q Ab4 F4 Eb4 | Db4:h. C4:q | F3+Ab3+C4+F4:w' },
    { name: 'CELLO', inst: 'cello', vol: 0.6, reverb: 0.4, notes: 'F2:h Eb2:h | Db2:h C2:h | F2:w' },
    { name: 'STRINGS', inst: 'strings', vol: 0.4, reverb: 0.5, notes: 'r:w | Db3+F3+Ab3:w | F3+Ab3+C4:w' }])
};
