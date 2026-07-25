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

**Status:** `getTierColor()` is implemented (`tierColor.ts`). `rollQuality`,
`refine`, and `craft` are still outstanding.
