/* THE PRETEND AUDIO CONTEXT THE SOUND CHECKS SHARE (dev-only, not packaged): as strict as the real one -- an exponential ramp to nothing, a stop before a start, a start twice and a time before zero all throw, as
   they do in a browser -- and it keeps every node it makes, so a check can ask what was started, what was told to stop, and what it was connected to. */
export function fakeAudio() {
  const A = { currentTime: 10, state: 'running', sampleRate: 8000, made: [] };
  const param = v0 => ({ value: v0 || 0, set: [], ramps: [], targets: [],
    setValueAtTime(v, t) { if (t < 0) throw new RangeError('negative time'); this.set.push([v, t]); },
    linearRampToValueAtTime(v, t) { if (t < 0) throw new RangeError('negative time'); this.ramps.push(['lin', v, t]); },
    exponentialRampToValueAtTime(v, t) { if (!(v > 0)) throw new RangeError('exponential ramp to ' + v); this.ramps.push(['exp', v, t]); },
    setTargetAtTime(v, t) { if (!(t >= 0)) throw new RangeError('negative time'); this.value = v; this.target = v; this.targets.push(v); } });
  const mk = (kind, o) => { const n = Object.assign({ kind, out: [], connect(x) { n.out.push(x); return x; }, disconnect() { n.out.length = 0; } }, o); A.made.push(n); return n; };
  const source = (kind, o) => mk(kind, Object.assign({ started: null, stopAt: null, ended: false, onended: null,
    start(t) { if (this.started != null) throw new Error('started twice'); this.started = t; },
    stop(t) { if (this.started == null) throw new Error('stop before start'); if (t != null && t < this.started) throw new RangeError('stop before start time'); this.stopAt = t == null ? A.currentTime : t; if (t == null) { this.ended = true; if (this.onended) this.onended(); } } }, o));
  A.destination = mk('dest');
  A.createOscillator = () => source('osc', { type: 'sine', frequency: param(440) });
  A.createBufferSource = () => source('src', { buffer: null, loop: false });
  A.createGain = () => mk('gain', { gain: param(1) });
  A.createBiquadFilter = () => mk('filter', { type: '', frequency: param(350), Q: param(1) });
  A.createStereoPanner = () => mk('pan', { pan: param(0) });
  A.createBuffer = (ch, len) => ({ getChannelData: () => new Float32Array(len) });
  A.sources = () => A.made.filter(n => n.kind === 'osc' || n.kind === 'src');
  return A;
}
/* a host for createSfx / createAudio over a fake context: o { on, level, noCard } */
export function rig(createSfx, o) {
  o = o || {};
  const A = fakeAudio(), host = { on: () => o.on !== false, level: () => (o.level == null ? 1 : o.level), ctx: () => (o.noCard ? null : A), bus: () => A.destination };
  return { A, host, fx: createSfx ? createSfx(host) : null };
}
