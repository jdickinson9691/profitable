# content

Owned by the **Content Agent** (GDD §5.2, agent 6).

JSON config data — not code — defining the actual MVP content (GDD §3.4):
2–3 resource type definitions, one refining recipe, one crafting recipe +
schematic. Must validate against the schemas in `src/data/schemas`, and must
be rich enough to exercise every branch of the formulas (e.g. at least one
resource with a null/NA quality, at least one craft input that can fall
below the recipe's threshold).

This directory is data-only. The Content Agent should not need to touch any
TypeScript file.

**Status: complete.** Five JSON files, one per `src/data/schemas` shape
that `loadContent()` (`src/simulation/loadContent.ts`) expects:

- `resources.json` — the 3 raw MVP resources (Igneous Ore, Hydrogen Gas,
  Autunite Crystal, per GDD §3.4) **plus** `radiant-alloy-bar` and
  `ion-forged-hull-plate` — the refining/crafting outputs. These two aren't
  part of the contract's literal "3 resource type definitions," but every
  `Recipe`/`RefiningRecipe`'s `outputResourceId` needs a real `Resource`
  entry to resolve to (applicable-qualities profile, used to build a
  `ResourceInstance` once that item exists), so leaving them out would
  create dangling references. Documented here rather than silently added.
- `planets.json` — Delta Rigelus, referencing the 3 raw resource ids.
- `refiningRecipes.json` — 2x Igneous Ore + 1x Autunite Crystal → 1x
  Radiant Alloy Bar.
- `recipes.json` — 1x Radiant Alloy Bar (durability 60+) + 1x Hydrogen Gas
  → 1x Ion-Forged Hull Plate.
- `schematics.json` — one schematic for that recipe, at Blue tier
  (deliberately not Grey/Gold, so ceiling-raise and forgiveness are both
  non-trivial).

Validated end-to-end (not just schema-shape) by
`tests/content/mvpContent.test.ts`: loads through the real `loadContent()`,
confirms the null-quality branches are actually exercised (Autunite
Crystal/purity, Hydrogen Gas/durability), confirms the crafting threshold
is a real, violable value (strictly between 1 and 100), and confirms every
cross-referenced id (planet → resources, recipes → resources, schematic →
recipe) resolves to a real entry.

**Phase 3 (Agent 14 — Trading Content):**

- `resources.json` gained `itemTier` (1-7) on all 5 existing entries —
  necessary completion, not a new item: `Resource.itemTier` (added in the
  Phase 3 schema amendment) was left unset on every real resource, which
  would make the tier 6-7 global-listing restriction untestable against
  real content (missing `itemTier` is treated as unrestricted). Tier
  reflects pipeline depth, not the schematic's own quality `TierColor` (a
  different concept): raw = 1 (Igneous Ore, Hydrogen Gas, Autunite
  Crystal), refined = 2 (Radiant Alloy Bar), first-order crafted = 3
  (Ion-Forged Hull Plate, since MVP's one recipe is single-stage — nothing
  crafts from another crafted item, which is what would push a tier past 3
  toward 7).
- `tradingBasePrices.json` (new) — one Credits base price per existing
  item, internally consistent per the contract's own note: each output
  tier's price exceeds its raw-input cost combined (Radiant Alloy Bar's 35
  > 2×5 + 12 = 22 in raw inputs; Ion-Forged Hull Plate's 60 > 35 + 4 = 39).
- `planetMarketPreferences.json` (new) — keyed by **Planet Type**, not by
  specific planet id; see `src/data/types/planetMarketPreference.ts` for
  why (Phase 2's galaxy is procedurally generated per save, so no fixed
  set of "real" planet ids exists for static content to reference ahead of
  time). Loosely follows each Planet Type's resource eligibility
  (`PLANET_TYPE_ELIGIBILITY`): a Terrestrial planet sells its solid/crystal
  produce cheap and pays a premium for the gas and crafted goods it can't
  make itself; a Gas Giant (Gas-only) is the inverse.

Both new files validate against `itemBasePrice.schema.json`/
`planetMarketPreference.schema.json` via `loadTradingContent()`
(`src/trading/loadTradingContent.ts`) — see
`tests/content/tradingContent.test.ts`.

**Phase 5 (Agent 23 — Ships & Travel Content):**

- `resources.json` gained 4 new entries — `weapon-component`,
  `engine-component`, `shield-component`, `cargo-hold-component` — the
  crafting outputs for the 4 ship component categories. Necessary,
  same reasoning as the MVP's own `radiant-alloy-bar`/
  `ion-forged-hull-plate` additions: `Recipe.outputResourceId` needs a
  real `Resource` entry to resolve to (`ShipComponent` itself isn't a
  `Resource` — see `componentRecipe.ts`'s own comment on that gap). Each
  entry's `category` field is set to its exact `ComponentCategory` string
  (`"weapon"`, `"engine"`, `"shield"`, `"cargoHold"`) rather than
  something more descriptive, so a category-based lookup (the same
  pattern `CraftScene`/`CrewScene` already use to resolve a recipe slot to
  a resource) works without any special-casing. All four are `itemTier: 3`
  (first-order crafted, same reasoning as `ion-forged-hull-plate`).
- `recipes.json` gained one recipe per component category — each takes
  1x Radiant Alloy Bar (with a threshold on `potency` for weapon/engine,
  `durability` for shield/cargo hold) plus one existing raw MVP resource
  as a category-flavored second input (Autunite Crystal for weapon/
  shield, Hydrogen Gas for engine, Igneous Ore for cargo hold) — reusing
  the existing 4-resource roster entirely, no new raw resources invented,
  per the contract's own instruction. `ion-forged-hull-plate` stays first
  in the array, preserving `CraftScene`/`CrewScene`'s existing
  `content.recipes[0]` assumption.
- `componentRecipes.json` (new) — the `recipeId` → `ComponentCategory`
  link data for the necessary-completion `ComponentRecipe` type (see
  `src/data/types/componentRecipe.ts`). Validated via `loadShipsContent()`
  (`src/ships/loadShipsContent.ts`, mirroring `loadTradingContent()`'s
  exact shape) — a necessary completion of its own, since Agent 22's
  contract forbids reading Agent 23's raw content directly and nothing in
  Agent 20's contract named a loading path for it.
- `tradingBasePrices.json` gained a base price for all 4 new component
  resources (Phase 5 GDD §2.2: "components... flow into the existing
  trading market automatically"), each priced above its own recipe's raw
  input cost combined, same internal-consistency rule already applied to
  `radiant-alloy-bar`/`ion-forged-hull-plate`.

Validated by `tests/content/shipsContent.test.ts`: the real
`componentRecipes.json` loads with no errors, every category has exactly
one recipe link (no more, no fewer), every link references a real recipe
and a real output resource (no dangling references), and — the
contract's own explicit Definition of Done — every component recipe is
actually craftable end-to-end via the real `craft()` using only existing
resources.
