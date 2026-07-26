# src/data/types

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

TypeScript interfaces for every data shape referenced in GDD §3: the 5
qualities, resource types, `material`/recipe/schematic shapes, and the tier
tables (color breakpoints, refiner/crafter variance, refund chance, penalty
curve, schematic tier contribution).

No formula logic, gameplay behavior, or rendering — shapes only. Every other
agent imports types from here rather than re-declaring them.

**Status:** all GDD §3 data shapes and tables are now defined: `tierColor.ts`,
`quality.ts`, `resource.ts`, `resourceInstance.ts`, `refineResult.ts`,
`tierVariance.ts`, `refundChance.ts`, `random.ts`, `recipe.ts`,
`schematicEntity.ts` (the `Schematic` item, distinct from `schematicTier.ts`'s
formula table), `craftResult.ts`, `penaltyCurve.ts`, `schematicTier.ts`, and
`planet.ts` (minimal per GDD §3.4 — id/name/producible resource ids only, no
modifiers/seasons/tier).

Also `refiningRecipe.ts` — **not** one of Agent 1's originally-listed 6
types, added because Agent 6's contract requires a "refining recipe config"
and nothing else covers that shape (`refine()` itself takes no recipe
parameter at all — it just averages whatever `ResourceInstance[]` it's
given; this type exists purely for content/presentation purposes: which
specific resources combine, in what quantities, into what output).
