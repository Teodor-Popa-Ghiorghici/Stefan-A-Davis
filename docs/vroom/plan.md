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
