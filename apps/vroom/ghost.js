/* THE GHOST (docs/vroom/plan.md section 9: a time trial against your own best run). The sim is deterministic, so a run is not a recording of where a car was but of what was done to it: the keys, a frame at a time.
   Play them back into a second race of the same road and car and the same car drives the same run, to the bit. A frame's keys are one byte (throttle, brake, reposition and the stick in fifteenths), and the
   stream is run-length coded into a short string of text, which is what is kept (`ctx.save`). `quantize` is what the player's own race is fed as well, so that the run and its replay are given the very same numbers. Pure. */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const STICK = 15;

/* the keys of a frame as one byte: bit 0 throttle, bit 1 brake, bit 2 reposition, bits 3 to 7 the stick (0 to 30, 15 is straight; 31 is never written, and is read as 30) */
export function encode(i) {
  const st = Math.round(clamp(i.steer || 0, -1, 1) * STICK) + STICK;
  return ((st << 3) | (i.repo ? 4 : 0) | (i.brake > 0.5 ? 2 : 0) | (i.throttle > 0.5 ? 1 : 0)) & 255;
}
export const decode = b => ({ throttle: b & 1, brake: (b >> 1) & 1, steer: clamp(((b >> 3) - STICK) / STICK, -1, 1), repo: !!(b & 4), fire: false });
/* the keys as the sim will get them, from what a person did */
export const quantize = i => decode(encode(i));

/* a run as text: runs of one value, "value:count" in base 36, joined by commas ("16:7z,17:3" is 275 frames of 16 and 3 of 17) */
export function pack(bytes) {
  const out = []; let i = 0;
  while (i < bytes.length) { let j = i; while (j < bytes.length && bytes[j] === bytes[i]) j++; out.push(bytes[i].toString(36) + ':' + (j - i).toString(36)); i = j; }
  return out.join(',');
}
export function unpack(text) {
  const out = [];
  if (typeof text !== 'string' || !text) return Uint8Array.from(out);
  for (const part of text.split(',')) {
    const [v, n] = part.split(':'), b = parseInt(v, 36), c = parseInt(n, 36);
    if (!(b >= 0 && b < 256 && c >= 1 && c <= 1e6)) return Uint8Array.from([]);
    for (let k = 0; k < c; k++) out.push(b);
  }
  return Uint8Array.from(out);
}
/* what is written down while a run is driven */
export function recorder() {
  const bytes = [];
  return { push(inp) { bytes.push(encode(inp)); }, get frames() { return bytes.length; }, text: () => pack(bytes) };
}
/* what a replay gives back, a frame at a time: the keys, and then nothing once the run is over (the car coasts and brakes where it ended) */
export function player(text) {
  const bytes = unpack(text); let k = 0;
  return { next() { return k < bytes.length ? decode(bytes[k++]) : { throttle: 0, brake: 0.3, steer: 0, repo: false, fire: false }; }, get done() { return k >= bytes.length; }, get frames() { return bytes.length; } };
}
