/* THE TRACK MAKER (docs/vroom/plan.md section 9): draw a ring of road on a grid of tiles, stand modules on it, give it a name and a theme, save it as `::/Home/Vroom/<NAME>.TRK`, and drive it. The arrows move a cursor over the grid;
   ENTER does what the tool in hand does there (1 to 9 choose the tool; ROAD is a pen: ENTER puts it down and the road follows the cursor, ENTER again lifts it); TAB goes to the menu on the right (the themes, laps, name,
   SAVE, OPEN, NEW, TEST DRIVE); ESC goes back (twice, if there is something that was not saved). Under the grid the road says what it is: a road, with its length, or the tile that is the trouble and why. The road
   is raced exactly as the town's are (maker_def.js builds the same data), and nothing on it is paid or earned (user_roads.js). The editing is maker_edit.js and the files maker_io.js. */
import { drawShowroom } from './showroom.js';
import { playerLook } from './events.js';
import { C, panel, left, menu, hint, head, wrap } from './ui.js';
import { nav } from './input.js';
import { CARS } from './cars.js';
import { registerTrack } from './tracks.js';
import { blank, clone, cleanName, fileOf, THEMES, THEME_IDS, GRID_W, GRID_H } from './maker_trk.js';
import { defOf } from './maker_def.js';
import { TOOLS, HELP, paint, removeRoad, put, clearTile, analyse } from './maker_edit.js';
import { saveRoad, idOf, DIR } from './maker_io.js';
import { drawGrid } from './maker_draw.js';

const PX = 204, PW = 112, ROWH = 7;                         /* the menu on the right */
const ROWS = TOOLS.map(t => ({ tool: t.id })).concat([{ id: 'theme' }, { id: 'laps' }, { id: 'name' }, { id: 'save' }, { id: 'open' }, { id: 'new' }, { id: 'test' }, { id: 'back' }]);

export function create(G) {
  const S = { t: blank('MY ROAD'), cx: 5, cy: 3, tool: 'road', pen: null, focus: 'grid', row: 0, dirty: false, file: null, list: [], pick: 0, msg: '', msgT: -9, armed: -9, replace: false, blink: false, an: null, init: false };
  const say = m => { S.msg = m; S.msgT = G.t; };
  const edited = () => { S.dirty = true; S.replace = false; S.an = analyse(S.t, idOf(S.t.name)); };
  const announce = () => { if (typeof window === 'undefined') return; for (const d of [DIR, '::/Home']) window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: d } })); };
  const reload = () => G.refreshRoads().then(() => { S.list = G.userList || []; S.pick = Math.max(0, Math.min(S.pick, S.list.length - 1)); });
  const askName = then => {
    if (!G.ctx || !G.ctx.ask) { then && then(); return; }
    G.ctx.ask('NAME YOUR ROAD', S.t.name, v => { const n = cleanName(v); if (n) { S.t.name = n; edited(); } if (G.focus) G.focus(); if (then) then(); });
  };
  /* SAVE: quietly over the same file; a name that is another road's file asks to be said twice */
  function save() {
    if (!G.ctx || !G.ctx.fs) { say('NO DISK TO SAVE ON'); return; }
    if (!S.file && S.t.name === 'MY ROAD') { askName(save); return; }
    const file = fileOf(S.t.name);
    if (file !== S.file && S.list.some(r => r.file === file) && !S.replace) { S.replace = true; say(file + ' IS THERE. SAVE AGAIN TO REPLACE IT'); return; }
    saveRoad(G.ctx.fs, S.t).then(() => { S.file = file; S.dirty = false; S.replace = false; say('SAVED ' + file); announce(); return reload(); }).catch(() => say('COULD NOT SAVE'));
  }
  function fresh() { S.t = blank('MY ROAD'); S.file = null; S.dirty = false; S.pen = null; S.cx = 5; S.cy = 3; S.an = analyse(S.t); }
  function test() {
    if (!S.an.ok) { say(S.an.problems[0] ? S.an.problems[0].text : 'NOT A ROAD YET'); return; }
    const id = idOf(S.t.name), r = defOf(S.t, id);
    if (!r.def) { say(r.problems[0].text); return; }
    r.def.name = S.t.name; registerTrack(r.def);
    G.go('race', { ev: { kind: 'single', track: id, v: 'f', rating: CARS[G.career.car].rating, n: 4, laps: S.t.laps, seed: 11 + ((G.t * 1000) | 0), back: 'maker' } });
  }
  /* what ENTER does on the tile under the cursor */
  function act() {
    const { cx, cy } = S, k = cx + ',' + cy;
    if (S.tool === 'road') {
      if (S.pen) { S.pen = null; return; }
      if (S.t.road[k]) { removeRoad(S.t, cx, cy); edited(); } else { paint(S.t, cx, cy); S.pen = 'paint'; edited(); }
    } else if (S.tool === 'erase') {
      if (clearTile(S.t, cx, cy)) edited();
    } else {
      const w = put(S.t, S.tool, cx, cy);
      if (w) say(w); else edited();
    }
  }
  const move = (dx, dy) => {
    S.cx = Math.max(0, Math.min(GRID_W - 1, S.cx + dx)); S.cy = Math.max(0, Math.min(GRID_H - 1, S.cy + dy));
    if (S.pen === 'paint' && paint(S.t, S.cx, S.cy)) edited();
  };
  function leave() {
    if (S.dirty && G.t - S.armed > 4) { S.armed = G.t; say('NOT SAVED. ESC AGAIN TO LEAVE'); return; }
    S.pen = null; G.go('title');
  }
  function useRow() {
    const r = ROWS[S.row];
    if (r.tool) { S.tool = r.tool; S.pen = null; S.focus = 'grid'; }
    else if (r.id === 'name') askName();
    else if (r.id === 'save') save();
    else if (r.id === 'open') { const o = S.list[S.pick]; if (o) { S.t = clone(o.t); S.file = o.file; S.dirty = false; S.pen = null; S.an = analyse(S.t, idOf(S.t.name)); S.focus = 'grid'; say('OPENED ' + o.file); } }
    else if (r.id === 'new') { if (S.dirty && G.t - S.armed > 4) { S.armed = G.t; say('NOT SAVED. NEW AGAIN TO THROW IT AWAY'); } else fresh(); }
    else if (r.id === 'test') test();
    else if (r.id === 'back') leave();
  }
  const change = dx => {
    const r = ROWS[S.row];
    if (r.id === 'theme') { S.t.theme = THEME_IDS[(THEME_IDS.indexOf(S.t.theme) + dx + THEME_IDS.length) % THEME_IDS.length]; edited(); }
    else if (r.id === 'laps') { S.t.laps = Math.max(1, Math.min(9, S.t.laps + dx)); edited(); }
    else if (r.id === 'open' && S.list.length) S.pick = (S.pick + dx + S.list.length) % S.list.length;
  };
  return {
    enter() { if (!S.init) { S.init = true; S.an = analyse(S.t); } S.focus = 'grid'; reload(); },
    leave() { S.pen = null; },
    state: () => ({ S }),
    update() {
      const I = G.input;
      TOOLS.forEach((tl, i) => { if (I.take('Digit' + (i + 1))) { S.tool = tl.id; S.pen = null; } });
      const k = nav(I);
      S.blink = ((G.t * 2) | 0) % 2 === 0;
      if (k.alt) { S.focus = S.focus === 'grid' ? 'panel' : 'grid'; return; }
      if (S.focus === 'grid') {
        if (k.back) { leave(); return; }
        if (k.dx || k.dy) move(k.dx, k.dy);
        if (k.ok) act();
      } else {
        if (k.back) { S.focus = 'grid'; return; }
        if (k.dy) S.row = (S.row + k.dy + ROWS.length) % ROWS.length;
        if (k.dx) change(k.dx);
        if (k.ok) useRow();
      }
    },
    draw() {
      const R = G.R, c = G.career, look = playerLook(c.look), an = S.an || (S.an = analyse(S.t));
      drawShowroom(R, { track: G.hall(), car: c.car, rating: CARS[c.car].rating, paint: look.paint, livery: look.livery, num: look.num, t: G.t, zoom: 0.8 });
      head(R, 'TRACK MAKER', (S.t.name + (S.dirty ? ' *' : '')));
      drawGrid(R, S, an);
      const open = S.list[S.pick];
      const rows = ROWS.map(r => {
        if (r.tool) { const i = TOOLS.findIndex(t => t.id === r.tool); return { label: (i + 1) + ' ' + TOOLS[i].name, tag: S.tool === r.tool ? (S.pen ? 'PEN' : 'ON') : '', tagColor: C.green }; }
        if (r.id === 'theme') return { label: 'THEME', tag: '< ' + THEMES[S.t.theme].name + ' >' };
        if (r.id === 'laps') return { label: 'LAPS', tag: '< ' + S.t.laps + ' >' };
        if (r.id === 'name') return { label: 'NAME', tag: S.t.name.slice(0, 12) };
        if (r.id === 'save') return { label: 'SAVE', tag: S.file ? '' : 'NEW' };
        if (r.id === 'open') return { label: 'OPEN', tag: open ? '< ' + open.name.slice(0, 11) + ' >' : 'NONE SAVED', off: !open };
        if (r.id === 'new') return { label: 'NEW ROAD' };
        if (r.id === 'test') return { label: 'TEST DRIVE', off: !an.ok };
        return { label: 'BACK' };
      });
      panel(R, PX - 3, 20, PW + 6, ROWS.length * ROWH + 6);
      menu(R, rows, S.focus === 'panel' ? S.row : -1, PX, 23, PW, { rowH: ROWH });
      /* what the road is, and what the tool in hand does */
      panel(R, 6, 151, R.w - 12, 19);
      const say1 = G.t - S.msgT < 3 ? { s: S.msg, c: C.white } : an.ok ? { s: 'A ROAD: ' + an.info.cells + ' TILES, ' + Math.round(an.info.length) + ' M, ' + an.info.pickups + ' PICKUPS', c: C.green } : { s: (an.problems[0] && an.problems[0].text) || 'PAINT SOME ROAD', c: C.red };
      wrap(say1.s, R.w - 24).slice(0, 1).forEach(l => left(R, l, 10, 154, say1.c, { outline: -1 }));
      left(R, HELP[S.tool].slice(0, 72), 10, 162, C.dim, { outline: -1 });
      hint(R, S.focus === 'grid' ? 'ARROWS  MOVE      ENTER  PLACE      1-9  TOOL      TAB  MENU      ESC  BACK' : 'UP DOWN  ROW      LEFT RIGHT  CHANGE      ENTER  DO      TAB  GRID');
    }
  };
}
