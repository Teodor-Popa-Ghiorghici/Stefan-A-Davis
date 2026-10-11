/* THE SHELLS, ROOKIE AND AMATEUR (docs/vroom/plan.md section 5): eight cars, each a stack of parts from car_parts.js in fractions of itself. A shell draws a body and returns where a livery goes on it:
     side: [x, z0, z1, y0, y1]   the flat of its flank (x a share of the half-width, the rest shares of the length and height)       roof: [y, z, halfLength, halfWidth]   where a number goes on top
     ant: [x, y, z]              where the antenna stands (the hot parcel's fuse burns it down)
   Silhouette is the point: from behind and above, which is how the chase camera sees a field, a milk float is a tall box, a bug is an egg, a trike is a wedge with one wheel, a van has a big roof. cars_check.js
   measures how different they are. */
const SIDE = [1, -0.7, 0.3, 0.2, 0.8];

export const SHELLS_A = {
  /* the KEI COURIER: a cab, an open bed and a parcel in it, a bobblehead on the dash */
  pickup(K) {
    const { P, G, M, hl, hw, H, y0, zc } = K, ex = K.look.extra || [];
    K.lf([[-0.12, 1, 0.9, 0.98], [0.36, 1, 0.9, 0.98], [0.58, 0.58, 0.94, 1], [1, 0.46, 0.95, 1]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    const bz0 = zc - hl, bz1 = zc - 0.12 * hl, bl = bz1 - bz0, wh = H * 0.5, mid = (bz0 + bz1) / 2, W = K.W;
    K.raw(0, y0 + 0.03, mid, W * 0.96, 0.02, bl, M.rubber);
    K.raw(-hw * 0.94, y0 + wh / 2 + 0.02, mid, 0.014, wh, bl, P); K.raw(hw * 0.94, y0 + wh / 2 + 0.02, mid, 0.014, wh, bl, P);
    K.raw(0, y0 + wh / 2 + 0.02, bz0 + 0.007, W * 0.96, wh, 0.014, P);
    if (ex.includes('parcel')) { K.raw(0.015, y0 + 0.07, mid + 0.005, W * 0.5, 0.06, bl * 0.62, M.card, 0.1); K.raw(0.015, y0 + 0.073, mid + 0.005, W * 0.08, 0.004, bl * 0.62, M.tape); }
    if (ex.includes('bobble')) { K.raw(0, y0 + H * 0.74, zc + 0.02 * hl, 0.022, 0.012, 0.022, M.dark); K.raw(0, y0 + H * 0.74 + 0.02, zc + 0.02 * hl, 0.028, 0.028, 0.028, M.face); }
    return { side: [0.98, -0.1, 0.55, 0.18, 0.7], roof: [1, 0.12, 0.3, 0.6], ant: [-0.6, 1, 0.1] };
  },
  /* the MILK FLOAT: a tall box over the back, a low cab in front of it, crates on the roof */
  box(K) {
    const { P, T, G, M, hl, hw, H, y0, zc, W, L } = K;
    K.lf([[-1, 1, 0.99, 1], [0.12, 1, 0.99, 1]], [{ top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.lf([[0.12, 0.62, 0.94, 1], [0.5, 0.62, 0.94, 1], [0.7, 0.44, 0.96, 1], [1, 0.38, 0.96, 1]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    for (let i = 0; i < 3; i++) K.raw((i - 1) * W * 0.28, y0 + H + 0.012, zc - hl * 0.55, W * 0.24, 0.026, L * 0.2, M.card, 0.1);
    void hw;
    return { side: [1, -0.9, 0.05, 0.15, 0.85], roof: [1.05, -0.45, 0.4, 0.7], ant: [-0.7, 1.1, -0.9] };
  },
  /* the SNOWBUG: an egg on four wheels */
  bubble(K) {
    const { P, G } = K;
    K.lf([[-1, 0.32, 0.55, 0.78], [-0.72, 0.8, 0.86, 0.94], [-0.2, 1, 0.92, 0.98], [0.3, 0.86, 0.9, 0.98], [0.72, 0.52, 0.84, 0.96], [1, 0.3, 0.6, 0.8]],
      [{ top: P, side: P }, { top: G, side: P }, { top: G, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    return { side: [0.9, -0.5, 0.2, 0.25, 0.8], roof: [1, -0.5, 0.3, 0.4], ant: [-0.5, 0.8, -0.8] };
  },
  /* the PAPERBOY: a trike. One wheel under a narrow nose, a rider's cab over the back axle and a sack of papers behind it */
  trike(K) {
    const { P, T, G, M, hl, hw, H, y0, zc } = K;
    K.lf([[-1, 0.62, 0.96, 0.96], [-0.4, 0.62, 0.96, 0.96], [-0.15, 1, 0.82, 0.92], [0.2, 1, 0.74, 0.86], [0.4, 0.6, 0.5, 0.66], [1, 0.42, 0.34, 0.4]],
      [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.bx(-0.8, 0.8, 0.62, 1.1, -1, -0.45, M.card, 0.1);
    K.bx(-0.06, 0.06, 0.62, 1.1, -1, -0.45, M.tape);
    K.bar([-0.12, 0.15, 0.9], [-0.12, 0.5, 0.82], 0.01, M.dark); K.bar([0.12, 0.15, 0.9], [0.12, 0.5, 0.82], 0.01, M.dark);       /* the fork over the front wheel */
    void hl; void hw; void y0; void zc; void H;
    return { side: [0.9, -0.4, 0.2, 0.2, 0.7], roof: [1, -0.1, 0.3, 0.45], ant: [-0.7, 1.1, -0.9] };
  },
  /* the POSTIE: the mail van. A big roof, a short sloped nose, a band of yellow, a beacon */
  van(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.88, 0.98], [-0.9, 1, 0.9, 1], [0.3, 1, 0.9, 1], [0.64, 0.66, 0.92, 1], [1, 0.5, 0.9, 1]], [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.bx(-1.02, 1.02, 0.34, 0.5, -1, 0.5, T);
    K.bx(-0.2, 0.2, 1, 1.14, -0.2, 0.2, M.lit);
    return { side: [1, -0.85, 0.2, 0.52, 0.95], roof: [1, -0.3, 0.45, 0.6], ant: [-0.7, 1, -0.85] };
  },
  /* the TUNA TRUCK: a cab-over and a long box of fish behind it, a dorsal fin on the roof */
  fishbox(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.98, 1], [0.25, 1, 0.98, 1]], [{ top: P, side: P }], { front: { side: P }, back: { side: T } });
    K.lf([[0.25, 0.64, 0.92, 1], [0.5, 0.64, 0.92, 1], [0.72, 0.5, 0.94, 1], [1, 0.44, 0.94, 1]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.lf([[-0.85, 1, 0.05, 0.05, 0.98], [-0.45, 1.34, 0.05, 0.05, 0.98], [-0.15, 1, 0.05, 0.05, 0.98]], [{ top: T, side: T }, { top: T, side: T }], { front: { side: T }, back: { side: T } });
    K.bx(-1.02, 1.02, 0.4, 0.58, -1, 0.25, T);
    void M;
    return { side: [1, -0.9, 0.2, 0.62, 0.95], roof: [1, -0.4, 0.45, 0.6], ant: [-0.7, 1, -0.9] };
  },
  /* the PLOUGHBOY: a pickup with a blade across its nose, wider than it is */
  plough(K) {
    const { P, T, G, M } = K;
    K.lf([[-0.9, 0.8, 0.95, 1], [0.0, 0.8, 0.95, 1], [0.15, 1, 0.82, 0.92], [0.5, 1, 0.78, 0.9], [0.62, 0.62, 0.9, 1], [1, 0.52, 0.92, 1]], [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.lf([[1, 0.16, 1.55, 1.55, 0.02], [1.22, 0.6, 1.6, 1.6, 0.02]], [{ top: T, side: T }], { front: { side: T }, back: { side: T } });
    K.bx(-1.1, 1.1, 0.02, 0.4, 0.96, 1.04, M.dark);
    K.bx(-0.18, 0.18, 1, 1.14, 0.1, 0.3, M.lit);
    return { side: [0.96, -0.6, 0.1, 0.2, 0.7], roof: [1, 0.3, 0.2, 0.5], ant: [-0.6, 0.85, -0.85] };
  },
  /* the TOFU: a low white block of a coupe with a lip on the tail */
  wedge(K) {
    const { P, T, G, hl, hw, H, y0, zc } = K;
    K.lf([[-1, 0.46, 0.96, 1], [-0.25, 0.54, 0.96, 1], [0.12, 1, 0.9, 0.98], [0.46, 0.92, 0.9, 0.98], [0.62, 0.5, 0.94, 1], [1, 0.3, 0.84, 1]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    if ((K.look.extra || []).includes('spoiler')) { K.raw(0, y0 + H * 0.46 + 0.045, zc - hl * 0.96, K.W * 0.9, 0.008, 0.045, T); K.raw(-hw * 0.6, y0 + H * 0.46 + 0.022, zc - hl * 0.96, 0.008, 0.044, 0.02, T); K.raw(hw * 0.6, y0 + H * 0.46 + 0.022, zc - hl * 0.96, 0.008, 0.044, 0.02, T); }
    return { side: SIDE, roof: [0.95, 0.25, 0.3, 0.55], ant: [-0.6, 0.6, -0.9] };
  }
};
