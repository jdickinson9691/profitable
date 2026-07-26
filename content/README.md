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
