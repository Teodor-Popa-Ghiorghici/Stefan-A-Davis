# VROOM — the secret game behind the two hundredth trophy

The design record for VROOM.EXE. Read it before you change a rule. `docs/vroom/prompt.md` is the brief that
builds it from this plan.

---

## 1. What it is, in one paragraph

Re-Volt's scale, physics and chaos, set in Easy Delivery Co.'s world. You drive a radio-controlled courier car,
a toy kei truck with a parcel in the back. It races seven rivals through a life-size, snowed-in mountain town:
the floor of the post office sorting room, under the pumps of the gas station, along the diner's counters, down
the spillway of the hydro dam, across the frozen harbour. The town is drawn the PlayStation way: low polygons,
wobbling textures, fog that comes in by dithered bands, snow on everything. The cars are light and bouncy. They
flip, wheelie and come down on their roofs. The pickups are household things that turn a race over. What you
win buys parts for the truck, and the parts open new roads, as snow tyres, a bumper bar and ice chains do in
Easy Delivery Co.

## 2. The secret, and the one clue

- **Nothing about VROOM exists anywhere a player can look until 200 trophies are earned.** That means no icon,
  no GO TO entry, no terminal command, no help page, no Stack folder, no ledger area, no shop shelf and no
  mention from the elephant. The registry entry and the code ship, because that is how the machine is built.
  The interface simply never lets on.
- **The clue is the existing gold trophy `meta_200` (`kernel/trophies_system2.js`), renamed from `TWO HUNDRED`
  to `VROOM`.** Keep the id, the tier, the pay (`trophy_rewards.js`: 4,000), its shelf reward (THE TWO
  HUNDREDTH cup in `cos_rewards.js`) and the description `Earn 200 trophies.`. The machine's rule is that a
  description is the exact condition, so the name is the only clue, and the name is the clue.
  Every save that has it keeps it, because the id did not change.
- **The moment it is earned** (the `trophy-earned` event for `meta_200`), or at boot on a machine that already
  has it, `kernel/vroom_gate.js` does the following. It is modelled on `kernel/trophy_box.js`:
  - It sets `templeos.vroom.v1`.
  - It writes `::/Vroom`, an app record `{ type: 'app', app: 'vroom' }`, into the GAMES zone (`desk_grid.js`).
  - It shows one toast: `SOMETHING IN THE GARAGE STARTED ITS ENGINE. ::/Vroom`.
  - It registers a `handedOver` source so RESTORE SYSTEM FILES brings the icon back.
- **Every place that could give it away asks the gate** (`window.VroomGate.open()`; apps use a small
  `apps/vroom_scope.js`, so no app imports from the kernel):
  - **GO TO:** `launcher_model.js` lists it only when it is open. `check-launcher.mjs` learns a third state,
    "gated", next to listed and `NOT_LISTED`.
  - **Terminal:** `VROOM`, and `OPEN VROOM`/`RUN VROOM`, answer exactly like an unknown command until then.
    Tab completion and HELP leave it out. `complete_check.js` is taught the gate, not loosened.
  - **The ledger:** VROOM's area, its cards and its seal are hidden from TROPHIES.EXE, `TROPHIES [GAME]`, the
    REWARDS tab and the pins.
  - **The Stack:** its folder appears the way STYLE METER does (`apps/hifi/library.js`).
  - **Help:** a VROOM page appears only when the gate is open.
  - **Mixer and elephant:** both only react to an open window, so they cannot leak.
  - **The app itself:** opened while locked (by a check, or by devtools), it mounts a black canvas that says
    `NOT YET.` and does nothing else. That way `check:apps` and `check:listeners` still open and close it
    cleanly. A check exercises the real game by setting the gate key first.
- **Trophies stay out of the meta rules.** VROOM is not added to `GAMES`/`TOYS` in `trophies_system2.js`, so
  `meta_each` and `meta_grand` ("the nine games") are unchanged. It does get a mastery seal: add it to the
  `finalize` list in `trophies_defs.js`. `meta_all` naturally includes it, which is right, because the full
  ledger should mean everything.

## 3. Research: what each community loves (sources at the end)

**Re-Volt (1999, and RVGL today), the parent for racing, physics and chaos**
- **Handling that feels like a real RC car:** light, twitchy, bouncy, easy to flip. A reviewer: "they have
  captured the feel of controlling RC cars perfectly." Weight differences matter in a bump.
- **Toy scale in a human world:** a museum, a steamship, a supermarket, a suburban street, a botanical garden.
  The joy is in driving under shelves and over furniture.
- **Household weapons that are physical:** shockwave (flips cars in its path), firework and firework pack
  (limited homing), electro pulse (cuts a nearby car's power), **the bomb that passes on contact** (the fuse is
  the antenna burning down), oil slick, water balloons (less grip), ball bearing (a heavy ball that knocks
  things aside), clone pickup (a decoy that explodes), turbo battery (about +10% top speed). The rare
  **Global Pulse star** cuts everyone's power.
- **A big, varied roster with distinct silhouettes, in ratings Rookie → Amateur → Advanced → Semi-Pro → Pro**
  (top speeds about 32, 35, 37, 41 and 43 mph), electric versus glow engines (sound and power), and 4WD, FWD or
  RWD. The community's favourite is a Pro car (Toyeca) for its balance of speed and handling.
- **Structure players remember:**
  - Championship cups (four races, finish 3rd or better, three tries).
  - Time Trial challenge times that unlock **reversed and mirrored** tracks.
  - A **hidden star on every track** in Practice.
  - The **Stunt Arena** with 20 stars.
  - Battle Tag.
  - Clockwork Carnage (thirty wind-up cars at once).
  - Unlocking cars by winning.
- **Longevity:** RVGL, custom tracks and cars, a track editor, monthly time-trial track sets. It runs on
  anything and is replayable for decades.

**Easy Delivery Co. (2025), the parent for the world, the look, the car and the upgrades.** "Delivery & Co"
in the brief is taken to mean this game. Change §1 and §5 if a different game was meant.
- **The PS1 look:**
  - Low polygons, a pixelation filter, a little texture wobble.
  - Photographic textures on the world, pixel art on the truck, the characters and the items.
- **The atmosphere:**
  - A snowy mountain town (Mountain Town, Snowy Peaks, Fishing Town), with a hydro dam and a factory.
  - Empty roads, blizzards, the cold. "Lonely, harsh, but weirdly comforting."
  - A lo-fi drum and bass soundtrack.
- **The truck:** a Japanese kei pickup with satisfying controls, cargo with physics in the bed, paint colours
  and a dashboard bobblehead to unlock.
- **Upgrades that open the world, bought with delivery money:**
  - **Snow tyres** for the snowed-over roads.
  - **A bumper bar** to break through fence gates.
  - **Ice chains** to cross the frozen lake.
- **What critics disliked, which VROOM must not repeat:** repetition, little challenge, abrupt black-screen
  cuts between areas, janky reloads after a crash.

**The fusion, in one rule:** Re-Volt decides how a race *plays*, and Easy Delivery Co. decides what it *looks
like and where it is*. Re-Volt's chaos supplies the challenge Easy Delivery Co. lacked. Easy Delivery Co.'s
upgrades, which open roads, give Re-Volt's unlocks a reason to exist beyond a list.

## 4. How it is built (the decisions, and why)

- **A software rasterizer, not WebGL.**
  - The machine has no WebGL anywhere and no vendor libraries; its 3D object (`apps/bottle/glass3d.js`) is
    raycast in plain JS.
  - The PS1 look *is* a low resolution: render at **320 × 180** into an `ImageData`, then blit it to a canvas
    with `data-fit="int"` (`kernel/canvas_fit.js`), which scales by whole pixels with no smoothing.
  - At 57,600 pixels, a z-buffered triangle filler in JS spends a few milliseconds a frame on ~3,000 triangles
    after culling.
  - A pure renderer runs in Node, so the picture is checkable: the palette, no antialiasing, determinism, and
    milliseconds a frame.
  - The PS1 traits are free consequences of the method:
    - **affine texture mapping** (the wobble), with large near triangles subdivided so it never swims badly;
    - **vertex snapping** to whole pixels;
    - **Gouraud intensity**;
    - **4 × 4 Bayer dither**;
    - **fog as dither bands** toward the fog colour.
- **Palette: the machine's VGA16, strictly.** Every material is a two-colour VGA16 ramp, and intensity picks
  the dither pattern between the two. This matches the blackout's dithered photographs and keeps the base rule.
  Only the owner can grant an exception (Bekkedal and Stand Battle have one). If they ask, the one place to
  change is the quantiser (`raster_shade.js`). Canvas smoothing stays off either way.
- **Textures are pixel art made in code** (32 × 32, in the spirit of Magen's `scene_kit.js`):
  - snow, slush, asphalt with tyre tracks, a lino sorting-room floor, cardboard, corrugated iron, brick, pine
    planks;
  - shop signs lettered with `apps/pixtext.js`.
  The "photographic" quality of Easy Delivery Co. comes through noise-built detail and dither. If the owner
  supplies photos later, `scripts/make-blackout-art.py`/`vga_dither.py` press them the same way.
- **A pure physics sim at a fixed 60 Hz, seeded, the way Stand Battle is built.**
  - No canvas, clock or audio inside it.
  - What happened in a step is a list of events, as in AfterEgypt's `run.ev`.
  - The game, the CPU drivers, a replay ghost, the headless harness and the budget bot are all the same thing
    to it: a set of inputs per car per frame.
- **Tracks are data that build their own mesh,** the way Bekkedal's buildings are elevations rather than
  rectangles:
  - a centreline spline with cross-section profiles (road, kerb, banking, walls);
  - set pieces placed along it (ramps, a loop where it fits, conveyor belts, gates);
  - props from a kit (lamp posts, vending machines, mailboxes, parked full-size kei trucks to drive under,
    snowbanks, telegraph poles with wires, parcel stacks).
  The AI line, pickup spots, the hidden star, gates and doors are derived from or declared on the same data,
  and the collision grid is built from the same mesh.

## 5. The cars

**Every car is a stack of parts, like the bottles** (`apps/bottle/shapes.js`). The parts are a chassis, a body
shell (cab, bed, box, bubble, wedge, open-wheel, tub, tank), wheels (size, width, count 3 or 4, with or without
an arch), extras (roof light, spoiler, bull bar, crane, sail, plough) and the antenna (the hot-parcel fuse burns
it down, Re-Volt's best detail). The low-poly model (60–160 triangles), the collision box and the physics
numbers are all worked out from those parts, so a long wheelbase handles like one.

**The roster: 24 cars in five ratings plus specials.** All names are original. A first draft:

| Rating | Cars (silhouette in brackets) |
|---|---|
| ROOKIE | KEI COURIER (the player's start: a kei pickup, FWD, electric), MILK FLOAT (tall box, slow and heavy), SNOWBUG (tiny bubble car), PAPERBOY (three-wheeler) |
| AMATEUR | POSTIE (high-roof mail van), TUNA TRUCK (fish box, RWD, heavy), PLOUGHBOY (front plough, pushes others), TOFU (light coupé, RWD, drifty) |
| ADVANCED | DAM RUNNER (lifted 4×4), NOODLE BAR (food van, glow), RATTLER (buggy, long travel), SLED (low wedge on skis at the front, ice-happy) |
| SEMI-PRO | FREEZER (refrigerated truck, glow, very heavy), MINX (rally hatch, 4WD), LOGGER (crane truck, top heavy), NIGHT BUS (long, stable, slow to turn) |
| PRO | VECTOR (balanced, the "Toyeca" of the field: never best at one thing, never bad), HORNET (open-wheel, twitchy, fastest), WARDEN (armoured van, heaviest), KESTREL (low prototype) |
| SPECIAL | PHONE BOX (a phone box on wheels), SNOWMAN (a snowman on a skateboard), CURLING STONE (literally), THE CAT (the courier's own cat-shaped car) |

- **Variety is measured, not hoped for.** `apps/vroom/cars_check.js` renders every car's side and top silhouette
  and holds the pairwise overlap (IoU) below a threshold. It also holds the stat spread:
  - each rating's top speed and acceleration are inside its band;
  - inside a rating, no car is best at more than two of speed, acceleration, grip and weight;
  - every rating has a heavy, a light, a grippy and a drifty car.
- **The player's car looks unlike every rival.** The player drives a courier car: the KEI COURIER at first, then
  any car they unlock (unlocking is Re-Volt's way). Theirs wears the courier's livery: a parcel in the bed, a
  bobblehead on the dash, their paint and their plate. Rival cars are driven by eleven named rivals, each with
  a livery of their own (stripes, numbers, a logo, all made with pixtext and pattern code, 32 × 16). Eight race
  at a time, so the field always looks mixed.
- **Engines sound like their class:** electric is a whine with pitch on RPM, glow is a two-stroke buzz with
  harmonics (Re-Volt's split).

## 6. The physics (numbers to start from; every one lives in `apps/vroom/tune.js`, and checks read them from there)

- **Scale:**
  - A car is ~0.40 m long and 1.2–3.0 kg.
  - The world is life-size. A kerb is a wall, a parcel is a ramp, a full-size kei truck is a tunnel.
  - Top speed by rating, in m/s (a scale feel, not real mph): ROOKIE 13, AMATEUR 14.2, ADVANCED 15, SEMI-PRO 16.6,
    PRO 17.5. The ratios follow Re-Volt's 32/35/37/41/43.
- **Body and wheels:**
  - The body is a rigid body with 4 (or 3) raycast wheels.
  - Each wheel is a spring and damper with travel ~25 mm.
  - Tyre force uses a friction circle: lateral force ∝ slip angle, clamped at μ·N; longitudinal force from
    wheel slip; the two combined.
  - Drivetrain is FWD, RWD or 4WD. The centre of mass is high enough that hard cornering and kerbs flip a car.
  - Wheelies come from torque on a light RWD car.
  - **A little air control** (pitch and roll torque while airborne) makes landings a skill. It stays small and
    is held by a check.
- **Gravity** is tuned for feel (start around 1.6 × real, so jumps are snappy and not floaty). A check measures a
  standard jump's airtime against a band.
- **Surfaces** (μ, then what parts do):

| Surface | μ |
|---|---|
| asphalt / lino | 1.0 |
| carpet | 1.1, with rolling drag |
| cardboard | 0.9 |
| packed snow | 0.55 (SNOW TYRES 0.85) |
| deep snow | 0.45 plus drag (SNOW TYRES 0.75) |
| ice | 0.18 (ICE CHAINS 0.6) |
| antifreeze spill or splash | × 0.3 for 2 s |
| conveyor | moves you |

- **Collisions:**
  - The track is triangles in a uniform grid (2 m cells).
  - The car body is a box tested at its corners and edge midpoints.
  - Car against car is three spheres a car with mass-weighted impulses, restitution ~0.3. Heavy cars shove
    light ones, which is half of Re-Volt's chaos.
- **REPOSITION (R), Re-Volt's own answer to a car on its roof:**
  - It puts the car back on the nearest line node, facing forward, after a 0.6 s fade.
  - The car is a ghost for 1 s.
  - It is automatic after 3 s upside down or stuck.
  - It costs time, never the race.
  - **There is no black-screen cut anywhere** (Easy Delivery Co.'s complaint), and a crash never reloads.

## 7. The pickups (Re-Volt's set, made Easy Delivery Co.'s)

Pickups lie on the track as small parcels (Re-Volt's lightning bolts) and respawn 4 s after they are taken. You
hold one pickup at a time, two with the ROOF RACK.

| Pickup | After Re-Volt's | Effect |
|---|---|---|
| STATIC BALL | Shockwave | rolls forward, flips every car it touches |
| BOTTLE ROCKET / ROCKET PACK | Firework / pack | one, or three, limited homing; explode on a car or a wall |
| JUMP LEADS | Electro Pulse | crackles round you 5 s; a car that comes close loses power 1.5 s |
| **HOT PARCEL** | Bomb | your antenna becomes a fuse (6 s); touch a car and it is theirs; it blows up whoever holds it at the end (flip plus 1.5 s stun) |
| ANTIFREEZE | Oil slick | a puddle behind you; each tyre in it loses grip |
| SNOWBALLS ×3 | Water balloons | thrown ahead; a splash means less grip for nearby cars for 2 s |
| CURLING STONE | Ball bearing | a heavy stone dropped behind; knocks anything aside |
| FAKE PARCEL | Clone pickup | looks like a pickup; explodes on whoever takes it |
| COFFEE | Turbo battery | +10 % top speed for 6 s (Easy Delivery Co.'s coffee) |
| **POWER CUT** | Global Pulse star | rare; every car ahead of you loses power 2 s |

- **Deal by position, so the race never settles.** The leader draws from ANTIFREEZE, CURLING STONE, FAKE PARCEL
  and SNOWBALLS. The middle draws everything but POWER CUT. Last place gets ROCKET PACK, STATIC BALL and HOT
  PARCEL more often, and POWER CUT can only be dealt to positions 5–8. The table is pure, in
  `pickups_deal.js`, and checked.
- **Every pickup has counter-play:** a rocket can be dodged at a corner, the HOT PARCEL passed back, a FAKE
  PARCEL told apart by a one-pixel tell, JUMP LEADS outrun.

## 8. Upgrades (Easy Delivery Co.'s) without making it easy

Races, deliveries and stars pay **TIPS**, the game's own money (the machine's SUN is separate; see §11). The
DEPOT is a small 3D garage scene, not a list: the truck is on a bench, and the parts hang on the wall.

**Route parts** open roads. They are the backbone, and each is wanted for a place:

| Part | Price | What it does |
|---|---|---|
| SNOW TYRES | 600 | the ADVANCED cup's snow roads become raceable; a snowed-in shortcut on two earlier tracks opens |
| HEADLIGHTS | 450 | night and blizzard races are visible past the fog line (the fog distance doubles in the dark for you) |
| BUMPER BAR | 900 | break the fence gates on four tracks; each gate is a shortcut |
| ICE CHAINS | 1,400 | the frozen harbour is raceable; a lake shortcut on the dam opens |
| ROOF RACK | 1,100 | hold two pickups |

**Tuning parts**, three levels each: MOTOR, GEARING, SPRINGS, TYRE COMPOUND, BATTERY and BALLAST (weight
both ways).

**Cosmetics:** paint, bobblehead, horn, plate, cab light. Some are bought; some are found as Practice stars.

How "never too easy" is kept:
1. **A rating caps every event.** In a ROOKIE race the car's effective numbers are clamped to the ROOKIE
   envelope. Tuning lets a weak car reach the cap. Nothing passes it.
2. **Route parts change the route, not the speed.** A shortcut saves 1.5–3 s and has a cost: a gate slows you
   if you hit it off-centre, and a lake road is lower-grip.
3. **Rivals buy parts too.** From the ADVANCED cup, rivals with bumper bars take the gates, so shortcuts are
   fought over.
4. **The CPU has no cheats.** Difficulty is a handful of numbers (reaction, line error, brake-point error,
   pickup sense, aggression, mistake rate), in the spirit of Stand Battle's `TIERS`. There are no speed, grip
   or mass multipliers. Catch-up comes only from the pickup deal.
5. **The championship stays Re-Volt's:** four races, top 3 of 8 to go on, three tries a cup.

The budget bot holds the result. A human-paced profile wins a cup on the first try 35–60 % of the time with the
parts that cup asks for, below 20 % with none in SEMI-PRO and PRO, and never above 85 % with everything. Inside
those numbers it stays fun.

## 9. Places and modes

**The town (eight tracks, two a cup, each also REVERSED and MIRRORED once its challenge time is beaten):**

| Cup | Tracks |
|---|---|
| ROOKIE | 1 SORTING ROOM: the post office floor, conveyor belts, parcel ramps, under the counter. 2 MAIN STREET, NIGHT: snowbanks, under parked trucks, a vending machine's glow |
| AMATEUR | 3 FORECOURT: under the pumps and through the shop's shelves (a nod to Re-Volt's supermarket). 4 THE DINER: counter-tops, a jump between two, a kitchen floor |
| ADVANCED | 5 SNOWY PASS: switchbacks, deep snow, blizzard (SNOW TYRES). 6 THE DAM: spillway, catwalks, a gate shortcut and a lake road |
| SEMI-PRO / PRO | 7 FROZEN HARBOUR: boats frozen in, ice (ICE CHAINS). 8 THE FACTORY: conveyors, a press that slams on a beat, sparks |

**Weather and time are part of a track, not a setting:** snowfall (pixels), blizzard (fog closes in), night
(headlights matter), and the factory's sparks.

**Modes:**
- **CHAMPIONSHIP:** four cups (ROOKIE+AMATEUR tracks, then up), unlocks cars, pays TIPS.
- **SINGLE RACE:** any track you have, any car you have, 2–8 cars.
- **TIME TRIAL:** with your own **ghost** (a recorded input stream; the sim is deterministic). The challenge
  time unlocks REVERSED, then MIRRORED.
- **PRACTICE:** no rivals. **One hidden star per track**, each in a place you have to *drive* to (a top shelf,
  a rafter). Finding a cup's stars unlocks a car.
- **STUNT YARD:** a snowy skate park behind the depot (half pipe, ramps, a loop, the ski jump). **20 stars**,
  some needing a better car. All 20 unlock a SPECIAL car.
- **LAST MILE:** the child's own mode. A parcel rides physically in your bed and can bounce out over a jump or
  in a hit (stop on it to pick it up). Deliver it to a lit door across the track before the rivals deliver
  theirs. The tip falls with damage and time, and the HOT PARCEL is especially cruel here.
- **CLOCKWORK:** sixteen wind-up kei trucks with no pickups and pure chaos (perf-bounded; Re-Volt's Clockwork
  Carnage).
- **2P SPLIT** (a late phase): two 320 × 90 views, both keyboard sides, as Stand Battle does it. Both parent
  games have split-screen.
- **TRACK MAKER** (the last phase; Re-Volt's editor is half its afterlife):
  - tile-based, from road modules (straight, bend, ramp, jump, bank, tunnel under a truck, a gate, pickups);
  - saved as `::/Home/Vroom/<NAME>.TRK` text;
  - playable in SINGLE RACE and TIME TRIAL;
  - validated so the line is closed and every module is reachable.

**The cadence check:** the budget bot proves something new (a car, a track, a part, a paint, a star) arrives at
least every three races of a normal run. The championship takes about 3 hours, everything about 7.

## 10. Sound and music

- **The score is drum and bass and breakbeat.** It is both games' shared ground: Re-Volt's soundtrack, and Easy
  Delivery Co.'s lo-fi DnB.
  - Six tunes, about 172 bpm, all in one key, written from scratch in `kernel/songtext.js`'s notation
    (`buildSong`).
  - They play through `apps/director.js` on a new `'vroom'` mixer channel.
  - The race layers (`deck.levels`) lean in on the last lap and with a close fight.
  - **The RADIO** (V) changes station: RACE (the DnB pool) or NIGHT (a lo-fi pool for night tracks and the depot).
  - The Stack gets a VROOM folder, gated (§2).
- **Effects are synthesised on the SFX bus** and scaled by the VROOM mixer slider, as AfterEgypt does: engines by
  class and RPM, tyre scrub by slip, snow crunch, landing thuds, the HOT PARCEL fuse tick that speeds up, every
  pickup, the countdown, the horn.

## 11. The machine's side

- **SUN:**
  - It pays through `Economy.earn(n, why, { game: 'vroom' })`, and `'vroom'` joins `PAYERS`
    (`kernel/eggs_core.js`).
  - The pay tables are modelled in `scripts/check-sun.mjs` and must sit in its band.
  - TIPS buy parts. SUN is the machine's money and is paid for cups, first wins and stars.
- **Trophies:**
  - About 40, plus a seal, in `apps/vroom/trophies.js` with `apps/trophy_kit.js`.
  - Each description is the exact condition. A few are secret. Examples: HOT POTATO (pass the HOT PARCEL three
    times in one race), ROOFTOP FINISH (cross the line upside down), NOT A SCRATCH (a LAST MILE delivery at
    full tip).
  - The calls are kept in `trophy_calls.js`.
  - `check-trophy-wires.mjs` must find a wire for each.
  - The total-count promises (`CLAUDE.md`, `check-trophies.mjs`, the help text) are updated.
- **Props:** a mastered VROOM leaves its folder (`props.js`): every car's livery and side view as PNGs.
- **Window:** `fluid`, the canvas `data-fit="int"`, zoom and fullscreen from the machine. It opens once.
  `scopedListeners` is used only if it ever calls `open()`.
- **Saves:** `ctx.save('vroom.v1')`.
- **Pure checks:** the gate, the renderer, the physics, the cars, the deal, the AI, the economy, the music,
  the trophies, and the track maker's validator, each runnable in plain Node.

## 12. Phases (each ends with its checks green, a commit, and a push)

| # | Phase | Done when |
|---|---|---|
| 0 | Gate and shell | `meta_200` is VROOM; `vroom_gate.js` hands the icon over; every leak in §2 is closed; the locked app mounts `NOT YET.`; `vroom_gate_check.js` plus launcher, terminal and trophies checks pass |
| 1 | Renderer | `raster*.js` draws a test town at 320 × 180; `raster_check.js`: only VGA16 pixels, deterministic, ≤ 6 ms a frame in Node on the heaviest view |
| 2 | Physics | `sim*.js` plus `physics_check.js`: surfaces, flip and reposition, jump airtime band, wheelie, collisions, determinism over 10 minutes |
| 3 | Vertical slice | SORTING ROOM plus KEI COURIER plus 3 rivals, countdown, laps, HUD, chase camera; playable from the icon |
| 4 | Roster, AI, pickups | 24 cars, 11 rivals, the line-following CPU, all ten pickups; `cars_check`, `ai_check`, `pickups_check` |
| 5 | Career | championship, TIPS, the depot, route and tuning parts, unlocks, saves; `budget_bot.js` holds §8 and §9's numbers |
| 6 | The rest of the town | the remaining 7 tracks, reversed and mirrored, time trial with ghost, practice stars, STUNT YARD, LAST MILE, CLOCKWORK |
| 7 | Sound and the machine | score, radio, effects, mixer channel, Stack folder, trophies, SUN, props, help page, `CLAUDE.md` |
| 8 | Polish | 2P split, TRACK MAKER, contrast, perf, packaging, every check in `CLAUDE.md` |

## 13. Sources

- Re-Volt: [Wikipedia](https://en.wikipedia.org/wiki/Re-Volt), [Re-Volt I/O, pick-ups](https://re-volt.io/articles/pick-ups),
  [Re-Volt I/O, car stats and ratings](https://re-volt.io/articles/car-selection-and-display), [car list](https://revolt.fandom.com/wiki/List_of_Re-Volt_cars),
  [Top Gear on why it nailed RC racing](https://www.topgear.com/car-news/gaming/absolutely-nailed-it-1999-videogame-perfected-rc-racing-formula),
  [DJ Cube review](https://djcube.co.uk/re-volt/), [revoltrace.net](https://www.revoltrace.net/revolt-info.php), [community forum](https://www.tapatalk.com/groups/revolt_live/what-makes-re-volt-original-t1399.html).
- Easy Delivery Co.: [Wikipedia](https://en.wikipedia.org/wiki/Easy_Delivery_Co.), [Nintendo Life review](https://www.nintendolife.com/reviews/switch-eshop/easy-delivery-co),
  [autoevolution review](https://www.autoevolution.com/news/easy-delivery-co-review-pc-a-cozy-yet-creepy-ps1-style-driving-adventure-257706.html),
  [Gematsu announcement](https://www.gematsu.com/2025/04/low-poly-cozy-driving-game-easy-delivery-co-announced-for-pc), [SebTruck mod (paint, bobblehead)](https://thunderstore.io/c/easy-delivery-co/p/shiibe/SebTruck/v/1.1.5/).
- No name, asset, track, tune or texture from either game is copied. Everything is made new for this machine,
  and `CLAUDE.md` says "inspired by", as the Cook does.

## 14. Decisions made while building (the plan was silent; these are the answers)

Written as they were taken, newest last. Each says what and why.

**Phase 0 -- the gate**
- **The gate is a question read each time, never remembered** (`kernel/vroom_gate_core.js`, `isOpen(io)` reads `templeos.vroom.v1`). A key set by a check, a save carried over and a key lost with the
  storage are all true the moment they are, and a store that throws is a *shut* gate: the safe answer for a secret. The core is pure and registers the RESTORE source itself (`handedOver(() => owed())`),
  so Node sees exactly what the machine sees.
- **VROOM's trophies are not registered with the engine until the gate opens** (`registerVroom` in `kernel/trophies_defs.js`), rather than registered and hidden behind `until`/closed. A closed trophy is
  still in `T.defs`, so it would be reachable from every list, search, pin, `TROPHY <NAME>` and count; an unregistered one is simply not there. `apps/trophies/model.js` also drops the area while shut: two locks
  on one door. An empty list registers nothing (a seal of nothing is not a seal).
- **The gate opens on `trophies-changed` as well as `trophy-earned`**, because a trophy found in an old save is credited without a card (`T.backfill`) and the only event that makes is `trophies-changed`.
  A machine that earned TWO HUNDRED before this version existed meets VROOM at its next boot, with the toast.
- **The toast waits 4.8 s** so the trophy's own card (4.2 s) has gone; the two do not talk over each other.
- **EVERY DOOR** (`sys_apps_all`, "open every app that has a window") would have asked for a door nobody can open. `Trophies.appCount` leaves `vroom` out until the gate is open; after it opens the count is one
  higher, and opening the game marks it.
- **Help, terminal and GO TO keep gated things apart from the lists that other code walks**: `GATED_TOPICS`/`GATED_PAGES` are not in `TOPICS`/`PAGES` (`HELP_PAGES = TOPICS.length` is a trophy), and the terminal's
  words are `aliases()` not `APP_ALIASES`. `COMMANDS` in `apps/terminal/complete.js` is the shell's own list and never has them; Tab learns them only through `o.commands`.
- **The check scans the source** (`vroom_gate_check.js`): a file that is not in its allow-list and says VROOM fails it, so a leak added later by someone who did not know about the gate is caught.
- **Dev-only files** (`apps/vroom/*_check*.js`, `check_kit.js`, `headless_harness.js`, `budget_bot.js`) are left out of the package (`electron-builder.yml`) and forbidden by `check-package.mjs`.

**Phase 1 -- the owner's answers (asked once, at the start of phase 1)**
- **Palette: VGA128, an exception the owner granted** ("it still keeps the feel of the rest while making details and visuals actually feel nice"). It replaces plan section 4's strict VGA16 for VROOM's *picture*
  only; the rest of the machine is untouched and canvas smoothing stays off. VGA128 is built *from* the sixteen so it keeps their feel: eight ramps of sixteen steps (`apps/vroom/palette.js`): GREY, BLUE, GREEN,
  CYAN, RED, MAGENTA, BROWN (which climbs through the machine's brown to its yellow) and COOL (a blue-grey the town's snow and shadows need and VGA does not have). Each ramp passes *exactly* through its VGA16
  colours (steps 5 and 10, and the greys' black and white), so all sixteen are in it, and no two of the 128 are alike. A material is a ramp and a level; light moves the level within its ramp; the 4 x 4 Bayer
  dither still blends neighbouring steps and still fades into fog, so the picture keeps the machine's dithered look with far finer shading. The one place that decides colour is `raster_shade.js`.
- **Textures are procedural** (the owner has no photographs to supply); `scripts/make-blackout-art.py` remains the way to press photographs later.
- **"Delivery & Co." is Easy Delivery Co.**, as the plan assumed.
- **The renderer indexes, it does not blend.** The buffer is palette indices; a texel is already an index (`ramp * 16 + level`), so light is `level + (light - 1) * 9` with the Bayer fraction added and floored
  (mean-preserving: a flat colour at light 1 stays flat), fog is the same pattern turned to the fog colour in eight bands, and a shadow is a *material* that takes steps off the ramp already drawn. Nothing mixes
  two colours, so nothing can leave the palette (`raster_check.js` reads every byte and every presented pixel). Fog is per vertex and linear in depth, as the PS1 did it: big triangles are therefore cut up,
  and the town's ground is built in pieces.
- **Affine on purpose.** Texel positions are walked in a straight line across the screen. The only protection from smearing is the subdivision of triangles that are both large and deep (edge > 28 px and a
  depth ratio over 1.35, or any edge over 96 px, up to three cuts); the rest of the wobble is the look. Corners are snapped to whole pixels, which shows as a shimmer on moving cars: also the look.
- **Texture sizes are any power of two from 8 to 64** (a lit window is 16 x 16, a sign 64 x 16): the filler takes a shift and two masks per material, so the size costs nothing.
- **A frame is cheap enough to share.** 5,000 triangles submitted and 1,500 drawn in about 4 ms in Node, against the 6 ms budget; the second view of the 2P split (`R.view` with a smaller rectangle) costs about the same
  again, which is why the split screen is a late phase and not a free one.

**Phase 2 -- the physics**
- **Tyre model: a saturating slip angle in a friction circle**, not a Pacejka curve. Lateral force `-mu N tanh(k v_side / (|v_forward| + v0))` (k 5.5, v0 1.0) is capped by the impulse that would stop the sliding in one
  substep (so a tyre can never push a car back the other way), and the engine, the brake and that lateral force share one circle of radius `mu N` (the lateral limit scaled by the car's own grip): past it both shrink,
  which is the slide. It has no peak-and-fall, so a car that is sliding is still gripping at `mu N`: forgiving by design.
- **The steering lock is chosen by grip, not by a table**: `atan(gain * g * wheelbase / v^2)` with gain 2.0, capped by the car's lock. A fixed lock either spins the car at speed or is useless at a crawl; this one
  asks the road for about twice what a tyre has at any speed, so the stick can be held over without a spin and the car pushes wide. A rear lateral grip bias of 1.12 (`latBias`; below 1 is a drifty car) keeps it from
  stepping out when the throttle is lifted, which a centre of mass this high above a wheelbase this short would otherwise do at once.
- **Heights are chosen to be a toy**: the courier's centre of mass is 0.058 m over a 0.28 m wheelbase and a 0.19 m track (stability factor 1.6, flat-out cornering never rolls it); a van is 1.0 and a crane truck 0.8.
  Inertia is scaled 1.6 over a solid box (a lower number made every ramp foot a bucking bronco: the impulse on a front wheel has a very short arm and a very small inertia to work on).
- **Acceleration is held by the road before it is held by the engine**: no tyre can ask more than mu g (15.7 m/s^2), so `ACCEL_BEST` is an engine time (0 to 95 %, 1.9 s for ROOKIE down to 1.3 s for PRO) and the
  check measures what a car really does (a ROOKIE courier is at 90 % of its top speed in 2 to 3.4 s on asphalt, longer in front-wheel drive, far longer on snow and ice).
- **The ends of the body are cut away** (the bottom corners and the bottom end midpoints are lifted 3 cm: an approach and a departure angle) and the belly stands 3.2 cm off the road, or the nose digs into the foot of every
  ramp. The wheel has a full 5 cm of travel over a 6 cm rest length, then a sphere that stops the body.
- **Air: the nose follows the path and the spin dies away** (`AIR.align` 30 rad/s^2 per radian, `AIR.damp` 5.5 /s), with the player's pitch and roll torque (7.5 rad/s^2, capped at 3.2 rad/s) on top. A car that leaves a
  ramp with the nose-up spin a rigid body gets from the foot of it comes down level; the player's authority is the small angle at which the player's torque balances the alignment (about 14 degrees).
- **The ghost-contact trap is real and was found by the check, not by thought**: an edge shared by two coplanar triangles gives a contact normal along the seam, so a wheel sphere crossing the diagonal of a flat ramp
  stopped the car dead (a 7 m/s loss at a 12 degree ramp). `col_grid.js` flags such seams when the grid is built and `closest()` reports where the nearest point was, so the contact is dropped there.
- **Friction impulses accumulate and are clamped as a total** (the first version clamped each iteration to mu times the normal impulse and so applied up to four times what friction could give: landings lost 3 m/s).
- **A conveyor is a surface with a grip on the wheel** (`SURF.belt.drag` 0.5 N s/m a wheel): a car on it is carried toward the belt's speed in about a second, and one driving against it is slowed.
- **Events** the sim emits each step: `land`, `flip`, `wheelie`, `hit-wall`, `hit-car`, `surface`, `repo-start`, `repo`. The trophies, the sound and the camera hear these and nothing else.

**Phase 3 -- the vertical slice (SORTING ROOM, the KEI COURIER, three rivals)**
- **A track is drawn as a polygon with rounded corners** (`track_path.js`): the author gives the corners (place, width, floor, wall, bend radius), the builder makes the control points and refuses a bend that does not fit its
  straight. Features are put on "straight 6, 66 % of the way along", never on a number that moves when a corner does. The first draft drew control points by hand, and the jump ended up six metres after a bend: a jump with
  a corner for a run-up is a wall.
- **The road is 2.2 to 3.7 m wide for a car 0.22 m wide** (about ten car widths; the first draft was sixteen and looked like a field with a car lost in it). The pinch is 1.2 m (five cars), a belt lane 1.3 m, walls 0.6 m of parcels
  or 0.95 m of shelf, so the camera sees over the parcels into the hall. Bends are 6 to 10 m in radius: the tyres give about 0.72 g in a steady bend (`spec.aLat`, measured on a skidpad), so at 12 m/s the tightest bend a
  car can hold is about 10 m, and anything tighter makes a driver brake.
- **The first track is a lap of 332 m, about 30 s** for the CPU at its best, three laps a race (a race of about a minute and a half: a cup of four is about six minutes).
- **A belt is neutral at speed.** As a drag on the wheel (0.5 N s/m) a belt took a car from 12 m/s to 7 across its length; now it carries what is slower than itself up to its own speed (`BELT_CARRY`, 0.12 of the weight, so a
  standing car is moved off at about 1.9 m/s^2) and leaves a faster car to its rolling drag. A belt is a narrow raised lane, a bump and a place cars bunch, not a speed trap.
- **A crease between two triangles under 15 degrees is a seam** (`col_grid.js` `SEAM`; it was 1.8 degrees). The 4 cm step of a belt and the 11 degrees at the foot of a ramp gave a wheel sphere a normal along the crease and
  stopped the car dead. A belt also rises over its first and last half metre; a step square across the road is a wall.
- **The air brings a car level with the ground near it** (`AIR.seek` 0.5 m, `level` 40 rad/s^2, after `levelAfter` 0.15 s in the air): above that the nose still follows the way the car is travelling. A car that left a
  ramp nose-high and landed nose-first stood on its bumper and could not get off it. The 0.15 s keeps a kerb's brief hop out of it (the kerb check still rolls the crane truck and spares the courier).
- **A ride-height wheel sphere never takes the floor, in either direction.** The sphere is placed to touch the ground at rest, so a hard landing puts its centre under the floor, where "the side it came from" turns the
  contact into a pull *down*; the car then sank into the road and lost all its speed in six steps. Found by listing the contacts of a bad landing.
- **A brake at a standstill is reverse, so none is held on the grid** (the first start rolled four cars backwards ten metres during the count), and a pedal held with the car not moving counts as stuck: a car reversing against
  a wall is put back after 3 s like one driving into it.
- **The CPU's tyres are a measured number.** The speed plan used the road's mu times g, which no car reaches (the courier gives 11.3 to 13.7 m/s^2 with the stick over, 0.72 to 0.87 g), so every tier was sliding wide and
  hitting walls and the tiers all lapped the same. `spec.aLat` is 0.72 g (0.93 of that rear-driven); a tier's `gripUse` is the share of it the driver trusts (0.78 ROOKIE to 0.99 PRO), and the first track puts ROOKIE to
  PRO about 3 % apart in a lap, plus the mistakes and the line error. A track with more bends than SORTING ROOM spreads them further, which phase 4's `ai_check` measures per track.
- **Steering is felt, braking is seen.** A driver's own heading and position are not delayed (a controller delayed by 0.27 s oscillates); what is seen late is how far round the lap it is (so where the next bend is) and the
  cars about. A Stanley controller (heading error, a cross-track term that shrinks with speed, the bend's own steering from 0.25 s ahead) replaced pure pursuit, which weaved down a straight at 12 m/s and cut every bend.
- **A CPU keeps to what the road allows** (`track.limits`: inside the walls with a margin, narrower at a kerb or a pinch, tapered so a narrow place is seen coming; `track.speedCap`: 9 m/s through a pinch) and **backs off
  when it is stuck** (brake from a standstill, the opposite lock), because a rival that sits against a stack of parcels for 3 s until the sim puts it back is not a rival.
- **The HUD's speed is `3.6 x m/s`** and says KPH: a toy's, not a real car's. The count is 3.2 s, GO shows for 1.2 s, the fade of being put back is a Bayer dither to black (a fade that never leaves the palette).
- **The window pauses itself when it loses focus** (a stuck key drives a car into a wall) and the canvas, not the document, takes the keys (as Stand Battle does), so another window's typing never reaches the race.
- **Dev tools added**: `headless_harness.js` (a race without a screen), `scripts/vroom_map.mjs` (a track from its data), `scripts/vroom_race_shots.mjs` (the real game's frames to PNG). The GUI check drives the race with real keys
  and reads the speed bar from the pixels.

**Phase 4 -- the roster, the CPU and the pickups**
- **Twenty-four cars are rows of numbers and a shell each** (`cars_data.js`, `car_shells_a/b/c.js`): five ratings of four, four specials (PHONE BOX, SNOWMAN, CURLING STONE, THE CAT, with ratings of their own so their numbers sit in a band). The roles of §5 are
  measured and not tagged: a rating's heaviest and lightest are a ratio of 1.5 apart, its grip spans 0.08, at least one has its tail out first (`latBias` 1.0 or less) on tyres that are not its best, and no car is the best of its four at more than two of
  speed, acceleration, grip and weight. The ratings' envelopes still clamp every event, and a car's own table sits within a tenth of its cap.
- **Silhouettes are measured from the real meshes** (`cars_check.js` rasterises each car, wheels and all, into a side, a rear and a top bitmap at 5 mm a cell and takes the intersection over the union of every pair). Boxy trucks overlap a lot in absolute metres
  (the first draft was 90 %), so the bound is what the data can honestly meet and the cars were pushed apart in size and profile until it held: no pair above 82 % averaged over the three views, nor 84 % from the side and behind, which is how a driver sees a car.
- **A trike is a chassis, not a special case**: `wheels: 3` puts one wheel in the middle at the front and two behind, with the whole front axle's weight on it; the sim, the picture and the wheelie test loop over `spec.wheels` and ask a wheel whether it is `front`.
  The static stability factor (`ssf`) is the distance from the centre of mass to the nearest line the car can tip over, over its height (half the track for a four-wheeler). A car rolls at about `ssf` g, so `aLat = min(0.72 g grip, 0.7 ssf g)`: the 0.7 is what
  the checks found (0.85 rolled a top-heavy crane truck ten times in two laps). The PHONE BOX, SNOWMAN and MILK FLOAT keep their gag in the picture and their weight low (batteries on the floor, a heavy base), or the CPU could not drive them and a person could not either.
- **A wheel's thrust is held to 0.9 of what its tyre can hold** (`TRACTION`). A PRO engine asks the tyres for two or three times what they have; `accel` is an engine time and the road is the limit, but the friction circle then shared everything with the sideways force and a
  rear-drive car sat in a slide with no steering from the line. 0.95 and 0.9 both pass every old check; 0.8 took the light RWD's wheelie away. 0.9 leaves a rear tyre 0.44 of its grip sideways at full throttle. This changes every car's launch, so the ten-minute hash was set again.
- **The CPU eases off when its tyres let go** (the friction circle's own `slide`: a driver feels a rear step out): throttle x (1 - 3.5 x (slide - 0.06)), down to a quarter. It also **presses R after three failed attempts to back out of one place**: the sim's own stuck timer is
  reset by every bit of backing, so a trike pressed against a wall backed out and drove back in for ever (found in a race that never finished). Smoothing the stick (a thumb with a time constant) was tried and made a Stanley controller worse; it is not there.
- **A driver lifts for a jump** (`track.speedCap`: 12.5 m/s from 3 m before the ramp to the landing, as at a pinch). A fast light car with its foot down on a ramp stands on its tail and a long one catches its tail on the lip; the speeds a jump is built for are ROOKIE's. A person
  at PRO is free to try it. The jump check now applies its keys only while a car is in the air (it used to hold brake and gas on the landing, which stops a car dead in the window).
- **Eleven rivals, a block of seven at a time** (`rivals.js`). A rival is a name, a number, a livery, a skill (-1, 0, 1: the tier it drives at around the event's rating) and a style that nudges bold, sloppy and keen. `fieldFor` takes a block of the eleven that moves on with the seed
  and puts each in the rating's four cars in turn, so the first four are four different cars and the others are twins in other paint. Cars from another rating are not mixed in: they would simply be slower, and the deal already does the catching up.
- **Liveries are made in code** (`livery.js`): a flank decal and a roof decal, textures with holes in them so the paint shows through, laid as decals a hair off the body (`zbias`). The roof's number is what the chase camera sees. Seven stripe patterns and twelve logos; the player's livery (a band of white, a plate, a parcel, cyan)
  differs from every rival's by at least 30 % of its texels and shares no paint, number or logo with any.
- **The pickups are pure and live in the race** (`pickups.js`), not in the sim. A pickup knocks (`world.knock`, which also stops the air straightening the car for `tumble` seconds, or a flip is put level again in 0.15 s), takes power or takes grip. Every number is in `pickups_fx.js`.
  The deal is `pickups_deal.js`: three anchor tables (the leader, the middle, the last) blended by how far down the field a car is, POWER CUT removed below the back half. A rocket is a pack of three with a chance that grows with the place.
- **Pickups are bigger than first drawn.** A parcel on the road is 0.19 m, a car's width, with a thin lit column over it (the first, 0.13 m, was three pixels at 15 m). It is taken within 0.2 m, a car and a parcel touching. The fake parcel is the same mesh with one texel of its texture and one pixel of its icon different:
  the dot of the question mark is red. A driver sees it only if its `pickups` number says so (a seeded roll, once per parcel), and a dull one drives at it.
- **The HOT PARCEL is only dealt to a car with company within 14 m of it along the road.** The first version dealt it to last place, which was often 60 m behind everyone, with six seconds to live and nobody to give it to. It passes on any overlap of the two cars' spheres (not only a hard hit: `hit-car` needs 0.35 m/s)
  and, so that two cars in contact do not trade it every second, not back to the car that gave it until the two have come apart. A car that has finished puts it out. A holder goes for the nearest car (ahead at full throttle, behind by slowing right down on a straight so it runs into the back of it).
- **POWER CUT is three seconds** (it was two: a car with no engine only coasts, and two seconds of that is a metre a second). **The ball is 20 m/s** (15 never caught anything), **a snowball is thrown 13 m/s over the car's own and lands 5.6 m ahead** (6.5 landed behind the car it was thrown at: it inherits the thrower's speed),
  **a rocket 18 m/s at least and sees 16 m**. These were found by counting hits in races of eight, not by thought.
- **Chaos is measured** (`pickups_check.js`: four races of eight on SORTING ROOM, three laps): about 70 parcels taken, 85 pickups used and 30 to 55 hits (the plan wants a dozen), 11 to 23 flips, 30 to 45 places changed hands for good (a place counts as moved when its raw place has differed for 1.5 s) and the lead changes hands once or twice a race.
  The check holds a dozen hits, ten places, three flips, every kind of pickup, everybody finishing and no more than 28 repositions in a race. The lead changes less than Re-Volt's: the best CPU of seven mostly keeps the front, which is what phase 5's budget bot (a person's numbers in the field) is for.
- **Input:** SPACE, E or SHIFT fires what the car holds; the brake is S or DOWN only (SPACE used to be the brake; a keyboard has one thumb for the pickup). `fire` is the fifth key a driver returns, with `repo`.
- **Dev tools added**: `scripts/vroom_cars_shots.mjs` (the real car meshes in the hall's light, one sheet), `scripts/vroom_pickup_shots.mjs` (the pickups and their icons), `LIVERY=1` puts a rival's livery on each car. `headless_harness.js` runs a field of eight.

**Phase 5 -- the career**
- **Four cups of four races, and the cup list is data** (`cups.js`). Points are Re-Volt's (10, 8, 6, 5, 4, 3, 2, 1), a cup is passed in the top three of the eight, three tries a cup, and a cup with no tries left gets one back when you finish on the podium of any single race (a stuck
  player is sent out to drive, not made to wait). The last cup climbs from SEMI-PRO to PRO inside itself (ratings 3, 3, 4, 4), which is how four cups hold five ratings. **Until the other seven tracks exist the cups are run on the sorting room in its four
  variants** (forward, reversed, mirrored, both): a cup's races are `{ track, v, rating }` rows and phase 6 changes the rows, nothing else.
- **Reversed and mirrored tracks are a transform of the data** (`track_variant.js`), not tracks to author: the controls turn round (each stretch's floor and wall carried to the control that now starts it), a belt keeps the way it moves (so it runs against you), left and right swap
  once for either turn and not at all for both. A jump needs a straight run-up and a cluster of parcels a straight to be seen from; when turning a road round leaves one without, it slides to the nearest stretch that has room and a jump that finds none goes. `track_check.js` runs
  every variant of every track through everything it holds.
- **Parts belong to the garage, not to a car** (`parts.js`): what is bought is fitted to whichever car goes out, so unlocking the twentieth car does not mean buying the tyres again. Route parts are things a car has or has not; tuning parts are three levels each and **the rating holds every
  number** (`tuned()` works from the car's own row and the levels, then the rating's envelope clamps it: a car at the cap gains nothing in that number, a car under it can reach it, and gearing is a trade, a higher top speed for a slower start). BALLAST is a dial between minus and plus the
  level bought (a seventh of the mass and a fiftieth of the centre's height a step). A BATTERY is two rates in the sim: the timers of COFFEE and of a power cut or a stun run at a different speed (exactly the step at level 0, so nothing else changed).
- **A cup's cars are won in the cup before it** (`unlocks.js`), as in Re-Volt: passing ROOKIE opens the AMATEUR cars, AMATEUR the ADVANCED, ADVANCED the SEMI-PRO and PRO ones the last cup is raced in. The first version gave the ROOKIE cars for passing the ROOKIE cup, and the bot found a last
  cup that nobody could pass (no car of its rating to race it in). The ROOKIE cars other than the courier come from playing: a first win, five podiums, twenty-five hits. Every car has a rule, and `career_check.js` holds that every rule names a cup that exists.
- **TIPS** (`pay.js`): a place always pays, the better places pay several times as much (240 down to 30 for eight), the rating multiplies it (1 to 2.5), and hits, a clean race and a lap record add a line each. A passed cup pays 400 times (1 + its rating), more won. Everything in the depot is
  about 15,000.
- **The screens** (`screens.js`, `screen_*.js`): title, cups, garage, depot, single race, race, board. The keys are read once a frame in one place (`nav`). **The depot is a room** (`depot_scene.js`): a bench with your truck on it, a pegboard with three rows of boards (route parts, tuning, looks), a
  camera that goes along the wall with the cursor and comes back to the bench for the looks. A panel that carries small type is solid, never the picture dimmed through the dither (the type could not be read over it). `scripts/vroom_screens.mjs` draws them all to PNG.
- **The save** is `ctx.save('vroom.v1', career)` after every change that matters, and `sanitize()` reads anything back (a damaged save is read as far as it can be, never refused). A cup in progress is part of it.
- **The budget bot** (`budget_bot.js`, `budget_play.js`; dev-only): a person is a CPU driver with HUMAN's numbers at the wheel of the player's car, and the bot shops, grinds and tries cups the way a sensible player does. It measures a cup by putting it together from a pool of single races (the same seven
  rivals on each of its four roads, several rolls of the dice each, then thousands of cups made of one race from each road): the share in the top three is the first-try pass rate, from dozens of races instead of dozens of cups. What it found while it was written, in order: the unlock structure above;
  that **the cars of a rating were 20 % apart in lap time with the same driver**, so the best car was the whole game (the car balance pass below); that its own choice of car must be by measured pace (a person finds the car that works for them by driving it) and, among cars within two per cent, the heavier;
  and that a driver's skill moves a result by less than the dice do, which sets how many races a measurement needs.
- **A car balance pass** (`cars_data.js`). In a field of eight of the same car the median best lap of the four cars of a rating was up to 20 % apart. The numbers of the outliers were brought in (the milk float's start, the paperboy's weight, the tuna truck's grip and start, the sled's engine, the logger's width and
  height of its centre) without breaking what `cars_check.js` holds about the spread of a rating. Two cars stay hard for a CPU to drive, the PAPERBOY (a trike that comes down off the jump on its tail) and the HORNET (an open-wheeler that touches a wall at its first bend): they are marked `noRival`, never given to the CPU,
  and are all the more fun for a person.
- **The field's strength is a number** (`FIELD` in `ai_profiles.js`: the tier an ordinary rival drives at in a rating, and what a rival's skill of -1 or +1 adds), and a tier may be between two (`tierProfile`), so the bot can find how strong a field has to be.
- **The class rule** (`career.js carFor`, `events.js`): in the championship a car goes into a race only if it is of that race's rating or a lower one; if the garage car is too fast the best allowed car is taken out instead (and the race says so). A PRO car held to SEMI-PRO numbers is still the better car (the cap
  makes the numbers equal, not the cars), and the bot found the last cup passed 80 % of the time with it. A single race allows any car. Specials are never taken out for you.
- **The field's strength was calibrated** (`FIELD.ofRating` in `ai_profiles.js`: `1.0, 1.8, 2.7, 2.35, 3.3`, a rival's skill of -1 or +1 adding or taking one). A person with the bot's numbers passes a cup first try 55, 55, 53 and 57 % of the time with what the cup asks for (the plan: 35 to 60), 55, 32, 23 and 17 % with
  nothing, and 64, 74, 76 and 51 % with everything (never above 85): the parts matter, and the class does not make them a formality. The measure is a pool of 768 races and thousands of cups made from it; a cell is good to about seven points, which is the slack the bot allows. **Skill moves a result by less than the dice
  do**: with every car the same, the bot's driver finishes 4.5th of eight (the field's average) and a novice 5.3rd, and a whole tier of the CPU's skill is two or three per cent of a lap on a road with the rating's caps on it. The strength of a field is therefore mostly which cars it has, which is why the car balance pass came first.
- **What a cup asks for** (`CUPS[i].ask`): the route parts its roads need and a level of tuning (0, 1, 2, 3 for the four cups). Until a road says it needs a route part (a track's `needs: [...]`, phase 6) the parts a cup asks for can make no difference, and the bot says so instead of asserting "under 20 % with none in the
  last cup" (17 % here, by tuning alone). **That assertion must pass with the real roads in phase 6**, and `career_check.js` will hold that what a cup asks for and what its roads need are the same list.
- **The pay was halved** and a SPARE added. The first pay table (240 down to 30 a race) paid for everything in the depot in an hour and a half. Now a race pays 150 down to 17 (times 1 to 2.5 for the rating), a cup passed 260 (times 1 + its rating, more won), and every third race, whatever it was, the garage turns up
  the cheapest look you do not have (`SPARE_EVERY`): that is what keeps something new arriving between the cups and the cars (the longest wait for something new was two races, in every career; the plan: three).
- **Hours.** The plan's three hours are for a town whose roads average a lap of about 48 s; the sorting room is 32 s. The bot scales the hours it measures to the lap the town is meant to have (`TOWN_LAP`), prints both, and holds the scaled number to 2.2 to 3.8: **1.60 h as run, 2.43 h at the town's pace**, earning 4,900 TIPS an hour
  (the plan's economy needs about 4,000: what the last cup asks for, 12,000 in parts, is afforded by the end of the championship). In phase 6 the scale becomes about one, and this has to hold on the real roads. **The town's roads should average about 500 m a lap.**
- **Chaos is measured** the same way (all eight cars, 768 races): 38.9 pickup hits, 13.7 flips, 27.8 places changed for good and 1.3 lead changes a race.
- **Dev-only files are `budget_*.js`, `*_check*.js`, `check_kit.js`, `headless_harness.js` and `raster_scene.js`** (`electron-builder.yml`, `check-package.mjs`), so a new helper for the bot is named `budget_...`.

**Phase 6 -- the rest of the town and the other modes**
- **Eight roads, each a polygon** (`tracks_a/b/c.js`, `track_def.js`: `rounded()` turns the corners of a route, with a place, a width, a floor, a wall and a bend radius each, into a closed line; things on it are placed by *which straight and how far along it*). Ratings: SORTING ROOM, STREET and
  FORECOURT, DINER, PASS, DAM, HARBOUR, FACTORY are 0, 0, 1, 1, 2, 2, 3, 4. The roads' best laps run from 30 s (the sorting room) to 55 s (the pass) and the cups' roads average 43 s a lap; a road is built in the one sink that makes the picture and the collision, so a thing on it is a thing the CPU knows about.
- **A shortcut is a slip lane, not a hole in a wall** (`track_cut.js`). The first version cut a gap in the wall and ran a straight line across the corner: a CPU never took it (a kink at the mouth and one at the exit) and a person lost half a second in the doorway. A cut now leaves the road through a gap
  in the wall on a lead-in laid on the main road itself (`CUT_LEAD` 9 m, a tail of 9 m), runs a body of Bezier points through the places the data names (`via`, or `reach` and `lean` from the straight line), and rejoins on a lead-out; the path is a centripetal Catmull-Rom (a uniform one overshoots at a
  short control). A gate is an oriented box (`obox`), tagged, that a world breaks for a car with a BUMPER BAR above `GATE.speed`; the swept probes of `sim_body.js` are asked as well (a car that arrives faster than a probe's step went through the first version unbroken). **The CPU decides by time**: it
  compares the plan of the main road with the plan of the cut, both with the drag of the floor in them (`ai_surface.js`'s `settleSpeed`, a probe of what speed the surface lets a car settle at), and takes the cut only if it has the part and it is faster; the walls of the road have a hole where a cut leaves, and `track_check.js` holds the hole (a wall gap that
  spanned a whole lap, because an offset past the start line wrapped, was found that way).
- **What a road needs is read from its data** (`needsOfDef`): packed or deep snow underfoot is SNOW TYRES, ice is ICE CHAINS, a blizzard is HEADLIGHTS, a gate is a BUMPER BAR. A car without SNOW TYRES in deep snow sinks (`SURF.deep.dragTyres`, 0.5 against 0.07), so the part is a road, not a number.
  Rivals have the parts from the AMATEUR cup (`events.js rivalParts`: SNOW TYRES, a BUMPER BAR in every other car, HEADLIGHTS), and take the cuts.
- **A press is a slab on the race clock** (`press.js`, `track_press.js`): up or down by `pressAt(p, t)`, so it is the same for every car and every replay, a wall (a tagged set of triangles switched by the world: `W.press`) while it is down, with the sparks and the thump drawn from the same function. A CPU asks `nextClear` and waits at the line until it can cross
  (`clearFor` holds that the slab will not close on it). Every world has its own copy of the collision tags (`off`/`mark`/`stamp`), so a car and its ghost never see each other's presses.
- **A star is a shelf off the road** (`track_star.js`): a spur leaves through a gap in the wall, climbs a ramp and stops; the star hovers over the end. PRACTICE has one a road. The ones in the air over a spur were first placed too close to the road's own floor, which changed the physics of every lap beside them
  (the coffee test measured it): the spur's floor is clamped out of the road's width, and the sorting room's star was moved off the first straight. Finding every road's star in a cup gives that cup's car.
- **Doors** are for LAST MILE (`track_door.js`): six to a road, worked out from its own line (not authored): spread evenly round the lap, each on the nearest straight that has no belt, jump, kerb, pinch, counter, press, shortcut or star on it, alternating sides; a lit panel in the wall and a pad in front of it. A parcel is `lastmile.js`: it rides in the bed, comes out by what the car's velocity does over three steps (a raw force sees every kerb; Δv over three steps sees a jump and a hit), stays out
  until a car stops on it, and is worth a tip that falls by 1.6 a second, 14 a drop and 4 a hit (not below 10). First to six wins. A CPU stops at a door (`ctx.stop`: a braking plan of 3.2 m/s², aim 1.1 m short, reverse if it passed by under 20 m) and does not take cuts (`noCuts`, for the doors are on the main road).
- **CLOCKWORK** is sixteen of one truck, no pickups: a grid of sixteen (eight rows of two, which every road has room for: `track_check` holds it), the eleven rivals and four of them again in other paint, and the player in the twelfth place. It costs the sim about 1.5 ms a step (`clockwork_check.js`).
  A race is called when the player is home and the others have had four seconds, so the check runs it on until the last truck is across and holds that nobody is stuck.
- **The ghost is the keys, not the car** (`ghost.js`): a frame's keys are one byte (throttle, brake, reposition and the stick in fifteenths), the stream is run-length coded into a short string in base 36 and kept apart from the career (`ctx.save('ghost.<road>:<variant>')`, a few kilobytes), and a second
  race of the same road and car is given those keys a frame at a time and drives the same run to the bit. The player's own race is given the *rounded* keys too (`quantize`), so the run and its replay are the same numbers and nothing is lost to the rounding. A byte whose stick field is 31 is never written and reads as full lock.
- **The challenge time is measured** (`budget_par.js`: a PRO driver who makes no slips in each of the four cars of the road's rating, the road's route parts on, three laps, the best lap, plus three per cent) and pasted into `challenge_data.js`, so a person has about three per cent over what a CPU line gives to find. Beating it opens the road
  REVERSED, REVERSED opens MIRRORED, and MIRRORED opens both; it pays once (`PAR_TIPS` times one plus the car's rating). The times run from 30.3 s (the sorting room) to 55.2 s (the pass).
- **The STUNT YARD is a road to the builder** (`yard_def.js`, `track_yard.js`, `yard_pieces.js`, `yard.js`): a ring of asphalt 10 m wide with no inside wall, a flat infield of the same floor, and the pieces stood on it; every face goes through the same sink, so the picture and the collision are one. **A loop is not there.** The
  suspension's travel (`SUSP.travel` 0.05 m at 7 Hz) is about 6 g of spring, and the least a car can ask of the ground at the foot of a vertical loop is 6 g whatever the loop's size (a car with enough speed to get over the top is at 6 g at the bottom): the first tries lost the car at the first quarter whatever the radius, and the one that went round
  did it inverted at 17 m/s. A **bowl** is there instead: a banked ring with a gate, where how high a car holds is the speed it goes round at. The stars are caught inside a metre across and eight tenths up (a star in the air is a hard thing to put the middle of a car through) and drawn twice the size. Whether a star is for a better car is **measured**:
  `yard_check.js` drives a way to each star (a few waypoints, full throttle, pure pursuit: `yard_check_ways.js`) with every car of the roster from a standstill and holds that each is possible, seven are for every car, three or more are not for the first car and the fastest few are what is left. (How the roster did: the
  first car, 13 of 20; the best car, 17; one star only the three fastest reach.) A wall run, a bowl and a roof are not repeatable for a bot as a kicker is, so those are held loosely: reachable by someone.
- **Bugs the modes' flows found** (`screens_check.js` walks every mode from its menu to its board): LAST MILE could not be started from the menu (it asked a road's rating and car of an event that carried neither), a ghost's byte decoded to a full-lock stick that is never written, and a practice star was lost to a teleport that moved the car and
  not its previous position (the sim sweeps its probes between the two). Checks that move a car use `world.place`.
- **The cups are on the real roads** (`cups.js`): ROOKIE sorting and street, AMATEUR forecourt and diner, ADVANCED pass and dam, PRO harbour and factory, forward and reversed, ratings 0, 1, 2 and 3 and 4. What a cup asks for is what its roads need: AMATEUR SNOW TYRES and a BUMPER BAR, ADVANCED SNOW TYRES and HEADLIGHTS,
  PRO ICE CHAINS and a BUMPER BAR. `career_check.js` holds that a cup asks for everything its roads need, and the bot now asserts the rule it had been waiting for roads to make true (the last cup with no parts at all passes under 20 %: it passes 0 %).
- **The budget bot, on the real roads.** With the cups on the eight roads a person with the bot's numbers passes a cup first try 67, 66, 60 and 56 % of the time with what it asks for (the plan: 35 to 60, held to 28 to 67 for the noise of a cell), 67, 4, 1 and 0 % with no parts, and 82, 87, 88 and 50 % with everything (never above 85, held to 88).
  The AMATEUR field is the one that moved: **`FIELD.ofRating[1]` is 3.6, from 1.8**. The first calibration was made on the sorting room alone, where parts make no difference; on the forecourt and the diner a person with the cheap route parts is a second a lap faster, and a field of the old strength let them win. Giving the rivals
  the same cheap parts from AMATEUR up (SNOW TYRES for all of them, a BUMPER BAR in every other car) took the no-parts figure from 20 % to 4 %, which is the point of a part that opens a road, and a stronger field then brought the asked-for figure back to the band. It is noisy: 3.3, 3.6 and 3.9 gave 69, 66 and 77 % on 192 races each. It is a sharper field than ADVANCED's (2.7) because the lower rating's caps hold skill down, so `ai_check.js` lets a rating's field be up to a tier under the one before it, not half a one.
  **The pay was cut by a third** (150 to 17 became 98 to 11 a place, a cup 170 a rating step, a hit 5, a clean race 16, a lap record 23): with the real roads the championship took 2.0 h at the town's pace and earned 6,100 TIPS an hour, and the plan wants about three and about four thousand. Now it takes 2.9 h (2.6 as run, 58 to 69 races) at 3,200 TIPS an hour.
  The longer career ran out of spares (the looks that are given every third race), so the plate list has ten more numbers (none a rival's), and the longest wait for something new is two races in every career. Chaos, the same way: 37.7 hits, 12.4 flips, 28.5 places changed hands and 1.5 lead changes a race.
- **Dev tools added or changed**: `scripts/vroom_map.mjs` and `vroom_race_shots.mjs` take every road and variant; `budget_par.js` makes the challenge times; `yard_check_kit.js` and `yard_check_ways.js` drive the yard; `budget_bot.js --shifts` finds how strong a field a cup wants.

**Phase 7 -- sound and the machine**
- **The score is nine tunes in F minor in two pools, on one beat grid** (`score.js`, `tunes.js`, `band.js`, `breaks.js`). The plan said six drum and bass tunes and a lo-fi pool for the night and the depot; the lo-fi pool is three tunes at 86 bpm, half of the race's 172, sixteen bars long where the race's are thirty-two,
  so every tune is the same 44.7 s a pass and a change of station (a V, a night road, a menu) lands on a bar line whichever tune it leaves. F minor was chosen because the sampler's `bass` and `synthbass` sit well in it (F2 to Ab2 is where the sub is audible on a small speaker) and because its notes and the one major chord that
  leads home (C) are the whole vocabulary: `music_check.js` holds every note of every part to F minor or the chord of its bar, the lead to its chords on the strong beats (70 %), and the loop to a seam (the last chord is C or F, the first is F, Bb or Db).
  A race tune is A B A B of sixteen chords: the first A is the room before the drop (the break, the bass, a pad and a comp, the tune teased on a music box an octave up), the lead comes in on the first B and stays. Two layers ride on it (`music_heat.js`): `last` (horn stabs on the off-beats, a choir, the lead an octave up, a crash every four bars) and
  `fight` (a ride and open hats, an arpeggio, a guitar on every off-beat). The two numbers are pure functions of a race: over real races of eight on the sorting room the fight is asked for 56 % of the time (46 % above one half) and the last lap a third of it. Fast in, slow out (`FEEL`: a fight 0.45 s in and 2.4 s out, the last lap 1.2 s and 3 s), glided to by the desk.
- **The radio** (V, anywhere in the game) is two stations. Left alone: the menus, the depot and the night roads (MAIN STREET, the harbour) play NIGHT, a road by day RACE. A choice is the player's and is kept as `ctx.save('vroom.radio.v1')` until V is pressed again. It is `apps/director.js` and nothing new: a change of station is the one thing that cannot wait and takes a short crossfade that begins on a bar line;
  each race starts the pool one tune further along (`seed`), so no two races open alike. A win or a miss at the finish plays a stinger (F major or F minor) once over the music, which goes out under it, and the radio comes back after its tail. The name of the tune goes up on the glass for three seconds (`radio_hud.js`, outlined pixel type on a dithered panel).
- **The effects are synthesised, and an engine is a voice, not a one-shot** (`sfx_synth.js`: tones and noise as in AfterEgypt's, plus an *engine* of two oscillators and a band and a *bed* of noise through a band, both following numbers handed in every frame, never more than six alive: four engines and the player's two beds). Each audible car is an engine by kind (ELECTRIC: a brushed motor's whine; GLOW: lower, with a ring in it, a tremolo at a third of its pitch) and class (each a step higher and brighter), revs from speed over its top speed, the throttle on a slow car, the slide of its tyres and the air; THE CAT purrs, the CURLING STONE has next to no motor, the SNOWMAN's is muffled.
  Another car is quieter by `1 / (1 + (d / 3)^2)` and panned by which side of the player's it is on; beyond 30 m it is not an engine at all. The player's tyres are a bed by surface (a band and a loudness for each of the twelve) and a scrub that follows the slide. Everything pitched is in F minor. The HOT PARCEL's tick comes faster as the fuse burns (0.55 s to 0.08 s) from the nearest burning parcel within 25 m. Silent at SFX 0, with the set off and with no sound card; scaled by the mixer's VROOM slider; `sfx_check.js` runs it all against a context as strict as the real one.
- **Trophies are forty-six and a seal, and are told two ways** (`trophy_calls.js`): events where they happen (a race ends, a car comes down, a gate breaks, a parcel passes) and a *scan* of the career every time it is saved, so a collection counts however it was collected and a machine that played before is credited the first time its career is read. Two thresholds were made by measuring:
  a *clean race* is no wall hit of 3 m/s or more (`HARD_WALL`) because a CPU in traffic scrapes a wall five to fifteen times a race, so "touch no wall" was out of reach of the best driver there is, and *NOT A SCRATCH* is a LAST MILE delivery of 90 or more because the closest two doors of any road are 28 m apart and a tip falls 1.6 a second, so the 95 the toast first used was out of reach too (`SCRATCH_TIP`, `lm_tip.js`, shared by the glass, the board and the trophy, in its own file so the ledger does not pull the physics in to read it).
  The long ones pay like hours (`PAY`, applied by `registerVroom`: not in the ledger's `COMPLETION`, which is held to name only trophies that are there). `trophy_check.js` earns every one with a witness: races are real (a proxy driver in the real setup, the real tally), cups are real career code with the order handed in, the sim's own events are the sim's names and fields. `check-trophies.mjs` and `check-trophy-wires.mjs` hold the list in a ledger of its own where the gate's open.
- **SUN is paid for what is done once** (`sun.js`), and only that: a cup passed (500 / 900 / 1,300 / 2,000), won (+40 %), swept (+20 %); the first win on a road in each of its four versions (100 to 300 by rating, half for a variant); a hidden star (200 to 400); a star in the yard (50, and 500 for all twenty); a challenge time (80 to 240); a LAST MILE (120 a road); CLOCKWORK (400). A single race pays TIPS and nothing else, so there is no brake to design.
  It is paid from the career, not from what just happened: `owed(c)` is everything the career says is earned that `c.sun` does not say is paid, `settle(c, earn)` pays it and marks it, so a thing is paid once whatever reaches it first and a career that earned something before SUN existed is paid when it is next read. `Economy.earn(n, why, { game: 'vroom' })` (so the golden eggs raise it, `'vroom'` in `PAYERS`), one ledger line each as `VROOM: <what for>`.
  `check-sun.mjs` holds it: the championship (four cups passed and won, a first win on every road) 8,030 SUN in 2.9 hours, 2,769 an hour; everything 21,545 in about nine hours, 2,394 an hour; both inside the band (1,500 to 5,000).
- **The machine's other doors**: the Stack's folder (`stack.js`, nine discs, both layers in, amber for the drive and cyan for the night station); the help page (full, `kernel/help_text.js`); `::/VroomProps` for a mastered VROOM (`props.js`: every car from the side and from behind in the sorting room's light, the eleven liveries and the player's, sixty pictures through the real renderer).
  The folder is listed in the ledger's REWARDS tab only through `folderOf()`, which has VROOM in it when the gate is open and not otherwise (`FOLDER_OF`, which the ledger walked, said its name for every game, locked or not: a leak found by reading who walks it), and `makeProps('vroom')` refuses while the gate is shut.
- **Found while writing it**: the screens' check rig had no sound or trophies and so could not have found a call to `G.audio` that did not exist; the rig now makes the real `audio.js` over a host with no speaker and the real trophy calls over a ledger that is not there, so the screens are walked with both in place.

**Phase 8 -- polish: the 2P split, the track maker, and the whole machine's checks**
- **The 2P split is a single race with two people in the field** (`screen_split_menu.js`, `screen_split.js`, `events.js setupSplit`; `split_check.js`). `race.step` takes a list of inputs, one for each person in the order they stand in the field, or one input for one human as ever (`people.indexOf(f)`); P1 (W A S D, SPACE / E / SHIFT fires, R back) is the top half and P2 (the arrows, ENTER / RIGHT SHIFT / 0 fires, `/` back) the bottom.
  The picture is two views of 320 x 90 (`drawView` and `drawHud` took a rectangle from phase 3 on: that is what they were written for), each with its own chase camera, and the vertical field of view is 0.58 in a half against 1.0 in the whole, so that a half is as wide to the eye as the whole and not a fisheye. P1 and P2 are in different paint and stand side by side in the middle of the grid with up to six CPU cars of the rating.
  It pays nothing, keeps nothing and tells the trophies nothing (a second person's win must not be a first person's money): `split_check.js` runs a whole race with both people driven and finds the career byte for byte what it was and nothing saved. **A frame costs what a single view does** (3.2 ms against 3.35 in Node with other work running): the pixels are the same number and the geometry is done twice, so the plan's worry that the second view "costs about the same again" did not come true.
  Found by playing it in the real machine: the title keeps its cursor, so a check that goes "down six" from wherever it left the cursor races the wrong thing; the GUI check goes up to the top first (ESC sends the cursor to QUIT and one more goes round to the first row).
- **The track maker is tiles, a ring, and nothing else** (`maker_trk.js` the file and the value, `maker_loop.js` the ring, `maker_def.js` the track data, `maker_edit.js` the verbs, `maker_io.js` the files, `maker_draw.js` and `screen_maker.js` the screen). A road is a grid of 12 x 8 tiles of 24 m, at most 64 of them painted; the painted tiles must be **one ring** (every tile has exactly two painted neighbours: a lone tile, a dead end, a fork, a crossing, two rings are each found at the tile that is the mistake).
  Every tile of the ring is a vertex of the route in the town's own `rounded()` (a straight tile a vertex with no bend, a corner a bend of 7 m), so the road is built, drawn, driven and raced by the same code as the town's and a CPU drives it with the same driver. The modules are the town's own features: JUMP (the standard jump, needs a straight tile and a straight one before it), BELT (16 m), PINCH, COUNTER, PICKUPS (a cluster across the road, and the road is given more until it has four, one for every four tiles up to twelve) and KERB (inside a corner); the start line is the straight tile with the longest straight run either side unless one is asked for.
  A road is text, `::/Home/Vroom/<NAME>.TRK`, one fact to a line, and `fromText` never throws and never trusts. **A file's name, not the NAME in it, is the road's identity** (`user:<FILE NAME>`), so a file renamed on the desktop is the same road. The roads are read (`loadRoads`) when the menus open and registered in `tracks.js` apart from the town's: **`TRACK_IDS` and `allTracks()` are the town's eight and nothing else**, so no list the career, the cups, the trophies or the checks walk can hold one. A road is offered by SINGLE RACE, TIME TRIAL and the 2P split after the roads of the cups that are open, never by the modes that look for what a road has hidden (PRACTICE, LAST MILE, CLOCKWORK, the yard).
  **Nothing is paid, kept or earned on a road of your own** (`user_roads.js`): no TIPS, no record in the career, the trophies are not told; the cars on it wear what it needs (snow tyres on snow, chains on ice) because a road nobody could race without the tyres is a road nobody finishes; the only thing kept is the best lap of a time trial and its ghost, apart from the career (`vroom.mine.v1`, `ghost.user:<NAME>:f`).
  `maker_check.js` grows forty roads at random (a ring of 4 to 7 by 3 to 5 tiles, then three to seven bumps pushed out of it one tile at a time, each kept only if it is still a ring; every theme; modules strewn on them, and a jump forced on every other one) and holds each to what the town's own are held to (`track_check_kit.js` is `track_check.js`'s checks as a function of a built track, run on every eighth road and on all forty with `MAKER_FULL=1`: 1,242 checks, all green) and races eight cars on every one of them to the flag. `maker_screen_check.js` walks the screen with real key presses against a disk in a table (a ring with the pen, a jump placed and a place refused, a tile taken out and the problem named at it, SAVE with its name box and its replace guard, NEW and OPEN, ESC with something unsaved, TEST DRIVE to the end with the career byte for byte what it was, a single race and a time trial on it).
- **The bug the maker found in the town's code** (`track_path.js rounded`): a corner with no bend (r 0) put a control point of its own on the line exactly where the straight that starts there put its first, so two control points stood in one place. The spline (`spline.js`) fitted a stretch of line through them in which a metre of road was a half of its length -- a ramp of 0.9 m was 0.55 m long and so steeper than its data, the rear wheels' ride-height spheres caught the lip, and a car flipped.
  Every jump a random road had failed the town's own jump check, at every position along its tile and in every theme, until this was found by instrumenting the contact solver (the contact was the ride-height sphere of the rear wheels on the edge of the ramp's end). The fix is `rounded(verts, { merge: true })`, which leaves the second point out; it is **opt-in**, because three of the town's own roads (the sorting room, the pass, the factory) have one such corner each and their golden numbers (challenge times, ghosts, hashes) were made with it. The maker uses it; `maker_check.js` fails a road with two control points in one place or a ramp whose length on the line is not its data's, and without the fix it does (and a race of eight had 17.2 repositions on average and 63 at the worst against 8.5 and 18 with it).
  It is a finding for the owner too: those three town corners are a few metres of road a CPU and a player drive a little differently from the way the map says, harmlessly (every check passes on them).
- **Checks added**: `split_check.js` (43), `maker_check.js` (232, `MAKER_FULL=1` 1,242), `maker_screen_check.js` (51), `scripts/check-vroom-play.mjs` (`npm run check:vroomplay`: the maker and the split in the real machine with real keys, the speed bar of each half read off the pixels by its exact fill colour so that a green car going by behind it does not count). `screens_check.js` walks the two new title rows (the title has twelve rows now, nine pixels each). The pause of the split, its RESTART and QUIT, and its board are in `split_check.js`.
