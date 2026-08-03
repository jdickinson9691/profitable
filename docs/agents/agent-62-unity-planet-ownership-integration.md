# Agent 62: Unity Planet Ownership Phase Integration Agent

**Creation order:** Fifth and last in Migration Phase 2, Sub-Phase E. Depends on all four prior agents' completed outputs (58-61).

## Responsibility

Wire everything together and verify Sub-Phase E actually works end-to-end in Unity: confirm colonizing/claiming/building persists correctly across a reload, and confirm a docked ship at an owned Level 2+ Citadel actually gets the refuel discount and repair rate in the Unity build — the literal questions this sub-phase's own checklist entry asks.

## Inputs

All four prior agents' completed outputs:
- Agent 58: `PlanetOwnershipEntry` (+ `Default()`), `TransportColonistsResult`/`ClaimPlanetResult`/`BuildCitadelResult` unions, extended `PlanetOwnershipConstants`.
- Agent 59: `ColonistTransporter`, `PlanetClaimer`, `CitadelBuilder`, `PlanetOwnershipMerger`.
- Agent 60: 12-case parity corpus, all passing against the TypeScript source.
- Agent 61: `PlanetOwnershipState.cs` (real persistence), `GatherPanel.cs`'s ownership actions, `GalaxyState.cs`'s bootstrap-colonization integration.

## Outputs

### A real integration gap found and fixed directly (not just reported)

While verifying the checklist's second Phase Integration requirement ("confirm a docked ship at an owned Level 2+ citadel actually gets the refuel discount and repair rate in the Unity build, not just the schema fields existing"), `ShipsPanel.RefuelShip`/`CheckRepair` (Sub-Phase D, Agent 56) were found to **always** pass `null`/`Array.Empty<CrewMember>()` for `dockedPlanet`/`ownedCrew` — meaning no Citadel benefit could ever apply through the real UI, regardless of ownership state, even though `RefuelShip`/`ResolveComponentRepair` themselves were already correctly parity-tested against a Citadel-owning planet (Sub-Phase D's own corpus). This was invisible until Sub-Phase E's own ownership state existed to make it observable — Agent 56 had nothing to pass at the time, since planet ownership wasn't wired yet. Fixed directly in `ShipsPanel.cs`: both methods now resolve the real, ownership-merged `GalaxyState.StartingPlanet` when the ship is docked there (via a new private `DockedPlanetFor` helper), and `CheckRepair` passes `CrewState.Crew` (the real owned-crew list) instead of an empty one. A new test, `RefuelShip_AppliesCitadelDiscountWhenStartingPlanetIsOwnedAndHasALevel2Citadel`, proves the discount is real by refueling the same amount twice — once with a Level 2 Citadel owned, once without — and asserting the owned case costs strictly less.

### Integration report (below)

## Must NOT Do

- Must not introduce new game logic beyond what closes the specific gap found — the `DockedPlanetFor` fix reuses `PlanetOwnershipState.WithOwnership`/`GalaxyState.StartingPlanet` exactly as `GatherPanel` already does, not a new formula.
- Must not write a new PlayMode click-through test for Planet Ownership specifically — `GatherPanelTests.cs`/`ShipsPanelTests.cs` (EditMode) already exercise every relevant trigger method's real wiring, and the existing PlayMode tests already prove the scene builds/runs with the ownership section present.

## Testing Requirements

- Run the full verification sweep together: `dotnet test`, Unity `EditMode`, Unity `PlayMode`, `npm test`.
- Specifically confirm both of the checklist's own claims: a claimed/colonized/Citadel-built planet's state survives a simulated reload (`PlanetOwnershipState_PersistsAcrossASimulatedReload`), and a docked ship at an owned Level 2+ Citadel genuinely pays less to refuel (`RefuelShip_AppliesCitadelDiscountWhenStartingPlanetIsOwnedAndHasALevel2Citadel`).
- Confirm `FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` pass unmodified with `GatherPanel`'s new ownership section present.

## Definition of Done

- Sub-Phase E (Planet Ownership) is fully integrated: a player can open `MvpLoop.unity`, purchase a ship, transport colonists, claim the starting planet, build its Citadel, and see that Citadel's refuel discount and repair rate genuinely apply — all through real Simulation Core calls, persisted to a real save file.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every Sub-Phase E box checked.

---

## Integration report

**Sub-Phase E's Definition of Done is met.** All four agents' outputs (58-61) integrate correctly; colonizing/claiming/building genuinely persists across a reload, and a real integration gap in Sub-Phase D's own `ShipsPanel` (never wiring Citadel context through to `RefuelShip`/`ResolveComponentRepair`) was found and fixed as part of closing this sub-phase out, since it only became observable once real ownership state existed.

1. **Persistence claim, directly confirmed**: `GatherPanelTests.PlanetOwnershipState_PersistsAcrossASimulatedReload` claims a planet, clears `PlanetOwnershipState`'s in-memory cache while keeping the same on-disk temp directory, re-injects a fresh `FileSaveSystem` pointed at it (simulating a real Unity Editor domain reload / app restart re-reading `Application.persistentDataPath`), and confirms the entry survives byte-for-byte — colonist count, Citadel level, and owner id all intact.
2. **Citadel-benefit claim, directly confirmed (and a real gap closed to get there)**: `ShipsPanelTests.RefuelShip_AppliesCitadelDiscountWhenStartingPlanetIsOwnedAndHasALevel2Citadel` proves a ship docked at an owned Level 2 Citadel pays strictly less to refuel than the same ship at an unowned planet — reachable only after fixing `ShipsPanel`'s own `DockedPlanetFor` wiring gap described above.
3. **Regression proof, reused unmodified**: `FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` needed zero changes and still pass with `GatherPanel`'s new ownership section present.
4. **No other gaps found.** The colonist-gathering gate's seam (living in `GetCurrentPlanetResources`, Sub-Phase A) was confirmed unchanged, not re-derived. `BuildCitadel` was confirmed to reuse Sub-Phase D's own `CitadelLevelBenefits` table directly, never a second lookup.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 743/743 passed (716 through Sub-Phase D + 12 Planet Ownership parity cases + 15 Planet Ownership direct unit tests).
- Unity `EditMode`: 55/55 passed (47 through Sub-Phase D + 7 new `GatherPanelTests` cases + 1 new `ShipsPanelTests` case).
- Unity `PlayMode`: 2/2 passed, both unmodified from Sub-Phase A.
- `npm test` (the TypeScript source Sub-Phase E ports from, unaffected by this migration): 687/687 passed.

**Migration Phase 2 Sub-Phase E (Planet Ownership) is complete.** `transportColonists`, `claimPlanet`, `buildCitadel`, and `mergePlanetOwnership` are all ported to C#, proven numerically identical to the TypeScript source, driving a real Unity scene a player can open and click through, and backed by real, working persistence — the first in this migration's Presentation layer. Sub-Phase F (Encounters & Combat Presentation/Integration — its Schema/Simulation Core/Parity Validation already done in Sub-Phase D) is out of this document's scope — see `docs/unity-migration-phase2-checklist.md`.
