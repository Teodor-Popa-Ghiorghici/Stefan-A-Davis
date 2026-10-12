import { VaultURL } from '../../kernel/vault.js'; import { showMenu } from '../../kernel/menus.js'; import { wallpaperMenu } from '../../kernel/wallpaper.js'; import { deletePaths } from '../../kernel/fileops.js';
import { dirOf, baseName, joinPath } from '../../kernel/vfs_ops.js'; import { toast } from '../../kernel/wm.js'; import { whenGone } from '../lifecycle.js'; import { playVideo } from './video.js';

/* The arrows are walked through a folder of photographs, and a person does that quickly, with the pointer left where the arrow is. So nothing about the window may move under the pointer
   or answer a click that was meant for an arrow:
     - the bar is built once and never emptied: the arrows stay where they are while a photograph is read, and only the buttons of the file change (a fixed height, never wrapped);
     - a navigation is a destination, not a place: `want` moves at once, so three quick presses are three steps, and a photograph that arrives after a newer press is dropped;
     - the old photograph stays until the new one is decoded, and the swap is one step (the pane was blank for a moment, the bar too, and the pane grew over where the arrow had been);
     - a single click on a photograph does nothing: FIT / 1:1 is a button, and a double click on the photograph (not within half a second of a step) does the same;
     - the photograph cannot be selected or dragged. */
const GUARD_MS = 500;                       /* after a step, the photograph ignores a double click */

export default { id: 'viewer',
  title: 'VIEWER',
  icon: '',
  width: 460,
  height: 380,
  resizable: true,

  async mount(root, ctx, args) { const _style = document.createElement('link'); _style.rel = 'stylesheet'; _style.href = 'apps/viewer/style.css'; root.appendChild(_style); root.style.display = 'flex'; root.style.flexDirection = 'column'; root.tabIndex = 0;
    root.style.outline = 'none';

    let path = args?.path || '';            /* what is on the glass */
    let want = path;                        /* where the last press was going */
    let stop = null, siblings = [], isVideo = false, actual = false, token = 0, lastStep = -1e9, shown = false;

    const pane = document.createElement('div'); pane.className = 'imgpane'; const bar = document.createElement('div'); bar.className = 'appbar vbar'; const nav = document.createElement('div'); nav.className = 'vnav';
    const tools = document.createElement('div'); tools.className = 'vtools'; bar.append(nav, tools); root.append(pane, bar); whenGone(root, () => { token++; if (stop) stop(); stop = null; });

    const mk = (label, title, fn, host, cls) => { const b = document.createElement('button'); b.className = 'appbtn' + (cls ? ' ' + cls : ''); b.textContent = label; b.title = title;
      b.addEventListener('mousedown', ev => { ev.stopPropagation(); if (ev.button) return; if (window.Snd) window.Snd.click(); fn(b, ev); }); (host || tools).appendChild(b); return b; }; const info = document.createElement('span');
    info.className = 'godword vinfo'; const count = document.createElement('span'); count.className = 'godword vcount'; let prev = null, next = null;

    /* the other pictures in the same folder, so the arrow keys can walk through them */
    async function findSiblings() { if (!path) return; const list = await ctx.fs.list(dirOf(path)); siblings = list.filter(i => i.type === 'image' || i.type === 'video')
        .map(i => joinPath(dirOf(path), i.name))
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); } const paintNav = () => { const many = siblings.length > 1; if (many && !prev) { prev = mk('<', 'PREVIOUS PICTURE (LEFT ARROW)', () => step(-1), nav, 'vgo');
        next = mk('>', 'NEXT PICTURE (RIGHT ARROW)', () => step(1), nav, 'vgo'); nav.appendChild(count); } else if (!many && prev) { nav.replaceChildren(); prev = next = null; } const i = siblings.indexOf(want);
      count.textContent = many && i >= 0 ? (i + 1) + '/' + siblings.length : ''; }; const step = d => { if (siblings.length < 2) return; const i = siblings.indexOf(want); want = siblings[(i + d + siblings.length) % siblings.length];
      lastStep = performance.now(); paintNav(); show(want); };

    /* a photograph is ready when the browser has decoded it, so nothing is swapped in half drawn */
    const readyImage = src => new Promise(res => { const img = new Image(); img.draggable = false; img.src = src; if (img.decode) img.decode().then(() => res(img), () => res(img)); else img.addEventListener('load', () => res(img)); });
    const setActual = on => { actual = on; pane.classList.toggle('actual', actual); if (fitBtn) fitBtn.textContent = actual ? 'FIT' : '1:1'; }; let fitBtn = null;

    async function show(p) { const my = ++token; const slow = setTimeout(() => { if (my === token) info.textContent = 'LOADING...'; }, 180); const file = p ? await ctx.fs.read(p) : null; let src = '', img = null; const vid = !!file && file.type === 'video';
      if (file) { src = vid && file.vault ? (await VaultURL.url(file.vault)) : (file.src || ''); if (!vid && src) img = await readyImage(src); } clearTimeout(slow);
      if (my !== token) return;                                       /* a newer press has gone on from here */
      if (stop) { stop(); stop = null; } path = p; isVideo = vid; info.textContent = ''; fitBtn = null; if (p) ctx.setTitle(p); if (!file) { pane.className = 'imgpane';
        pane.textContent = p ? 'THAT PICTURE IS NOT ON THE DISK ANY MORE.' : 'NO PICTURE. OPEN ONE FROM A FOLDER.'; tools.replaceChildren(); paintNav(); return; } pane.className = 'imgpane'; pane.replaceChildren(); tools.replaceChildren(); if (vid) {
        if (!src) pane.textContent = 'THAT VIDEO IS NOT ON THE DISK ANY MORE.'; else stop = playVideo(pane, tools, src); } else if (img) { img.alt = p; img.title = 'DOUBLE-CLICK: FIT OR ACTUAL SIZE';
        const sz = img.naturalWidth ? img.naturalWidth + 'x' + img.naturalHeight : ''; img.addEventListener('dblclick', ev => { ev.preventDefault(); if (performance.now() - lastStep > GUARD_MS) setActual(!actual); });
        img.addEventListener('mousedown', ev => ev.preventDefault()); pane.appendChild(img); pane.classList.toggle('actual', actual); fitBtn = mk(actual ? 'FIT' : '1:1', 'SWITCH BETWEEN FIT AND ACTUAL SIZE', () => setActual(!actual)); info.textContent = sz; }
      mk('BACKGROUND', 'USE THIS AS THE DESKTOP BACKGROUND, IN ONE OF FIVE WAYS', (b) => { const r = b.getBoundingClientRect(); showMenu(document.getElementById('ctxmenu'), r.left, r.top - 130, wallpaperMenu(p, isVideo)); });
      mk('SAVE A COPY', 'MAKE A COPY NEXT TO THIS ONE', async () => { try { toast('SAVED A COPY: ' + baseName(await ctx.fs.copy(p, dirOf(p)))); await findSiblings(); paintNav(); } catch (e) { toast(e.message); } });
      del = mk('DELETE', 'PUT THIS IN THE RECYCLE BIN (DELETE KEY)', () => remove(p), null, 'vdel'); tools.appendChild(info); shown = true; paintNav(); } let del = null; async function remove(p) { const i = siblings.indexOf(p); if (await deletePaths([p])) {
        siblings = siblings.filter(x => x !== p); if (siblings.length) { want = siblings[Math.min(i, siblings.length - 1)]; paintNav(); show(want); } else ctx.close(); } }

    root.addEventListener('keydown', ev => { if (ev.ctrlKey || ev.altKey || ev.metaKey) return; if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
      else if (ev.key === 'Delete' && shown && del) { ev.preventDefault(); remove(path); } }); root.addEventListener('mousedown', () => root.focus());

    await findSiblings(); want = path; paintNav(); await show(path); setTimeout(() => root.focus(), 50); },

  unmount() {} };
