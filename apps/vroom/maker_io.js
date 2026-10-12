/* THE TRACK MAKER'S FILES (docs/vroom/plan.md section 9): a road is kept as text in `::/Home/Vroom/<NAME>.TRK` and is a road the game knows from the moment it is read: `loadRoads` reads the folder, turns every
   file that is a road into track data (maker_def.js) and registers it (tracks.js) under the id `user:<FILE NAME>`, which is what the single race, the time trial and the 2P split's menus offer after the town's
   own. A file that is not a road yet (a ring with a gap in it: a road half drawn) is listed for the maker to open and is in no race's menu. The file name, not the NAME written in the file, is the road's identity,
   so a file renamed on the desktop is the same road under the new name. `fs` is the window's `ctx.fs` (read, write, list); a store that throws is an empty folder. */
import { fromText, toText, fileOf, cleanName } from './maker_trk.js';
import { defOf } from './maker_def.js';
import { registerTrack, unregisterTrack, userIds } from './tracks.js';

export const DIR = '::/Home/Vroom';
export const stemOf = file => String(file).replace(/\.TRK$/i, '').toUpperCase();
export const idOfFile = file => 'user:' + stemOf(file);
export const idOf = name => idOfFile(fileOf(name));

/* keep a road: the path it went to */
export async function saveRoad(fs, t) {
  const path = DIR + '/' + fileOf(t.name);
  await fs.write(path, { type: 'text', content: toText(t) });
  return path;
}
/* every .TRK in the folder as { id, file, name, t, ok, problems }, in name order; the ones that are roads are registered, and a road registered earlier whose file has gone is forgotten */
export async function loadRoads(fs) {
  let files = [];
  try { files = (await fs.list(DIR)) || []; } catch (e) { files = []; }
  const out = [], seen = new Set();
  for (const f of files.slice().sort((a, b) => String(a && a.name).localeCompare(String(b && b.name)))) {
    const file = f && f.name;
    if (typeof file !== 'string' || !/\.TRK$/i.test(file)) continue;
    let rec = null;
    try { rec = await fs.read(DIR + '/' + file); } catch (e) { rec = null; }
    const text = rec && typeof rec.content === 'string' ? rec.content : typeof rec === 'string' ? rec : null;
    if (text == null) continue;
    const t = fromText(text), id = idOfFile(file), r = defOf(t, id);
    t.name = cleanName(t.name) || stemOf(file);
    if (r.def) { r.def.name = t.name; registerTrack(r.def); seen.add(id); }
    out.push({ id, file, name: t.name, t, ok: !!r.def, problems: r.problems });
  }
  for (const id of userIds()) if (!seen.has(id)) unregisterTrack(id);
  return out;
}
