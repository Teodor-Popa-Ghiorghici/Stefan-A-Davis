/* Every music/ambience subsystem on this machine already runs its own
   Web Audio gain bus in isolation (the lobby, Magen's band, the Cook's
   radio, the garden's wind) -- this just gives each one a persisted
   multiplier and a small taskbar panel to work it from, the way a real
   volume mixer keeps one slider per application instead of one for
   everything at once -- and, like one, it lists only what is running. */
import { openWins } from './wm.js';
import { Music } from './music.js';
import { VARIANTS } from './music_variants.js';
const KEY = 'templeos.mixer.v1';
/* `app` is the id the window manager gives the window; a channel is only
   offered while that window is open. The lobby is not an app: it is offered
   while it is the lobby music that is playing. */
const CHANNELS = [
  { id: 'lobby',      n: 'LOBBY MUSIC' },
  { id: 'hifi',       n: 'THESTACK',   app: 'hifi' },
  { id: 'magen',      n: 'MAGEN',      app: 'magen' },
  { id: 'cook',       n: 'THE COOK',   app: 'cook' },
  { id: 'garden',     n: 'GARDEN',     app: 'garden' },
  { id: 'elephant',   n: 'ELEPHANT',   app: 'elephant' },
  { id: 'bekkedal',   n: 'BEKKEDAL',   app: 'bekkedal' },
  { id: 'standbattle', n: 'STAND BATTLE', app: 'standbattle' },
  { id: 'aftere',     n: 'AFTEREGYPT', app: 'aftere' },
  { id: 'solitaire',  n: 'SOLITAIRE',  app: 'solitaire' },
  { id: 'sweeper',    n: 'DUNGEON SWEEPER', app: 'sweeper' },
  { id: 'garage',     n: 'THE GARAGE', app: 'garage' },
  { id: 'solitaire',  n: 'SOLITAIRE',  app: 'solitaire' },
  { id: 'holyc',      n: 'HOLYC.EXE',  app: 'holyc' },
  { id: 'vroom',      n: 'VROOM',      app: 'vroom' }
];

let st = {};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) st = JSON.parse(raw) || {};
} catch (e) {}

export const Mixer = {
  get(ch) { return st[ch] == null ? 1 : st[ch]; },
  set(ch, v) {
    st[ch] = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('mixer-changed', { detail: { channel: ch } }));
  },
  channels: CHANNELS
};
window.Mixer = Mixer;

export const MixerUI = {
  box: null, panel: null, rows: null,
  /* which channels are live right now */
  live() {
    const apps = new Set(openWins.map(w => w.appId).filter(Boolean));
    return CHANNELS.filter(ch => ch.app ? apps.has(ch.app) : (Music.on && !Music.inBoot));
  },
  build() {
    const panel = this.panel;
    if (!panel) return;
    panel.textContent = '';

    /* what the lobby plays, outside of the boot */
    const head = document.createElement('div');
    head.className = 'mixhead';
    head.textContent = 'LOBBY TRACK';
    panel.appendChild(head);
    const picks = document.createElement('div');
    picks.className = 'mixpicks';
    VARIANTS.forEach(v => {
      const b = document.createElement('button');
      b.className = 'mixpick' + (Music.variant === v.id ? ' on' : '');
      b.textContent = v.name;
      b.title = v.mood + (v.id === 'hymn' ? '' : '. Same song, different mood.');
      b.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.click();
        Music.setVariant(v.id);
      });
      picks.appendChild(b);
    });
    panel.appendChild(picks);
    const sub = document.createElement('div');
    sub.className = 'mixsub';
    sub.textContent = Music.VARIANTS.find(v => v.id === Music.variant).mood +
      (window.CRT && window.CRT.lobby ? '' : ' (LOBBY SWITCH IS OFF)');
    panel.appendChild(sub);

    const sep = document.createElement('div');
    sep.className = 'mixhead';
    sep.textContent = 'RUNNING';
    panel.appendChild(sep);
    const live = this.live();
    if (!live.length) {
      const none = document.createElement('div');
      none.className = 'mixsub';
      none.textContent = 'NOTHING IS MAKING MUSIC.';
      panel.appendChild(none);
    }
    live.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'mixrow';
      const lbl = document.createElement('span');
      lbl.className = 'mixlbl';
      lbl.textContent = ch.n;
      const rng = document.createElement('input');
      rng.type = 'range';
      rng.min = '0'; rng.max = '100'; rng.step = '1';
      rng.value = String(Math.round(Mixer.get(ch.id) * 100));
      rng.className = 'mixslider';
      const pct = document.createElement('span');
      pct.className = 'mixpct';
      pct.textContent = rng.value + '%';
      rng.addEventListener('input', () => {
        Mixer.set(ch.id, rng.value / 100);
        pct.textContent = rng.value + '%';
      });
      rng.addEventListener('mousedown', ev => ev.stopPropagation());
      row.appendChild(lbl); row.appendChild(rng); row.appendChild(pct);
      panel.appendChild(row);
    });
    if (panel.style.display !== 'none') this.position();
  },
  mount() {
    const bar = document.getElementById('taskbar');
    const sunbox = document.getElementById('sunbox');
    if (!bar || document.getElementById('mixerbox')) return;

    const box = document.createElement('div');
    box.id = 'mixerbox';
    box.title = 'MIXER. Volume for whatever is running, and which lobby track plays.';
    box.textContent = '\u266B';
    bar.insertBefore(box, sunbox || document.getElementById('clock'));
    this.box = box;

    const panel = document.createElement('div');
    panel.id = 'mixerpanel';
    panel.style.display = 'none';
    document.getElementById('shell').appendChild(panel);
    this.panel = panel;
    this.build();

    /* the panel follows what is running: a window opening or closing, the
       lobby starting or stopping, a variant being picked */
    const refresh = () => { if (panel.style.display !== 'none') this.build(); };
    window.addEventListener('wins-changed', refresh);
    window.addEventListener('music-state', refresh);

    box.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      if (window.Snd) window.Snd.click();
      const on = panel.style.display === 'none';
      panel.style.display = on ? 'flex' : 'none';
      if (on) { this.build(); this.position(); }
    });
    document.addEventListener('mousedown', ev => {
      if (panel.style.display === 'none') return;
      if (ev.target === box || box.contains(ev.target) || panel.contains(ev.target)) return;
      panel.style.display = 'none';
    });
    window.addEventListener('resize', () => { if (panel.style.display !== 'none') this.position(); });
  },
  position() {
    if (!this.box || !this.panel) return;
    /* the panel is inside #shell, which is not at the corner of the viewport: its place is the button's, measured from the shell, and it sits
       wholly above the button (measured from the viewport it used to sit a bar's height too low, over the taskbar it opens from) */
    const r = this.box.getBoundingClientRect(), o = this.panel.offsetParent ? this.panel.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    const pw = this.panel.offsetWidth, ph = this.panel.offsetHeight;
    this.panel.style.left = Math.max(4, r.right - o.left - pw) + 'px';
    this.panel.style.top = Math.max(4, r.top - o.top - ph - 6) + 'px';
  }
};
window.MixerUI = MixerUI;
