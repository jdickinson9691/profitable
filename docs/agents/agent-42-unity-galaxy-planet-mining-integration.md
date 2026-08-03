# Agent 42: Unity Galaxy/Planet/Mining Phase Integration Agent

**Creation order:** Sixth and last in Migration Phase 2, Sub-Phase A. Depends on all five prior agents' completed outputs (38-41).

## Responsibility

Wire everything together and verify Sub-Phase A actually works end-to-end in Unity — mirrors Agent 36's own role for Migration Phase 1 exactly (`docs/agents/agent-36-unity-migration-phase1-integration.md`): verification and integration, not new construction. Confirms Agent 40's parity proof holds all the way through the real presentation layer (Agent 41), not just in isolated `dotnet test` runs.

## Inputs

All five prior agents' completed outputs:
- Agent 38: `Planet`/`Galaxy`/`PlanetType`/`PlanetPosition` schema, the five new constant tables.
- Agent 39: `SeededRandom`, `GalaxyGenerator`, `PlanetGenerator`, `ResourceSubsetSelector`, `PlanetQualityRoller`, `PlanetResourceCycle`, `AggregateTierResolver`.
- Agent 40: 23-case real-content parity corpus (`galaxyCases`, `planetResourceCycleCases`, `gcprCases`) plus 14 direct unit tests, all passing against the TypeScript source.
- Agent 41: `GalaxyState.cs`, the rewritten `MapPanel.cs`/`GatherPanel.cs`, updated `GatherPanelTests.cs`/`MvpLoopSceneSmokeTest.cs`.

Also, directly: `Assets/Tests/PlayMode/FullLoopClickThroughTest.cs` (Agent 36's own real-click-through test) — confirmed to need **zero modification** for Sub-Phase A, and reused here as this sub-phase's own end-to-end proof rather than writing a second, duplicate one. It already clicks `"Button_Gather Igneous Ore"`, `"Button_Gather Autunite Crystal"`, `"Button_Gather Hydrogen Gas"` by name; those exact resources and labels survive Agent 41's rewrite unconditionally via the tutorial guarantee (`PlanetResourceCycleConstants.TutorialGuaranteedResourceIds`), so the same test now also proves the real generated galaxy's starting planet, not a hardcoded one, drives the click-through correctly.

## Outputs

### Integration report (below)

This document's own Definition of Done section, filled in after running the full verification sweep.

## Must NOT Do

- Must not introduce new game logic, new formulas, or new content to "make things work" — a gap found here is reported and attributed to the specific upstream agent whose contract wasn't fully met, not patched around directly in this agent's own files.
- Must not write a second real-click-through PlayMode test when `FullLoopClickThroughTest.cs` already exercises the real scene against the now-galaxy-backed `GatherPanel` without modification — duplicating it would test the same wiring twice for no added confidence.
- Must not exercise Sub-Phase D (travel) or Sub-Phase E (persisted ownership) — `GalaxyState.cs`'s in-memory `ColonistCount`/`Discovered` overrides are Agent 41's own explicitly-scoped stopgap, not a claim that those sub-phases are done.

## Testing Requirements

- Run the full verification sweep together, not just individually across separate sessions: `dotnet test` (`ProfitableCore.Tests`), Unity `EditMode`, Unity `PlayMode`, and `npm test` (confirms the TypeScript source Sub-Phase A ports from is unaffected).
- Confirm `FullLoopClickThroughTest.cs` passes unmodified against the real generated galaxy.
- Confirm `MvpLoopSceneSmokeTest.cs`'s updated starting-planet-name assertion passes against whatever `GalaxyState.StartingPlanet.Name` actually is at runtime (not a stale literal).

## Definition of Done

- Sub-Phase A (Galaxy, Planet, Mining) is fully integrated: a player can open `MvpLoop.unity`, press Play, see a real 50-planet generated galaxy on the Map panel, and gather from the starting planet's real current-cycle resources through to a completed refine/craft loop.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every Sub-Phase A box checked.

---

## Integration report

**Sub-Phase A's Definition of Done is met.** All five agents' outputs (38-41) integrate correctly; the real generated galaxy drives the Map and Gather panels, and the existing gather → refine → craft loop still completes end-to-end through it.

1. **Presentation layer proof**: `MapPanel` shows the real 50-planet galaxy (seed `"unity-mvp-galaxy"`) with the starting planet marked and its tier/type/position shown, replacing the static "Delta Rigelus" label. `GatherPanel` builds its buttons from `PlanetResourceCycle.GetCurrentPlanetResources()`'s real output, read once at construction time — confirmed by `RepeatedGatherProducesIdenticalQuality` (new in Agent 41's `GatherPanelTests.cs`), which would fail if any click still rolled a fresh quality.
2. **Real click-through, reused unmodified**: `FullLoopClickThroughTest.cs` (Agent 36, Migration Phase 1) needed zero changes and still passes — it clicks `"Button_Gather Igneous Ore"` (twice), `"Button_Gather Autunite Crystal"`, `"Button_Gather Hydrogen Gas"` by exact name, all three guaranteed present and correctly labeled by the tutorial guarantee regardless of this galaxy's actual roll, then completes Refine and Craft with a definitive logged outcome. This is the strongest proof available that Sub-Phase A's galaxy/planet/mining port is wired correctly into the existing, already-proven loop, not just self-consistent in isolation.
3. **No gaps found.** No upstream agent's contract was violated. One scope boundary made explicit rather than silently decided: `GalaxyState.cs` deliberately does not port `galaxyState.ts`'s `SaveSystem` persistence, `secondaryDiscoveredPlanet`, or discovery-by-travel (Sub-Phase D), nor `planetOwnershipState.ts`'s full persisted bootstrap colonization (Sub-Phase E) — it applies only the minimal in-memory `Discovered`/`ColonistCount` overrides Sub-Phase A itself needs, exactly as Agent 41's own contract states.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 541/541 passed (504 Migration Phase 1 + 37 Sub-Phase A: 23 parity + 14 direct unit tests).
- Unity `EditMode` (`Unity.exe -batchmode -runTests -testPlatform EditMode`): 28/28 passed (27 from Phase 1 + 1 new `RepeatedGatherProducesIdenticalQuality`).
- Unity `PlayMode` (`-testPlatform PlayMode`): 2/2 passed — `MvpLoopSceneSmokeTest` (updated assertion) and `FullLoopClickThroughTest` (unmodified).
- `npm test` (the TypeScript source Sub-Phase A ports from, unaffected by this migration): 687/687 passed.

**Migration Phase 2 Sub-Phase A (Galaxy, Planet, Mining) is complete.** `generateGalaxy`, `generatePlanet`, resource-subset selection, planet-scoped quality rolling, and the reset-cycle/tutorial-guarantee logic are all ported to C#, proven numerically identical to the TypeScript source (Agent 40's 23-case real-content parity corpus), and driving a real Unity scene a player can open and click through. Sub-Phases B-F (Trading → Crew → Ships/Travel → Planet Ownership → Combat) are out of this document's scope — see `docs/unity-migration-phase2-checklist.md`.
