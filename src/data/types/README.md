# src/data/types

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

TypeScript interfaces for every data shape referenced in GDD §3: the 5
qualities, resource types, `material`/recipe/schematic shapes, and the tier
tables (color breakpoints, refiner/crafter variance, refund chance, penalty
curve, schematic tier contribution).

No formula logic, gameplay behavior, or rendering — shapes only. Every other
agent imports types from here rather than re-declaring them.

**Status:** `tierColor.ts` (the `TierColor` union), `quality.ts` (the `Quality`
union + `QualityMap`/`QualityRoll`), and `resource.ts` (the `Resource` shape)
are defined. `Recipe`, `Schematic`, `Planet`, and the remaining GDD §3 tables
are still outstanding.
