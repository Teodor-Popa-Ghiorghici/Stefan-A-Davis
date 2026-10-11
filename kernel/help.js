/* The Help window: topics down the left, a DolDoc page on the right. */
import { createWindow, openWindow, toast } from './wm.js';
import { ddRender } from './doldoc.js';
import { topicsNow, pageNow } from './help_text.js';
import { restoreSystemFiles } from './fileops.js';
import { sys } from './trophy_hook.js';

let current = null;               /* the one open help window: { show(topic), win } */

function act(cmd, show) {
  if (cmd === '@restore') { restoreSystemFiles(); return; }
  if (cmd === '@welcome') { if (window.Welcome) window.Welcome.open(); return; }
  if (cmd.indexOf('@open:') === 0) { openWindow(cmd.slice(6)).catch(console.error); return; }
  if (cmd.indexOf('@help:') === 0) { show(cmd.slice(6)); return; }
  toast('NOTHING TO DO FOR ' + cmd);
}

export function openHelp(topic) {
  topic = pageNow(topic) ? topic : 'start';
  if (current && document.body.contains(current.win)) { current.show(topic); return current; }
  let show;
  const made = createWindow({
    kind: 'doc', title: 'HELP', w: 700, h: 470, appId: 'help',
    build: body => {
      body.style.display = 'flex';
      const nav = document.createElement('div');
      nav.className = 'helpnav';
      const pane = document.createElement('div');
      pane.className = 'ddpane helppane';
      const btns = {};
      topicsNow().forEach(([id, name]) => {
        const b = document.createElement('div');
        b.className = 'helptopic';
        b.textContent = name;
        b.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.click(); show(id); });
        nav.appendChild(b);
        btns[id] = b;
      });
      show = id => {
        Object.keys(btns).forEach(k => btns[k].classList.toggle('on', k === id));
        sys.mark('help', id);
        ddRender(pageNow(id), pane,
          target => { if (target.charAt(0) === '@') show(target.slice(1)); },
          cmd => act(cmd, show));
        pane.scrollTop = 0;
      };
      body.appendChild(nav);
      body.appendChild(pane);
      show(topic);
    }
  });
  current = { win: made.win, show: t => show(t) };
  return current;
}
