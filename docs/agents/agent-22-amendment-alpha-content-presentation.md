# Agent 22 (Amendment): Ships & Travel Presentation — Alpha Content Additions

**Status:** Amendment to the existing Agent 22, not a new agent. Every other scene (Shipyard, Map travel layer) and every prior Agent 22 amendment (Travel Encounters, Scanner, Combat) is unchanged — this file documents the one scene this milestone touched.

**Written retroactively** — see `agent-01-amendment-alpha-content-schema.md`'s status note and `agent-30-alpha-content-confirmation.md` for the full account of why this doc postdates its implementation.

**Creation order:** Independent of the other two alpha-content amendments (1, 16) — depends only on `content/componentRecipes.json` now having 4 links per category instead of 1.

## Responsibility

Extend `ShipAssemblyScene` so every component recipe the alpha content roster authored per category (4, not 1) is actually reachable and craftable through the scene — without changing anything else about ship assembly, crafting, or installation.

## Inputs

- The alpha content roster's `componentRecipes.json` (16 entries, 4 per category) — see `content/README.md`'s Alpha section.
- `ShipAssemblyScene.ts`'s own prior comment on `findRecipeForCategory()`, which explicitly named the assumption this closes: "MVP content only ever has one resource per relevant category" / one recipe per category.

## Outputs

### Changed method

- `findRecipeForCategory(category): Recipe | undefined` (singular, `.find()` — first `componentRecipes` link only) → `findRecipesForCategory(category): Recipe[]` (plural, `.filter()` — every link for that category, mapped to its recipe).

### Changed rendering

- `renderShip()`'s per-category block now lists every recipe returned by `findRecipesForCategory()`, each with its own name label and its own "Craft & Install" button (enabled/disabled independently based on that specific recipe's `hasEnoughInputs()` check) — instead of a single unlabeled button for whichever recipe happened to be first.

### Unchanged

- `resolveSlotResource()` (recipe *input*-category resolution) — untouched. Every alpha-content recipe's input categories are already unique per resource (verified by `tests/content/mvpContent.test.ts`'s dedicated uniqueness test), so the existing first-match `.find()` there continues to resolve correctly; the ambiguity this amendment fixes was specifically in *output*-category (component-category) resolution, not input resolution.
- `onCraftAndInstall()`, `hasEnoughInputs()`, the crafter/schematic tier selectors, and every other scene — all unchanged; `onCraftAndInstall()` already took an explicit `recipe` parameter, so no signature change was needed to support multiple recipes per category.

## Must NOT Do

- Must not change `assembleShip()`, `craft()`, or any simulation-core function — this is presentation-only, listing existing craftable options rather than adding new mechanics.
- Must not change how many components a ship can hold per category (still exactly one installed component per `ComponentCategory`, unchanged) — this amendment adds recipe *choice*, not a new slot type.
- Must not touch the Shipyard or Map travel-layer scenes, or any prior Agent 22 amendment's code (Travel Encounters' arrival display, Scanner's docked action, Combat's attack/flee prompt).

## Testing Requirements

- No dedicated test file exists for `ShipAssemblyScene.ts` (a Phaser scene, consistent with the rest of Agent 22's output — presentation scenes in this project are verified via typecheck + manual/integration exercise, not unit tests, per the existing pattern for `MapScene`/`ShipyardScene`/etc.).
- `npm run typecheck` must pass with no errors — confirmed during the retroactive validation pass.
- `tests/integration/phase5Loop.test.ts`'s full extended-loop test (craft one component per category → purchase a ship → assemble → derived tier → travel time → voyage) must still pass unmodified against the real, expanded `componentRecipes.json` — it iterates `shipsContent.componentRecipes` generically rather than assuming exactly 4 entries, so it required no edit and still passes with 16.

## Definition of Done

- Every one of the 16 component recipes in `content/componentRecipes.json` is listed and craftable through `ShipAssemblyScene`, not just the first per category.
- `npm run typecheck` and the full `npm test` suite (523/523) pass — confirmed via the retroactive validation pass.
- A diff against the pre-amendment Agent 22 output shows only `ShipAssemblyScene.ts`'s category-to-recipe resolution and rendering changed — no other scene touched.
