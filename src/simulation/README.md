# src/simulation

Owned by the **Simulation Core Agent** (GDD §5.2, agent 2).

Pure, framework-agnostic functions implementing the actual game logic:
quality roll generation, the refining formula (§3.2), the crafting formula
(§3.3), null/NA quality handling, and the threshold-penalty/forgiveness
interaction. E.g. `rollQuality()`, `refine(inputs, refinerTier)`,
`craft(inputs, recipe, schematicTier, crafterTier)`.

Rules:
- Imports only from `src/data` (types + constants). No Phaser/PixiJS, no DOM,
  no browser APIs.
- Every function takes typed data in, returns typed data out — no side
  effects.
- Deterministic given a fixed random seed.
- No hardcoded numeric constant that already exists in `src/data/constants`.

**Status:** all four GDD §5.2 Agent 2 functions are implemented:
`getTierColor()` (`tierColor.ts`), `rollQuality()` (`rollQuality.ts`),
`refine()` + `computeBaseAverages()` (`refine.ts`), and `craft()`
(`craft.ts`), plus `tierVariance.ts`/`refundChance.ts`/`schematicTier.ts`/
`penaltyCurve.ts` lookup helpers alongside the data-layer tables they read.
`clamp()` (`clamp.ts`) is the single shared implementation both `refine()`
and `craft()` call, using `src/data/constants/quality.ts`'s
`QUALITY_MIN`/`QUALITY_MAX` rather than each hardcoding `1, 100`.

**Two underspecified GDD points were resolved by explicit user decision**
(not silently guessed) and are documented here so they aren't re-litigated:

- **`refine()`'s output tier:** refined items display each quality's own
  tier individually (GDD §3.1), so there's no single "output tier" to key
  the refund chance table off of. Resolved by applying the GDD's own
  straight-average stub to the 5 final quality values (excluding nulls) and
  tiering that average.
- **`refine()`/`craft()`'s variance roll:** one shared random roll is
  applied proportionally across all 5 quality dimensions per action, not
  five independent per-dimension rolls.
- **`craft()`'s ceiling + variance mechanics:** the combined ceiling raise
  (crafter + schematic, capped at +18%) is a true cap, not just a new
  center point — the roll only ever pulls *down* from the raised ceiling,
  never above it. The downside width is the crafter tier's negative bound
  widened toward zero by the schematic's variance-narrowing value (floored
  at 0, never crossing positive). At Gold crafter + Gold schematic this
  floors to exactly 0 -- deterministically at the (capped) ceiling.
- **`craft()`'s recipe/input matching:** `Recipe.inputs[i]` is matched
  positionally against `inputs[i]` — no category-string matching logic.
- **`craft()`'s multi-threshold combination:** if a recipe has more than
  one thresholded input slot, the single *worst* (largest) points-below-
  threshold across all checked slots governs the penalty. Untested by the
  MVP recipe (which has only one thresholded slot) — revisit if a future
  recipe actually needs multiple simultaneous threshold checks.
