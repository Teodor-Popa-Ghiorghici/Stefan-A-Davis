/* THE SHELLS, PRO AND THE SPECIALS (docs/vroom/plan.md section 5): eight more, in the fractions of car_parts.js. See car_shells_a.js for what a shell returns. */

export const SHELLS_C = {
  /* the VECTOR: a smooth GT with a glass canopy, a lip on the tail and two dark intakes */
  gt(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.4, 0.86, 0.94], [-0.6, 0.52, 0.95, 1], [-0.1, 0.6, 0.92, 1], [0.35, 0.5, 0.9, 1], [1, 0.26, 0.8, 0.96]], [{ top: P, side: P }, { top: P, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.lf([[-0.55, 0.6, 0.62, 0.9], [-0.15, 1, 0.5, 0.8], [0.2, 0.96, 0.5, 0.8], [0.5, 0.5, 0.8, 0.95]], [{ top: G, side: G }, { top: G, side: G }, { top: G, side: G }], { front: { side: G }, back: { side: P } });
    K.bx(-0.9, 0.9, 0.5, 0.56, -1.04, -0.88, T);
    K.bx(0.97, 1.03, 0.3, 0.46, -0.1, 0.3, M.dark); K.bx(-1.03, -0.97, 0.3, 0.46, -0.1, 0.3, M.dark);
    return { side: [1, -0.6, 0.0, 0.2, 0.5], roof: [0.98, -0.2, 0.3, 0.45], ant: [-0.6, 0.6, -0.9] };
  },
  /* the HORNET: an open-wheel racer: a narrow nacelle between wheels that stand outside it, a wing across the nose and another over the tail, a helmet */
  openwheel(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.7, 0.34, 0.38, 0.1], [-0.2, 0.84, 0.44, 0.48, 0.1], [0.2, 0.7, 0.36, 0.4, 0.1], [1, 0.34, 0.14, 0.16, 0.1]], [{ top: P, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.bx(-0.2, 0.2, 0.84, 1.1, -0.35, -0.05, M.dark); K.ell(0, 1.2, -0.2, 0.2, 0.3, 0.1, T, 6, 3);
    K.bx(-0.2, 0.2, 0.84, 1.5, -0.55, -0.4, M.steel);
    K.bx(-1.9, 1.9, 0.22, 0.3, 0.82, 1.02, T); K.bx(-1.9, -1.8, 0.2, 0.45, 0.8, 1.04, T); K.bx(1.8, 1.9, 0.2, 0.45, 0.8, 1.04, T);
    K.bx(-1.5, 1.5, 1.28, 1.36, -1.04, -0.84, T); K.bx(-1.5, -1.4, 0.85, 1.4, -1.04, -0.84, T); K.bx(1.4, 1.5, 0.85, 1.4, -1.04, -0.84, T);
    K.bar([-0.3, 0.84, -0.9], [-0.3, 1.3, -0.9], 0.012, M.dark); K.bar([0.3, 0.84, -0.9], [0.3, 1.3, -0.9], 0.012, M.dark);
    void G;
    return { side: [0.44, -0.6, 0.1, 0.25, 0.7], roof: [0.84, -0.6, 0.35, 0.3], ant: [0, 1.5, -0.5], lamps: false };
  },
  /* the WARDEN: an armoured van: slab sides, a sloped nose, slit windows, a light bar, a bull bar */
  armoured(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.98, 1], [0.35, 1, 0.98, 1], [0.7, 0.82, 0.98, 1], [1, 0.62, 0.98, 1]], [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }], { front: { side: T }, back: { side: P } });
    for (const x of [-1, 1]) K.bx(x * 0.97 - 0.03, x * 0.97 + 0.03, 0.62, 0.76, -0.5, 0.4, M.dark);
    K.bx(-0.8, 0.8, 1, 1.1, 0.45, 0.58, M.lit); K.bx(-0.9, 0.9, 0.12, 0.5, 1.0, 1.1, M.steel); K.bx(-0.3, 0.3, 1, 1.08, -0.5, -0.1, T);
    K.bx(-0.3, 0.3, 0.1, 0.9, -1.08, -1.0, M.tyre);
    return { side: [1, -0.9, 0.9, 0.15, 0.55], roof: [1, -0.6, 0.3, 0.7], ant: [-0.7, 1.05, -0.9] };
  },
  /* the KESTREL: a low prototype: covered wheels, a bubble canopy to one side of a long spine, a fin down the tail */
  proto(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.6, 0.7, 0.9, 0.0], [-0.4, 0.74, 0.82, 0.95, 0.0], [0.1, 0.9, 0.7, 0.9, 0.0], [0.5, 0.62, 0.82, 0.95, 0.0], [1, 0.3, 0.7, 0.9, 0.0]], [{ top: P, side: P }, { top: P, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.ell(0, 0.98, 0.0, 0.45, 0.55, 0.42, G, 8, 4);
    K.lf([[-1, 1.7, 0.04, 0.04, 0.6], [-0.35, 1.0, 0.04, 0.04, 0.6]], [{ top: T, side: T }], { front: { side: T }, back: { side: T } });
    for (const x of [-1, 1]) { K.bx(x * 0.95, x * 1.45, 0.2, 0.95, 0.42, 0.9, P); K.bx(x * 0.95, x * 1.45, 0.2, 0.95, -0.82, -0.34, P); }
    return { side: [0.95, -0.2, 0.3, 0.1, 0.55], roof: [0.76, -0.4, 0.3, 0.5], ant: [0.4, 0.8, -0.8], lamps: 0.2 };
  },
  /* the PHONE BOX: a red phone box with panes on all four sides, a crown on top, on four small wheels */
  phonebox(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.98, 1], [1, 1, 0.98, 1]], [{ top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.bx(0.97, 1.03, 0.14, 0.94, -0.8, 0.8, M.pane); K.bx(-1.03, -0.97, 0.14, 0.94, -0.8, 0.8, M.pane);
    K.bx(-0.8, 0.8, 0.14, 0.94, 0.99, 1.04, M.pane); K.bx(-0.8, 0.8, 0.14, 0.94, -1.04, -0.99, M.pane);
    K.bx(-0.85, 0.85, 1, 1.06, -0.85, 0.85, P); K.bx(-0.45, 0.45, 1.06, 1.12, -0.45, 0.45, T);
    return { side: [1.03, -0.8, 0.8, 0.14, 0.9], roof: [1.12, 0, 0.4, 0.4], ant: [-0.8, 1.1, -0.8], lamps: 0.15 };
  },
  /* the SNOWMAN: three snowballs and a top hat, a carrot and a scarf, on a skateboard */
  snowman(K) {
    const { P, T, G, M } = K;
    K.bx(-1, 1, 0, 0.07, -1, 1, M.wood); K.bx(-0.9, 0.9, 0.07, 0.13, 0.86, 1.0, M.wood); K.bx(-0.9, 0.9, 0.07, 0.13, -1.0, -0.86, M.wood);
    K.ell(0, 0.28, 0, 1.0, 0.2, 0.5, P, 8, 4); K.ell(0, 0.56, 0, 0.8, 0.16, 0.4, P, 8, 4); K.ell(0, 0.8, 0.02, 0.62, 0.13, 0.32, P, 8, 4);
    K.bx(-0.45, 0.45, 0.9, 1.12, -0.17, 0.17, M.black); K.bx(-0.65, 0.65, 0.9, 0.93, -0.3, 0.3, M.black);
    K.bx(-0.05, 0.05, 0.78, 0.82, 0.3, 0.7, T);
    K.bx(-0.8, 0.8, 0.66, 0.72, -0.3, 0.3, flatRed(K));
    K.bar([0.75, 0.6, 0], [1.9, 0.95, 0.1], 0.008, M.wood); K.bar([-0.75, 0.6, 0], [-1.9, 0.95, 0.1], 0.008, M.wood);
    void G;
    return { side: [0.9, -0.2, 0.2, 0.3, 0.6], roof: [0.95, 0.02, 0.2, 0.3], ant: [-0.5, 0.9, -0.5], lamps: false };
  },
  /* the CURLING STONE: a polished dome of granite, a band round its foot, a handle with two posts */
  stone(K) {
    const { P, T, M } = K;
    K.ell(0, 0.42, 0, 1.0, 0.6, 1.0, P, 10, 4);
    K.ell(0, 0.18, 0, 1.03, 0.2, 1.03, M.steel, 10, 3);
    K.bar([-0.7, 1.0, 0], [0.7, 1.0, 0], 0.022, T); K.bar([-0.7, 0.85, 0], [-0.7, 1.0, 0], 0.016, T); K.bar([0.7, 0.85, 0], [0.7, 1.0, 0], 0.016, T);
    return { side: [0.8, -0.4, 0.4, 0.3, 0.7], roof: [1, 0, 0.3, 0.3], ant: [0, 1.05, -0.2], lamps: false };
  },
  /* THE CAT: a tabby: a long body with stripes, a round head with two ears and green eyes, a tail that curls up behind */
  cat(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.55, 0.7, 0.9], [-0.5, 0.85, 0.95, 1], [0, 0.9, 0.95, 1], [0.35, 0.85, 0.9, 1], [0.5, 0.6, 0.8, 0.95]], [{ top: P, side: P }, { top: P, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.ell(0, 0.78, 0.78, 0.8, 0.6, 0.3, P, 8, 4);
    for (const x of [-1, 1]) { K.bar([x * 0.5, 1.0, 0.7], [x * 0.55, 1.4, 0.72], 0.03, P); K.bx(x * 0.35 - 0.1, x * 0.35 + 0.1, 0.75, 0.85, 0.99, 1.04, M.head); }
    K.bx(-0.07, 0.07, 0.6, 0.66, 1.03, 1.06, T);
    for (const z of [-0.65, -0.3, 0.05]) K.bx(-0.9, 0.9, 0.88, 0.94, z - 0.07, z + 0.07, T);
    K.bar([0, 0.6, -1], [0, 0.95, -1.2], 0.03, P); K.bar([0, 0.95, -1.2], [0, 1.6, -1.15], 0.03, P);
    void G;
    return { side: [0.97, -0.7, 0.3, 0.25, 0.75], roof: [0.92, -0.3, 0.3, 0.5], ant: [0.5, 1.0, -0.7], lamps: false };
  }
};
function flatRed(K) { return K.c(K.ix(4, 8)); }
