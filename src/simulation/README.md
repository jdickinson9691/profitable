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

**Status:** `getTierColor()` (`tierColor.ts`), `rollQuality()`
(`rollQuality.ts`), and `refine()` + `computeBaseAverages()` (`refine.ts`,
with `tierVariance.ts`/`refundChance.ts` lookup helpers alongside) are
implemented. `craft` is still outstanding.

**Note on `refine()`'s output tier:** refined items display each quality's
own tier individually (GDD §3.1), so there's no single "output tier" to key
the refund chance table off of. `refine()` resolves this by applying the
GDD's own straight-average stub to the 5 final quality values (excluding
nulls) and tiering that average — a deliberate, documented interpretation
of an underspecified point in the GDD, not an incidental implementation
detail. Revisit if the GDD is ever amended to define this explicitly.
