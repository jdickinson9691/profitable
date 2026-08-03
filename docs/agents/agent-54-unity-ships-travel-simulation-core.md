# Agent 54: Unity Ships & Travel Simulation Core Agent

**Creation order:** Second in Migration Phase 2, Sub-Phase D. Depends on Agent 53 (Schema).

## Responsibility

Port every `src/ships/*.ts` function to C#, exactly — `calculateDistance`, `calculateTravelTime`, `calculateFuelCost`, `deriveFuelCapacity`, `deriveShipTier` (+ `tierMidpoint`), `assembleShip`, `initiateVoyage`, `resolveArrival`, `purchaseShip`, `purchaseScanner`, `refreshShipyardPool`, `refreshScannerPool`, `refuelShip`, `getCrewSlotsForShip`, `assignToShipRole`, `unassignFromShipRole`, `resolveComponentRepair`, `performScan`, `initiateCombat`, `resolveEncounters`, `resolveCombatChoice`, and `loadShipsContent`.

## Inputs

- Agent 53's schema/constants.
- `unity/ProfitableCore/Simulation/SeededRandom.cs`, `TierColorResolver.cs`, `TierVarianceLookup.cs`, `AggregateTierResolver.cs`, `ClampHelper.cs`, `QualityRoller.cs`, `Crafter.cs` (all prior phases) — reused directly, never re-ported.
- `unity/ProfitableCore/Constants/TierColorBreakpoints.cs` (Phase 1) — reused by `ShipTierDeriver.TierMidpoint`.
- `unity/ProfitableCore/Constants/PlanetOwnershipConstants.cs` (extended by Agent 53) — reused by `RefuelShip`/`ResolveComponentRepair` for Citadel benefits.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **A real precision bug was found and fixed mid-implementation, not by inspection**: `Voyage.ArrivesAt` was initially typed `long` (Agent 53's first draft), and `VoyageInitiator.InitiateVoyage` truncated the fractional travel-time milliseconds when assigning it. A parity test comparing the C# output against the real recorded TypeScript value failed on the very first run because of this truncation. Fixed by changing the schema field to `double` (Agent 53) and removing the truncating cast here — exactly the kind of "prove it against the real TypeScript output, don't just trust the port looks right" discipline this migration's parity-validation step exists for.
- **Every "clone with one field changed" restates every field explicitly** (`AssembleShip`'s intermediate `updated` ship, `ResolveCombatChoice`'s cloned `CrewMember`/`CombatEncounter`), matching this project's own established idiom rather than a `with`-expression shortcut this codebase doesn't otherwise use.
- **`ResolveComponentRepair`/`ResolveCombatChoice` both reuse `ShipComponentSlots.Get`/`.With`** instead of a hand-rolled `switch` over `ComponentCategory` at each call site — the same helper Agent 53's schema decision introduced specifically so this class of "loop over all 4 component slots" logic (both functions do this) doesn't get reimplemented twice with subtly different `switch` arms.
- **`ResolveEncounters`/`InitiateCombat`/`ResolveCombatChoice` share the exact same `EncounterTypeOrder` declaration and `SeededRandom` seed-string conventions as the TypeScript source** (`"{voyageId}-combat-w{windowIndex}"`, `"{voyageId}-combat-arrival"`) — the seed string itself is part of the ported behavior, since a different (even equally "reasonable") string would silently diverge from the TypeScript output for the same inputs without ever throwing.

## Outputs (`unity/ProfitableCore/Simulation/`)

- `CalculateDistance.cs`, `CalculateTravelTime.cs`, `CalculateFuelCost.cs`, `DeriveFuelCapacity.cs`, `DeriveShipTier.cs` (+ `TierMidpoint`), `AssembleShip.cs`, `InitiateVoyage.cs`, `ResolveArrival.cs`, `PurchaseShip.cs`, `PurchaseScanner.cs`, `RefreshShipyardPool.cs`, `RefreshScannerPool.cs`, `RefuelShip.cs`, `GetCrewSlotsForShip.cs`, `AssignToShipRole.cs`, `UnassignFromShipRole.cs`, `ResolveComponentRepair.cs`, `PerformScan.cs`, `InitiateCombat.cs`, `ResolveEncounters.cs`, `ResolveCombatChoice.cs`.
- `unity/ProfitableCore/Content/ShipsContentLoader.cs` — `Load`/`LoadFromFile` for `content/componentRecipes.json` (the component recipes themselves are ordinary `Recipe` entries in `content/recipes.json`, loaded through the existing `ContentLoader` unchanged).

## Must NOT Do

- Must not duplicate `Crafter.Craft`, `TierColorResolver.GetTierColor`, `TierVarianceLookup.GetTierVariance`, `AggregateTierResolver.ComputeAggregateTier`, or `ClampHelper.Clamp` inside any of these files — every one is reused directly.
- Must not reimplement `ShipComponentSlots`' per-category switch logic ad hoc in more than one place — `Get`/`With`/`AsPairs` are the only sanctioned way to read/write a component slot.
- Must not change any seed-string format from the TypeScript source's own literal strings.
- Must not invent a rejection path `AssignToCraft`-style functions don't have (e.g., `AssembleShip` throws on category mismatch, exactly as the source does — never converted into a `Result` union the contract never asked for).

## Testing Requirements

- Direct unit tests (`ProfitableCore.Tests/Simulation/ShipsSimulationTests.cs`) covering throw/edge paths: missing-position throws (`CalculateTravelTime`/`CalculateFuelCost`), zero-component `DeriveShipTier` fallback to Grey, `AssembleShip` category-mismatch throw and fuel-capacity-shrink clamping, `InitiateVoyage`'s fuel/cargo rejection throws and the retreat-skips-both-checks behavior, ship/scanner purchase rejections, refuel rejections and the Citadel discount, ship-role assignment's Crafter-without-profession rejection and the combined Combat-Engineer/Science-Officer pool sharing, unassign's nothing-to-do rejection, component-repair's mutually-exclusive-voyage/planet throw, scan rejections and radius-based discovery, and combat's non-pending throw plus flee/win outcome shapes.
- Agent 55's parity corpus is the primary correctness proof for every function's real-content, real-galaxy-position behavior.

## Definition of Done

- Every `src/ships/*.ts` function has a byte-for-byte-equivalent C# port.
- `dotnet build`/`dotnet test` pass with zero warnings/errors.
- Agent 55 can generate a real-content, real-galaxy parity corpus against every function here without finding a missing case.
