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
