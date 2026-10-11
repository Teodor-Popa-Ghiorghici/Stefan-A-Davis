/* The folders in TheStack.

   One for the lobby (the four moods of the hymn) and one for every other app
   on the machine that scores itself with music. Nothing here is recorded:
   each entry is the app's own score, lifted out of the module that plays it
   live and described as a disc spec — the same shape discs.js presses — so
   the app and its folder can never drift apart. A disc is pressed the first
   time somebody plays it (see ensureBuf in index.js), not when the window
   opens, because forty offline renders at once would stall the whole box. */
import { VARIANTS, variantSpec } from '../../kernel/music_variants.js';
import * as MG from '../magen/score.js';
import * as CK from '../cook/score.js';
import * as ELE from '../elephant/score.js';
import * as BEK from '../bekkedal/score.js';
import * as SB from '../standbattle/score.js';
import * as AE from '../aftere/score.js';
import * as SOL from '../solitaire/score.js';
import * as SW from '../sweeper/score.js';
import * as Lang from '../../kernel/songtext.js';
import { unlocked } from '../../kernel/style_track.js';
import { FILE as STYLE_SONG } from '../../kernel/style_track_plan.js';
import { demoSongs } from '../garage/songs.js';
import { vroom } from '../vroom_scope.js';
import { vroomFolder } from '../vroom/stack.js';

const TARGET_SECS = 75;                     /* roughly how long a pressed disc plays */

const reps = spec => Math.max(3, Math.round(TARGET_SECS / (spec.len * 15 / spec.bpm)));

/* a game's own song (a studio song: real instruments), pressed as it is, with every layer on or the ones asked for */
const pure = (song, layers) => {
  const c = JSON.parse(JSON.stringify(song));
  c.tracks.forEach(t => { t.solo = false; t.mute = layers && t.layer != null ? !layers[t.layer] : false; });
  return c;
};
const disc = (song, tint, artist, layers) => { const c = pure(song, layers); return { song: c, bpm: c.bpm, len: c.bars * c.beats * 4, tint, artist }; };

const TITLE = {
  /* lobby */ hymn: 'HYMN', mellow: 'HYMN (MELLOW)', dynamic: 'HYMN (DYNAMIC)', glitch: 'HYMN (GLITCH)'
};

/* [folder name, folder tint, [[disc name, spec], ...]] */
export function stackFolders() {
  const out = [];

  out.push(['LOBBY MUSIC', 'white', VARIANTS.map(v => {
    const sp = variantSpec(v.id, v.id === 'dynamic' ? 2 : 3);
    sp.tint = v.id === 'mellow' ? 'cyan' : v.id === 'dynamic' ? 'amber' : v.id === 'glitch' ? 'red' : 'white';
    sp.artist = 'HOLYTRON SIGNAL / ' + v.mood;
    sp.rel = Object.assign({}, sp.rel);
    return [TITLE[v.id], sp];
  })]);

  out.push(['MAGEN', 'cyan', MG.IDS.map(k => [MG.NAMES[k], disc(MG.song(Lang, k), 'cyan', 'MAGEN BAND')])]);

  /* the Cook's four tunes are studio songs now (apps/cook/score.js), with the heat layers all the way in */
  out.push(['THE COOK', 'amber', CK.IDS.map(k => [CK.NAMES[k], disc(CK.song(Lang, k), 'amber', 'THE COOK', CK.layersFor(2))])]);

  out.push(['ELEPHANT', 'green', ELE.IDS.map(k => [ELE.NAMES[k], disc(ELE.song(Lang, k), 'green', 'ELEPHANT')])]);

  out.push(['BEKKEDAL', 'green', BEK.IDS.map(k => [BEK.NAMES[k], disc(BEK.song(Lang, k), 'green', 'BEKKEDAL')])]);

  /* Stand Battle's seven tunes, with every layer in (the menus, the select, the four places of Morioh and the boss) */
  out.push(['STAND BATTLE', 'red', SB.IDS.map(k => [SB.NAMES[k], disc(SB.song(Lang, k), 'red', 'STAND BATTLE ARENA', SB.layersFor(2))])]);

  /* AfterEgypt: the title and the five ways, each with its arrangement filled in (the wind, the locusts and the stone are the flight's) */
  out.push(['AFTEREGYPT', 'amber', AE.IDS.map(k => [AE.NAMES[k], disc(AE.song(Lang, k), 'amber', 'AFTEREGYPT', AE.DISC_LAYERS)])]);

  /* Solitaire's three tunes, with the whole band in */
  out.push(['SOLITAIRE', 'green', SOL.IDS.map(k => [SOL.NAMES[k], disc(SOL.song(Lang, k), 'green', 'SOLITAIRE')])]);

  /* Dungeon Sweeper's five tunes: the gate, the crossway, the moss, the Hollow One and the Underdeep */
  out.push(['DUNGEON SWEEPER', 'red', SW.IDS.map(k => [SW.NAMES[k], disc(SW.song(Lang, k), 'red', 'DUNGEON SWEEPER')])]);

  /* the Garage's own songs: real instruments, bounced by the studio rather than synthesised here */
  out.push(['THE GARAGE', 'white', demoSongs(Lang).map(sg => [sg.title, {
    song: sg, bpm: sg.bpm, len: sg.bars * sg.beats * 4, tint: 'white', artist: 'THE GARAGE BAND'
  }])]);

  /* the style meter's song: here once the meter has read HAPPY BIRTHDAY for the first time. It is a recording, so it is not pressed:
     the disc is the decoded file itself (`mp3`), ready as soon as it is read */
  if (unlocked()) out.push(['STYLE METER', 'white', [['AT ENDS', { mp3: STYLE_SONG, dur: 149.4, once: true, tint: 'white', artist: 'MARZUKU' }]]]);

  /* VROOM's tunes: not on the shelf at all until its gate is open (the trophy called VROOM) */
  if (vroom().open()) out.push(vroomFolder());

  out.forEach(f => f[2].forEach(d => { d[1].reps = d[1].once ? 1 : reps(d[1]); }));
  return out;
}
