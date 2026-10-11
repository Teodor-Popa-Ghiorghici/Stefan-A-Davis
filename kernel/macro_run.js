/* What a button in a document does, and where a link in one goes.
   `$MA,"t",LM="cmd"$` is a line typed at the shell: a word the terminal knows (TASKS, NEOFETCH, LINES, PANIC, DEGAUSS, CMOS ...) does what the terminal does with it,
   and anything else is HolyC. A button has no terminal to print in, so what it prints gets a window of its own. `$LK,"t",A="FI:path"$` opens what is at the path:
   a folder as a folder, a picture in the viewer, a program as the app it is, a document in the editor. */
import { createWindow, openWindow, toast } from './wm.js';
import { hcLex, hcParse, hcRun, isPanic } from './holyc.js';
import { aliases } from './commands.js';
import { lineReport } from './lines.js';
import { snapshot } from './holyc_env.js';
import { panic } from './panic.js';
import { degauss } from './hardware.js';
import { Saver } from './saver.js';
import { sys } from './trophy_hook.js';
import { fs as vfs } from './vfs.js';
import { openItem } from './fileops.js';

export function textWindow(title, rows, cls, appId) {
  createWindow({
    kind: 'terminal', title, w: 520, h: 280, appId: appId || 'editor',
    build: body => {
      const t = document.createElement('div'); t.className = 'term';
      const o = document.createElement('div'); o.className = 'termout';
      rows.forEach(r => { const d = document.createElement('div'); d.className = cls || 'l-holyc'; d.textContent = r; o.appendChild(d); });
      t.appendChild(o); body.appendChild(t);
    }
  });
}

const snd = f => { try { if (window.Snd && window.Snd[f]) window.Snd[f](); } catch (e) { /* no sound */ } };

/* a path from a link: a folder, or a file of any kind */
export async function openPath(target) {
  const path = String(target || '').startsWith('::') ? target : '::/' + target;
  let kind = null;
  try { kind = await vfs.stat(path); } catch (e) { kind = null; }
  if (!kind) { toast('NOT FOUND: ' + path); snd('err'); return false; }
  if (kind === 'folder') { openWindow('folder', { path }).catch(console.error); snd('open'); return true; }
  const rec = await vfs.read(path);
  openItem('', Object.assign({}, rec || {}, { path, name: path.split('/').pop(), type: (rec && rec.type) || 'text' }));
  snd('open');
  return true;
}

/* the words the terminal answers by opening something or doing something; false for anything it does not know */
async function word(up) {
  switch (up) {
    case 'NEOFETCH': case 'FETCH': sys.mark('eggs', 'NEOFETCH'); (await import('../apps/neofetch/index.js')).default.open(); return true;
    case 'LINES': {
      sys.mark('eggs', 'LINES'); sys.emit('cmd', { name: 'LINES' });
      const rows = await lineReport();
      textWindow('LINES', rows || ['THE COUNT IS NOT ON THE DISK.'], 'l-ok', 'terminal'); snd('ok'); return true;
    }
    case 'PANIC': case 'CRASH': setTimeout(() => { try { (void 0).ascendToRing0(); } catch (e) { panic(e, 'deliberate'); } }, 10); return true;
    case 'DEGAUSS': case 'DGAUSS': degauss(); return true;
    case 'BELL': snd('bell'); return true;
    case 'WELCOME': if (window.Welcome) window.Welcome.open(); return true;
    case 'CREDITS': openWindow('credits').catch(console.error); return true;
    case 'TROPHIES': case 'TROPHY': case 'ACHIEVEMENTS': openWindow('trophies').catch(console.error); return true;
    case 'SAVER': case 'SCREENSAVER': Saver.idle = 0; Saver.start(); return true;
    default: break;
  }
  const al = aliases();
  if (al[up]) { openWindow(al[up]).catch(console.error); return true; }
  return false;
}

async function holyc(cmd) {
  const env = await snapshot('::');
  const rows = []; let fault = null;
  try {
    const ast = hcParse(hcLex(cmd));
    hcRun(ast, l => rows.push(l), null, {
      godDoodle: () => openWindow('goddoodle').catch(console.error),
      dirNames: env.dirNames, cd: p => env.cd(p)
    });
    sys.holyc(ast, null);
  } catch (e) {
    if (isPanic(e)) { textWindow('HolyC JIT', rows, 'l-holyc'); panic(e, 'deliberate'); return; }
    fault = e && e.holyc ? 'HolyC: ' + e.message + (e.line ? '  (line ' + e.line + ')' : '') : 'FAULT: ' + (e && e.message);
  }
  snd(fault ? 'err' : 'holy');
  if (!rows.length && !fault) return;
  textWindow('HolyC JIT', rows.concat(fault ? [fault] : []), fault ? 'l-err' : 'l-holyc');
}

export async function runMacro(cmd) {
  const text = String(cmd || '').trim(), bare = text.replace(/;+\s*$/, '');
  if (/^[A-Za-z]\w*$/.test(bare) && await word(bare.toUpperCase())) return;
  await holyc(cmd);
}
