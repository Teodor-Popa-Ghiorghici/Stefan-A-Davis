/* THE PRESSES OF A TRACK (press.js says when a press is down): for each one, a tagged box across the road in the collision soup that the world switches on and off, a hazard-striped patch painted on the road under it, and
   the slab itself in the picture, which the scene lifts and lowers by the clock. Pure. */
import { builder, box, mat } from './raster_mesh.js';
import { material, across } from './track_geo.js';
import { PRESS_TAG } from './press.js';
import { SURF } from './tune.js';
import { place } from './raster_math.js';
import { ix, GREY, BROWN } from './palette.js';

const T = 0.5;                                  /* the slab's thickness */
export function buildPresses(ctx) {
  const { F, line, widthAt, out, decor } = ctx;
  F.presses.forEach((pr, k) => {
    const sm = (pr.s0 + pr.s1) / 2, p = line.at(sm), w = widthAt(sm) + 0.3, len = pr.s1 - pr.s0, yaw = Math.atan2(p.tx, p.tz);
    pr.tag = PRESS_TAG + k; pr.x = p.x; pr.z = p.z; pr.y = p.y; pr.yaw = yaw; pr.len = len;
    out.col.obox(p.x, p.y + 0.45, p.z, w, 0.9, len, yaw, SURF.metal.id, pr.tag);
    /* the stripes on the road under it: a warning */
    const a = line.at(pr.s0), b = line.at(pr.s1), hw = widthAt(sm) / 2, A0 = across(a, hw), A1 = across(a, -hw), B0 = across(b, hw), B1 = across(b, -hw), hm = material('hazard', { zbias: 0.003 });
    out.quad(sm, [A0.x, a.y + 0.004, A0.z], [A1.x, a.y + 0.004, A1.z], [B1.x, b.y + 0.004, B1.z], [B0.x, b.y + 0.004, B0.z], [0, 1, 0], [[0, 0], [hw * 2 / 0.35, 0], [hw * 2 / 0.35, len / 0.35], [0, len / 0.35]], hm, 'metal', null, false);
    /* the slab and its piston, built about its own centre on the road (the scene places it at the height the clock says) */
    const bd = builder(), steel = mat(ix(GREY, 6)), stripe = material('hazard'), top = mat(ix(GREY, 9)), rod = mat(ix(BROWN, 5));
    box(bd, 0, T / 2, 0, w, T, len, { top, bottom: stripe, side: stripe }); box(bd, 0, 3.6, 0, 0.45, 6.2, 0.45, rod); box(bd, 0, T + 0.12, 0, w * 0.6, 0.24, len * 0.6, steel);
    decor.push({ mesh: bd.build(), m: place(p.x, p.y + 0.8, p.z, yaw, 0, 0, 1), x: p.x, z: p.z, r: w + len + 4, press: pr });
  });
}
