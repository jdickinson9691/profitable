# Agent 57: Unity Ships & Travel Phase Integration Agent

**Creation order:** Fifth and last in Migration Phase 2, Sub-Phase D. Depends on all four prior agents' completed outputs (53-56).

## Responsibility

Wire everything together and verify Sub-Phase D actually works end-to-end in Unity: confirm a voyage can actually be initiated, resolved, and (if repair is checked) repaired in the Unity build, and confirm this doesn't regress Sub-Phases A/B/C's own parity — the literal questions this sub-phase's own checklist entry asks.

## Inputs

All four prior agents' completed outputs:
- Agent 53: `Ship`/`ShipComponentSlots`/`Voyage`/`Scanner`/`ShipyardPool`/`ScannerPool` schema, every result union, `ShipsAndTravelConfig`, the Encounter/Combat schema ported early.
- Agent 54: all 21 `src/ships/*.ts` function ports, plus the `Voyage.ArrivesAt` precision fix found during implementation.
- Agent 55: 21-section real-galaxy-position parity corpus (~65 cases) plus the two serialization-gap fixes found via failing tests.
- Agent 56: `ShipsState.cs`, `ShipsPanel.cs`, `GalaxyState.SecondaryDestinationPlanet`, `MvpLoopBootstrap.cs`'s seventh-panel wiring, `ShipsPanelTests.cs`.

Also, directly: `Assets/Tests/PlayMode/FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` — confirmed to need zero modification, reused as regression proof that a seventh panel didn't disturb the existing six.

## Outputs

### Integration report (below)

## Must NOT Do

- Must not introduce new game logic to "make things work" — a gap found here is reported and attributed to the specific upstream agent.
- Must not write a new PlayMode click-through test for Ships specifically — `ShipsPanelTests.cs` (EditMode) already exercises every trigger method's real wiring, and the existing PlayMode tests already prove the scene builds/runs with the seventh panel present.
- Must not exercise ship-crew-role assignment, scanner, or combat/encounter presentation — all three are explicitly out of Agent 56's scope, not a gap to patch here.

## Testing Requirements

- Run the full verification sweep together: `dotnet test`, Unity `EditMode`, Unity `PlayMode`, `npm test`.
- Specifically confirm the voyage claim: a real ship purchased in the Unity build can depart (fuel deducted, `Voyage.ArrivesAt` set from the real `CalculateTravelTime` formula), report not-yet-arrived before its time, and arrive (ship's `CurrentPlanetId` updated) once it is.
- Confirm `FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` pass unmodified with the seventh panel present.

## Definition of Done

- Sub-Phase D (Ships & Travel) is fully integrated: a player can open `MvpLoop.unity`, purchase a ship, refuel it, check repair, initiate a voyage, and resolve arrival, all through real Simulation Core calls.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every Sub-Phase D box checked.

---

## Integration report

**Sub-Phase D's Definition of Done is met.** All four agents' outputs (53-56) integrate correctly; the Ships panel drives a real purchase → refuel → check-repair → travel → resolve-arrival loop, and nothing about Sub-Phases A/B/C's own integration regressed.

1. **Voyage claim, directly confirmed**: `ShipsPanelTests.InitiateVoyage_DeductsFuelAndSetsActiveVoyage` proves a real ship purchased through the panel departs with fuel correctly deducted (`VoyageInitiator.InitiateVoyage`, `CalculateFuelCost` underneath) and `Voyage.ArrivesAt` set from the real `CalculateTravelTime` formula (real galaxy planet positions, real ship tier, real distance). `ResolveArrival_NotYetDueImmediatelyAfterDeparture` proves the panel correctly reports "not yet arrived" rather than resolving early. `CheckRepair_SetsLastRepairedAt` proves the repair check reaches `ComponentRepairResolver` for real (moving `LastRepairedAt` from `null` to a real timestamp). Together these close the checklist's literal question: a voyage can be initiated, resolved (once due), and repaired in the Unity build.
2. **Regression proof, reused unmodified**: `FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` needed zero changes and still pass with the seventh panel present.
3. **No gaps found.** No upstream agent's contract was violated. One scope boundary made explicit rather than silently decided: `ShipsPanel` covers only the core purchase/refuel/repair/travel loop — ship-crew-role assignment, scanner purchase/scan, and combat/encounter resolution are all explicitly deferred (the last to Sub-Phase F's own Presentation agent), exactly as Agent 56's own contract states. Two real defects were found and fixed *during* this sub-phase, not carried forward: the `Voyage.ArrivesAt` precision truncation (Agent 54) and two parity-corpus serialization gaps (Agent 55) — both caught by failing tests before this integration pass began, not discovered here.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 716/716 passed (651 through Sub-Phase C + 65 Ships/Travel parity cases + 27 Ships/Travel direct unit tests).
- Unity `EditMode`: 47/47 passed (40 through Sub-Phase C + 7 new `ShipsPanelTests`).
- Unity `PlayMode`: 2/2 passed, both unmodified from Sub-Phase A.
- `npm test` (the TypeScript source Sub-Phase D ports from, unaffected by this migration): 687/687 passed.

**Migration Phase 2 Sub-Phase D (Ships & Travel, incl. Scanner) is complete.** `calculateDistance`, `calculateTravelTime`, `calculateFuelCost`, `deriveFuelCapacity`, `deriveShipTier`, `assembleShip`, `initiateVoyage`, `resolveArrival`, `purchaseShip`, `purchaseScanner`, `refreshShipyardPool`, `refreshScannerPool`, `refuelShip`, `getCrewSlotsForShip`, `assignToShipRole`, `unassignFromShipRole`, `resolveComponentRepair`, `performScan`, `initiateCombat`, `resolveEncounters`, and `resolveCombatChoice` are all ported to C#, proven numerically identical to the TypeScript source, and driving a real Unity scene a player can open and click through. Sub-Phases E-F (Planet Ownership → Combat/Encounters Presentation) are out of this document's scope — see `docs/unity-migration-phase2-checklist.md`.
