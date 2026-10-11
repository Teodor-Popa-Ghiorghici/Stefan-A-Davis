/* THE SHELLS, ADVANCED AND SEMI-PRO (docs/vroom/plan.md section 5): eight more, in the fractions of car_parts.js. See car_shells_a.js for what a shell returns. */

export const SHELLS_B = {
  /* the DAM RUNNER: a wagon lifted on big wheels, a rack on the roof with a light bar, a bull bar, a spare on the back */
  truck4(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.94, 1, 0.3], [0.45, 1, 0.94, 1, 0.3], [0.62, 0.8, 0.92, 1, 0.3], [1, 0.68, 0.92, 1, 0.3]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.bx(-0.8, 0.8, 0.05, 0.3, -0.9, 0.9, M.dark);
    for (const x of [-0.7, 0.7]) K.bar([x, 1.1, -0.8], [x, 1.1, 0.35], 0.012, M.chrome);
    for (const z of [-0.8, 0.35]) K.bar([-0.7, 1.1, z], [0.7, 1.1, z], 0.012, M.chrome);
    K.bx(-0.5, 0.5, 1.1, 1.2, 0.3, 0.38, M.lit);
    K.bx(-0.9, 0.9, 0.35, 0.62, 1.0, 1.1, M.chrome);
    K.bx(-0.4, 0.4, 0.45, 0.95, -1.12, -1.0, M.tyre);
    K.bar([0.86, 0.7, 0.5], [0.86, 1.2, 0.45], 0.012, M.dark);
    return { side: [0.97, -0.8, 0.4, 0.5, 0.95], roof: [1.12, -0.2, 0.5, 0.55], ant: [-0.7, 1.15, -0.8], lamps: 0.45 };
  },
  /* the NOODLE BAR: a rounded van that is mostly kitchen: an awning on the right, a lit sign and a chimney on the roof */
  foodvan(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.95, 0.8, 1], [-0.5, 1, 0.85, 1], [0.35, 1, 0.85, 1], [0.7, 0.7, 0.9, 1], [1, 0.5, 0.9, 1]], [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.bx(0.95, 1.04, 0.3, 0.58, -0.55, 0.15, G);
    K.bx(0.98, 1.7, 0.6, 0.64, -0.62, 0.22, M.white); K.bx(0.98, 1.7, 0.64, 0.68, -0.62, -0.5, T);
    K.bx(-0.55, 0.55, 1, 1.24, -0.22, -0.16, M.lit); K.bx(-0.55, -0.45, 1, 1.0, -0.22, -0.16, M.dark);
    K.bx(0.3, 0.5, 1, 1.32, -0.85, -0.65, M.steel);
    return { side: [0.97, -0.9, 0.2, 0.15, 0.5], roof: [1, -0.1, 0.4, 0.5], ant: [-0.6, 1.1, -0.9] };
  },
  /* the RATTLER: a buggy: a bare tub, a roll cage, the engine hanging out of the back and tyres wider than the car */
  buggy(K) {
    const { P, T, G, M } = K;
    K.lf([[-0.9, 0.5, 0.62, 0.7, 0.1], [0.5, 0.5, 0.62, 0.7, 0.1], [1, 0.36, 0.44, 0.5, 0.1]], [{ top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.bx(-0.45, 0.45, 0.5, 0.9, -1.05, -0.5, M.steel); K.bx(-0.2, 0.2, 0.5, 0.7, -1.2, -1.05, M.dark);
    K.bx(-0.5, -0.1, 0.5, 0.78, -0.25, 0.0, M.dark); K.bx(0.1, 0.5, 0.5, 0.78, -0.25, 0.0, M.dark);          /* the seats */
    for (const x of [-0.6, 0.6]) { K.bar([x, 0.5, 0.15], [x, 1.7, 0.1], 0.008, T); K.bar([x, 0.5, -0.5], [x, 1.7, -0.45], 0.008, T); K.bar([x, 1.7, 0.1], [x, 1.7, -0.45], 0.008, T); }
    K.bar([-0.6, 1.7, 0.1], [0.6, 1.7, 0.1], 0.008, T); K.bar([-0.6, 1.7, -0.45], [0.6, 1.7, -0.45], 0.008, T);
    K.bx(-0.7, 0.7, 0.45, 0.6, 0.88, 0.96, M.lit); K.bx(-0.7, 0.7, 1.7, 1.78, 0.1, 0.18, M.lit);
    void G;
    return { side: [0.64, -0.7, 0.4, 0.2, 0.5], roof: [1.7, -0.17, 0.35, 0.6], ant: [-0.6, 1.5, -0.6], lamps: false };
  },
  /* the SLED: a low wedge with a canopy, a thick tail, and runners where the front wheels would be (car_art.js swaps them) */
  sled(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.78, 0.9, 0.9, 0.1], [-0.1, 0.9, 0.94, 0.94, 0.1], [0.4, 0.55, 0.8, 0.86, 0.1], [1, 0.2, 0.5, 0.62, 0.1]], [{ top: P, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.ell(0, 1.05, -0.1, 0.62, 0.42, 0.34, G, 8, 4);
    K.bx(-0.9, 0.9, 0.78, 1.15, -1.05, -0.9, T); K.bx(-0.85, -0.65, 0.78, 1.0, -1.05, -0.5, T); K.bx(0.65, 0.85, 0.78, 1.0, -1.05, -0.5, T);
    return { side: [0.94, -0.8, 0.0, 0.2, 0.8], roof: [0.9, -0.55, 0.25, 0.5], ant: [-0.5, 1.2, -0.95], lamps: 0.3 };
  },
  /* the FREEZER: a white box on a long chassis, a refrigeration unit above the cab, a stripe, an exhaust stack */
  reefer(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 1, 0.99, 1], [0.15, 1, 0.99, 1]], [{ top: P, side: P }], { front: { side: P }, back: { side: M.steel } });
    K.lf([[0.15, 0.6, 0.94, 1], [0.5, 0.6, 0.94, 1], [0.72, 0.46, 0.96, 1], [1, 0.4, 0.96, 1]], [{ top: T, side: T }, { top: G, side: T }, { top: T, side: T }], { front: { side: T }, back: { side: P } });
    K.bx(-1.02, 1.02, 0.42, 0.56, -1, 0.15, T);
    K.bx(-0.7, 0.7, 1, 1.16, 0.0, 0.25, M.steel); K.bx(-0.5, 0.5, 1.0, 1.1, 0.25, 0.27, M.dark);
    K.bar([0.8, 0.6, 0.35], [0.8, 1.45, 0.3], 0.014, M.chrome);
    return { side: [1, -0.9, 0.1, 0.62, 0.92], roof: [1.0, -0.45, 0.45, 0.65], ant: [-0.7, 1, -0.9] };
  },
  /* the MINX: a short hatch with a scoop, rally lights on the roof, a big wing */
  hatch(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.75, 0.98, 1], [-0.7, 0.95, 0.9, 0.98], [0.0, 1, 0.88, 0.98], [0.32, 0.92, 0.9, 0.98], [0.6, 0.55, 0.95, 1], [1, 0.4, 0.96, 1]], [{ top: P, side: P }, { top: P, side: P }, { top: G, side: P }, { top: P, side: P }, { top: P, side: P }], { front: { side: P }, back: { side: P } });
    K.bx(-0.2, 0.2, 1, 1.1, -0.3, 0.05, M.dark); K.bx(-0.07, 0.07, 1, 1.01, -0.7, 0.3, T);
    K.bx(-0.65, 0.65, 0.95, 1.06, 0.2, 0.3, M.lit);
    for (const x of [-0.7, 0.7]) K.bar([x, 0.7, -0.98], [x, 1.2, -0.98], 0.01, M.dark);
    K.bx(-1.25, 1.25, 1.18, 1.24, -1.12, -0.82, T);
    return { side: [0.99, -0.7, 0.3, 0.3, 0.85], roof: [1, -0.3, 0.3, 0.55], ant: [-0.6, 1.1, -0.9] };
  },
  /* the LOGGER: a flatbed with a cab, a crane standing behind the cab and a hook on a cable, and three logs on the bed. Everything about it is too high. */
  crane(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.36, 0.98, 1], [0.38, 0.36, 0.98, 1]], [{ top: M.wood, side: P }], { front: { side: P }, back: { side: P } });
    K.lf([[0.4, 0.66, 0.94, 1], [0.62, 0.66, 0.94, 1], [0.8, 0.5, 0.96, 1], [1, 0.42, 0.96, 1]], [{ top: P, side: P }, { top: G, side: P }, { top: P, side: P }], { front: { side: T }, back: { side: P } });
    K.bx(-0.25, 0.25, 0.36, 1.7, 0.0, 0.3, T);
    K.bar([0, 1.7, 0.15], [0, 2.3, -0.85], 0.03, T); K.bar([0, 2.3, -0.85], [0, 1.0, -0.85], 0.006, M.dark); K.bx(-0.12, 0.12, 0.9, 1.0, -0.9, -0.8, M.dark);
    K.bx(-0.85, -0.45, 0.36, 0.56, -0.95, -0.15, M.wood); K.bx(-0.3, 0.1, 0.36, 0.56, -0.95, -0.15, M.wood); K.bx(0.4, 0.8, 0.36, 0.56, -0.95, -0.15, M.wood); K.bx(-0.55, 0.45, 0.56, 0.74, -0.95, -0.15, M.wood);
    return { side: [1, 0.45, 1.0, 0.1, 0.5], roof: [0.66, 0.7, 0.25, 0.6], ant: [-0.8, 0.8, 0.5] };
  },
  /* the NIGHT BUS: long, low, every window lit, a destination board in the windscreen */
  bus(K) {
    const { P, T, G, M } = K;
    K.lf([[-1, 0.5, 0.98, 1], [1, 0.5, 0.98, 1]], [{ top: P, side: P }], { front: { side: P }, back: { side: P } });
    const zs = [-0.97, -0.65, -0.33, -0.01, 0.31, 0.63, 0.97];
    K.lf(zs.map(z => [z, 1, 0.9, 0.97, 0.5]), zs.slice(0, -1).map(() => ({ top: P, side: M.pane })), { front: { side: G }, back: { side: P } });
    K.bx(-1.02, 1.02, 0.34, 0.46, -1, 1, T);
    K.bx(-0.6, 0.6, 0.86, 0.98, 0.99, 1.0, M.lit);
    return { side: [1, -0.9, 0.9, 0.08, 0.48], roof: [1, 0.0, 0.5, 0.5], ant: [-0.6, 1, -0.9] };
  }
};
