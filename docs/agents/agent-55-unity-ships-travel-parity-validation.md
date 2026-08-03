# Agent 55: Unity Ships & Travel Parity Validation Agent

**Creation order:** Third in Migration Phase 2, Sub-Phase D. Created alongside Agent 54 and runs continuously against it.

## Responsibility

Prove Agent 54's C# port produces numerically identical output to the current TypeScript implementation for the same inputs, across all 21 ported functions.

## Inputs

- `docs/agents/agent-50-unity-crew-parity-validation.md` — the harness/comparison pattern extended, not re-invented.
- A real generated galaxy (`generateGalaxy(5, realResources, "ships-parity-galaxy-seed")`) — two of its real planets (with real positions) back every distance/travel-time/fuel-cost/voyage/arrival/scan/encounter case, so real coordinate data is exercised, not synthetic `{x:0,y:0}`-style stand-ins throughout.
- Agent 54's own output.

## Outputs

### 1. Extended `scripts/parityHarness.ts`

21 new corpus sections (one per ported function), real-galaxy-planet-backed where position data matters: `calculateDistanceCases`, `calculateTravelTimeCases`, `calculateFuelCostCases`, `deriveFuelCapacityCases` (all 7 tiers), `deriveShipTierCases`, `tierMidpointCases` (all 7 tiers), `assembleShipCases`, `initiateVoyageCases` (normal + retreat-skips-checks), `resolveArrivalCases` (not-yet-due + resolved-with-encounters), `purchaseShipCases`, `purchaseScannerCases`, `refreshShipyardPoolCases`, `refreshScannerPoolCases`, `refuelShipCases` (including the Citadel-discount case), `getCrewSlotsForShipCases` (all 7 tiers), `assignToShipRoleCases`, `unassignFromShipRoleCases`, `resolveComponentRepairCases` (Systems Engineer + Crafter-while-traveling), `performScanCases`, `initiateCombatCases`, `resolveEncountersCases` (normal + retreat-never-rolls), `resolveCombatChoiceCases` (flee/win/lose-with-mitigation).

### 2. Extended `ProfitableCore.Tests/Parity/ParityCorpus.cs`

New DTOs for every section. Two corrections made **after** an initial pass produced test failures, not found by inspection:
- `SerializedPlanet` was missing `OwnedByPlayerId`/`CitadelLevel` (needed by `RefuelShip`/`ResolveComponentRepair`'s docked-planet cases) — added.
- `ResolveCombatChoiceCase` was missing `originPlanet`/`currentPlanet` entirely — the harness computed real positioned planets internally (needed by the flee/lose branches' own `InitiateVoyage` call for the retreat voyage) but never serialized them, so the C# test had nothing to reconstruct real input planets from and was fabricating position-less stand-ins, throwing `CalculateTravelTime`'s own "must have a generated position" precondition. Fixed by serializing `{id, position}` for both and reconstructing them in the C# test instead of guessing.

### 3. `ProfitableCore.Tests/Parity/ShipsTravelParityTests.cs`

21 `[Theory]`/`[MemberData]` test methods, one per corpus section.

## Must NOT Do

- Must not accept Agent 54's own unit tests passing as a substitute for this comparison.
- Must not serialize only an id/summary for an object the C# side needs to reconstruct and re-run the real function against — both corrections in Outputs Section 2 are exactly this mistake, caught by a real test failure rather than left in.
- Must not use synthetic `{x: 0, y: 0}`-style coordinates for every case when a real generated galaxy's actual planet positions are available and already used elsewhere in this migration's parity suite (Agent 40's own `galaxyCases`).

## Testing Requirements

- All ~65 new corpus cases pass, and regenerating the corpus (`npm run parity`) and re-running `dotnet test` reproduces the same result.
- Every Sub-Phase D Simulation Core function has at least one real-content/real-position parity case exercising it.

## Definition of Done

- `dotnet test` passes with zero failures across all 716 tests (651 through Sub-Phase C + 65 new parity cases + 27 direct unit tests).
- A reviewer can regenerate the corpus and re-run to reproduce the same result independently.
- No later Sub-Phase D or F agent should discover a numeric disagreement between the C# and TypeScript implementations this agent's corpus should have already caught.
