# Agent 58: Unity Planet Ownership Schema Agent

**Creation order:** First in Migration Phase 2, Sub-Phase E. Depends on Agent 38 (Unity Galaxy/Planet Schema, for `Planet.ColonistCount`/`CitadelLevel`/`OwnedByPlayerId`, already scoped in) and Agent 53 (Unity Ships & Travel Schema, for the `CitadelLevelBenefits` table it started extending in Sub-Phase D).

## Responsibility

Port `src/data/types/{planetOwnershipEntry,transportColonistsResult,claimPlanetResult,buildCitadelResult}.ts` and the remaining, not-yet-ported half of `src/data/constants/planetOwnership.ts` (`ColonistTransportCost`, `CitadelLevelBenefits`' own `ConstructionCost` fields) to C#.

## Inputs

- `docs/agents/agent-53-unity-ships-travel-schema.md` — `PlanetOwnershipConstants.CitadelLevelBenefits` was already started there (`RefuelDiscountPercent`/`RepairEnabled` only, since that's all `RefuelShip`/`ResolveComponentRepair` needed); this agent extends the same dictionary rather than replacing it, confirming those two fields survive unchanged.
- The real TypeScript source files listed above, read directly.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`CitadelLevelBenefit` gains `ConstructionCostCredits`/`ConstructionMaterial`** (a new nested `CitadelConstructionMaterial { ResourceId, Quantity }` class) — `BuildCitadel` is the only function that needs the construction-cost half of this table; Sub-Phase D's own `RefuelShip`/`ResolveComponentRepair` never read it, so nothing there breaks by adding fields they don't touch.
- **`PlanetOwnershipEntry.Default()` is a static factory method, not a `static readonly` field** — the TypeScript source's `DEFAULT_PLANET_OWNERSHIP_ENTRY` is an immutable shared constant object; C# classes are reference types, so a single shared mutable instance would risk one caller's edit leaking into another's "default" — a factory method returning a fresh instance every call avoids that class of bug outright, at negligible cost (three primitive-field assignments).

## Outputs

### 1. New schema types (`unity/ProfitableCore/Schema/`)

`PlanetOwnershipEntry.cs` (+ `Default()`), `TransportColonistsResult.cs`, `ClaimPlanetResult.cs`, `BuildCitadelResult.cs`.

### 2. `unity/ProfitableCore/Constants/PlanetOwnershipConstants.cs` (extended)

`ColonistTransportCost` (new scalar) and `CitadelLevelBenefits`' `ConstructionCostCredits`/`ConstructionMaterial` fields added to the dictionary Agent 53 started.

## Must NOT Do

- Must not touch `MinimumColonistsToProduce` (Sub-Phase A) or `CitadelLevelBenefits`' `RefuelDiscountPercent`/`RepairEnabled` fields (Sub-Phase D) beyond adding the new fields alongside them.
- Must not add any formula logic to this file set — Agent 59's job.
- Must not model `PlanetOwnershipEntry`'s default as a shared mutable singleton.

## Testing Requirements

- `dotnet build` succeeds with zero warnings/errors.
- Confirm Sub-Phase D's own tests (`ShipsSimulationTests`, `ShipsTravelParityTests`) still pass unmodified after `CitadelLevelBenefit`'s extension — a schema change to a type Sub-Phase D already depends on is exactly the kind of change that could silently break something there if not checked.

## Definition of Done

- Every Planet Ownership TypeScript type/constant Sub-Phase E needs has a C# equivalent, field-for-field.
- Agent 59 can port `transportColonists.ts`/`claimPlanet.ts`/`buildCitadel.ts`/`mergePlanetOwnership.ts` against these types without needing to reopen this file set for a missing field.
- Sub-Phase D's own `dotnet test` suite still passes unmodified.
