/* VROOM's folder in THE STACK (apps/hifi/library.js), there only while the gate is open (apps/vroom_scope.js). Its discs are the game's own tunes, lifted out of apps/vroom/score.js the way
   every other game's are; `disc(song, tint, artist, layers)` is the library's own press. Until the score is written (docs/vroom/plan.md section 10) the folder is there and empty, and an empty
   folder puts no disc on the shelf. */
export function vroomFolder() {
  return ['VROOM', 'amber', []];
}
