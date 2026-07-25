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
formula table), `craftResult.ts`, `penaltyCurve.ts`, and `schematicTier.ts`.
Only `Planet` (GDD §3.4, needed once Content/Presentation start) remains
outstanding.
