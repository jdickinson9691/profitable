# Functional Agent: Recipes & Schematics

**Status: existing system, documented as-built.** Consolidates the content-authoring role played by Agent 6 (MVP), Agent 14 (Phase 3), Agent 23 (Phase 5 components), and the Alpha content pass, plus `schematicTier.ts`'s resolution logic (Agent 2/16-adjacent).

## Responsibility

Define what a recipe needs and produces — **two structurally distinct shapes**, category-matched `Recipe` (general and ship-component) and resourceId-matched `RefiningRecipe` — and resolve a `Recipe`'s schematic-tier bonus. This is the shared data spine `refining.md`, `crafting.md`, and `ship.md`'s Assembly-related content all read from — it owns no gameplay formula itself beyond schematic-tier resolution.

## Inputs

- `Quality`/`TierColor` types — schematics and recipe threshold checks are expressed in these, never a parallel vocabulary.
- `ComponentCategory` (`ship.md`) — `ComponentRecipe`'s link target.

## Outputs

### `Recipe` / `RecipeInput` — `src/data/types/recipe.ts`
`RecipeInput`: `{ category: string; quantity: number; thresholdQuality?: Quality; thresholdValue?: number }` (threshold fields both present or both absent). `Recipe`: `{ id, name, inputs: RecipeInput[], outputResourceId, outputQuantity }`. Inputs are matched by **category**, not a specific resource id — content's own convention (`content/README.md`) keeps every non-raw input's category unique to exactly one resource, so category-based resolution never collides. `craft()`'s (`crafting.md`) `inputs` array is matched **positionally** against `Recipe.inputs`. **Backs `recipes.json` only** (both general and component recipes) — see `RefiningRecipe` below for the structurally different shape `refiningRecipes.json` uses.

### `RefiningRecipe` / `RefiningRecipeInput` — `src/data/types/refiningRecipe.ts`
**A genuinely separate type from `Recipe`, not a specialization of it — found missing from this file on review, despite backing an entire content file (`refiningRecipes.json`) this section is supposed to be the spine for.** `RefiningRecipeInput`: `{ resourceId: string; quantity: number }` — no `category`, no threshold fields at all. `RefiningRecipe`: `{ id, name, inputs: RefiningRecipeInput[], outputResourceId, outputQuantity }`. **Matched directly by `resourceId`, never by category** — deliberately simpler than `Recipe`, because refining always combines specific named raw ores (e.g. "2 Igneous Ore + 1 Autunite Crystal"), never a slot multiple different resources could satisfy, so category-based resolution's whole reason to exist (disambiguating which resource fills a slot) doesn't apply here. Content-authored purely for presentation/matching purposes — `refine()` itself (`refining.md`) takes no recipe parameter at all, only a pre-resolved `ResourceInstance[]`; recipe selection is entirely `RefineScene`'s job. **Never participates in schematic-tier resolution** — `resolveSchematicTier()` is never called anywhere in `refining.md`'s own formula (refiner tier is already a free UI pick, no bonus-tier layer on top), and confirmed empirically this review: zero `schematics.json` entries reference a `refiningRecipes.json` id.

### `Schematic` — `src/data/types/schematicEntity.ts`
`{ id, name, recipeId, tier: TierColor }`. A **fixed content-table entry**, not a player-owned item — `content.schematics.find(s => s.recipeId === recipe.id)` is a direct lookup against the loaded catalog. A recipe with no matching entry is a "known-by-default" recipe (`docs/profitable-alpha-content-roster.md` §5), not an error state.

### `resolveSchematicTier(schematic)` — `src/simulation/schematicTier.ts`
`(schematic: Schematic | undefined | null) => TierColor`. Returns `schematic?.tier ?? "Grey"` — a missing schematic resolves to Grey, which is mechanically identical to an owned Grey-tier schematic (`SCHEMATIC_TIER_CONTRIBUTION`'s Grey row is already "+0% ceiling raise, -0% variance narrowing, 0% penalty forgiveness"), so this is not a separate bonus-free code path. **There is no schematic-ownership mechanic anywhere in this codebase** — every recipe with a `Schematic` entry gets that bonus for every player, always. Confirmed while auditing the alpha playtest doc's A2 scenario this session.

### `ComponentRecipe` — `src/data/types/componentRecipe.ts`
`{ recipeId: string; category: ComponentCategory }`. A small link table (`content/componentRecipes.json`) closing the gap `Recipe.outputResourceId` can't (a `ShipComponent` isn't a `Resource`) — maps a component recipe's id to which of the 4 `ComponentCategory` slots its `craft()` output becomes. Read by `ship.md`'s Assembly path; never duplicated elsewhere.

### Content files (`content/`)
`recipes.json` (28 `Recipe` entries, category-matched: 13 general — `CraftScene`'s domain — + 16 component, 4 per category), `refiningRecipes.json` (10 `RefiningRecipe` entries, resourceId-matched, `refining.md`'s domain — its own distinct schema, not `Recipe`'s), `schematics.json` (24 entries, one per `recipes.json` entry that has a bonus tier — `refiningRecipes.json` ids never appear here), `componentRecipes.json` (16 entries, the link table above, `Recipe` ids only). All Ajv-validated via `loadContent()`/`loadShipsContent()` against `src/data/schemas/` — `recipe.schema.json` and `refiningRecipe.schema.json` are separate schemas, not one shared shape.

## Must NOT Do

- Must not write any TypeScript/JavaScript simulation logic beyond `resolveSchematicTier()`'s one-line resolution — content authoring populates JSON, it doesn't implement formulas (the exact rule Alpha Content Authoring's retroactive amendment, `docs/agents/agent-30-alpha-content-confirmation.md`, exists to enforce after it slipped once).
- Must not introduce a schematic-ownership/ownership-tracking concept — confirmed design (schematic tier is a fixed lookup, not player state); any future "acquire a schematic" mechanic is new scope requiring its own design-questions entry first, not something to add here quietly.
- Must not make any non-raw `Recipe` input's `category` ambiguous (matching more than one resource) — the existing uniqueness invariant, tested (`tests/content/mvpContent.test.ts`). **Applies to `Recipe`/`RecipeInput` only** — `RefiningRecipeInput` matches by `resourceId` directly, so category ambiguity structurally cannot occur there.
- Must not let `ComponentRecipe` duplicate or diverge from what `Recipe`/`Schematic` already express for the same recipe id — it only adds the category link, nothing else.
- **Must not add `category` or threshold fields to `RefiningRecipeInput`, or a `resourceId` field to `RecipeInput`** — found worth stating explicitly on review: the two types look similar enough (both `{ id, name, inputs, outputResourceId, outputQuantity }` at the outer level) that merging their input shapes would look like a harmless cleanup, but it would either force category-resolution complexity onto refining (which doesn't need it) or lose crafting's ability to accept any resource satisfying a category (which it depends on).
- **Must not add a `schematics.json` entry keyed to a `refiningRecipes.json` id** — refining has no bonus-tier/schematic mechanic; `resolveSchematicTier()` is never called from `refining.md`'s formula. Such an entry would be dead content with no code path to consume it.

## Testing Requirements

- Every `content/recipes.json`/`refiningRecipes.json`/`schematics.json`/`componentRecipes.json` entry validates against its own schema with zero errors — `recipes.json` against `recipe.schema.json`, `refiningRecipes.json` against the separate `refiningRecipe.schema.json`.
- Every `ComponentRecipe.recipeId` references a real `Recipe`; every category has exactly 4 linked recipes, no more, no fewer.
- `resolveSchematicTier()`: returns the schematic's own tier when one exists for a recipe; returns `"Grey"` when none does; a `null`/`undefined` schematic input is handled identically to "not found".
- **Every `schematics.json` entry's `recipeId` references a real `recipes.json` id, never a `refiningRecipes.json` id** — found worth a real assertion on review, not just a one-time manual check (confirmed zero overlap this pass, but nothing currently guards against a future content edit reintroducing one).
- Regression: no test anywhere asserts or depends on schematic *ownership* — a passing suite here should not accidentally validate a mechanic that doesn't exist.

## Definition of Done

- Every recipe (general or component) resolves to a real, schema-valid input/output shape with no dangling category or resource-id reference.
- `resolveSchematicTier()` is provably a pure content lookup — zero player-state reads anywhere in `schematicTier.ts`.
- `crafting.md`'s `craft()` and `ship.md`'s Assembly path both consume this file's `Recipe`/`Schematic` outputs without ever reimplementing recipe matching or schematic resolution themselves; `refining.md`'s `RefineScene` consumes `RefiningRecipe` the same way, without ever reimplementing resourceId matching.
- `Recipe` and `RefiningRecipe` remain provably distinct types with no shared fields beyond the outer `{ id, name, outputResourceId, outputQuantity }` shape — neither gains the other's matching mechanism (category vs. resourceId) or capabilities (thresholds, schematic bonuses).
