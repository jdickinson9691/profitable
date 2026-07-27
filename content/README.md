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
