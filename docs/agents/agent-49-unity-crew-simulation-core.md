# Agent 49: Unity Crew Simulation Core Agent

**Creation order:** Second in Migration Phase 2, Sub-Phase C. Depends on Agent 48 (Schema).

## Responsibility

Port `src/crew/{hireCrew,dismissCrew,payUpkeep,checkAttrition,purchaseCapacity,refreshCrewPool,assignToCraft,resolveBackgroundCrafting}.ts` to C#, exactly — formula logic only.

## Inputs

- Agent 48's schema/constants.
- `unity/ProfitableCore/Simulation/SeededRandom.cs` (Agent 39), `TierColorResolver.cs` (Phase 1) — reused directly by `RefreshCrewPoolSimulation`, not re-ported.
- `unity/ProfitableCore/Simulation/Crafter.cs` (Phase 1) — reused directly by `AssignToCraftSimulation`/`ResolveBackgroundCraftingSimulation`, never reimplemented.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`ResolveBackgroundCraftingSimulation.ResolveBackgroundCrafting` is two overloads, not one method with a default parameter reading `CrewConfig.BackgroundIdleOutputRate`.** The TypeScript source's `backgroundRate: number | null = BACKGROUND_IDLE_OUTPUT_RATE` default is evaluated **per call** (a live JS default-argument read against a mutable module binding) — an omitted argument always uses whatever the config currently holds, including a value changed since the module first loaded. C# default parameter values are baked in at compile time and cannot read a mutable static property live, so a literal translation would silently freeze the default to whatever `BackgroundIdleOutputRate` was at first JIT, never picking up a later debug-panel change. The four-parameter overload (no `backgroundRate` parameter) reads `CrewConfig.BackgroundIdleOutputRate` fresh on every call and forwards to the five-parameter overload — this is the actual translation of the TypeScript live-default behavior, not a simplification of it. Passing an explicit `null` (calling the five-parameter overload directly) still means "no background output configured for this call," exactly as in TypeScript.
- **Every "clone with one field changed" (`PayUpkeep`'s `UpdatedCrewMember`, `AssignToCraft`'s status/assignedCraftId update, etc.) restates every `CrewMember` field explicitly**, matching this project's own established idiom (`Drift.ApplyDrift`, `PurchaseListing`'s `UpdatedListing`) rather than introducing a `with`-expression/record-copy shortcut this codebase doesn't otherwise use.
- **`AssignToCraftSimulation.AssignToCraft` never constructs an `AssignRejected`** — the real TypeScript function has no rejection path (always succeeds given a valid `CraftAction`); `AssignResult`'s rejected case exists for the type's own contractual completeness (Agent 48's schema), not because this function produces one. Documented explicitly so a later reviewer doesn't go looking for a missing branch.

## Outputs (`unity/ProfitableCore/Simulation/`)

- `HireCrew.cs` — `HireCrewSimulation.HireCrew` (pool-membership check, capacity check, hire-cost/wage lookups, wallet-sufficiency check before deduction — a check `PurchaseListing` itself never had).
- `DismissCrew.cs` — `DismissCrewSimulation.DismissCrew` (ownership check only).
- `PayUpkeep.cs` — `PayUpkeepSimulation.PayUpkeep` (single-interval-gated payment, three-way result).
- `CheckAttrition.cs` — `CheckAttritionSimulation.CheckAttrition` (deterministic grace-period check from `LastPaidAt`).
- `PurchaseCapacity.cs` — `PurchaseCapacitySimulation.PurchaseCapacity` (exponential cost curve).
- `RefreshCrewPool.cs` — `RefreshCrewPoolSimulation.RefreshCrewPool` (tier roll via `TierColorResolver`, profession roll for Orange/Gold only, reuses `SeededRandom`'s exact seed-string conventions).
- `AssignToCraft.cs` — `AssignToCraftSimulation.AssignToCraft` (delegates entirely to `Crafter.Craft`).
- `ResolveBackgroundCrafting.cs` — `ResolveBackgroundCraftingSimulation.ResolveBackgroundCrafting` (two overloads, see Design decisions; elapsed-time cap, `maxUnits` real-inventory clamp, repeated `Crafter.Craft` calls for `unitsCompleted`).

## Must NOT Do

- Must not duplicate `Crafter.Craft`'s formula inside `AssignToCraft`/`ResolveBackgroundCrafting` — both call the shared function.
- Must not duplicate `TierColorResolver.GetTierColor`'s breakpoint logic inside `RefreshCrewPool` — reused directly, same as `PlanetGenerator.RollPlanetTier`'s own precedent.
- Must not invent an `AssignRejected` case or any other rejection path the TypeScript source doesn't have, to "make the union feel more complete."
- Must not let a default-parameter translation silently freeze `BackgroundIdleOutputRate` at compile time — see the two-overload requirement above.

## Testing Requirements

- Direct unit tests (`ProfitableCore.Tests/Simulation/CrewSimulationTests.cs`) covering boundary cases: `PayUpkeep`/`CheckAttrition` at the exact interval/grace-period boundary (both directions), `PurchaseCapacity`'s cost-doubling curve across two slots, `HireCrew` succeeding at exactly one slot below capacity, `ResolveBackgroundCrafting`'s negative-elapsed-time clamp, `RefreshCrewPool`'s determinism and its Orange/Gold-only profession rule.
- Agent 50's parity corpus is the primary correctness proof for every function's real-content behavior.

## Definition of Done

- Every `src/crew/*.ts` function has a byte-for-byte-equivalent C# port.
- `dotnet build`/`dotnet test` pass with zero warnings/errors.
- Agent 50 can generate a real-content parity corpus against every function here without finding a missing case.
