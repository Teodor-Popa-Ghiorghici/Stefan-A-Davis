/* THE CHALLENGE TIMES (docs/vroom/plan.md section 9: beat it in a time trial and the road opens the other way round). Made by `node apps/vroom/budget_par.js`, not by hand: the best lap a PRO driver who makes no slips can drive in each of the four
   cars of the road's rating, flat out, with the road's route parts, plus three per cent. Seconds, by road and variant. Measure them again whenever a road, a car or the physics changes (ghost_check.js holds that the table is whole). */
export const PAR = {
  "sorting:f": 30.3, "sorting:r": 30.6, "sorting:m": 30.3, "sorting:rm": 30.6,
  "street:f": 33.5, "street:r": 33.5, "street:m": 33.5, "street:rm": 33.5,
  "forecourt:f": 36.7, "forecourt:r": 36.8, "forecourt:m": 36.7, "forecourt:rm": 36.8,
  "diner:f": 46.1, "diner:r": 46.3, "diner:m": 46, "diner:rm": 46.3,
  "pass:f": 55.2, "pass:r": 55.2, "pass:m": 55.2, "pass:rm": 55.2,
  "dam:f": 38.9, "dam:r": 39, "dam:m": 38.8, "dam:rm": 39,
  "harbour:f": 40.5, "harbour:r": 40.5, "harbour:m": 40.5, "harbour:rm": 40.5,
  "factory:f": 40.9, "factory:r": 40.1, "factory:m": 40.6, "factory:rm": 40.1
};
