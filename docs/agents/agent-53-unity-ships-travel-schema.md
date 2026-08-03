# Agent 53: Unity Ships & Travel Schema Agent

**Creation order:** First in Migration Phase 2, Sub-Phase D. Depends on Agent 38 (Unity Galaxy/Planet Schema, for `Planet.Position`/`Discovered`/`OwnedByPlayerId`/`CitadelLevel` reuse) and Agent 48 (Unity Crew Schema, for `CrewMember`/`ShipCrewRole` reuse).

## Responsibility

Port every `src/data/types/{ship,shipComponent,componentCategory,voyage,scanner,scannerCandidate,scannerPool,shipCandidate,shipyardPool,componentRecipe,initiateVoyageResult,purchaseShipResult,purchaseScannerResult,refuelShipResult,assignShipRoleResult,unassignShipRoleResult,performScanResult,arrivalResult,encounter,combatEncounter,combatResolution,encounterResolution}.ts` and `src/data/constants/shipsAndTravelConfig.ts` to C#. Types and constants only — no formula logic (Agent 54's job).

## Inputs

- `docs/agents/agent-48-unity-crew-schema.md` — the immediately-preceding Schema agent's own conventions, extended rather than re-derived.
- The real TypeScript source files listed above, read directly.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **Encounter/Combat schema (`EncounterResult`, `CombatEncounter`, `CombatResolution`, `EncounterResolution`) is ported here, in Sub-Phase D, not deferred to Sub-Phase F**, even though Sub-Phase F's own checklist entry names these same types under its own Schema row. `resolveEncounters.ts`/`resolveCombatChoice.ts`/`initiateCombat.ts` physically live in `src/ships/` and are explicitly assigned to Sub-Phase D's own Simulation Core row — those functions cannot compile or mean anything without these types existing first. Sub-Phase F's own Schema role becomes "confirm these already exist and extend if needed" rather than "create fresh," the same relationship Sub-Phase A's `PlanetOwnershipConstants.MinimumColonistsToProduce` already has with Sub-Phase E.
- **`PlanetOwnershipConstants` (Sub-Phase A/Agent 38) is extended here with `CitadelLevelBenefits`** (keyed by level 1-3: `RefuelDiscountPercent`, `RepairEnabled`) — `RefuelShip` and `ResolveComponentRepair` both have a hard dependency on it. `ColonistTransportCost` is left for Sub-Phase E's own agent to add, since nothing in Sub-Phase D needs it.
- **`ShipComponentSlots` (new) replaces the TypeScript source's inline `{ weapon, engine, shield, cargoHold }` object-literal shape** on both `Ship.Components` and `ShipCandidate.Components`. JS's computed-property spread (`{ ...ship.components, [slot]: component }`) and `Object.values(ship.components)` have no direct C# equivalent for an anonymous shape reused across two types — `ShipComponentSlots` is a named class with `Get(category)`/`With(category, component)`/`AsPairs()` helper methods that `AssembleShip`/`DeriveShipTier`/`ResolveComponentRepair`/`ResolveCombatChoice` all call instead of hand-rolling a switch at every call site.
- **`Voyage.ArrivesAt` is `double`, not `long`** — unlike every other epoch-ms timestamp in this codebase (`Listing.ExpiresAt`, `CrewMember.LastPaidAt`), `ArrivesAt` is *derived* from a floating-point calculation (`DepartedAt + CalculateTravelTime(...)`, itself distance × several tunable multipliers) and is genuinely fractional in real use, exactly matching the TypeScript source's own plain `number` type. **Found via a parity test failure, not by inspection** — an initial `long ArrivesAt` silently truncated the fractional milliseconds, which would have diverged from the real TypeScript output on every single voyage. Fixed before it could hide anywhere else.
- **`CrewSlotsByTierEntry`/`HazardFailureCostBand` are named classes, not anonymous tuples** — mirrors the TypeScript source's own named-interface shape for these two non-scalar per-tier/per-band tables (every other table in `ShipsAndTravelConfig` is a simple `Dictionary<TierColor, double>`).
- **`ComponentCategory`'s real content values are camelCase** (`"weapon"`, `"cargoHold"`), unlike `TierColor`/`PlanetType` (already capitalized in real JSON) — parsing it from content/parity JSON uses `Enum.TryParse(..., ignoreCase: true)`, documented explicitly at both call sites (`ShipsContentLoader`, `ShipsTravelParityTests`) so a future reader doesn't "fix" it to match the other enums' case-sensitive parse.

## Outputs

### 1. New schema types (`unity/ProfitableCore/Schema/`)

`ComponentCategory.cs`, `ShipComponent.cs`, `ShipComponentSlots.cs`, `Ship.cs`, `ShipCandidate.cs`, `ShipyardPool.cs`, `Scanner.cs`, `ScannerCandidate.cs`, `ScannerPool.cs`, `Voyage.cs` (+ `VoyageCargoItem`), `ComponentRecipe.cs`, `InitiateVoyageResult.cs`, `PurchaseShipResult.cs`, `PurchaseScannerResult.cs`, `RefuelShipResult.cs`, `AssignShipRoleResult.cs`, `UnassignShipRoleResult.cs`, `PerformScanResult.cs`, `EncounterResult.cs` (+ `EncounterType` enum), `CombatEncounter.cs` (+ `CombatTriggerContext`/`CombatStatus`/`CombatOutcome` enums), `CombatResolution.cs`, `EncounterResolution.cs`, `ArrivalResult.cs`.

### 2. `unity/ProfitableCore/Constants/ShipsAndTravelConfig.cs` (new)

All ~30 ships/travel tunables: distance-to-hours, ship-tier speed modifier, shipyard/scanner pool size+refresh, ship/scanner purchase cost curves, encounter check window/trigger chance/type weights, arrival combat check chance, combat damage/mitigation/unavailable-duration constants, trade-opportunity credit range, hazard pass threshold/tier modifier/failure cost curve, scanner base radius/tier bonus, fuel capacity/cost, cargo hold capacity, crew slots by tier, pilot/combat-engineer/science-officer/crafter role-effect tables, systems-engineer/crafter repair rates, citadel repair rates, repair elapsed-time cap.

### 3. `unity/ProfitableCore/Constants/PlanetOwnershipConstants.cs` (extended)

`CitadelLevelBenefits` added alongside Sub-Phase A's `MinimumColonistsToProduce`.

## Must NOT Do

- Must not add any formula logic to this file set — Agent 54's job.
- Must not defer Encounter/Combat schema to Sub-Phase F "to keep sub-phase boundaries clean" — Sub-Phase D's own Simulation Core functions have a hard, immediate dependency on it; deferring would make Sub-Phase D's own functions uncompilable.
- Must not model `ShipComponentSlots` as a raw `Dictionary<ComponentCategory, ShipComponent?>` — the TypeScript source's own shape is a fixed 4-field object, not an arbitrary-keyed map; a named class with exactly 4 properties preserves that fixed-shape guarantee at compile time.
- Must not port `ColonistTransportCost` here — no Sub-Phase D function needs it; Sub-Phase E's own agent adds it alongside the functions that do.

## Testing Requirements

- `dotnet build` succeeds with zero warnings/errors.
- Every new type is exercised by Agent 54's simulation code and Agent 55's parity tests.

## Definition of Done

- Every ships/travel/scanner/combat/encounter TypeScript type/constant Sub-Phase D needs (including what Sub-Phase F's own functions, ported here, need) has a C# equivalent, field-for-field.
- Agent 54 can port every `src/ships/*.ts` function against these types without needing to reopen this file set for a missing field.
