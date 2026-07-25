# Agent 3: Validation/Test Agent

**Creation order:** Third, created alongside Agent 2 and run continuously against it (not a one-time pass at the end).

## Responsibility

Write automated tests proving Agent 2's (Simulation Core) output matches the GDD's tables and formulas exactly — not just "it runs without error," but "it runs correctly" against documented, known values. This agent is the project's source of truth for whether the math is right.

## Inputs

- Agent 2's public functions (`rollQuality`, `getTierColor`, `refine`, `craft`).
- GDD Sections 3.2 and 3.3, and Agent 1's constant tables, as the authoritative expected values.

## Outputs

A test suite covering:

### Quality roll & tier mapping
- `rollQuality` always returns integers in range 1–100 for applicable qualities.
- `rollQuality` returns `null` (never `0`) for non-applicable qualities, for all three MVP resources (confirm Hydrogen Gas → durability is `null`; Autunite Crystal → purity is `null`).
- `getTierColor` boundary tests: 40→Grey, 41→White, 60→White, 61→Green, 75→Green, 76→Blue, 85→Blue, 86→Purple, 91→Purple, 92→Orange, 96→Orange, 97→Gold, 100→Gold.

### Refining formula
- At each of the 7 refiner tiers, confirm the variance applied matches the documented negative/positive percentages exactly (e.g., Gold tier: negative side never exceeds -0.5% of `base_avg`, positive side can extend up to +15%).
- Confirm mixed-resource inputs (e.g., 2 Igneous Ore + 1 Autunite Crystal) combine via straight average weighted by quantity only — not weighted toward best/worst.
- Confirm a `null` quality (e.g., Autunite Crystal's purity) is excluded from the average entirely, and does not silently zero out the result.
- Confirm refund chance is keyed to the *output* tier, not the input tier, and matches the documented percentages per tier (Grey/White 0%, Green 5%, Blue 10%, Purple 15%, Orange 20%, Gold 25% + secondary 2-unit chance).
- Confirm refining never produces a failure state — every valid input set produces a valid output.

### Crafting formula
- Confirm ceiling raise from crafter tier + schematic tier sums additively, and is capped at +18% combined even when both are at Gold (which would otherwise sum to +21%).
- Confirm the threshold penalty curve matches exactly: 0 points under → 1.0x, 1–10 → 0.95x, 11–20 → 0.85x, 21–30 → 0.70x, 31–40 → 0.50x, 41+ → craft rejected outright.
- Confirm schematic forgiveness correctly reduces the *effective* points-below-threshold before the penalty curve is applied (e.g., a Gold schematic's 35% forgiveness turns 20 points under into ~13 effective points under), and confirm it can soften but never fully cancel a penalty.
- Confirm the threshold penalty is applied **after** the ceiling raise and variance roll, not before (order-of-operations test — this is easy to get backwards).
- Confirm a recipe referencing a `null` quality on an input (e.g., a hypothetical durability threshold applied to Hydrogen Gas) is excluded from the calculation, not treated as an automatic failure or a 0.
- Confirm the MVP crafting recipe (Radiant Alloy Bar + Hydrogen Gas → Ion-Forged Hull Plate) runs correctly end-to-end at a representative schematic/crafter tier combination, with output matching a hand-calculated expected value.

## Must NOT Do

- Must not modify Simulation Core (Agent 2) logic. If a test fails, this agent reports the discrepancy — it does not "fix" the formula to make the test pass.
- Must not test rendering, presentation, or content-loading concerns — those belong to Agents 5, 6, and 7.
- Must not rely on purely statistical/approximate assertions where an exact value is knowable (e.g., don't assert "roughly 25% refund chance over 1000 trials" when the tier lookup itself can be tested directly and exactly).

## Definition of Done

- Every table row in GDD Sections 3.2 and 3.3 has at least one corresponding passing test asserting the exact documented value.
- The full suite passes against Agent 2's implementation.
- Any discrepancy between Agent 2's actual behavior and the GDD's documented tables is reported clearly (which table, which row, expected vs. actual) rather than silently patched.
