# Agent 64: Unity Encounters & Combat Phase Integration Agent

**Creation order:** Second and last in Migration Phase 2, Sub-Phase F. Depends on Agent 63 (Presentation) and Sub-Phase D's already-complete Schema/Simulation Core/Parity Validation (agents 53-55). Closes out both Sub-Phase F and the entire Migration Phase 2 checklist (Sub-Phases A-F).

## Responsibility

Verify Sub-Phase F actually works end-to-end in Unity: confirm a real voyage arrival can produce a real, applied encounter outcome (credits/resource) and a real, resolvable pending combat, then confirm the entire Migration Phase 2 checklist (all six sub-phases) is genuinely complete.

## Inputs

All of Agent 63's completed outputs, plus every prior sub-phase's own closing integration report (agents 42, 47, 52, 57, 62) for the standing "what does 'done' mean at this point" baseline.

## Outputs

### Integration report (below) — no new gap found requiring a code fix

Unlike Sub-Phase E's closing verification (which found and fixed a real `ShipsPanel` wiring gap left over from Sub-Phase D), Sub-Phase F's own Presentation agent (63) already wired the one thing this sub-phase adds — `ResolveArrival`'s opt-in encounter/combat parameters — directly at the point where the underlying gap would otherwise have existed (`ArrivalResolver.ResolveArrival` was designed in Sub-Phase D specifically as an additive, optional-parameter extension for this reason). Verification below confirms there is no equivalent silent gap here.

## Must NOT Do

- Must not introduce new game logic — this agent verifies, it does not add scope.
- Must not build a return-voyage UI for a normal combat win, or ship-crew-role assignment UI — both are real, already-documented scope limits from Sub-Phase D/F's own Presentation agents, not gaps to close here.

## Testing Requirements

- Run the full verification sweep together: `dotnet test`, Unity `EditMode`, Unity `PlayMode`, `npm test`.
- Specifically confirm the checklist's own Sub-Phase F claims: a resolved arrival can produce and apply a real encounter outcome, and a detected pending combat can be resolved (attack or flee) through the real Unity UI wiring, with a flee/loss producing a real automatic retreat voyage.

## Definition of Done

- Sub-Phase F (Encounters & Combat) is fully integrated: a player can open `MvpLoop.unity`, travel a ship to the secondary planet, resolve its arrival, and see a real credited/debited Wallet, a real Inventory addition, or a real pending-combat Attack/Flee choice — all through real Simulation Core calls already proven numerically identical to the TypeScript source in Sub-Phase D.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every box checked, across all six sub-phases (A-F).

---

## Integration report

**Sub-Phase F's Definition of Done is met, and with it, the entire Migration Phase 2 checklist.**

1. **Encounter-outcome claim, directly confirmed**: `ShipsPanelTests.ResolveArrival_AppliesTradeOpportunityEncounterToWallet` forces a Trade Opportunity roll (via the new `RandomFn` injection seam) through the real `ShipsPanel.ResolveArrival -> ArrivalResolver.ResolveArrival -> EncounterResolver.ResolveEncounters` path and confirms the exact credited amount reaches the real `MarketState.Wallet` via `ApplyEncounter` — not a self-consistent mock, the real Sub-Phase D-proven formula.
2. **Pending-combat claim, directly confirmed**: `ShipsPanelTests.ResolveArrival_DetectsPendingCombatAndFleeInitiatesARetreatVoyage` forces the arrival-combat-check roll to trigger, confirms the resulting `CombatEncounter` is recorded in `ShipsState.PendingCombats` with the correct `ShipId`, then resolves it with `"flee"` through `ShipsPanel.ResolveCombat` and confirms a real automatic retreat voyage is set as the new `ActiveVoyage`, destined back to the original origin planet.
3. **No equivalent to Sub-Phase E's own found-and-fixed gap exists here.** `ArrivalResolver.ResolveArrival`'s `destinationPlanet`/`resources`/`random` parameters were designed in Sub-Phase D specifically as additive-optional, and Agent 63 opted into them directly at the one call site (`ShipsPanel.ResolveArrival`) that needed to — there was no second, later-integrated caller left silently passing nulls the way `RefuelShip`/`CheckRepair` did before Sub-Phase E existed to make that gap observable.
4. **Regression proof, reused unmodified**: `FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` needed zero changes and still pass with `ShipsPanel`'s new pending-combat section present.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 743/743 passed, unchanged from Sub-Phase E — Sub-Phase F added zero new `ProfitableCore` code (its Schema/Simulation Core/Parity Validation were already done in Sub-Phase D).
- Unity `EditMode`: 58/58 passed (55 through Sub-Phase E + 3 new `ShipsPanelTests` cases).
- Unity `PlayMode`: 2/2 passed, both unmodified from Sub-Phase A.
- `npm test` (the TypeScript source this migration ports from, unaffected by it): 687/687 passed.

**Migration Phase 2 Sub-Phase F (Encounters & Combat) is complete**, and with it, **Migration Phase 2 in its entirety (Sub-Phases A-F).** Every system the MVP loop's `docs/unity-migration-phase2-checklist.md` scoped — galaxy/planet/mining, trading, crew, ships/travel, planet ownership, and encounters/combat — is ported to C#, proven numerically identical to the TypeScript source via real parity corpora, and driving a real Unity scene a player can open and click through end to end.
