/* What Dave's shelves already prove, read from what the player OWNS rather than waited for as an event (an event is a purchase, and a player who has bought it all has none left to make).
   Handed to the backfill at every boot: returns the ids owed. Browser only (it reads window.Cos). */
import { Cos, COS_CATS } from './cos.js';
import { ELEPHANT } from './cos_data.js';

const DEFAULTS = { frame: 'beige', logo: 'temple', cursor: 'stock', scheme: 'vga' };

export function shopCatchUp() {
  const ids = [];
  if (!Cos || !Cos.st || !Cos.st.owned) return ids;
  const cats = Object.keys(COS_CATS);
  /* anything bought: an owned item that costs something and is not a gift or a trophy's reward */
  if (cats.some(cat => COS_CATS[cat].list.some(it => !it.reward && !it.gift && it.price > 0 && Cos.has(cat, it.id)))) ids.push('sys_buy1');
  let all = true, some = false;
  cats.forEach(cat => {
    if (COS_CATS[cat].list.every(it => it.reward || Cos.has(cat, it.id))) { some = true; ids.push('set:system:shelves:' + cat); } else all = false;
  });
  if (some) ids.push('sys_shelf');
  if (all) { ids.push('sys_bare'); ids.push('set:system:bare:all'); }
  try { if (Object.keys(DEFAULTS).every(c => Cos.equipped(c) !== DEFAULTS[c] && Cos.has(c, Cos.equipped(c)))) ids.push('sys_refit'); } catch (e) { /* nothing worn */ }
  if (ELEPHANT.filter(i => i.slot !== 'free' && !i.reward).every(i => Cos.has('elephant', i.id))) ids.push('el_wardrobe');
  return ids;
}
