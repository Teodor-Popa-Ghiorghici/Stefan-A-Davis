/* THE GARDEN's trophies (docs/achievements/games-1.md, with TEND and the BENCH, which are late-game now). Data only; the calls are in trophy_calls.js.
   Events: pick { n, room, species, night }, rack { rooted, bed, mates, perfect, rooms, drips, hands }, chain, blessed, catchup { gapMs, gathered }, tend { rooms }, bench-buy, tune.
   Counter gardenSun (every SUN the garden paid); set grown (the species that have reached full size). */
import { t, rule, inSet } from '../trophy_kit.js';
import { SPECIES } from '../../kernel/cos_data.js';
const on = rule.on;

export const TROPHIES = [
  t('gd_first', 'FIRST FRUIT', 'B', 'P', 'Pick your first SUN token.', on('pick')),
  t('gd_sun1', 'GREEN THUMB', 'B', 'P', 'Earn 1,000 SUN from the garden.', rule.stat('gardenSun', 1000)),
  t('gd_sun2', 'ORCHARD KEEPER', 'S', 'P', 'Earn 10,000 SUN from the garden.', rule.stat('gardenSun', 10000)),
  t('gd_sun3', 'BY ROOT AND BRANCH', 'G', 'P', 'Earn 99,999 SUN from the garden: the price of the gold frame.', rule.stat('gardenSun', 99999)),
  t('gd_rooms', 'FIVE ROOMS', 'S', 'P', 'Open all five rooms.', on('rack', p => p.rooms >= 5)),
  t('gd_herb5', 'HERBALIST', 'B', 'P', 'Grow five kinds of plant to full size.', rule.sets('grown', 5)),
  t('gd_herb8', 'BOTANIST', 'S', 'P', 'Grow eight kinds to full size.', rule.sets('grown', 8)),
  t('gd_herb11', 'HERBARIUM', 'G', 'P', 'Grow every kind there is to full size.', rule.sets('grown', SPECIES.length)),
  t('gd_tend', 'THE WHOLE ROUND', 'B', 'P', 'Press TEND in a garden of four rooms or more, which is when it opens.', on('tend', p => p.rooms >= 4)),
  t('gd_bench', 'A BENCH TO SIT ON', 'B', 'P', 'Buy something at the bench, which opens when you own eight kinds of plant.', on('bench-buy')),
  t('gd_rooted', 'ROOTED', 'B', 'E', 'Have a plant that shows both HOME ROOM and KIN POT.', on('rack', p => p.rooted)),
  t('gd_bed', 'FULL BED', 'B', 'E', 'Have a plant with four of its own kind around it.', on('rack', p => p.bed)),
  t('gd_mates', 'BEST FRIENDS', 'B', 'E', 'Have a plant with two MATES beside it.', on('rack', p => p.mates)),
  t('gd_perfect1', 'A PERFECT RACK', 'S', 'S', 'Fill a rack of twelve with plants that are all ROOTED, in a room that is SET.', on('rack', p => p.perfect >= 1)),
  t('gd_perfect5', 'FIVE PERFECT RACKS', 'G', 'S', 'Have a perfect rack in all five rooms at once.', on('rack', p => p.perfect >= 5)),
  t('gd_chain', 'FULL SWEEP', 'S', 'S', 'Keep a sweep going until the chain reaches its +50% cap.', on('chain')),
  t('gd_drip', 'NEVER DRY', 'S', 'P', 'Fit a drip line in every room.', on('rack', p => p.drips >= 5)),
  t('gd_hands', 'HANDS FREE', 'G', 'P', 'Own all five drip lines, the biggest basket and both gatherers.', on('rack', p => p.hands)),
  t('gd_night', 'NIGHT SHIFT', 'B', 'E', 'Pick a token from a night-only plant after dark, in a room other than the cellar.', on('pick', p => p.night)),
  t('gd_blessed', 'BLESSED', 'B', 'E', 'Get a doubled token at the SHRINE.', on('blessed')),
  t('gd_away', 'WHILE YOU SLEPT', 'S', 'E', 'Come back after eight hours away and find the gatherer has paid in.', on('catchup', p => p.gapMs >= 8 * 3600 * 1000 && p.gathered > 0)),
  t('gd_tune', 'A TUNE FROM THE ROOTS', 'B', 'C', 'Poke five plants in rising pitch within eight seconds.', on('tune'))
];

/* what the garden's save already proves */
export function backfill(read) {
  const s = read('app_garden_st'), ids = [];
  if (!s || !Array.isArray(s.rooms)) return ids;
  const open = s.rooms.filter(r => r && r.unlocked).length;
  /* the bench: anything it ever sold is on the save (a drip line, a basket, a gatherer), so a bench with nothing left to sell still counts */
  if (s.rooms.some(r => r && r.drip) || (s.up && (s.up.basket > 0 || s.up.gather > 0))) ids.push('gd_bench');
  if (open >= 5) ids.push('gd_rooms');
  if (s.rooms.length >= 5 && s.rooms.every(r => r && r.drip)) ids.push('gd_drip');
  if (s.up && s.up.basket >= 3 && s.up.gather >= 2 && s.rooms.length >= 5 && s.rooms.every(r => r && r.drip)) ids.push('gd_hands');
  const grown = new Set(), need = id => { const sp = SPECIES.find(x => x.id === id); return sp ? sp.grow * 3000 : 0; };
  s.rooms.forEach(r => (r && r.pots || []).forEach(p => { if (p && p.sp && p.grown >= need(p.sp) && need(p.sp) > 0) grown.add(p.sp); }));
  grown.forEach(id => ids.push(inSet('garden', 'grown', id)));
  if (grown.size >= 5) ids.push('gd_herb5'); if (grown.size >= 8) ids.push('gd_herb8'); if (grown.size >= SPECIES.length) ids.push('gd_herb11');
  return ids;
}
