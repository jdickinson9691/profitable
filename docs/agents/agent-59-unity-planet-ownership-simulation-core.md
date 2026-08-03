# Agent 59: Unity Planet Ownership Simulation Core Agent

**Creation order:** Second in Migration Phase 2, Sub-Phase E. Depends on Agent 58 (Schema).

## Responsibility

Port `src/planets/{transportColonists,claimPlanet,buildCitadel,mergePlanetOwnership}.ts` to C#, exactly.

## Inputs

- Agent 58's schema/constants.
- `unity/ProfitableCore/Schema/Ship.cs`/`Planet.cs`/`Wallet.cs` (prior phases) — reused directly.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`BuildCitadel`'s Citadel-level lookup reuses `PlanetOwnershipConstants.CitadelLevelBenefits` directly** — the same dictionary `RefuelShip`/`ResolveComponentRepair` (Sub-Phase D) already read from, never a second, duplicate lookup. This is the checklist's own explicit instruction ("don't re-derive 'which level gets which rate' independently here; it's one function's job, not two"), and it holds equally for `ConstructionCostCredits`/`ConstructionMaterial` even though Sub-Phase D never reads those two fields.
- **Every "clone with one field changed" restates every field explicitly** (`TransportColonists`'/`ClaimPlanet`'s/`BuildCitadel`'s cloned `PlanetOwnershipEntry`, `MergePlanetOwnership`'s cloned `Planet`), matching this project's own established idiom.
- **`MergePlanetOwnership` is a pure function taking an optional `PlanetOwnershipEntry?`** — the actual `SaveSystem`-backed lookup (a persisted `Dictionary<planetId, PlanetOwnershipEntry>`) lives entirely in the Unity presentation layer (Agent 61's `PlanetOwnershipState.cs`), exactly mirroring `mergePlanetOwnership.ts`'s own "pure function; the SaveSystem-backed lookup lives in the caller" comment.

## Outputs (`unity/ProfitableCore/Simulation/`)

- `TransportColonists.cs` — `ColonistTransporter.TransportColonists` (docking check, positive-quantity check, wallet-sufficiency check, colonist-count accumulation).
- `ClaimPlanet.cs` — `PlanetClaimer.ClaimPlanet` (docking check, colonist-threshold gate reusing `PlanetOwnershipConstants.MinimumColonistsToProduce`, already-claimed check).
- `BuildCitadel.cs` — `CitadelBuilder.BuildCitadel` (docking check, ownership check, sequential-level check, funds/material checks, reports what to consume without touching Inventory itself — same boundary `Crafter.Craft` already holds).
- `MergePlanetOwnership.cs` — `PlanetOwnershipMerger.MergePlanetOwnership`.

## Must NOT Do

- Must not duplicate `PlanetOwnershipConstants.CitadelLevelBenefits`' lookup logic — reused directly from Sub-Phase D's own table.
- Must not have `BuildCitadel`/`TransportColonists` touch `Inventory`/materials directly — both report what changed (a resource id + quantity to consume, a wallet to update), leaving the actual consumption to the caller, exactly like `Crafter.Craft`'s own boundary.
- Must not "improve" the colonist-gathering gate's seam (it lives in `GetCurrentPlanetResources()`, Sub-Phase A, as a presentation-layer check in the TypeScript source, not inside a core function) — port the exact seam, no design changes during translation.

## Testing Requirements

- Direct unit tests (`ProfitableCore.Tests/Simulation/PlanetOwnershipSimulationTests.cs`) covering every rejection path (not-docked, non-positive quantity, insufficient funds, below-colonist-threshold, already-claimed, not-claimed, level-skipping, insufficient material) and the successful paths for all three actions plus `MergePlanetOwnership`'s null-entry-uses-defaults case.
- Agent 60's parity corpus is the primary correctness proof for every function's real-content behavior.

## Definition of Done

- Every `src/planets/*.ts` function has a byte-for-byte-equivalent C# port.
- `dotnet build`/`dotnet test` pass with zero warnings/errors.
- Agent 60 can generate a real-content parity corpus against every function here without finding a missing case.
