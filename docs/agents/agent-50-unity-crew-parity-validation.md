# Agent 50: Unity Crew Parity Validation Agent

**Creation order:** Third in Migration Phase 2, Sub-Phase C. Created alongside Agent 49 and runs continuously against it.

## Responsibility

Prove Agent 49's C# port produces numerically identical output to the current TypeScript implementation for the same inputs, across every Sub-Phase C function.

## Inputs

- `docs/agents/agent-45-unity-trading-parity-validation.md` — the harness/comparison pattern extended, not re-invented.
- The real content catalog, reused for the two craft-touching functions (`AssignToCraft`/`ResolveBackgroundCrafting`, both call `Crafter.Craft` against a real recipe/resources) — `radiant-alloy-bar`/`hydrogen-gas`/`ion-forged-hull-plate`, the same MVP fixture set every prior craft-related parity case already uses.
- Agent 49's own output.

## Outputs

### 1. Extended `scripts/parityHarness.ts`

Eight new corpus sections:

- `hireCrewCases` (4) — successful hire, rejected-not-in-pool, rejected-at-capacity, rejected-insufficient-funds.
- `dismissCrewCases` (2) — owner dismisses, non-owner rejected.
- `payUpkeepCases` (3) — not-due, paid, insufficient-funds.
- `checkAttritionCases` (3) — within grace period, exactly at the grace-period boundary (not departed — the comparison is strictly `>`), past the grace period.
- `purchaseCapacityCases` (3) — slot 0 and slot 2 (proving the doubling curve, not just one point on it), insufficient funds.
- `refreshCrewPoolCases` (3) — three seeds, full pool output.
- `assignToCraftCases` (2) — real recipe/resource-instance craft actions with recorded random sequences, at two different crew tiers/schematic tiers.
- `resolveBackgroundCraftingCases` (4) — omitted `backgroundRate` (proving the live-config-read default), explicit `null` (unavailable), `maxUnits` capping below the elapsed-time-derived count, and zero elapsed time.

### 2. Extended `ProfitableCore.Tests/Parity/ParityCorpus.cs`

New DTOs for every section (`SerializedCrewMember`, `SerializedCrewCandidate`, `SerializedCrewCapacity`, `SerializedPlanetCrewPool`, and each function's own case/result shape).

### 3. `ProfitableCore.Tests/Parity/CrewParityTests.cs`

Eight `[Theory]`/`[MemberData]` test methods, one per corpus section.

## Must NOT Do

- Must not accept Agent 49's own unit tests passing as a substitute for this comparison.
- Must not record a case for `HireCrew`'s tier-cost/wage-lookup `RangeError` throw path — unreachable with real content (`CrewConfig`'s tables always cover all 7 tiers), same reasoning prior parity agents used to exclude structurally-unreachable error paths from the corpus.
- Must not hand-verify `resolveBackgroundCraftingCases`' "omitted `backgroundRate`" case against a guessed unit count — the expected value comes directly from running the real TypeScript function with the argument genuinely omitted, then the C# side's own four-parameter overload (which reads `CrewConfig.BackgroundIdleOutputRate` fresh) is what's asserted against it, proving the live-default translation is actually equivalent, not just plausible.

## Testing Requirements

- All 24 new corpus cases pass, and regenerating the corpus (`npm run parity`) and re-running `dotnet test` reproduces the same result.
- Every Sub-Phase C Simulation Core function has at least one real-content parity case exercising it.

## Definition of Done

- `dotnet test` passes with zero failures across all 624 tests (591 through Sub-Phase B + 24 parity + 9 direct unit tests).
- A reviewer can regenerate the corpus and re-run to reproduce the same result independently.
- No later Sub-Phase C agent (Presentation/Integration) should discover a numeric disagreement between the C# and TypeScript implementations this agent's corpus should have already caught.
