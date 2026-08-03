# Agent 61: Unity Planet Ownership Presentation Agent

**Creation order:** Fourth in Migration Phase 2, Sub-Phase E. Depends on Agent 59 (Simulation Core) and Agent 60 (Parity Validation), both complete.

## Responsibility

Add the `> Transport N Colonists` / `> Claim Planet` / `> Build Citadel` actions to `GatherPanel` (Sub-Phase A's own "whatever Unity scene covers `GatherScene`'s job"), backed by **real, working persistence** — the first actual `Adapters.ISaveSystem` use anywhere in this migration's Presentation layer.

## Inputs

- `docs/agents/agent-56-unity-ships-travel-presentation.md` — the immediately-preceding Presentation agent's own conventions.
- Agent 59's `ColonistTransporter`, `PlanetClaimer`, `CitadelBuilder`, `PlanetOwnershipMerger`.
- `unity/ProfitableCore/Adapters/FileSaveSystem.cs` (Phase 1, Agent 34) — real, working `ISaveSystem` backend, unused by Presentation until now.
- `src/presentation/planetOwnershipState.ts` — the real TypeScript precedent for the persisted side-table pattern, read directly.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`PlanetOwnershipState.cs` is the first `*State.cs` class in this migration to use real persistence, not session-only in-memory state.** Every prior one (`GalaxyState`, `MarketState`, `CrewState`, `ShipsState`) deliberately deferred `ISaveSystem` wiring to "a later phase." This isn't scope creep — Sub-Phase E's own Phase Integration requirement is explicit ("confirm colonizing/claiming/building... persists correctly across a reload"), unlike every earlier sub-phase's own deliberately-deferred persistence. `FileSaveSystem` is constructed against `Application.persistentDataPath` by default, with a `SetSaveSystem(ISaveSystem)` test-injection seam mirroring `FileSaveSystem`'s own constructor-injected-base-directory precedent ("swap implementation, keep interface") — EditMode tests inject a temp-directory-backed instance for isolation from a player's real save data.
- **`ISaveSystem.Load` returns a boxed `JsonElement`, not the real typed shape** — `FileSaveSystem.Load(key): object?` uses `JsonSerializer.Deserialize<object?>` internally (mirroring the TypeScript interface's own `unknown`-in/`unknown`-out contract), which for JSON object data actually returns a boxed `System.Text.Json.JsonElement`. `PlanetOwnershipState.Load()` re-serializes that `JsonElement` and deserializes it into the real `Dictionary<string, PlanetOwnershipEntry>` shape — a necessary extra step this `object?`-typed interface requires that a generic `Load<T>` wouldn't, but the interface itself (Agent 34's own contract) is not renegotiated here.
- **`GalaxyState`'s original colonist-floor stopgap (Sub-Phase A) is removed and replaced with a real call into `PlanetOwnershipState.EnsureBootstrapColonization`** — `GalaxyState.StartingPlanet.ColonistCount` is now always `null` on the raw object (matching `generatePlanet()`'s own real "never set by generatePlanet()" behavior); every caller that needs the live colonist count must go through `PlanetOwnershipState.WithOwnership(planet)` instead. `GatherPanel`'s constructor was updated accordingly — this is a real integration fix, not just an additive change, closing the gap Agent 41's own contract explicitly flagged as a deliberate stopgap pending this sub-phase.
- **`EnsureBootstrapColonization` is called unconditionally every session**, not gated behind an "is this a genuinely new galaxy" check the way `galaxyState.ts`'s own `isNewGalaxy` flag gates it — `GalaxyState` has no persistence of its own to make that distinction cheaply, and the floor-set-not-overwrite semantics (`max(existing, MinimumColonistsToProduce)`) make repeated calls provably harmless (a player who transported colonists past the floor is never clawed back).
- **Ownership actions require an owned ship docked at the starting planet**, resolved as `ShipsState.OwnedShips.FirstOrDefault(s => s.CurrentPlanetId == GalaxyState.StartingPlanet.Id)` — never fabricated, matching the real functions' own docking-required rejection. A freshly-purchased ship (Sub-Phase D's `ShipsPanel`) starts docked at the shipyard's own planet (`GalaxyState.StartingPlanet`), so this is reachable through the existing MVP loop without any special-casing.

## Outputs

### 1. `Assets/Scripts/Content/PlanetOwnershipState.cs` (new)

Real persisted side-table: `GetEntry(planetId)`/`SetEntry(planetId, entry)` (saves immediately), `WithOwnership(planet)`, `EnsureBootstrapColonization(planetId)`, `SetSaveSystem(ISaveSystem)` (test-injection seam), `ResetForTests()`.

### 2. `Assets/Scripts/Content/GalaxyState.cs` (updated)

Colonist-floor stopgap removed; `PlanetOwnershipState.EnsureBootstrapColonization` called instead when generating the galaxy.

### 3. `Assets/Scripts/UI/GatherPanel.cs` (updated)

Reads `PlanetOwnershipState.WithOwnership(GalaxyState.StartingPlanet)` instead of the raw planet. New ownership status line (colonists/citadel level/owner) plus `Transport 5 Colonists`/`Claim Planet`/`Build Citadel` buttons and their `TransportColonists(quantity)`/`ClaimPlanet()`/`BuildCitadel()` trigger methods. `BuildCitadel()` resolves the target level (`current + 1`, guarded at 3 to avoid triggering the core function's own out-of-range throw for a scenario a real UI would simply not offer) and the real material resource id/quantity from `Inventory` before calling `CitadelBuilder.BuildCitadel`, consuming the reported material from `Inventory` only after a success.

### 4. `Assets/Scripts/UI/MvpLoopBootstrap.cs` (updated)

`Log()` now also calls `_gatherPanel.RefreshOwnership()`.

### 5. `Assets/Tests/EditMode/GatherPanelTests.cs` (extended)

New cases: transport/claim/build each fail cleanly without a docked ship; transport succeeds and accumulates colonist count; claim succeeds immediately thanks to the bootstrap floor (no manual transport needed) and fails without ownership prerequisites; build-citadel fails before claiming and succeeds at Level 1 (no material required) after claiming. **`PlanetOwnershipState_PersistsAcrossASimulatedReload`** is the direct test of the checklist's own explicit requirement: claims a planet, resets the in-memory cache (`ResetForTests()`) while keeping the same on-disk temp directory, re-injects a fresh `FileSaveSystem` pointed at it (simulating a real app restart re-reading `Application.persistentDataPath`), and confirms the entry survives byte-for-byte.

## Must NOT Do

- Must not let `GatherPanel` compute any transport-cost/colonist-threshold/citadel-cost formula itself — every number traces back to a Simulation Core function call.
- Must not let any EditMode test touch the real `Application.persistentDataPath` — every test injects a temp-directory `FileSaveSystem` via `SetSaveSystem` and cleans it up in `TearDown`.
- Must not gate `EnsureBootstrapColonization` behind an "is this a new galaxy" check `GalaxyState` has no cheap way to answer — rely on the floor-set-not-overwrite semantics instead, exactly as designed.
- Must not fabricate a docked ship for the ownership actions — resolve one from `ShipsState.OwnedShips`, and fail cleanly (matching the real function's own rejection) when none exists.

## Testing Requirements

- Unity EditMode tests: all pass, including the new `GatherPanelTests` cases and the persistence-across-reload test.
- Unity PlayMode tests: both existing tests pass unmodified — `FullLoopClickThroughTest.cs`'s hardcoded `"Button_Gather Igneous Ore"`-style button names still resolve correctly with the new ownership section added below the gather buttons.
- `dotnet test`: unaffected (no `ProfitableCore` logic changed by this agent, only consumed).

## Definition of Done

- A player can open `MvpLoop.unity`, press Play, purchase a ship (Ships panel), then from the Gather panel transport colonists, claim the starting planet, and build its Citadel — all through real Simulation Core calls, persisted to a real save file that survives a Unity Editor domain reload.
- Zero formula logic in `GatherPanel.cs`'s new ownership methods.
- All three test layers green.
- Agent 62 (Phase Integration) can close out Sub-Phase E without finding a wiring gap here.
