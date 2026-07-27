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

**Status: complete.** Render engine: **Phaser** (chosen over PixiJS — see
commit history for rationale: Phaser's built-in Scene classes/screen-flow/
tweens map directly onto the GDD's "map/gather/refine/craft scenes"
language). Bundler: **Vite** (`vite.config.ts` + root `index.html`; `npm run
dev` / `npm run build`).

- `main.ts` — `Phaser.Game` bootstrap, registers the 4 scenes. Also exposes
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
