# src/presentation

Owned by the **Presentation Agent** (GDD §5.2, agent 5).

Renderable scenes for the MVP loop: the map screen, and animated screens for
resource collection, refining, and crafting. Calls `src/simulation`'s public
functions and renders their output — never reimplements or duplicates
formula logic locally. Goes through `src/adapters` for persistence/audio,
never `localStorage`/Web Audio directly. No DOM-based UI — everything
renders inside the canvas (grep-verified: no
`createElement`/`innerHTML`/`appendChild`/etc. anywhere in this folder).

**Phase 2 integration (Agent 10):** the map/gather screens no longer show a
single hardcoded planet (Delta Rigelus) — they show a real planet drawn
from a generated galaxy.
- `galaxyState.ts` — the integration point. Loads a previously-stored
  galaxy seed via `saveSystem` (key `profitable:galaxySeed`), or generates
  and persists a new one on first run, then calls Agent 8's
  `generateGalaxy(PLANET_COUNT, content.resources, seed)`. `PLANET_COUNT`
  is a small fixed 5 — enough to prove real generation without redesigning
  the single-planet MVP UI into a multi-planet one (out of scope for this
  agent; see its own contract). Exports `galaxy` and `startingPlanet` (the
  first generated planet, with `discovered` forced to `true` — Agent 8
  always generates planets as undiscovered, since picking/revealing a
  starting planet is explicitly this agent's integration concern, not
  Agent 8's).
- `MapScene.ts` / `GatherScene.ts` — swapped their planet source from
  `content.planets[0]` (Agent 6's hardcoded content) to `startingPlanet`,
  and `GatherScene`'s gather roll from `rollQuality()` to Agent 8's
  `rollQualityOnPlanet()` so the planet's tier/specialty modifiers actually
  apply. `GatherScene` also displays the planet's tier and specialty
  resource (when it has one) so the modifier's effect is visible to a
  player, not just a silent internal number. `RefineScene`/`CraftScene`
  are untouched — they only ever operated on inventory batches, never on
  planet data.

**Phase 3 (Agent 13 — Trading Presentation):** adds the market/trade-map
loop on top of Phase 2's generated galaxy.
- `tradingState.ts` — Agent 13's own cross-scene state (same role
  `gameState.ts`/`galaxyState.ts` already play), all persisted through
  `saveSystem`: `Wallet`, active `Listing[]`, and `PlanetMarketState[]`.
  Statically imports `content/tradingBasePrices.json` and
  `content/planetMarketPreferences.json` and hands them straight to
  `loadTradingContent()` (Agent 11) — the same "one sanctioned touch point"
  pattern `loadMvpContent.ts` already established, just folded into this
  file rather than split into its own, since Agent 13 (unlike Agent 5) owns
  both the loading and the state in one place. On first run, seeds
  `PlanetMarketState` for `startingPlanet` from the base-price content, and
  seeds two starter `Listing`s created by a `"seed-market"` player id —
  without a counterparty, a single-player session could never demonstrate
  a real purchase, since `purchaseListing()` correctly rejects buying your
  own listing. Also maintains a `listingId -> QualityRoll` side-table
  (`getListingQualities`/`setListingQualities`): `Listing` (Agent 1) only
  carries a derived `marketTier`, not the item's real 5 qualities, so
  without this a purchased item's actual rolled qualities would be lost at
  the point of sale — a direct violation of CLAUDE.md §3.1's "qualities
  persist at every tier, never relabeled." This is that "elsewhere" the
  type's own comment refers to. **Agent 15 (Integration):**
  `PlanetMarketState` seeding was extended from just `startingPlanet` to
  every planet in the generated galaxy — Agent 13 deliberately scoped
  itself to the one discovered planet and left full multi-planet seeding
  as Agent 15's job (see this file's own prior comment). A background
  economy exists galaxy-wide regardless of what the player has discovered;
  `TradeMapScene` still correctly filters its own display to discovered
  planets only.
- `scenes/MarketScene.ts` — the planet-local market at `startingPlanet`:
  browse/buy active listings there (including partial purchase via
  "Buy 1" vs. "Buy All"), and list any inventory batch for sale. Every
  price/fee/drift number shown comes straight from `purchaseListing()`'s
  and `createListing()`'s actual return values.
- `scenes/GlobalMarketScene.ts` — the global market: the derived buy/sell
  price per item via `getGlobalPrice()` (display only — no way to fulfill
  a purchase *at* the derived price without order-routing logic Agent 11's
  contract never specified, so buying works the same direct-listing way as
  the planet market, just for `location: "global"` listings), plus
  browsing/purchasing global listings and listing eligible inventory
  globally. The tier 6-7 restriction is enforced at the UI level (the
  "List Globally" button simply isn't rendered for an ineligible item) as
  defense in depth on top of `createListing()`'s own hard rejection — not
  reachable live with real MVP content since no shipped item reaches tier
  6 (max is Ion-Forged Hull Plate at 3), so this branch is confirmed by
  code review + the `GLOBAL_LISTABLE_MAX_ITEM_TIER` constant rather than a
  live example.
- `scenes/TradeMapScene.ts` — read-only: for each discovered planet,
  classifies "sells cheap" / "buys at a premium" / "steady" *live* from
  `currentPrice` vs. `basePrice` (a ±5% band) in real `PlanetMarketState`
  data — never computes pricing itself. Agent 14's static
  `planetMarketPreferences.json` entry is shown separately, labeled
  "typically," since it's explicitly a day-one seed, not a live signal.
- `scenes/nav.ts` gained 3 entries (Market/Global/TradeMap);
  `main.ts` registers the 3 new scenes alongside the original 4.

**Phase 4 (Agent 18 — Crew Presentation):** adds crew hiring/management
on top of Phase 3's market loop.
- `crewState.ts` — Agent 18's own cross-scene state (same role
  `tradingState.ts` plays for Phase 3), scoped to `startingPlanet` only,
  same boundary Agent 13 already drew: `CrewCapacity`, the player's
  `CrewMember[]` roster, and one `PlanetCrewPool` (seeded via Agent 16's
  `refreshCrewPool()` on first run). Reuses Phase 3's `Wallet`/`PLAYER_ID`
  from `tradingState.ts` rather than duplicating either.
- `scenes/CrewScene.ts` — one combined screen (hiring + management +
  capacity), mirroring how `MarketScene` already combines browsing and
  selling in one screen rather than splitting every GDD "output" bullet
  into its own scene. Lists the pool (hire), the player's roster (assign/
  check background/pay upkeep/dismiss), and capacity usage with a
  purchase option. Crew members draw from the same shared player
  inventory as the player's own crafting — there's no separate
  per-crafter stockpile. On every redraw, runs `checkAttrition()` for
  each crew member and actually removes any that have departed, showing
  which — this only reflects what Agent 16 already computed, never a
  fabricated risk warning (Section 2.7 has no random-loss mechanic, and
  the UI must not imply one exists).
- `scenes/nav.ts` gained a Crew entry; `main.ts` registers `CrewScene`
  alongside the other 7.

**Phase 4 integration bug fix (Agent 19):** discovered while performing
this agent's own required manual playtest — `MarketScene`, `GlobalMarketScene`,
and `CrewScene` all shared the same status-message bug. Every action
handler set `statusText` then called `redraw()`, but `redraw()`
unconditionally recreates a blank `statusText` at its own end (after
`children.removeAll()`), silently wiping the message before a player ever
saw it — a pre-existing gap in Agents 13's and 18's own scope, not
something Agent 19 introduced. `CrewScene`'s departure notice had the
identical problem twice over: two lines apart, it wrote the departure
text and then immediately overwrote it with a second blank `statusText`.
Fixed in all three scenes with a `pendingMessage` field that survives the
`removeAll()`/recreate cycle — `setStatus()` replaces every
`this.statusText?.setText(...)` call site, and each scene's final
`this.add.text(...)` in `redraw()` seeds from `this.pendingMessage`
instead of `""`. `CrewScene`'s departure notice now flows through the
same single mechanism rather than a separate, also-broken code path.
Confirmed live post-fix: a purchase confirmation and a background-check
result both now persist on screen after their triggering action.

**Phase 5 (Agent 22 — Ships & Travel Presentation):** adds ship purchasing,
component crafting/assembly, and travel on top of Phase 4's crew loop.
- `galaxyState.ts` gained `secondaryDiscoveredPlanet` — a necessary
  integration choice, not a new mechanic: no "discover a planet by
  traveling/scanning" system exists yet (still out of scope per CLAUDE.md
  Section 6), so without a second planet marked discovered the same way
  Agent 10 already marks `startingPlanet`, the travel layer below would
  have zero selectable destinations in a fresh session. Mirrors
  `startingPlanet`'s own override exactly, one planet further into the
  generated list.
- `shipsState.ts` (new) — Agent 22's own cross-scene state, same pattern
  `crewState.ts`/`tradingState.ts` already established: a `ShipyardPool`
  seeded at `startingPlanet` via Agent 20's `refreshShipyardPool()`, the
  player's owned `Ship[]` roster, and active `Voyage[]` — none of the
  latter two are planet-scoped, since an owned ship and its voyages belong
  to the player, not to any one planet. Also owns `getShipsContent()`,
  statically importing `content/componentRecipes.json` and handing it to
  Agent 20's `loadShipsContent()` (mirrors `tradingState.ts`'s
  `getTradingContent()` exact shape).
- `scenes/ShipyardScene.ts` (new) — browse the shipyard pool at
  `startingPlanet` and purchase a candidate via Agent 20's real
  `purchaseShip()`; every number shown (tier, cost) is sourced directly
  from its return values and `SHIP_PURCHASE_COST_BY_TIER`, never
  recomputed here.
- `scenes/ShipAssemblyScene.ts` (new) — craft a component in place and
  install it, mirroring `CrewScene.onAssign()`'s precedent of calling
  `craft()` directly against player inventory rather than routing through
  `CraftScene.ts`. **Necessary completion:** component recipes have no
  `Schematic` entity behind them (only the MVP's own
  `ion-forged-hull-plate` recipe does — see `content/README.md`'s Phase 5
  section), so there's no `schematic.tier` to read the way
  `CraftScene`/`CrewScene` do; `schematicTier` is instead player-selected
  directly via a second tier selector, the same way `crafterTier` already
  is. A successful craft is wrapped into a real `ShipComponent` (id +
  category from Agent 20's `ComponentRecipe` link data + the craft's
  qualities + `computeAggregateTier()` for its own tier) and installed via
  Agent 20's real `assembleShip()`, which recomputes the ship's derived
  tier on every call — never read off a stale value.
- `scenes/TradeMapScene.ts` extended (not replaced by a second screen, per
  the Phase 5 GDD's own "same map, extended" requirement) with a travel
  section: shows the player's current ship, any voyage in progress with
  live remaining time, a "Resolve Arrival" action once due, and — only
  when the ship has no unresolved voyage — a travel-time-and-"Initiate
  Voyage" row per other discovered planet, computed via Agent 20's real
  `calculateTravelTime()`/`initiateVoyage()`. Initiated voyages carry
  empty cargo — a real cargo-carrying voyage (the Phase 3 remote tier 6-7
  sale connection) is Agent 24's own required integration check, exercised
  directly against the core functions, not through a cargo-selection UI
  this contract never asked for. No encounter mechanic is displayed or
  implied anywhere (deferred, per `docs/profitable-design-questions.md`'s
  "Travel" section).
- `scenes/nav.ts` gained 2 entries (Shipyard/Assembly); `main.ts` registers
  the 2 new scenes alongside the other 8.

**Phase 5 bug found and fixed during this agent's own manual playtest:**
the travel layer's "does this ship have a voyage in progress" check was
initially `arrivesAt > Date.now()`, which stopped counting a voyage as
active the instant its arrival time passed — but a voyage isn't actually
resolved until the player clicks "Resolve Arrival" (only
`resolveArrival()` updates `Ship.currentPlanetId`). Between those two
moments, the destination list reappeared and let a second voyage be
initiated from a planet the ship hadn't actually reached yet. Fixed by
gating on "does an unresolved voyage record exist for this ship at all"
(`shipVoyages.length > 0`) rather than checking `arrivesAt` — a voyage
record only leaves the list once `resolveArrival()` succeeds.

**Galactic Map milestone (Agent 25 — Map Verification):** no new scenes or
state files — this milestone audits the existing Phase 3/5 map rather than
building anything (see `docs/profitable-map-gdd.md` Section 1). Live
playtest evidence recorded here for the one property (2.4, "existing map
sufficient at current scale") that isn't provable by `node:test` alone,
per this file's own standing note that Phaser scenes need a real browser:
driven via `npm run dev` + `window.__game`, measuring `TradeMapScene`'s
actual rendered content bounds against the 800×500 canvas.
- A **freshly-cleared session** (`localStorage.clear()`, zero player
  actions taken — the minimum possible content) already renders past the
  bottom of the canvas: content extends to y=615 against a 500px-tall
  canvas, 115px unreachable with no scrolling mechanism. After purchasing
  a ship and resolving one voyage (an ordinary post-Phase-5 state, not a
  contrived edge case), the overflow grows to y=636.
- Separately, `scenes/nav.ts`'s shared nav bar (present on all 10 scenes)
  overflows horizontally by 32px (x=832 against 800px wide) — Phase 3, 4,
  and 5 each added entries without any of them revisiting the bar's
  layout budget.
- Neither is evidence a new galaxy-wide/zoom-out view is needed (a
  different problem — navigating *many* planets — that 2 discovered
  planets doesn't present); both are plain legibility/overflow bugs in
  the existing screen(s), present before this milestone and reported as
  such. Full write-up: `docs/profitable-map-gdd.md` Section 6.

**Galactic Map bug fix (discovery-by-travel, agent-25/26's item #2):**
`galaxyState.ts` gained a persisted `discoveredPlanetIds` side-table
(`saveSystem` key `profitable:discoveredPlanetIds`) and two new exports,
`getDiscoveredPlanets()`/`markPlanetDiscovered()`. Necessary because
`galaxy.planets` itself only round-trips its seed through `SaveSystem` —
`generatePlanet()` deterministically reproduces `discovered: false` for
every planet on every reload, so an in-memory-only mutation would vanish
on the next session; discovery-by-travel needed its own persisted
side-table, the same "elsewhere" pattern `tradingState.ts`'s
`listingQualities` already uses for data a regenerated structure can't
itself carry. `TradeMapScene.discoveredPlanets()` (a private method
duplicating this logic) was removed in favor of calling the shared
`getDiscoveredPlanets()`, and `onResolveArrival()` now calls
`markPlanetDiscovered(result.destinationPlanetId)` on every successful
arrival. Live-verified: purchased a ship, traveled to the galaxy's third
planet (never one of the two structural bootstrap planets), confirmed it
appeared on the Trade Map immediately after `resolveArrival()`, then
reloaded the page and confirmed all three planets — and the ship's new
location — were still correctly shown, proving the fix survives a real
session boundary rather than just an in-memory check.

**Galactic Map bug fix (seasons/emergencies, agent-25/26's item #1):**
`TradeMapScene.renderPlanet()` now calls the new `src/trading/season.ts`/
`emergency.ts` (see that directory's own README for why both compute
everything live from `(planetId, now)` with zero persisted state). For
each planet, a "Season: X (A cheaper, B pricier)" line always renders, and
an "⚠ Emergency: C prices spiking (ends in Nh)" line renders only while
one is actually active — neither is fake flavor text, both feed a real
`effectivePrice = currentPrice × seasonMultiplier × emergencyMultiplier`
that the existing `classify()` compares against `basePrice`, so "sells
cheap"/"buys at a premium"/"steady" now genuinely reflects all three
documented layers, not just baseline drift. The real, stored
`currentPrice` (what trades actually move) is never touched by either
multiplier — they're display/classification-only, computed fresh on every
`redraw()`. Live-verified (fresh session, `localStorage` cleared): one
planet showed `Season: Winter` with an active emergency on the same
category the season favored as "cheaper" — the emergency's larger
premium (+30%) correctly overrode the season's milder discount (-8%),
rendering "buys at a premium," a genuine layered-effect interaction, not
a coincidence. A second, independently-seasoned planet (`Season: Autumn`,
no active emergency) showed its own cheap/premium categories flip from
"steady" to the season-driven classification while every other item on
that planet stayed "steady" — confirming per-planet independence (the
seed-derived phase offset), not a galaxy-wide synchronized effect.

**Galactic Map bug fix (canvas/nav overflow, agent-25/26's item #3):**
two independent overflow bugs, fixed separately since they lived in
different files.
- `scenes/nav.ts`: the shared 10-entry nav bar now **wraps to a second row**
  instead of running off the canvas edge — `renderNav()` measures each
  label against `scene.cameras.main.width` and starts a new row rather
  than hardcoding an item count or shrinking text, so it scales correctly
  if more entries are ever added later too. Live-verified: "Assembly" (the
  10th entry) now renders at `(16, 38)` — row 2 — instead of `x=832`
  (32px past the 800px-wide canvas).
- `scenes/TradeMapScene.ts`: every content line (title, planets, travel
  section — everything except the fixed nav bar and status line) now
  renders inside a `Phaser.GameObjects.Container`, clipped to a
  `GeometryMask` covering the visible viewport (`y` 64–455), with
  mouse-wheel input scrolling the container within `[0, maxScrollY]` and
  a "(scroll for more)" hint shown whenever `maxScrollY > 0`. **Necessary
  completion beyond the obvious clip-and-scroll:** a `GeometryMask` only
  clips *rendering*, not Phaser's input hit-testing — an "Initiate Voyage"
  button scrolled out of the visible range would otherwise still be
  clickable at its now-wrong on-screen position (potentially overlapping
  the fixed nav bar). `updateScrollInteractivity()` toggles each
  interactive child's own `input.enabled` based on whether its *current*
  world-space position actually falls inside the visible viewport,
  called after every scroll change, not just on redraw. Live-verified:
  a fresh session's content (previously measured overflowing to y=615)
  now renders with only the 64–455 range visible, `maxScrollY` correctly
  reflects the real overflow amount, and scrolling to `maxScrollY` reveals
  the second planet and the full Travel section that were previously
  unreachable. The specific input-toggle behavior (a button becoming
  unclickable while scrolled out of view) was verified by code review
  rather than an interactive click test, since browser-tool connectivity
  dropped mid-verification for this specific check — the mechanism itself
  (`object.input.enabled = worldY >= VIEWPORT_TOP && ...`) is a direct,
  narrow boolean condition with no other moving parts.

**Travel Encounters (Non-Combat) amendment (Agent 22):** no new screen —
extends the existing arrival display inside `TradeMapScene.onResolveArrival()`.
- `onResolveArrival()` now looks up the destination `Planet` (`galaxy.planets.find(...)`)
  and passes it plus `content.resources` to `resolveArrival()` — this is
  what actually opts the live game into encounter resolution, since Agent
  20's amendment keeps both parameters optional (every pre-amendment call
  site, including this one before this change, worked identically without
  them).
- `display.ts` gained `describeEncounter()` — sourced entirely from an
  `EncounterResult`'s own `outcome` data, never recomputing it: a
  trade-opportunity's credits grant, a discovery's resolved resource name
  (an optional caller-provided string, falling back to the raw `resourceId`
  — keeps `display.ts` free of any content/gameState import, same as every
  other function there) plus its aggregate tier via the existing
  `computeAggregateTier()`, and a hazard's pass/fail-with-cost. The arrival
  status message is built as `[base arrival line, ...encounter lines].join("\n")`
  — no section at all when `encounters` is empty, never a padded
  "nothing happened" line.
- Live-verified (scripted, per this amendment's own "may require seeding/
  forcing outcomes" allowance): a 30-day voyage run through the real
  `resolveArrival()`/`resolveEncounters()` pipeline with a real generated
  galaxy and real content, sampled across many random seeds until all
  three encounter types appeared, produced exactly: `"Found derelict
  cargo: Autunite Crystal (White)"`, `"Encountered a trader en route: +88
  Credits"`, and `"Navigational hazard: -45 Credits"` — matching the
  GDD's own example phrasing. A separate voyage with the trigger roll
  forced to never fire produced `encounters: []`, confirming the
  zero-encounter case shows no extra lines.

**Scanner/Probe amendment (Agent 22):** no new screen — a scanner listing
integrated into `ShipyardScene` (the existing shipyard-adjacent market UI,
per the contract's own "no new screen" requirement) and a "Scan" action
integrated into `TradeMapScene`'s existing travel section (the existing
"docked at a planet" UI context, next to the destination list).
- `shipsState.ts` gained a scanner pool/roster, same cross-scene state
  pattern as the shipyard pool/roster right above it: `getScannerPool()`/
  `setScannerPool()` (scoped to `startingPlanet`, same reasoning as the
  shipyard pool — the one planet a player can browse without traveling
  there first) and `getOwnedScanners()`/`setOwnedScanners()`/`addScanner()`
  (not planet-scoped, same as the ship roster — a purchased scanner
  belongs to the player).
- `ShipyardScene.renderScannerPool()`/`renderScannerRoster()` mirror the
  existing ship pool/roster sections exactly: browse and purchase from
  `ScannerPool` (`purchaseScanner()`, never reimplemented), and list every
  owned scanner's tier. The roster section satisfies the contract's own
  "owned-scanner display... so the 'highest tier is used' rule is legible"
  requirement by labeling the highest-tier owned scanner "(in use for
  scanning)" — computed by comparing tier *names* against the shared
  7-tier breakpoint order (`TIER_COLOR_BREAKPOINTS`), never by
  recalculating a radius (that stays exclusively inside `performScan()`).
- `TradeMapScene.renderTravel()` — the origin-planet lookup now prefers
  `discoveredPlanets` (the caller-supplied, already-normalized list) over
  a raw `galaxy.planets` lookup, falling back to the latter only if the
  ship's current planet somehow isn't in it. `renderScan()` renders inside
  the same "ship is docked, not en route" branch that already gates the
  destination list — a ship mid-voyage isn't docked anywhere, so neither
  travel nor scanning show. With no scanner owned, only a grey hint line
  renders (referring the player to the Shipyard); otherwise a "> Scan"
  button calls `onScan()`, which calls `performScan()` with the docked
  ship/planet, the real owned scanners, and every galaxy planet
  (discovery-normalized — see below), then calls `markPlanetDiscovered()`
  for each of `performScan()`'s own `newlyDiscovered` results — the exact
  same persisted side-table `onResolveArrival()`'s discovery-by-travel
  path already writes through. The status line reports the newly
  discovered planets' names, or "no new planets found within range."
  Nothing here displays or implies any connection to Travel Encounters or
  map staleness, per the contract's own guardrail — this section only
  ever talks about scanning.

**Necessary correction, found while implementing this amendment:**
`galaxyState.ts`'s `getDiscoveredPlanets()` only normalized `discovered:
true` on the two structural bootstrap planets — a planet discovered by
travel came straight off `galaxy.planets`, which always carries
`discovered: false` baked in (`generatePlanet()` is deterministic and
never mutated in place; membership in the persisted `discoveredPlanetIds`
side-table is what actually signals discovery, not the object's own
field). This went unnoticed until `performScan()` needed a real,
trustworthy `Planet.discovered` to check on whatever planet the ship is
currently docked at — every planet `getDiscoveredPlanets()` returns is
now normalized to `discovered: true`, matching what its own name and
contract already promised. `TradeMapScene.onScan()` reuses these
already-normalized objects directly (`[...getDiscoveredPlanets(),
...undiscovered]`) rather than re-stamping the field a second time, so no
new literal `discovered: true` write site was introduced beyond
`performScan.ts` itself (see `tests/integration/mapVerification.test.ts`'s
regression guard).

**Live-verified** (fresh session, `localStorage` cleared, driven through
the real live scene instances via `window.__game.scene.getScene(...)`
rather than a screenshot-driven click-through — the Chrome extension's
screenshot capture was broken for this entire session, a tool-level bug
unrelated to this code; every check below exercised the actual production
methods, not reimplementations):
- Purchased a Grey-tier scanner at the Shipyard through the real
  `onPurchaseScanner()` handler: pool count 3→2, wallet 500→420cr (exact
  tier cost), a real owned `Scanner` with the correct `ownerId` appeared.
- Purchased a Blue-tier scanner the same way; the roster section's
  rendered text confirmed `"Blue tier scanner (in use for scanning)"`
  against the two owned tiers (Grey, Blue) — the highest-tier-only rule
  legible exactly as the contract requires.
- Purchased a ship and called the real `TradeMapScene.onScan()` at the
  starting planet: correctly reported "no new planets found within
  range" — verified independently correct (not a bug) by computing every
  real planet's distance against the effective radius by hand; this
  5-planet galaxy's closest undiscovered planet (~680 units) is genuinely
  farther than even a Gold-tier scanner's max radius (470).
- Isolated positive-path check: ran the real `performScan()` +
  `markPlanetDiscovered()` sequence (identical to what `onScan()` itself
  calls) against a synthetic dock position placed within range of a real
  undiscovered planet — it was correctly reported `newlyDiscovered`,
  `getDiscoveredPlanets()` grew from 2 to 3, `redraw()` ran with no
  exceptions, and — after a full page reload (real session boundary, not
  just in-memory) — the discovery, the owned scanners, and the ship were
  all still correctly persisted.
- Confirmed both rejection paths live: no scanner owned → `"no scanner
  owned"`; ship's `currentPlanetId` not matching the docked planet →
  `"ship is not docked at the given planet"`.

**Status: complete.** Render engine: **Phaser** (chosen over PixiJS — see
commit history for rationale: Phaser's built-in Scene classes/screen-flow/
tweens map directly onto the GDD's "map/gather/refine/craft scenes"
language). Bundler: **Vite** (`vite.config.ts` + root `index.html`; `npm run
dev` / `npm run build`).

- `main.ts` — `Phaser.Game` bootstrap, registers the scenes. Also exposes
  `window.__game` in dev mode only (`import.meta.env.DEV`) — a debug hook
  for inspecting/driving the running game from the console, since canvas
  rendering means there's no DOM to query otherwise.
- `gameState.ts` — cross-scene state, created once: `content` (via
  `loadMvpContent()`), `saveSystem`/`audioManager` (Agent 4's adapters —
  `audioManager` is wired up but never exercised, since no sound
  ids/assets are defined anywhere in the GDD or content/ for this MVP),
  and `getInventory()`/`setInventory()` (persisted through `saveSystem`
  exclusively, under the `profitable:inventory` key).
- `loadMvpContent.ts` — the one place this agent touches Agent 6's raw
  JSON: statically imports the 5 `content/*.json` files (Vite/Node both
  handle `with { type: "json" }` import attributes) and hands them
  straight to `loadContent()` with no manual parsing of their shape.
- `inventory.ts` — pure, Phaser-free batch tracking (add/consume-FIFO/
  total), directly unit-tested. Each gather roll is its own batch (quality
  varies per roll) — never aggregated into a single running total, so
  `refine()`/`craft()` see each batch's real rolled qualities.
- `display.ts` — pure "what should this show" formatting (tier labels,
  refund/reject summaries, the tier-3-7 aggregate-color stub from GDD
  §3.1, computed by calling the real `getTierColor()`, never reimplementing
  breakpoint logic). Directly unit-tested — this is where "does the
  displayed number match what Agent 2 actually computed" is provable
  without a renderer. **Phase 3 note:** `computeAggregateTier()` itself now
  lives in `src/simulation/aggregateTier.ts` (Agent 11's `Listing.marketTier`
  needs the same formula, and trading core can't depend on presentation) —
  `display.ts` re-exports it, so this file's own usage is unchanged.
- `scenes/nav.ts`, `scenes/tierSelector.ts` — shared UI helpers (persistent
  nav bar; the 7-tier picker used by both Refine and Craft).
- `scenes/MapScene.ts`, `GatherScene.ts`, `RefineScene.ts`, `CraftScene.ts`
  — the four required screens.

**Known simplifications, documented rather than silently made:**
- `refine()`'s `refundUnits` isn't credited back to inventory — refine()'s
  own contract rolls refund per *total* consumed unit without tracking
  which specific input resource each unit belonged to, so there's no
  correct resource to credit it to for a mixed-resource refine. Still
  shown to the player via `describeRefineResult()`, just not spendable.
- `CraftScene` resolves a recipe slot's `category` to a resource by taking
  the first content resource with a matching `category` string. Crafting
  recipes are intentionally category-based, not resource-id-based (GDD:
  "not fixed to specific materials"), and the MVP content only ever has
  one resource per relevant category, so this is a safe simplification for
  this content — not a general multi-resource-per-category resolver.
- A rejected craft rolls back: the consumed input batches are added back
  to inventory rather than destroyed, since a rejected craft "cannot
  proceed" (GDD) — verified live (see below).
- **Phase 3:** `purchaseListing()`'s `proceedsToSeller` isn't credited to
  a real `Wallet` when the seller is `"seed-market"` (a bootstrap
  counterparty with no wallet of its own, not a real player) — only the
  buyer's `Wallet` is ever updated in this minimal wiring. Remains true
  after Agent 15's integration pass too: a real multi-party economy needs
  actual multiplayer (explicitly out of scope through Phase 3), so there's
  no second real wallet to credit yet. `tradingState.ts`'s
  `replaceListing()` also removes a listing from the active array outright
  once its quantity reaches 0, rather than keeping a `"closed"` record
  around — nothing in this minimal wiring reads closed listings, so there
  was nothing to preserve one for.

**Manual playtest (per this agent's testing requirement — a canvas/WebGL
app can't run headless the way `node:test` runs everything else):** driven
live via `npm run dev` + a real Chrome tab. Screenshot capture and
DOM-based automation tools both time out against this app specifically,
because Phaser's continuous render loop means the page never reaches
`document_idle` — not a bug in this app, but it ruled out the usual
screenshot-based verification. Verified instead via direct JS execution
against the live `window.__game` instance (dev-only hook above), reading
back the actual rendered `Phaser.Text` content: gathered real resources via
`rollQuality()` (tier labels matched the real breakpoints exactly), refined
2x Igneous Ore + 1x Autunite Crystal into a Radiant Alloy Bar (inventory
consumed 2/2 and 1/1 correctly, output tier matched the average of the 5
values exactly), crafted it + Hydrogen Gas into an Ion-Forged Hull Plate —
which happened to roll a durability below the recipe's 60 threshold,
exercising the threshold-penalty branch live (aggregate tier again matched
the hand-checked average exactly) — confirmed `SaveSystem` persistence
survives a real page reload (`localStorage`), and confirmed the
craft-rejection rollback path with an injected low-durability batch: the
craft was rejected and the materials were still there afterward, not
destroyed.

**Phase 2 manual playtest (Agent 10):** re-driven live via `npm run dev` +
a real Chrome tab after the `galaxyState.ts` wiring above. MapScene showed
a real generated planet name (not the old hardcoded Delta Rigelus).
Landing on it and switching to GatherScene showed the planet's tier
("Grey tier") and correctly offered only the one resource eligible for
that planet's generated type (Hydrogen Gas — a Gas-only planet type, per
Agent 8's category filter), not all MVP resources. Gathering rolled
visibly tier-shifted values (Density/Potency/Rarity all landed in the
Grey band) with Hydrogen Gas's null durability still preserved as `N/A`,
confirming `rollQualityOnPlanet()`'s modifier is actually wired into the
live gather action rather than just unit-tested in isolation.

**Phase 3 manual playtest (Agent 13):** re-driven live via `npm run dev` +
a real Chrome tab, dispatching button `pointerdown` events directly
through `window.__game` (screenshotting still doesn't work against this
app's continuous render loop, per the note above). Confirmed the full
sequence in one session:
- Bought 1 unit from the seed Igneous Ore planet listing (20 → 19cr@6
  each): wallet went 500 → 494cr (exactly the listed price), the listing's
  quantity decremented rather than closing (partial purchase), and the
  item appeared in inventory with its real listed qualities (not a
  placeholder).
- Bought 5 more units in a row and watched Trade Map's classification for
  Igneous Ore flip live from "steady" (5.10cr vs. base 5cr) to "buys at a
  premium" (5.63cr vs. base 5cr) — driven purely by real
  `purchaseListing()`/`applyDrift()` calls, matching `1.02^6 * 5 ≈ 5.63`
  by hand.
- Global Market's derived prices matched `getGlobalPrice()`'s formula
  exactly against the one live planet state (e.g. Ion-Forged Hull Plate:
  buy 66.00cr = 60 × 1.1, sell 54.00cr = 60 × 0.9).
- Bought 1 unit then "Buy All"'d the remaining 4 units of the seed Radiant
  Alloy Bar *global* listing: wallet deducted exactly the listed price
  each time, and the listing disappeared from "Active global listings"
  once its quantity reached 0 (closed, not left dangling).
- Listed a unit of Igneous Ore globally as the real player, then attempted
  to buy it back: rejected with the exact self-trade reason
  `purchaseListing()` returns — confirmed live, not just unit-tested.

**Phase 3 manual playtest (Agent 15):** a *fresh* session (`localStorage`
cleared first) to prove the extended loop from a cold start, not
continuing state left over from Agent 13's session above. Landed on a
newly generated planet, gathered real Igneous Ore (rolled Purity 30/Grey,
Density 18/Grey, Potency 60/White, Durability 32/Grey, Rarity 33/Grey),
and listed it on that planet's market — the listing's `marketTier` came
out `Grey`, matching a hand-calculated average of those exact 5 values
((30+18+60+32+33)/5 = 34.6, within Grey's 1-40 band) and confirming the
gathered item's *real* qualities (not a placeholder) drove the listing.
Bought 1 unit from the seed listing in the same fresh session: wallet
500 → 494cr. The refine/craft legs of the chain aren't forced through this
specific live session — this randomly generated planet only produces
Igneous Ore, so Autunite Crystal/Hydrogen Gas simply aren't available to
gather there without a travel system (out of scope through Phase 3), same
constraint any real player would hit. That portion of the chain is instead
proven by `tests/integration/phase3Loop.test.ts`, which chains gather
(via a real generated planet's real `rollQualityOnPlanet()` roll) →
refine → craft → list → purchase against real content with hand-verified
values at every Phase 3-specific step — a stronger check than a live
click-through already luck-dependent on what a given seed's planet
produces.

**Phase 4 manual playtest (Agent 18):** re-driven live via `npm run dev` +
a real Chrome tab, continuing the persisted session above (real materials
gathered/carried over, no reset needed). Confirmed the full sequence:
- Crew pool showed 3 real candidates from `refreshCrewPool()` (Grey/Blue/
  Grey, with hire costs of 50cr/350cr/50cr matching `CREW_HIRE_COST_BY_TIER`
  exactly). Hired the cheapest: wallet 494 → 444cr, capacity 0/2 → 1/2,
  the hired candidate removed from the pool, and the new roster entry's
  wage (5cr) matched `CREW_WAGE_BY_TIER`'s Grey row exactly.
- With insufficient materials, "Assign to Craft" correctly showed a
  rejection rather than silently doing nothing or fabricating a result.
  After adding real Radiant Alloy Bar + Hydrogen Gas to inventory, the
  same action succeeded: the Grey-tier crew member's status flipped to
  `active`, and a real Ion-Forged Hull Plate landed in inventory at
  quality 75 on every dimension — hand-verified against `craft()`'s real
  formula (Grey crafter + Blue schematic: ceiling raise capped at 13%,
  raised ceiling 79.1, durability input at the recipe's 60 threshold with
  10 points to spare so no penalty applies; 75 falls inside the
  resulting valid roll range), confirming this was a genuine `craft()`
  call, not a placeholder.
- "Pay Upkeep" correctly reported not-due (no interval had elapsed yet)
  without touching the wallet — the not-due path isn't a failure, just a
  documented no-op.
- "Purchase Slot" deducted exactly `CREW_CAPACITY_EXPANSION_BASE_COST`
  (200cr) and moved capacity from 1/2 to 1/3.
- "Dismiss" removed the crew member and freed the roster slot (1/3 → 0/3).
- Confirmed via grep: no DOM UI anywhere in `CrewScene.ts`, and no
  random-loss/"risk of losing this crew member" messaging exists in the
  actual rendered text (Section 2.7 has no such mechanic).

**Phase 4 manual playtest (Agent 19):** a *fresh* session (`localStorage`
cleared first), proving the full extended loop from a cold start. Hired 2
crew members from a real generated planet's crew pool (Grey and Green,
costs matching `CREW_HIRE_COST_BY_TIER` exactly). Performed the player's
own craft via `CraftScene` directly (independent of any crew machinery),
then assigned the Green crew member to their own craft while leaving Grey
idle — confirmed in the rendered roster (`Grey — idle`, `Green — active,
working on craft-...`) and in inventory: two separately-computed
Ion-Forged Hull Plate batches (quality 78 and 79) proving the player's
craft and the crew member's craft produced genuinely independent results,
not one shared/serialized outcome. Checking the idle Grey member's
background production correctly reported "not yet decided" (the honest,
documented state of §2.1a at integration time — see the dedicated
hand-verified example in `tests/integration/phase4Loop.test.ts` for what
the mechanism does once a real rate exists). Purchased a capacity slot
and dismissed a crew member, both reflected immediately in the roster/
capacity display. This same session is also where the status-message bug
above was found and fixed — action results are now actually visible to a
player, not silently discarded.

**Phase 5 manual playtest (Agent 22):** a *fresh* session (`localStorage`
cleared first), driven live via `npm run dev` + a real Chrome tab, reading
back rendered `Phaser.Text` content through `window.__game` (same method
every prior playtest in this file used). Materials were seeded directly
into inventory via a direct module import (`import('/src/presentation/
gameState.ts')`, which Vite serves as real ES modules in dev mode) rather
than clicking through Gather/Refine repeatedly — the gather/refine path
itself is already proven live by the Phase 2/3 playtests above; this
session's job was to prove the new Phase 5 wiring specifically. Confirmed
the full sequence:
- Shipyard listed 3 real candidates from `refreshShipyardPool()` (White/
  Blue/Grey, costs of 600cr/2200cr/300cr matching
  `SHIP_PURCHASE_COST_BY_TIER` exactly). Purchased the Grey one: wallet
  500 → 200cr, the candidate removed from the pool, and the new roster
  entry correctly shown "at" `startingPlanet`.
- Ship Assembly showed the purchased ship already carrying 4 Grey
  components (ships purchase pre-assembled, per `refreshShipyardPool()`'s
  own "components generated to match the resulting tier" design). Selected
  Gold crafter tier + Gold schematic tier and crafted-and-installed a
  weapon component from quality-70 (Green) materials: the fresh component
  landed at Blue tier (70 × 1.18 combined ceiling raise ≈ 82.6, inside
  Blue's 76-85 band — hand-verified against `craft()`'s real formula), and
  the ship's own derived tier correctly stayed Grey (`deriveShipTier()`
  averaging 3 Grey + 1 Blue still falls in Grey's range) — proving the
  recompute is genuine, not just copying the new component's tier.
  Installed the remaining 3 components the same way; the ship's derived
  tier then correctly flipped to Blue once all 4 slots matched.
- Trade Map's travel section showed the Blue-tier ship's travel time to
  the second discovered planet as 5.56h, matching a hand calculation
  against the two planets' real generated `{x,y}` positions (distance
  741.27 × `DISTANCE_TO_TRAVEL_HOURS_PER_UNIT` 0.01 × Blue's 0.75 speed
  modifier = 5.5595h) exactly. Initiated the voyage — the destination list
  correctly disappeared while a voyage was in progress.
- **Bug found and fixed live** (see this file's own note above): fast-
  forwarding the voyage's `arrivesAt` into the past to test the arrival
  path revealed the destination list reappearing before the voyage had
  actually been resolved, which would have let a second voyage start from
  a planet the ship hadn't reached yet. Fixed the gating condition, then
  re-verified: the destination list correctly stayed hidden until
  "Resolve Arrival" was clicked, at which point the ship's `currentPlanetId`
  updated to the destination and the return-trip row (same 5.56h,
  symmetric distance) appeared in its place.
- Confirmed via grep: no DOM UI anywhere in the 3 new/modified scenes, and
  no encounter-related messaging exists in the actual rendered text
  (deferred, not implemented).
