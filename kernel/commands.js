/* The machine's words: what the terminal and a DolDoc button both understand when they are given a name instead of HolyC. Pure data (and one question: the gate below). */
import { isOpen as vroomOpen } from './vroom_gate_core.js';
/* apps launchable straight from the prompt (or a button in a document), by any of their aliases */
export const APP_ALIASES = {
  TASKS: 'tasks', PS: 'tasks', ADAM: 'tasks', SETH: 'tasks',
  AFTEREGYPT: 'aftere', EGYPT: 'aftere', GAME: 'aftere',
  BEKKEDAL: 'bekkedal', GAARD: 'bekkedal', BEK: 'bekkedal',
  STACK: 'hifi', HIFI: 'hifi', PLAYER: 'hifi',
  NOTES: 'notes', VAULT: 'notes', ZETTEL: 'notes',
  COOK: 'cook', BLUE: 'cook', CHEM: 'cook', LAB: 'cook',
  MAGEN: 'magen', STAR: 'magen', MITZVAH: 'magen', CLICKER: 'magen',
  ELEPHANT: 'elephant', ELE: 'elephant', FRIEND: 'elephant',
  JAEGER: 'bottle', BOTTLE: 'bottle', SHOT: 'bottle', DRINK: 'bottle',
  DEFRAG: 'defrag',
  CMOS: 'cmos', SETUP: 'cmos',
  GARDEN: 'garden', SHOP: 'shop', DAVE: 'shop',
  SWEEPER: 'sweeper', DUNGEON: 'sweeper', DUNGEONSWEEPER: 'sweeper', MINES: 'sweeper', SOLITAIRE: 'solitaire', CRAYON: 'crayon',
  DRAWINGS: 'drawings', ABOUT: 'about', DISPLAY: 'display',
  ACCOUNT: 'account', GODDOODLE: 'goddoodle', DOODLE: 'goddoodle',
  NEOFETCH: 'neofetch', FETCH: 'neofetch',
  GARAGE: 'garage', MUSIC: 'garage', BAND: 'garage', STUDIO: 'garage',
  HOLYC: 'holyc', PUZZLES: 'holyc', LESSONS: 'holyc', TUTOR: 'holyc',
  TRASH: 'trash', RECYCLE: 'trash'
};
/* words for an app behind a gate (kernel/vroom_gate_core.js): until the gate is open they are not words at all, and the terminal answers them like any other thing it does not know. Ask `aliases()`, not APP_ALIASES. */
export const GATED_ALIASES = { vroom: { VROOM: 'vroom', RACE: 'vroom', CARS: 'vroom' } };
export function aliases() {
  if (!vroomOpen()) return APP_ALIASES;
  return Object.assign({}, APP_ALIASES, GATED_ALIASES.vroom);
}
export const APP_HELLO = {
  tasks: 'ADAM IS TASK 0. IT DOES NOT EXIT.',
  aftere: 'FLY DOWN THE COLONNADE.',
  bekkedal: 'A SMALL LIFE IN NORWAY.',
  hifi: 'THE STACK IS WARM. DROP A FILE ON IT.',
  notes: 'WRITE [[LIKE THIS]] AND THE LINK MAKES ITSELF.',
  cook: 'THE BENCH IS CLEAN. BEGIN.',
  magen: 'PRESS THE STAR. THAT IS ONE.',
  elephant: 'HE HAS BEEN WAITING TO TELL YOU SOMETHING.',
  bottle: 'ONE MEASURE IS FORTY MILLILITRES.',
  garage: 'THIRTY INSTRUMENTS AND A DRUM KIT. PRESS LEARN IF YOU ARE NEW.',
  holyc: 'SEVEN LESSONS, FIFTY PUZZLES, AND A WORKSHOP. TYPE IT.',
  trash: 'NOTHING IS GONE UNTIL YOU SAY SO.',
  defrag: 'MOVING CLUSTERS.',
  vroom: 'THE ENGINE IS WARM. MIND THE ANTENNA.'
};

