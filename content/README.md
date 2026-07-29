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

**Alpha (Content Authoring, docs/profitable-alpha-content-roster.md):**
turns the verified proof-of-concept content set into an actually-playable
roster. Every file grew substantially; the 4 old generic Phase-5 component
placeholders (`weapon-component`/`engine-component`/`shield-component`/
`cargo-hold-component`, and their one recipe/componentRecipes entry each)
are **retired**, replaced by 16 named component recipes (4 per category)
so ships can actually differ by build choice.

- `resources.json`: **60 entries** (was 9) — 21 raw (9 solid/6 gas/6
  crystal, gas lacking `durability` and crystal lacking `purity` per the
  existing MVP precedent), 10 refined (1 kept + 9 new, each refined
  output's `category` set to its own id so category-based recipe-input
  resolution — see below — never collides with another resource), 13
  general crafted (1 kept `ion-forged-hull-plate` + 12 new), 16 ship
  components (all new, `category` = the exact `ComponentCategory` string,
  same as Phase 5). `itemTier` follows the existing pipeline-depth rule
  (raw=1, refined=2, first-order-crafted=3); 7 component recipes that
  consume another *crafted* item (Ion Beam Array, Fusion Engine, Quantum
  Thruster, Aegis Field Generator, Reinforced Hold, Expanded Freight Bay,
  Vault-Class Container) are `itemTier: 4`.
- `refiningRecipes.json`: **10 entries** (was 1) — 1 kept + 9 new, each
  n:1 (or n:1-from-multiple-resources) purely from raw inputs.
- `recipes.json`: **29 entries** (was 5) — `ion-forged-hull-plate` stays
  first (preserving `CraftScene`/`CrewScene`'s `content.recipes[0]`
  assumption); 12 new general crafting recipes + 16 new component
  recipes (4 per category), replacing the old 4 generic ones. **Every
  non-raw input `category` is unique to exactly one resource** (verified
  by `tests/content/mvpContent.test.ts`'s dedicated test) — necessary
  because `CraftScene`/`CrewScene`/`ShipAssemblyScene` all resolve a
  recipe slot's category via `resources.find((r) => r.category ===
  category)`, a first-match lookup that would silently pick the wrong
  resource if two ever shared a category.
- `componentRecipes.json`: **16 entries** (was 4) — 4 per category, no
  longer "exactly one recipe per category." `ShipAssemblyScene` (see
  `src/presentation/scenes/ShipAssemblyScene.ts`) was extended alongside
  this — `findRecipeForCategory()` (singular, `.find()`) became
  `findRecipesForCategory()` (plural, `.filter()`), and the scene now
  lists every craftable recipe per component slot instead of only ever
  reaching the first one.
- `schematics.json`: **24 entries** (was 1) — **5 recipes are known by
  default** (no schematic needed): Iron Hull Plate (the one general
  starter craft) plus the first tier in each component category (Pulse
  Cannon, Chemical Thruster, Basic Deflector, Standard Cargo Bay), so a
  new player can craft something immediately. This corrects the content
  roster doc's own first draft, which inconsistently said 12 recipes were
  known by default in one place while `docs/product-alpha.md`'s tracked
  checklist said 5 elsewhere — the checklist is authoritative. The
  remaining 24 recipes each get one schematic, tiers skewed toward
  Grey/White/Green (pre-tuning placeholder values, same latitude Agent 14
  used for base prices).
- `tradingBasePrices.json`: **60 entries** (was 9) — every resource
  priced above its own recipe's combined input cost, verified generically
  by two new tests in `tests/content/tradingContent.test.ts` (one per
  refining recipe, one per crafting recipe) rather than by hand for a
  couple of hardcoded ids.
- `planetMarketPreferences.json`: each Planet Type's `sellsCheap` list
  expanded to a representative sample of the raw resources it's actually
  eligible to produce (`PLANET_TYPE_ELIGIBILITY`); `buysAtPremium`
  expanded to a sample of refined/crafted goods no planet type produces
  directly, plus raw categories that type can't reach.
- `src/data/constants/crewConfig.ts` gained `TIER_6_7_PROFESSIONS`
  (Weaponsmith, Engineer, Shield Technician, Cargo Specialist, Artisan),
  closing the profession taxonomy `profession.ts`/`refreshCrewPool.ts`
  had left as an explicit placeholder (`"unspecified-profession-N"`).
  `refreshCrewPool.ts`'s `rollProfession()` now rolls a real profession
  for tier 6-7 candidates instead.
- Ship build presets (Starter Runner, Hauler, Scout, Skirmisher) are
  documented in `docs/profitable-alpha-content-roster.md` §7 only, per
  the roster's own "not a new data structure" recommendation — no code
  change, since alpha's onboarding UI (which would surface these) is a
  separate, not-yet-built milestone (alpha Section 4).

Validated by the expanded assertions in `tests/content/mvpContent.test.ts`
and `tests/content/tradingContent.test.ts` (every id referenced across
*every* recipe/schematic/refining-recipe now resolves, not just index
0 as before — a real gap in the MVP-era tests that this pass also
closed) and `tests/content/shipsContent.test.ts`'s updated component
tests (every category has at least one recipe, no duplicate recipe
links, still craftable end-to-end via the real `craft()`).
