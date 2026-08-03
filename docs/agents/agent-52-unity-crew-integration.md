# Agent 52: Unity Crew Phase Integration Agent

**Creation order:** Fifth and last in Migration Phase 2, Sub-Phase C. Depends on all four prior agents' completed outputs (48-51).

## Responsibility

Wire everything together and verify Sub-Phase C actually works end-to-end in Unity, and confirm assigning crew to a craft action genuinely affects `Crafter.Craft`'s output the same way it does in TypeScript — the literal question this sub-phase's own checklist entry asks.

## Inputs

All four prior agents' completed outputs:
- Agent 48: `CrewMember`/`CrewCandidate`/`PlanetCrewPool`/`CrewCapacity`/`CraftAction` schema, `HireResult`/`PaymentResult`/etc. unions, `CrewConfig`.
- Agent 49: `HireCrewSimulation`, `DismissCrewSimulation`, `PayUpkeepSimulation`, `CheckAttritionSimulation`, `PurchaseCapacitySimulation`, `RefreshCrewPoolSimulation`, `AssignToCraftSimulation`, `ResolveBackgroundCraftingSimulation`.
- Agent 50: 24-case real-content parity corpus plus 9 direct unit tests, all passing against the TypeScript source.
- Agent 51: `CrewState.cs`, `CrewPanel.cs`, `UiFactory.ClearChildren`, `MvpLoopBootstrap.cs`'s sixth-panel wiring, `CrewPanelTests.cs`.

Also, directly: `Assets/Tests/PlayMode/FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` — confirmed to need zero modification, reused as regression proof that a sixth panel (with the first-ever dynamic child-rebuilding UI in this migration) didn't disturb the existing five.

## Outputs

### Integration report (below)

## Must NOT Do

- Must not introduce new game logic to "make things work" — a gap found here is reported and attributed to the specific upstream agent.
- Must not write a new PlayMode click-through test for Crew specifically — `CrewPanelTests.cs` (EditMode) already exercises every trigger method's real wiring, and the existing PlayMode tests already prove the scene builds/runs with the sixth panel present.
- Must not exercise `resolveBackgroundCrafting`/`refreshCrewPool`'s Sub-Phase D-adjacent fields (`ShipRole`, ship-crew-slot assignment) — out of scope, not a gap.

## Testing Requirements

- Run the full verification sweep together: `dotnet test`, Unity `EditMode`, Unity `PlayMode`, `npm test`.
- Specifically confirm the assign-to-craft claim: a crew member's own tier reaching `Crafter.Craft` as the crafter-tier argument, producing a result attributable to that tier (not the player's own craft, and not a hardcoded tier).
- Confirm `FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` pass unmodified with the sixth panel present.

## Definition of Done

- Sub-Phase C (Crew) is fully integrated: a player can open `MvpLoop.unity`, hire a crew member, assign them to craft (their tier visibly driving the craft's variance the same way the player's own manual craft does), pay upkeep, dismiss, and purchase capacity.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every Sub-Phase C box checked.

---

## Integration report

**Sub-Phase C's Definition of Done is met.** All four agents' outputs (48-51) integrate correctly; the Crew panel drives real hire/upkeep/dismiss/capacity/assign-to-craft actions through the existing loop, and nothing about Sub-Phases A/B's own integration regressed.

1. **Assign-to-craft claim, directly confirmed**: `CrewPanel.AssignToCraft` builds a `CraftAction` from real Inventory materials and calls `AssignToCraftSimulation.AssignToCraft(member, craftAction)`, which passes `member.Tier` (not any player-selected tier) as `Crafter.Craft`'s `crafterTier` argument — the exact same function and parameter position the player's own manual `CraftPanel.TryCraft` uses with a `TierPicker`-selected tier. `CrewPanelTests.AssignToCraft_ConsumesInventoryAndActivatesTheCrewMember` proves the real materials are consumed and the member's `Status` flips to `Active`; Agent 50's own `AssignToCraftMatchesTypeScript` parity cases prove the underlying formula (crew tier in, craft result out) agrees with the TypeScript source at two different tiers. Together these close the checklist's literal question: assigning crew to a craft action does affect `craft()`'s output in the Unity build, driven by the crew member's own tier, the same way it does in TypeScript.
2. **Regression proof, reused unmodified**: `FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` needed zero changes and still pass with the sixth panel present — including `UiFactory.ClearChildren`'s first-ever dynamic-rebuild UI pattern, proving it doesn't destabilize the surrounding static-panel scene.
3. **No gaps found.** No upstream agent's contract was violated. One scope boundary made explicit rather than silently decided: crew-assisted crafts use a fixed Blue schematic tier rather than a second `TierPicker`, and `CrewMember.ShipRole`/ship-crew-slot assignment are schema-only placeholders until Sub-Phase D — both exactly as Agent 48/51's own contracts state.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 624/624 passed (591 through Sub-Phase B + 24 Crew parity cases + 9 Crew direct unit tests).
- Unity `EditMode`: 40/40 passed (33 through Sub-Phase B + 7 new `CrewPanelTests`).
- Unity `PlayMode`: 2/2 passed, both unmodified from Sub-Phase A.
- `npm test` (the TypeScript source Sub-Phase C ports from, unaffected by this migration): 687/687 passed.

**Migration Phase 2 Sub-Phase C (Crew) is complete.** `hireCrew`, `dismissCrew`, `payUpkeep`, `checkAttrition`, `purchaseCapacity`, `refreshCrewPool`, `assignToCraft`, and `resolveBackgroundCrafting` are all ported to C#, proven numerically identical to the TypeScript source, and driving a real Unity scene a player can open and click through. Sub-Phases D-F (Ships/Travel → Planet Ownership → Combat) are out of this document's scope — see `docs/unity-migration-phase2-checklist.md`.
