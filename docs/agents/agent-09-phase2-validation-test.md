# Agent 9: Phase 2 Validation/Test Agent

**Creation order:** Third in Phase 2, created alongside Agent 8 and run continuously against it — same relationship Agent 3 had with Agent 2 during the MVP, not a one-time pass at the end.

## Responsibility

Prove Agent 8's galaxy/planet generation output matches Phase 2 GDD Section 2's tables and rules exactly, and prove Section 2.6's planet-agnostic boundary held — that Agent 2's `refine()` and `craft()` were not modified in the process.

## Inputs

- Agent 8's public functions (`generateGalaxy`, `generatePlanet`).
- Agent 2's original MVP test suite (owned by Agent 3) as the regression baseline.
- Phase 2 GDD Section 2, and Agent 1's Phase 2 constant tables, as the authoritative expected values.

## Outputs

A test suite covering:

### Seeded reproducibility
- The same seed produces an identical galaxy (same planets, same tiers, same types, same subsets, same specialties) across multiple separate calls to `generateGalaxy()`.

### Planet tier
- Tier roll correctly maps through the shared breakpoint table — same boundary tests as the MVP's `getTierColor` tests (40→Grey, 41→White, etc.), confirming Agent 8 is calling the existing function rather than reimplementing tier logic.

### Quality modifier table
- Each of the 7 tier modifiers (Grey -15 through Gold +30) is applied exactly.
- Confirm **Green is genuinely neutral (+0)** — not treated as a baseline the way Grey is in the refiner/crafter/schematic tables. This is a common mistake to test for explicitly, since it inverts the usual pattern.

### Planet Type eligibility (hard filter, not a bias)
- A Gas Giant planet's `producibleResourceIds` never includes a solid-only resource.
- A Terrestrial planet's list never includes a gas-only resource.
- Confirm this holds across many generated planets, not just a single hand-picked example.

### Resource subset count
- For a known eligible-resource-count, confirm the percentage table (20% through 100%) produces the exact expected count at each tier.
- Confirm the `max(1, ...)` floor holds at Grey tier even with a small eligible pool (e.g., 1-2 eligible resources) — this is the case most likely to accidentally produce zero.

### Specialty reserved-slot rule
- White-tier-and-above planets always have exactly one non-null `specialtyResourceId`.
- Grey-tier planets always have `specialtyResourceId: null`.
- The specialty resource always appears within `producibleResourceIds` — never crowded out by the subset-selection step (this is the specific bug the reserved-slot rule was designed to prevent; test it directly, not just the rule's individual pieces).
- The specialty's +15 modifier is **additive on top of** the planet tier modifier, not a replacement for it (e.g., a Gold-tier planet's specialty resource gets +30 +15 = +45 total, not just +15).

### Regression check — the most important test in this suite
- Run Agent 2's `refine()` and `craft()` against the exact same test cases Agent 3 used for the original MVP suite, and confirm **byte-for-byte identical output**. Any deviation, however small, means Section 2.6's planet-agnostic boundary was violated somewhere and must be reported immediately — not patched.

## Must NOT Do

- Must not modify Agent 8's logic, or Agent 2's `refine()`/`craft()`. Report discrepancies; do not "fix" the formula to make a test pass.
- Must not test rendering, presentation, or integration concerns — those belong to Agent 10.
- Must not rely on purely statistical assertions where an exact value is knowable, same rule as the original Agent 3 (e.g., don't assert "roughly 50% Green-tier planets over 1000 generations" when the tier lookup itself can be tested directly and exactly).

## Definition of Done

- Every rule in Phase 2 GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The regression check against the original MVP formulas passes with zero deviation.
- Any discrepancy between Agent 8's actual behavior and Section 2's documented rules is reported clearly (which rule, expected vs. actual) rather than silently patched.
