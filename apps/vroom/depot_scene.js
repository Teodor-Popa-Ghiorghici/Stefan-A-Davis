/* THE DEPOT'S ROOM (docs/vroom/plan.md section 8: the garage is a small 3D scene, not a list). A back wall of brick with three rows of boards on it, a workbench with the car on it, a lamp. The boards are the
   goods: ROUTE PARTS on the top row, TUNING PARTS below, and the five looks (paint, bobblehead, horn, plate, cab light) on the third. Each board is a sign whose texture says what it is and how it stands
   (for sale, bought, out of reach, all fitted), and one of them has a bright frame round it: the cursor. The camera slides along the wall to the board that is chosen. The room is one mesh made once; the
   boards are built per state and kept. Pure but for the raster it is given. */
import { builder, box, sheet, mat } from './raster_mesh.js';
import { tex, sign } from './raster_tex.js';
import { place } from './raster_math.js';
import { material } from './track_geo.js';
import { ix, GREY, BROWN, GREEN, RED, COOL, CYAN } from './palette.js';
import { ROUTE_IDS, TUNING_IDS, COSMETIC_KINDS } from './parts.js';

export const ROWS = [ROUTE_IDS, TUNING_IDS, COSMETIC_KINDS];
export const ROW_NAMES = ['ROUTE PARTS', 'TUNING', 'LOOK'];
const ROW_Y = [1.36, 1.14, 0.92], GAP = 0.62, WALL_Z = 2.5, BW = 0.56, BH = 0.14;
const ID = place(0, 0, 0);
/* where a board is, centre */
export const boardAt = (row, col) => { const n = ROWS[row].length; return { x: (col - (n - 1) / 2) * GAP, y: ROW_Y[row], z: WALL_Z - 0.02 }; };
export const BENCH = { x: 0, y: 0.37, z: 1.4 };

let room = null;
export function roomMesh() {
  if (room) return room;
  const b = builder(), planks = material('planks'), wood = material('planks'), tin = material('concrete'), floor = material('concrete'), peg = material('plate');
  sheet(b, -3.2, -0.6, 3.2, WALL_Z, 0, 8, 6, floor, 1.2);                                    /* the floor */
  /* the back wall, two side walls, and a ceiling with a lamp */
  b.use(tin).quad([-3.2, 0, WALL_Z], [3.2, 0, WALL_Z], [3.2, 2.1, WALL_Z], [-3.2, 2.1, WALL_Z], [0, 0, -1], [[0, 0], [8, 0], [8, 2.6], [0, 2.6]]);
  b.use(peg).quad([-2.4, 0.78, WALL_Z - 0.005], [2.4, 0.78, WALL_Z - 0.005], [2.4, 1.56, WALL_Z - 0.005], [-2.4, 1.56, WALL_Z - 0.005], [0, 0, -1], [[0, 0], [6, 0], [6, 2], [0, 2]]);          /* the pegboard the boards hang on */
  b.use(tin).quad([-3.2, 0, -0.6], [-3.2, 0, WALL_Z], [-3.2, 2.1, WALL_Z], [-3.2, 2.1, -0.6], [1, 0, 0], [[0, 0], [4, 0], [4, 2], [0, 2]]);
  b.use(tin).quad([3.2, 0, WALL_Z], [3.2, 0, -0.6], [3.2, 2.1, -0.6], [3.2, 2.1, WALL_Z], [-1, 0, 0], [[0, 0], [4, 0], [4, 2], [0, 2]]);
  sheet(b, -3.2, -0.6, 3.2, WALL_Z, 2.1, 4, 3, material('under'), 1.5, true);
  /* the bench: a top, four legs, a pegboard strip at the back, a vice */
  const { x, y, z } = BENCH;
  box(b, x, y - 0.015, z, 1.3, 0.05, 0.66, wood, 0.6);
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.28, 0.28]) box(b, x + dx, (y - 0.04) / 2, z + dz, 0.06, y - 0.04, 0.06, wood, 0.6);
  box(b, x, 0.14, z, 1.18, 0.03, 0.56, wood, 0.6);                                              /* a lower shelf with tools on it */
  box(b, x - 0.45, y + 0.04, z + 0.2, 0.18, 0.06, 0.08, mat(ix(GREY, 4)));
  box(b, x + 0.46, y + 0.025, z + 0.2, 0.12, 0.04, 0.1, mat(ix(RED, 8)));
  box(b, x + 0.35, y + 0.02, z - 0.22, 0.1, 0.03, 0.06, mat(ix(BROWN, 12)));
  /* a rail under the boards, and the lamp: a bar of light over the bench */
  box(b, 0, ROW_Y[2] - 0.12, WALL_Z - 0.03, 3.4, 0.03, 0.05, wood, 0.5);
  box(b, 0, 2.0, z, 1.4, 0.04, 0.08, mat(ix(BROWN, 15), { emit: 0.95 }));
  room = b.build();
  return room;
}
export function roomDraw(R) { R.draw(roomMesh(), ID); }

/* a board in a state: { kind, text, line2? } -> a mesh facing the room, cached. `state`: 0 for sale and within reach, 1 for sale and out of reach, 2 bought, 3 all fitted. */
const boards = {};
const STATE_COLOURS = [[ix(GREY, 15), ix(CYAN, 5)], [ix(GREY, 9), ix(GREY, 3)], [ix(GREEN, 14), ix(GREEN, 5)], [ix(BROWN, 15), ix(BROWN, 5)]];
export function boardMesh(row, col, label, state) {
  const k = row + ':' + col + ':' + label + ':' + state;
  if (boards[k]) return boards[k];
  const c = STATE_COLOURS[state], at = boardAt(row, col), b = builder();
  const m = mat(sign(label, c[0], c[1], 64, 16), { emit: state === 1 ? 0 : 0.18 });
  b.use(m).quad([at.x - BW / 2, at.y - BH / 2, at.z], [at.x + BW / 2, at.y - BH / 2, at.z], [at.x + BW / 2, at.y + BH / 2, at.z], [at.x - BW / 2, at.y + BH / 2, at.z], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  return (boards[k] = b.build());
}
let frame = null;
/* the cursor: a bright frame round a board (four bars) */
export function frameMesh() {
  if (frame) return frame;
  const b = builder(), m = mat(ix(BROWN, 15), { emit: 1 }), t = 0.012, z = 0.012;
  b.use(m);
  const quad = (x0, y0, x1, y1) => b.quad([x0, y0, -z], [x1, y0, -z], [x1, y1, -z], [x0, y1, -z], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  const w = BW / 2 + 0.02, h = BH / 2 + 0.02;
  quad(-w, -h, w, -h + t); quad(-w, h - t, w, h); quad(-w, -h, -w + t, h); quad(w - t, -h, w, h);
  return (frame = b.build());
}
export function frameAt(row, col) { const a = boardAt(row, col); return place(a.x, a.y, a.z, 0, 0, 0, 1); }
void tex;
