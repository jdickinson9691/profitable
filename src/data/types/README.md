# src/data/types

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

TypeScript interfaces for every data shape referenced in GDD §3: the 5
qualities, resource types, `material`/recipe/schematic shapes, and the tier
tables (color breakpoints, refiner/crafter variance, refund chance, penalty
curve, schematic tier contribution).

No formula logic, gameplay behavior, or rendering — shapes only. Every other
agent imports types from here rather than re-declaring them.

**Status:** `tierColor.ts` (the `TierColor` union), `quality.ts` (the `Quality`
union + `QualityMap`/`QualityRoll`), `resource.ts` (the `Resource` shape),
`resourceInstance.ts` (a rolled, tradeable batch), `refineResult.ts`,
`tierVariance.ts`, `refundChance.ts`, and `random.ts` (the shared injectable
`RandomFn`) are defined. `Recipe`, `Schematic`, `Planet`, the threshold
penalty curve, and the schematic tier table are still outstanding.
