/* THE WAYS TO THE STUNT YARD'S STARS (dev-only, not packaged): for each star, the waypoints a patient driver follows to it from a standstill (yard_check_kit.js drives them). A star is meant for a kind of car, and this is where
   that is written down as something a check can run: `NEEDS` says the rating a star is for (a car of a lower rating is not expected to reach it, one of that rating or better is), and `WAYS` how to go. The bowl's way
   is a spiral drawn from numbers: in through the gate on the west side at the radius `rc`, round it counter-clockwise, out to `rt`. */

const BOWL = { x: -31, z: 6 };
const spiral = (rc, rt, laps) => {
  const w = [[-55, BOWL.z - rc], [BOWL.x - 3, BOWL.z - rc]], n = Math.round(laps * 24);
  for (let i = 1; i <= n; i++) { const t = i / n, r = rc + (rt - rc) * Math.min(1, t * 1.8), th = 1.5 * Math.PI + 2 * Math.PI * laps * t; w.push([BOWL.x + r * Math.cos(th), BOWL.z + r * Math.sin(th)]); }
  return w;
};

export const WAYS = {
  k1: { way: [[-55, -18], [-5, -18]], secs: 10 }, k2: { way: [[-55, -15], [-5, -15]], secs: 10 }, k3: { way: [[-55, -12], [-5, -12]], secs: 10 }, k4: { way: [[-55, -9], [-5, -9]], secs: 10 },
  ski: { way: [[-55, -23], [10, -23]], secs: 14 },
  gap: { way: [[55, 12], [10, 12]], secs: 10 },
  pipeL: { way: [[30, -36], [30, -14], [24, -6]], secs: 9 }, pipeR: { way: [[30, -36], [30, -14], [36, -6]], secs: 9 },
  qp1: { way: [[-55, 18], [-26, 18], [-14, 23]], secs: 9 }, qp2: { way: [[-55, 18], [0, 18], [10, 22.5]], secs: 10 },
  bowlA: { way: spiral(5.5, 7.5, 3), secs: 16, cap: 9 }, bowlB: { way: spiral(5.5, 6.7, 3), secs: 16, cap: 9 }, bowlC: { way: spiral(5.5, 8, 3), secs: 16, cap: 12 },
  roof: { way: [[-55, -4], [18, -4]], secs: 10 }, roofCorner: { way: [[-55, -4], [1, -4], [6, -2.2], [16, -2.2]], secs: 10 },
  slalom: { way: [[41, -35], [41, 9]], secs: 9 },
  squeeze: { way: [[12, 2.5], [12, 15]], secs: 6 }
};
/* which way is tried for which star, and the lowest rating of car it is for (0 to 4) */
export const STAR_WAYS = {
  0: ['k1'], 1: ['k2'], 2: ['k3'], 3: ['k4'], 4: ['gap'], 5: ['ski'], 6: ['ski'], 7: ['ski'],
  8: ['pipeL'], 9: ['pipeR'], 10: ['pipeL', 'pipeR'], 11: ['qp1'], 12: ['qp2'],
  13: ['bowlA', 'bowlB', 'bowlC'], 14: ['bowlA', 'bowlB', 'bowlC'], 15: ['bowlA', 'bowlB', 'bowlC'],
  16: ['roof'], 17: ['roofCorner'], 18: ['slalom'], 19: ['squeeze']
};
export const NEEDS = { 0: 0, 1: 0, 2: 1, 3: 3, 4: 1, 5: 3, 6: 2, 7: 4, 8: 1, 9: 2, 10: 4, 11: 0, 12: 1, 13: 0, 14: 2, 15: 3, 16: 0, 17: 3, 18: 0, 19: 0 };
