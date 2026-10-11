/* The small maths of the renderer and, later, the physics: a rotation is nine numbers (row-major, applied to a column vector), a placement is those nine and three more for where it stands (12 numbers,
   `m[9..11]` the translation). World space: x to the right, y up, z ahead; yaw turns from +z toward +x, pitch is nose up, roll is the right side going down. Pure. */
export const TAU = Math.PI * 2;

/* R = Ry(yaw) * Rx(pitch) * Rz(roll) */
export function rotEuler(yaw, pitch, roll, out) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const m = out || new Float64Array(9);
  /* Rx*Rz first */
  const a00 = cr, a01 = sr, a02 = 0, a10 = cp * -sr, a11 = cp * cr, a12 = sp, a20 = sp * sr, a21 = -sp * cr, a22 = cp;
  m[0] = cy * a00 + sy * a20; m[1] = cy * a01 + sy * a21; m[2] = cy * a02 + sy * a22;
  m[3] = a10; m[4] = a11; m[5] = a12;
  m[6] = -sy * a00 + cy * a20; m[7] = -sy * a01 + cy * a21; m[8] = -sy * a02 + cy * a22;
  return m;
}
/* a placement from a position and angles (and a uniform scale) */
export function place(x, y, z, yaw, pitch, roll, s, out) {
  const m = out || new Float64Array(12);
  rotEuler(yaw || 0, pitch || 0, roll || 0, m);
  const k = s == null ? 1 : s;
  if (k !== 1) for (let i = 0; i < 9; i++) m[i] *= k;
  m[9] = x; m[10] = y; m[11] = z;
  return m;
}
/* a placement from a unit quaternion (w, x, y, z) -- what the physics keeps -- and a position */
export function placeQuat(qw, qx, qy, qz, x, y, z, out) {
  const m = out || new Float64Array(12);
  const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
  m[0] = 1 - 2 * (yy + zz); m[1] = 2 * (xy - wz); m[2] = 2 * (xz + wy);
  m[3] = 2 * (xy + wz); m[4] = 1 - 2 * (xx + zz); m[5] = 2 * (yz - wx);
  m[6] = 2 * (xz - wy); m[7] = 2 * (yz + wx); m[8] = 1 - 2 * (xx + yy);
  m[9] = x; m[10] = y; m[11] = z;
  return m;
}
export const IDENTITY = () => Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
export function apply(m, x, y, z, out) {
  const o = out || [0, 0, 0];
  o[0] = m[0] * x + m[1] * y + m[2] * z + m[9]; o[1] = m[3] * x + m[4] * y + m[5] * z + m[10]; o[2] = m[6] * x + m[7] * y + m[8] * z + m[11];
  return o;
}
/* the direction of the axes of a rotation: its columns */
export const axisX = m => [m[0], m[3], m[6]], axisY = m => [m[1], m[4], m[7]], axisZ = m => [m[2], m[5], m[8]];

/* ---- the camera: where it is and the three directions it looks along, with the numbers the projection needs ---- */
export function camera(c, w, h) {
  const cy = Math.cos(c.yaw || 0), sy = Math.sin(c.yaw || 0), cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0), cr = Math.cos(c.roll || 0), sr = Math.sin(c.roll || 0);
  const fx = sy * cp, fy = sp, fz = cy * cp;                       /* forward */
  const rx0 = cy, ry0 = 0, rz0 = -sy;                              /* right before roll */
  const ux0 = fy * rz0 - fz * ry0, uy0 = fz * rx0 - fx * rz0, uz0 = fx * ry0 - fy * rx0;   /* up = forward x right */
  const rx = rx0 * cr + ux0 * sr, ry = ry0 * cr + uy0 * sr, rz = rz0 * cr + uz0 * sr;
  const ux = ux0 * cr - rx0 * sr, uy = uy0 * cr - ry0 * sr, uz = uz0 * cr - rz0 * sr;
  const fov = c.fov || 1.05;                                       /* the vertical field, in radians */
  return { x: c.x, y: c.y, z: c.z, rx, ry, rz, ux, uy, uz, fx, fy, fz, near: c.near || 0.05, far: c.far || 120, focal: (h / 2) / Math.tan(fov / 2), cx: w / 2, cy: h / 2, fov };
}
/* a chase camera: behind and above a placement, looking at a point ahead of it (the game builds this; here for the demo and the checks) */
export function lookAt(from, to, up) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  void up;
  return { x: from[0], y: from[1], z: from[2], yaw, pitch, roll: 0 };
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
