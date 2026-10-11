# Prompt: build VROOM.EXE

Paste everything below the line into a new session opened on this repository.

---

You are building **VROOM.EXE**, a secret 3D racing game, inside the TempleOS-style desktop machine in this
repository. It is an Electron app whose games are plain ES modules in `apps/`. The design record is
`docs/vroom/plan.md`. It holds every decision and number, and the reasons for them. This prompt says how to
work. When the two disagree, the plan wins on design and this prompt wins on process. Where the plan is
silent, decide in its spirit and write the decision into the plan.

## What you are making, in four sentences

When the player's 200th trophy lands, a game nobody knew existed appears on the desktop. The only clue
beforehand is that the 200-trophy achievement is called **VROOM**. The game is the child of **Re-Volt** and
**Easy Delivery Co.** Re-Volt gives it its racing, its light, bouncy, flippable RC-car physics, its household
pickups (above all the bomb that passes on contact) and its cups, stars, reversed tracks and roster. Easy
Delivery Co. gives it its world (a snowed-in mountain town at toy scale), its PlayStation look, its kei-truck
car design and its upgrades that open new roads.

It must always be **fun, chaotic, rewarding, and never too easy.**

## Read before you write a line

1. `CLAUDE.md`, all of it. It is the law of this repository. In particular:
   - the App Contract and `ctx`: apps never import from `kernel/`, and files stay under 300 lines;
   - the VGA16 rule and no antialiasing;
   - Fullscreen, Zoom and `canvas_fit`;
   - Mixer, the studio's desk and decks, `apps/director.js`, and "Writing music";
   - Trophies and how an app reaches them (`apps/trophy_scope.js`);
   - Restore system files and `kernel/handed.js`;
   - GO TO and the launcher's check;
   - Readability (text on a canvas is measured);
   - the SUN budget.
2. `docs/vroom/plan.md`, all of it.
3. Code to imitate. These are not to be copied blindly; each was chosen for one idea:
   - `kernel/trophy_box.js`: how something is handed to the desktop once, when a trophy lands, and kept by
     RESTORE.
   - `apps/standbattle/`: a pure, seeded, fixed-60 Hz sim, a headless harness, a CPU that is only a few numbers,
     a budget bot, `*_check.js` files in plain Node. Read `rules.js`, `sim_loop.js`, `ai_profiles.js`,
     `headless_harness.js` and `budget_bot.js`.
   - `apps/aftere/`: a run as plain data with events (`sim.js`), a score with layers ridden by danger
     (`music.js`, `danger.js`), and synthesised effects driven by events (`audio.js`, `sfx_synth.js`).
   - `apps/bottle/glass3d.js` and `apps/bottle/shapes.js`: 3D in plain JS, and an object built from a stack of
     parts.
   - `apps/magen/scene_kit.js`: pixel-art tiles made in code, VGA16 only.
   - `apps/pixtext.js`: every letter is pixels; never `fillText` small text.
   - `kernel/launcher_model.js` with `scripts/check-launcher.mjs`, `apps/terminal/complete.js` with
     `complete_check.js`, `apps/hifi/library.js` (the STYLE METER folder is gated), and `apps/trophies/model.js`.
     These are the places the secret could leak.
4. Run the existing quick checks once before you change anything, so you know what green looks like:
   `npm run check:trophies`, `node scripts/check-launcher.mjs`, `node apps/terminal/complete_check.js`,
   `npm run check:sun`, `node scripts/check-trophy-wires.mjs`.

## Decisions already made (do not reopen them)

- **The clue:**
  - Rename the existing gold trophy `meta_200` (`kernel/trophies_system2.js`) from `TWO HUNDRED` to `VROOM`.
  - Keep its id, tier, pay, reward and description (`Earn 200 trophies.`).
  - Do not add a new trophy.
- **The secret:**
  - It is a gate module, `kernel/vroom_gate.js`, plus `apps/vroom_scope.js` for apps.
  - Every leak point listed in plan §2 asks the gate.
  - Before the gate opens, VROOM shows up nowhere a player can look.
  - Opened while locked, the app mounts a black canvas reading `NOT YET.` and nothing else.
- **The renderer:**
  - It is a software rasterizer in plain JS, rendering 320 × 180 into `ImageData`.
  - The canvas is `data-fit="int"`.
  - It uses affine textures (near triangles subdivided), vertex snapping, Gouraud shading, 4 × 4 Bayer dither
    to VGA16, and fog in dither bands.
  - No WebGL, and no libraries.
- **The physics:**
  - A pure rigid body with raycast wheels and a friction circle, fixed at 60 Hz, seeded, deterministic, with no
    DOM, clock or audio inside it.
  - Events come out of each step.
- **The CPU is a player:**
  - It hands the sim the same inputs a keyboard would.
  - Difficulty is a handful of numbers.
  - It never gets speed, grip or mass multipliers.
  - Catch-up comes only from the position-weighted pickup deal.
- **Upgrades:**
  - Route parts (SNOW TYRES, HEADLIGHTS, BUMPER BAR, ICE CHAINS, ROOF RACK) open roads and shortcuts.
  - Tuning parts are clamped to the event's rating.
  - Rivals use route parts too.
- **Names:** every name, track, tune and texture is original. Nothing is copied from either game.

## How to work

- **Work phase by phase, in the order of plan §12.**
  - Each phase ends with its own checks passing and every pre-existing check you could have affected re-run and
    passing.
  - Then commit with a clear message and push to your branch (`git push -u origin <branch>`).
  - Do not start a phase with the previous one red.
  - Do not open a pull request unless asked.
- **Phase 3 is the vertical slice, and it matters most.** One track, one player car, three rivals: it is fun to
  drive *before* anything else is built. Drive it yourself through a headless run and a shell check, and tune
  `tune.js` until a lap has at least one flip-risk corner, one jump, one place a heavier car can shove you, and
  one decision. Fix the feel here, not in phase 8.
- **Keep the sim pure, and prove things in Node.** Every rule gets a `*_check.js` that runs in plain Node and
  prints `ok - …` / `FAILED …` the way the other checks do. Required, at the least:
  - `vroom_gate_check.js`: no leak before the gate opens; the icon, GO TO, terminal, help, Stack folder and
    ledger area afterwards; RESTORE brings the icon back.
  - `raster_check.js`: only VGA16 values in the output buffer; a fixed scene gives a byte-identical frame;
    milliseconds a frame on the heaviest view, under budget.
  - `physics_check.js`: μ by surface and part; jump airtime in band; a high-CoM car flips on a kerb at speed and
    a low one does not; wheelie on a light RWD; reposition after 3 s on the roof; car-on-car shove by mass; ten
    minutes bit-identical from a seed.
  - `cars_check.js`: 24 cars; rating bands; silhouette IoU below threshold for every pair; the stat-spread rules
    in plan §5; the player's livery differs from every rival's.
  - `pickups_check.js`: the deal table by position; POWER CUT only in 5–8; every pickup's effect and counter.
  - `ai_check.js`: the CPU's inputs are a function of what it could see; tiers order as they should.
  - `budget_bot.js`: championship win rates, unlock cadence, chaos per race (pickup hits, flips, lead changes),
    and total hours. Use the numbers in plan §8–§9. Fail outside them.
  - `music_check.js`: tunes, key, bars, layers.
  - `trophy_check.js`: a witness for each trophy.
  - `track_check.js`: every track's line closes; every pickup, star, gate and door is reachable; no gate
    disconnects the route.
- **Measure "never too easy" and "chaotic"; do not assert them.** If the bot shows a cup won 90 % of the time
  with all parts, the fix is the CPU numbers, the deal, the track or the cap, never a hidden multiplier. If a
  race has fewer than about a dozen pickup hits across the field, or almost no lead changes, the pickups,
  respawn or line need work.
- **Keep the machine's conventions:**
  - Files under 300 lines (split into siblings: `sim_wheel.js`, `sim_body.js`, `raster_tri.js`, `raster_shade.js`,
    `track_build.js`, `track_props.js`…).
  - Comments in the repository's voice: plain, exact, and saying *why*.
  - Text on the canvas in pixel type with an outline.
  - Disabled buttons hollow and dashed.
  - `prefers-reduced-motion` honoured (less shake, no flashes).
  - Every timer, `requestAnimationFrame` and listener removed in `unmount()`.
  - Music on the `'vroom'` channel; effects on the SFX bus, scaled by the mixer slider and silent at SFX 0.
- **Register it everywhere it must be, and gate it everywhere it could show:**
  - `kernel/registry.js`.
  - `kernel/launcher_model.js`: gated, and teach `check-launcher.mjs` the third state.
  - `kernel/desk_grid.js` GAMES: `Vroom`.
  - an icon sprite.
  - the mixer's `CHANNELS`.
  - `PAYERS` in `eggs_core.js`.
  - `scripts/check-sun.mjs` rows.
  - `trophies_defs.js`: `APPS`, `NAMES`, `finalize`; *not* `GAMES`/`TOYS` in `trophies_system2.js`.
  - the trophy-picture list (as a place without a picture, unless the owner supplies one).
  - `apps/hifi/library.js`: a gated folder.
  - a gated help page.
  - the terminal: gated.
  - `CLAUDE.md`: an app entry and the updated trophy totals.
- **Check the shell, not only Node.** Before the last commit of a phase that touches the window, run the GUI checks
  under `xvfb-run -a -s "-screen 0 1920x1080x24"`: `npm run check:apps`, `check:listeners`, `check:contrast`,
  `check:perf`, `check:paths`, `check:shell`. A check that drives the game sets `templeos.vroom.v1` first. Do not
  add entries to `check-apps.known.json` to hide a leak of yours; fix the leak.

## Stop and ask the owner only about these

1. **The palette.** VGA16 is the default and the machine's rule. If the owner wants the full-colour PS1 look,
   that is an exception only they can grant (as for Bekkedal and Stand Battle). Ask once, at the start of phase
   1, then build whichever they choose. VGA16 is the default if there is no answer.
2. **Photographs** for textures, if they would like to supply some. Without them, the textures are procedural
   and that is fine.
3. **"Delivery & Co."** The plan takes it to mean *Easy Delivery Co.* (2025). If the owner meant another game,
   ask before phase 3.

Decide everything else yourself, write the decision into `docs/vroom/plan.md`, and go on.

## Definition of done

- On a fresh machine, VROOM is undiscoverable. Earn the 200th trophy (or seed a save past it) and the card says
  VROOM, the toast speaks, and `::/Vroom` stands in the GAMES zone.
- Eight tracks, each with reversed and mirrored versions; 24 cars that are recognisably different at a glance;
  eleven rivals; ten pickups; championship, single race, time trial with ghost, practice stars, the STUNT YARD,
  LAST MILE, CLOCKWORK, 2P split and the TRACK MAKER.
- Every check in `CLAUDE.md` passes, plus every new one listed above.
- It runs at the machine's frame rate in a window and in fullscreen.
- `CLAUDE.md` describes it as fully as the other games are described.

When you finish each phase, report in three or four lines: what now works, what the checks measured (the
numbers), and what is next.
