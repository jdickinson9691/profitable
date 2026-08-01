# Agent 35: Unity MVP Presentation Agent

**Creation order:** Depends on Agent 32 (Unity Simulation Core) and Agent 34 (Unity Infrastructure Adapters), both complete. First agent in this migration requiring the Unity Editor — see `unity/UNITY_EDITOR_SETUP.md` for how that was set up (Unity 6000.5.6f1, project at `unity/ProfitableUnity/`, added to the existing repo rather than a separate one).

## Responsibility

Port Agent 5's MVP scenes (`docs/agents/agent-05-presentation.md`) to Unity: a map screen, and simple screens for gathering, refining, and crafting. Same rule as the original — this agent owns everything the player sees and clicks, and nothing else. Every displayed value must be sourced directly from Agent 32's ported functions, never recomputed here.

**Scope is Agent 5's original MVP definition, not the current, much-evolved TypeScript presentation layer.** The live `src/presentation/` has accumulated Phase 2-5 and deferred-gap scenes (galaxy map, trading, crew, ships, travel, scanner, combat, debug panel, onboarding) since the MVP. None of that is in scope here — this agent ports exactly what Agent 5's contract specified: Delta Rigelus as the only location, gather/refine/craft against the MVP content set (Igneous Ore, Hydrogen Gas, Autunite Crystal, the Radiant Alloy Bar refining recipe, the Ion-Forged Hull Plate crafting recipe).

## Inputs

- `docs/agents/agent-05-presentation.md` — the original contract this agent ports.
- `unity/ProfitableCore/Simulation/` (Agent 32) — `QualityRoller.RollQuality`, `Refiner.Refine`, `Crafter.Craft`, `TierColorResolver.GetTierColor`. Called, never duplicated.
- `unity/ProfitableCore/Adapters/` (Agent 34) — available for future persistence/audio needs; not used by this agent's minimal scope (see Must NOT Do).
- `unity/ProfitableCore/Content/ContentLoader.cs` (Agent 31) — the only sanctioned path to the real `content/*.json` files.
- `tests/fixtures/{resources,recipes}.ts` — confirmed real MVP recipe quantities: Radiant Alloy Bar = 2x Igneous Ore + 1x Autunite Crystal; Ion-Forged Hull Plate = 1x refined-metal (durability >= 60 recommended) + 1x gas.

## Design decisions (necessary completions beyond Agent 5's literal wording)

Agent 5's contract describes Phaser *scenes* — a concept with no exact Unity equivalent at this project's current scale. Two deliberate simplifications, made explicit here rather than silently decided:

1. **One Unity Scene asset (`Assets/Scenes/MvpLoop.unity`), not four.** Map/Gather/Refine/Craft are four *panels* within it, shown/hidden by a shared nav bar, rather than four separate `.unity` files loaded via `SceneManager`. Phaser's own `Scene` class is a lighter-weight concept than a Unity Scene asset (asset loading, lighting, `Library/` cache entries); one Scene with panel-swapping is the more proportionate match for "minimal presentation" at Phase 1's scope, and avoids scene-transition plumbing this phase doesn't need yet. Revisit if a later migration phase's screen count makes a real multi-scene structure worth it.
2. **Fixed buttons for the MVP's small, known content set, not dynamic dropdowns/lists.** The MVP has exactly 3 gatherable resources and 7 tier colors — one button per option (mirroring this project's own TypeScript presentation idiom of monospace-text, button-per-row UI, e.g. `TradeMapScene.ts`) is simpler and just as complete as a generic selector widget would be, for a content set this small and this unlikely to grow within Phase 1's scope.

All UI is constructed in code (`Assets/Scripts/UI/MvpLoopBootstrap.cs`), not hand-placed via the Editor GUI — this project has no Unity MCP tooling available this session (`profitable-unity-migration-gdd.md` Section 1 names Unity MCP as the intended tooling; its absence here is a real environment gap, not a design choice), so Editor-driven scene authoring isn't available. Code-driven UI construction is fully scriptable, reviewable as ordinary C# diffs, and verifiable via Unity's batch-mode test runner (see Testing Requirements) without needing an interactive Editor session.

## Outputs

### 1. Content loading

`Assets/StreamingAssets/Content/{resources,recipes,refiningRecipes,schematics,planets}.json` — the real, current content files (same files Agent 31's `ContentLoader.Tests` fixtures copy, kept in sync the same way, not a trimmed MVP-only subset — matching the "reuse as-is" rule already established for the C# port). `GameContent.cs` loads them once via `ContentLoader.LoadFromFiles(Application.streamingAssetsPath + ...)`, exposing the full `LoadedContent` plus convenience lookups for the specific MVP-scope items this agent's screens use.

### 2. `ProfitableCore.dll` as a Unity plugin

Built via `dotnet build -c Release` and copied to `Assets/Plugins/ProfitableCore.dll` — Unity's standard mechanism for consuming a precompiled managed assembly (auto-detected and referenced by every script in `Assets/`, no `.asmdef` wiring required for a single plugin DLL at this scale). Not source-embedded — keeps `ProfitableCore`'s own independent `dotnet build`/`dotnet test` flow (Agents 31-34) completely unchanged; this agent only consumes the compiled output.

### 3. `Assets/Scripts/` — presentation code

- `Content/GameContent.cs` — loads content once (static, lazy), exposes `Planet StartingPlanet`, and resource/recipe lookups by id.
- `Content/Inventory.cs` — in-memory (session-only, no persistence — see Must NOT Do) list of gathered/refined `ResourceInstance` batches, grouped by resource id.
- `UI/TierPicker.cs` — a reusable row of 7 tier buttons (Grey-Gold) plus a `SelectedTier` property, shared by the Refine and Craft panels.
- `UI/MapPanel.cs` — static label showing `GameContent.StartingPlanet.Name` ("Delta Rigelus"). No travel, no other planets, no modifiers — matches Agent 5's own MVP scope exactly.
- `UI/GatherPanel.cs` — one button per MVP resource (Igneous Ore, Hydrogen Gas, Autunite Crystal). Each click calls `QualityRoller.RollQuality()` for that resource, adds the result to `Inventory`, and logs the rolled values with their tier colors (via `TierColorResolver.GetTierColor()` per quality).
- `UI/RefinePanel.cs` — shows current Igneous Ore/Autunite Crystal counts, a `TierPicker` for refiner tier, and a "Refine" button that consumes exactly the real recipe's quantities (2x Igneous Ore + 1x Autunite Crystal) if available, calls `Refiner.Refine()`, adds the resulting Radiant Alloy Bar batch (plus any refund units) to `Inventory`, and logs the result including `OutputTier` and `RefundUnits`.
- `UI/CraftPanel.cs` — shows current Radiant Alloy Bar/Hydrogen Gas counts, two `TierPicker`s (schematic, crafter), and a "Craft" button that consumes exactly 1x Radiant Alloy Bar + 1x Hydrogen Gas if available, calls `Crafter.Craft()`, and logs the result — including the rejection path (`CraftRejected.Reason`) if the durability threshold check fails, not just the happy path. **On rejection, the consumed materials are returned to `Inventory`**, matching `src/presentation/scenes/CraftScene.ts`'s own established "a rejected craft never happened" behavior — found by checking that file directly rather than assuming, since Agent 5's own contract doesn't mention it (added to the presentation layer after the MVP, but the underlying principle is the same one this port should preserve).
- `UI/MvpLoopBootstrap.cs` — builds the `Canvas`/nav bar/log text/panel hierarchy at runtime and wires the four panels together. The single `MonoBehaviour` placed in the scene.

### 4. `Assets/Scenes/MvpLoop.unity`

Minimal scene: one `GameObject` with `MvpLoopBootstrap` attached, a `Camera`, and an `EventSystem` (required for uGUI button input).

## Must NOT Do

- Must not reimplement or duplicate any formula logic locally — every quality/tier/refine/craft computation goes through `ProfitableCore.Simulation`, never recomputed in a panel script.
- Must not read `ContentLoader`'s internals or parse the content JSON files independently — `GameContent.cs` is the only call site that touches `ContentLoader`/raw JSON, mirroring Agent 5's own "content accessed exclusively through `loadContent()`" rule.
- Must not build any DOM-based UI — not applicable to Unity directly, but the equivalent rule holds: all UI renders through Unity's own UI system (uGUI), nothing routes through a `WebView`/browser control.
- **Must not wire `Inventory` through `Adapters.ISaveSystem` in this agent.** Agent 5's own Outputs never asked the MVP gather/refine/craft screens to persist state (no save/load requirement appears anywhere in its contract) — `Inventory` is deliberately session-only (matching the original Phaser MVP's own scope, before `SaveSystem` persistence was even wired into `gameState.ts`). Wiring persistence in in a later migration phase is a real, separate piece of work, not a silent gap here.
- Must not add gameplay beyond gather/refine/craft against the MVP content set — no travel, no trading, no crew, no combat. Those are later migration phases' scope, not this one's.

## Testing Requirements

Real Editor/batch-mode verification, not just written-and-assumed-correct code — the same standard every prior agent in this migration was held to:

- Unity Test Framework **EditMode** tests (`Assets/Tests/EditMode/`), run via `Unity.exe -batchmode -runTests -testPlatform EditMode -projectPath ... -testResults ...` and inspected for a real pass/fail result.
- `GameContentTests`: confirms the real content loads (60 resources, `StartingPlanet.Name == "Delta Rigelus"`, the specific MVP resources/recipes are found by id).
- Panel logic tests that call each panel's public trigger method directly (`GatherPanel.Gather(resourceId)`, `RefinePanel.TryRefine()`, `CraftPanel.TryCraft()`) rather than simulating actual pointer-click events on `Button` components — `Button.onClick` invokes the same C# method a real click would, so this proves the gather→refine→craft wiring is correct without needing input-simulation machinery Phase 1 doesn't otherwise need. Confirms: a gather result's quality values are in 1-100 (or null, never 0, for inapplicable qualities); a refine consuming real gathered ore/crystal produces a result whose tier is derived correctly; a craft with sufficient inputs succeeds and one with an insufficient/violating input is correctly rejected with a reason, not silently treated as success.
- No test recomputes expected values independently — every assertion compares the panel's displayed/logged state against calling `ProfitableCore.Simulation` directly with the same recorded inputs, the same "compare against the real function's output" discipline Agent 33's parity tests already established (not a fresh, separate proof — this agent's own C# calls are the same functions Agent 33 already validated against TypeScript, so this layer only needs to prove correct *wiring*, not formula correctness a second time).

## Definition of Done

- A player can open `Assets/Scenes/MvpLoop.unity`, press Play, and complete the full gather → refine → craft loop by clicking through this agent's UI alone.
- Every displayed value is sourced directly from `ProfitableCore.Simulation`'s function outputs — confirmed by the EditMode tests, not just visual inspection.
- `Unity.exe -batchmode -runTests` passes with zero failures.
- Zero formula/tier/quality logic duplicated in any panel script — a search for arithmetic on quality values outside `ProfitableCore` calls should return nothing beyond simple UI concerns (counting inventory batches, formatting numbers for display).
- Agent 36 (Integration) can build on this without needing to fix a wiring gap here.
