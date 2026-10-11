/* VROOM's sound effects, the small instrument they are played on: tones, noise through a moving filter, and two kinds of continuous voice -- an ENGINE (an oscillator pair that follows a number) and a BED (noise
 * through a band that follows two). Everything goes through ONE gain (`bus`) that is the taskbar mixer's VROOM slider, and from it into the machine's SFX bus (Snd.sfx, which the SFX knob and the power switch
 * govern: see `host.on()`), the way AfterEgypt's and the garden's do.
 *
 * `host` is what the machine gives it, so this file knows nothing of the machine and can be run against any audio context:
 *   host.ctx()     the AudioContext (or null: no sound card, nothing is played)
 *   host.bus()     the node every effect ends in
 *   host.on()      whether the SFX knob is up and the power is on
 *   host.level()   the mixer slider, 0..1
 * No sound is ever scheduled in the past, and nothing outlives `stop()`. A voice that is stopped is faded first, so it never clicks.
 */
const FLOOR = 0.0001;
/* the effects are written at the loudness of the machine's own beeps; a score is playing under these ones, so they sit this much above them */
const TRIM = 1.6;
export const MAX_VOICES = 6;                  /* engines and beds alive at once: a race of sixteen does not make sixteen voices */

export function makeSynth(host) {
  const live = new Set(), voices = new Set();
  let bus = null, busCtx = null, noiseBuf = null;

  function out() {
    const c = host.ctx();
    if (!c) return null;
    if (!bus || busCtx !== c) {
      busCtx = c; noiseBuf = null;
      bus = c.createGain(); bus.gain.value = host.level() * TRIM;
      bus.connect(host.bus());
    }
    return bus;
  }
  const noiseBuffer = c => {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  };
  /* the start time of a sound `delay` seconds from now (a context that has not been resumed yet is given a hair of lead) */
  const when = (c, delay) => c.currentTime + (c.state === 'running' ? 0 : 0.06) + (delay || 0);
  const track = (src, nodes, end) => {
    live.add(src);
    src.onended = () => { live.delete(src); nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } }); };
    try { src.stop(end); } catch (e) { /* already stopped */ }
  };
  /* gain: a percussive swell (linear attack, exponential decay) or, with `env`, [[seconds, 0..1], ...] ridden linearly */
  function shape(g, t0, dur, vol, o) {
    g.setValueAtTime(FLOOR, t0);
    if (o.env) { o.env.forEach(e => g.linearRampToValueAtTime(Math.max(FLOOR, e[1] * vol), t0 + e[0])); return; }
    g.linearRampToValueAtTime(vol, t0 + (o.attack == null ? 0.004 : o.attack));
    g.exponentialRampToValueAtTime(FLOOR, t0 + dur);
  }
  /* source -> [filter] -> amp -> [pan] -> bus, returning the amp's gain param for shaping */
  function chain(c, src, o, filter) {
    const amp = c.createGain(), nodes = [src, amp];
    let head = src;
    if (filter) { head.connect(filter); head = filter; nodes.push(filter); }
    head.connect(amp); head = amp;
    if (o.pan != null && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan));
      if (o.panTo != null) p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, o.panTo)), when(c, o.delay) + o.dur);
      head.connect(p); head = p; nodes.push(p);
    }
    head.connect(bus);
    return { amp, nodes };
  }

  const S = {
    /* a pitched sound: { f, to, dur, type, vol, delay, attack, env, pan, panTo } */
    tone(o) {
      if (!host.on()) return;
      const c = host.ctx(); if (!c || !out()) return;
      const t0 = when(c, o.delay), osc = c.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
      const ch = chain(c, osc, o);
      shape(ch.amp.gain, t0, o.dur, o.vol == null ? 0.04 : o.vol, o);
      osc.start(t0);
      track(osc, ch.nodes, t0 + o.dur + 0.05);
    },
    /* noise through a filter that moves from f0 to f1: { dur, f0, f1, q, kind, vol, delay, attack, env, pan, panTo } */
    noise(o) {
      if (!host.on()) return;
      const c = host.ctx(); if (!c || !out()) return;
      const t0 = when(c, o.delay), src = c.createBufferSource(), f = c.createBiquadFilter();
      src.buffer = noiseBuffer(c); src.loop = true;
      f.type = o.kind || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f0, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
      const ch = chain(c, src, o, f);
      shape(ch.amp.gain, t0, o.dur, o.vol == null ? 0.05 : o.vol, o);
      src.start(t0, Math.random());
      track(src, ch.nodes, t0 + o.dur + 0.05);
    },
    /* AN ENGINE: two oscillators and a band that follow what `set` is told; { type, type2, ratio (the second's pitch over the first), trem (a tremolo's depth: a glow engine's ring) }.
       set({ f, gain, pan, cut, trem }) moves it (each a smooth glide), stop() lets it go. null if the machine has no sound or too many voices are alive. */
    engine(spec) {
      if (!host.on() || voices.size >= MAX_VOICES) return null;
      const c = host.ctx(); if (!c || !out()) return null;
      const o1 = c.createOscillator(), o2 = c.createOscillator(), mix2 = c.createGain(), lp = c.createBiquadFilter(), amp = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      const chop = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
      o1.type = spec.type || 'sawtooth'; o2.type = spec.type2 || 'square';
      o1.frequency.value = 120; o2.frequency.value = 120 * (spec.ratio || 2.01); mix2.gain.value = spec.mix2 == null ? 0.35 : spec.mix2;
      lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.value = 900; amp.gain.value = FLOOR;
      lfo.type = 'square'; lfo.frequency.value = 30; chop.gain.value = 1; depth.gain.value = 0;
      lfo.connect(depth); depth.connect(chop.gain);
      o1.connect(lp); o2.connect(mix2); mix2.connect(lp); lp.connect(chop); chop.connect(amp);
      let head = amp; if (pan) { amp.connect(pan); head = pan; }
      head.connect(bus);
      const t = c.currentTime + 0.01; o1.start(t); o2.start(t); lfo.start(t);
      const nodes = [o1, o2, mix2, lp, chop, lfo, depth, amp].concat(pan ? [pan] : []);
      const v = {
        set(p) {
          const now = c.currentTime, k = p.tc || 0.05;
          if (p.f != null) { o1.frequency.setTargetAtTime(p.f, now, k); o2.frequency.setTargetAtTime(p.f * (spec.ratio || 2.01), now, k); if (spec.trem) lfo.frequency.setTargetAtTime(Math.max(8, p.f / 3), now, k); }
          if (p.cut != null) lp.frequency.setTargetAtTime(p.cut, now, k);
          if (p.gain != null) amp.gain.setTargetAtTime(Math.max(FLOOR, p.gain), now, k);
          if (p.pan != null && pan) pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, p.pan)), now, k);
          depth.gain.setTargetAtTime(spec.trem ? spec.trem * (p.trem == null ? 1 : p.trem) : 0, now, k);
        },
        stop() {
          if (!voices.has(v)) return;
          voices.delete(v);
          const now = c.currentTime;
          try { amp.gain.setTargetAtTime(FLOOR, now, 0.04); [o1, o2, lfo].forEach(o => o.stop(now + 0.3)); } catch (e) { /* already stopped */ }
          o1.onended = () => nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
        }
      };
      voices.add(v);
      return v;
    },
    /* A BED: noise through a band, a continuous sound whose pitch and loudness follow `set(freq, gain, pan)` (the tyres on the road, the snow). */
    bed(spec) {
      if (!host.on() || voices.size >= MAX_VOICES) return null;
      const c = host.ctx(); if (!c || !out()) return null;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), amp = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      src.buffer = noiseBuffer(c); src.loop = true;
      f.type = spec.kind || 'bandpass'; f.Q.value = spec.q || 0.9; f.frequency.value = spec.f || 800; amp.gain.value = FLOOR;
      src.connect(f); f.connect(amp);
      let head = amp; if (pan) { amp.connect(pan); head = pan; }
      head.connect(bus);
      src.start(c.currentTime, Math.random());
      const nodes = [src, f, amp].concat(pan ? [pan] : []);
      const v = {
        set(freq, gain, p) {
          const now = c.currentTime;
          if (freq != null) f.frequency.setTargetAtTime(freq, now, 0.06);
          if (gain != null) amp.gain.setTargetAtTime(Math.max(FLOOR, gain), now, 0.06);
          if (p != null && pan) pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, p)), now, 0.06);
        },
        stop() {
          if (!voices.has(v)) return;
          voices.delete(v);
          try { amp.gain.setTargetAtTime(FLOOR, c.currentTime, 0.05); src.stop(c.currentTime + 0.4); } catch (e) { /* already stopped */ }
          src.onended = () => nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
        }
      };
      voices.add(v);
      return v;
    },
    /* the mixer slider moved */
    relevel() { if (bus && busCtx) bus.gain.setTargetAtTime(Math.max(FLOOR, host.level() * TRIM), busCtx.currentTime, 0.04); },
    /* the window is closing: nothing is left running */
    stop() {
      [...voices].forEach(v => v.stop());
      live.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } });
      live.clear();
      if (bus) { try { bus.disconnect(); } catch (e) { /* already gone */ } bus = null; }
    },
    get live() { return live.size + voices.size; },
    get voices() { return voices.size; }
  };
  return S;
}
