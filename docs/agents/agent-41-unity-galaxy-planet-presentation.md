# Agent 41: Unity Galaxy/Planet/Mining Presentation Agent

**Creation order:** Fifth in Migration Phase 2, Sub-Phase A. Depends on Agent 39 (Unity Galaxy/Planet Simulation Core) and Agent 40 (Parity Validation), both complete. Follows Agent 35's own Unity Presentation conventions (`docs/agents/agent-35-unity-mvp-presentation.md`) rather than re-deriving new ones.

## Responsibility

Replace Agent 35's MVP-only assumption — a single hardcoded planet (Delta Rigelus), no travel, no real galaxy — with a real generated galaxy wherever Sub-Phase A's own scope reaches: the Map panel now shows the real galaxy, and the Gather panel is planet-aware, reading a fixed quality per resource for the current cycle instead of rolling fresh per click. Ship travel to any planet besides the starting one is still out of scope (Sub-Phase D); this agent only stops being MVP-only about *content generation*, not about *reachability*.

## Inputs

- `docs/agents/agent-35-unity-mvp-presentation.md` — the Presentation conventions this agent extends: code-driven UI (`UiFactory.cs`), one Scene with panel-swapping, panels as plain C# classes with a constructor `(Transform parent, ...)` and a public trigger method testable without simulating a real click.
- Agent 39's simulation code: `GalaxyGenerator.Generate`, `PlanetResourceCycle.GetCurrentPlanetResources`.
- `src/presentation/galaxyState.ts` and `src/presentation/scenes/GatherScene.ts` — the real TypeScript presentation-layer analogs, read for their actual behavior (not re-derived from GDD prose): `galaxyState.ts`'s starting-planet override pattern (`discovered: true`, plus the Colonist-Driven Production bootstrap floor), and `GatherScene.ts`'s "read `getCurrentPlanetResources()` once per visit, never re-roll per click" rule.
- `docs/functional-agents/mining.md` — states the architectural shift directly: "Quality rolling moved to planet.md... GatherScene reads `getCurrentPlanetResources()` once per visit instead of rolling at click time."

## Design decisions (necessary completions beyond a literal 1:1 port)

`src/presentation/galaxyState.ts` is a bigger file than Sub-Phase A's own scope: it also handles seed persistence through `SaveSystem`, a `secondaryDiscoveredPlanet` override (Phase 5/travel-demonstration concern), and discovery-by-travel (`markPlanetDiscovered`, Sub-Phase D's arrival/scan concern). None of that is ported here — `GalaxyState.cs` is scoped down to exactly what Sub-Phase A needs: generate a real galaxy and expose a starting planet the existing MVP loop can gather from.

- **`GalaxyState.cs` is session-only, no persistence, fixed literal seed (`"unity-mvp-galaxy"`).** Mirrors `Inventory.cs`'s own already-established "persistence is a later agent's job" scope limit (Agent 35's Must-Not-Do) rather than porting `galaxyState.ts`'s `SaveSystem`-backed seed persistence early. A fixed (not random) seed keeps the galaxy — and any test asserting on it — reproducible run-to-run despite having no save/load path yet.
- **The starting planet's `ColonistCount` is floored to `PlanetOwnershipConstants.MinimumColonistsToProduce` directly on the generated object**, rather than porting `planetOwnershipState.ts`'s full persisted `ensureBootstrapColonization()` side-table. That side-table's read/write/merge machinery is Sub-Phase E's own scope; without *some* floor here, though, the Colonist-Driven Production gate (ported early into `PlanetResourceCycle.GetCurrentPlanetResources`, Agent 38/39) would make the starting planet permanently ungatherable before Sub-Phase E exists to unblock it — a real playability regression, not just an unfinished feature, exactly the class of gap Agent 5's own MVP contract would never have allowed.
- **`Discovered` is forced `true` on the starting planet** — `PlanetGenerator.Generate()` always emits `false` (its own comment: "starting-planet override is a later agent's job"); this is that agent, same as `galaxyState.ts`'s own `{ ...rawStartingPlanet, discovered: true }`.
- **`GalaxyGenerator.Generate`'s `PlanetCount` is `50`**, matching `galaxyState.ts`'s real current alpha-scale constant (already parity-tested at this exact size by Agent 40's `galaxyCases`) rather than an arbitrary smaller demo number.
- **`MapPanel` lists every generated planet as plain text rows** (id/tier/type/position, starting planet marked), not a real interactive map — a proportionate match for "show a real galaxy exists" at this sub-phase's scope; a clickable/travelable map is Sub-Phase D's job.

## Outputs

### 1. `Assets/Scripts/Content/GalaxyState.cs` (new)

Lazy static class parallel to `GameContent.cs` (separate, not merged into it — `GameContent` stays scoped to the raw content catalog per Agent 35's own rule). Exposes `Galaxy` and `StartingPlanet` (`Galaxy.Planets[0]`, with the `Discovered`/`ColonistCount` overrides above applied once at generation time), plus a `ResetForTests()` hook matching `GameContent`'s own convention.

### 2. `Assets/Scripts/UI/MapPanel.cs` (rewritten)

Shows the real galaxy: planet count, seed, the starting planet's name/tier/type, and one line per planet (marked `*` for the starting planet, `-` otherwise) with tier/type/position. Replaces the static "Delta Rigelus" label entirely.

### 3. `Assets/Scripts/UI/GatherPanel.cs` (rewritten)

Reads `PlanetResourceCycle.GetCurrentPlanetResources(GalaxyState.StartingPlanet, GameContent.Loaded.Resources, nowMs, isStartingPlanet: true)` **once, at construction time** (matches `GatherScene.ts`'s own "read once per visit" rule — panel construction is this project's equivalent of a scene visit). Builds one button per resource id in the result's `ProducibleResourceIds` (dynamic count, no longer a fixed 3 — though the tutorial guarantee still keeps Igneous Ore/Hydrogen Gas/Autunite Crystal always present). `Gather(string resourceId)` looks up that resource's already-fixed `QualityMap` from the construction-time snapshot and adds it to `Inventory` — it never calls `QualityRoller.RollQuality()` itself; all rolling now happens inside `PlanetResourceCycle`, exactly matching the real TypeScript architectural shift `mining.md` describes.

### 4. Test updates

- `Assets/Tests/EditMode/GatherPanelTests.cs` — updated to the new `Gather(string resourceId)` signature; added `RepeatedGatherProducesIdenticalQuality`, the one new behavior this rewrite introduces (previously: fresh roll per click, values could legitimately differ; now: fixed per cycle, must be identical).
- `Assets/Tests/PlayMode/MvpLoopSceneSmokeTest.cs` — the "Delta Rigelus" text assertion now checks for `GalaxyState.StartingPlanet.Name` instead of a literal string, since `MapPanel` no longer shows a hardcoded name.
- `Assets/Tests/EditMode/IntegrationTests.cs` and `Assets/Tests/PlayMode/FullLoopClickThroughTest.cs` — confirmed unmodified and still green: the former calls `QualityRoller.RollQuality()` directly against `GameContent.StartingPlanet` (Phase 1's own hardcoded Delta Rigelus, never routed through `GatherPanel`), and the latter clicks buttons by name (`"Button_Gather Igneous Ore"` etc.), which the tutorial guarantee keeps present and correctly labeled regardless of this galaxy's real roll.

### 5. `Assets/Plugins/ProfitableCore.dll`

Rebuilt (`dotnet build -c Release`) and re-copied — Agent 38/39's new Schema/Simulation types must be present in the plugin assembly for any of the above to compile against them.

## Must NOT Do

- Must not port `galaxyState.ts`'s `SaveSystem`-backed seed persistence, `secondaryDiscoveredPlanet` override, or discovery-by-travel (`markPlanetDiscovered`) — those depend on Sub-Phase D (travel/arrival) and belong with that sub-phase's own presentation agent, not here.
- Must not port `planetOwnershipState.ts`'s full persisted ownership side-table (`ensureBootstrapColonization`, `getPlanetOwnershipEntry`, `withPlanetOwnership`) — Sub-Phase E's scope. The `ColonistCount`/`Discovered` overrides here are a minimal, explicitly-scoped-down stopgap on the in-memory `Planet` object only.
- Must not let `GatherPanel` call `QualityRoller.RollQuality()` directly for any resource — every quality value must come from the `PlanetResourceCycle.GetCurrentPlanetResources()` snapshot taken at construction time.
- Must not add travel, trading, crew, ships, or combat UI — later sub-phases' scope.
- Must not change `GameContent.cs`'s `StartingPlanet` (Delta Rigelus) or any Phase-1-era MVP behavior `IntegrationTests.cs` depends on.

## Testing Requirements

- Unity EditMode tests (`Unity.exe -batchmode -runTests -testPlatform EditMode`): all pass, including the updated `GatherPanelTests` and unmodified `IntegrationTests`.
- Unity PlayMode tests (`-testPlatform PlayMode`): both pass — `MvpLoopSceneSmokeTest` (updated assertion) and `FullLoopClickThroughTest` (unmodified, still clicks through the real scene end-to-end using the dynamically-generated galaxy's starting planet).
- `dotnet test` from `unity/`: 541/541 still passing (no `ProfitableCore` logic changed by this agent, only consumed).

## Definition of Done

- A player can open `MvpLoop.unity`, press Play, and see the Map panel show a real 50-planet generated galaxy (not "Delta Rigelus" as static text) with the starting planet marked.
- Gather panel shows buttons for whatever the starting planet's current cycle actually produces (always including the 3 tutorial-guaranteed resources), and repeated gathers of the same resource return identical quality — proving quality is read from the cycle snapshot, not rolled per click.
- Zero quality/tier rolling logic in any panel script — a search for `RollQuality`/`Random` calls in `Assets/Scripts/UI/` should return nothing beyond `PlanetResourceCycle`'s own already-fixed results being read.
- All three test layers (`dotnet test`, EditMode, PlayMode) green.
- Agent 42 (Phase Integration) can close out Sub-Phase A without finding a wiring gap here.
