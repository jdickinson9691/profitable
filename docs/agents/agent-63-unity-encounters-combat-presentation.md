# Agent 63: Unity Encounters & Combat Presentation Agent

**Creation order:** First in Migration Phase 2, Sub-Phase F. Depends on Sub-Phase D's already-complete Schema/Simulation Core/Parity Validation for encounters and combat (agents 53-55) — this sub-phase adds only Presentation and Phase Integration, since `resolveEncounters.ts`/`resolveCombatChoice.ts`/`initiateCombat.ts` were ported early (their files live in `src/ships/`, alongside the rest of Sub-Phase D's own scope).

## Responsibility

Wire `EncounterResolver`/`CombatChoiceResolver` into `ShipsPanel`'s real `ResolveArrival` flow: opt into encounter/combat detection, apply resolved encounter outcomes (credits/resources) to the real `Wallet`/`Inventory`, and surface any detected pending combat as a real Attack/Flee choice in the Unity UI.

## Inputs

- `docs/agents/agent-56-unity-ships-travel-presentation.md`/`agent-61-unity-planet-ownership-presentation.md` — the immediately-preceding Presentation agents' own conventions.
- `unity/ProfitableCore/Simulation/ResolveArrival.cs`, `ResolveEncounters.cs`, `ResolveCombatChoice.cs`, `InitiateCombat.cs` (Sub-Phase D, agents 53-55) — already parity-proven, consumed here unmodified.
- `src/presentation/shipsState.ts`/equivalent UI flow the real TypeScript build uses for its own encounter/combat resolution, read for the real caller-responsibility contract (`resolveEncounters.ts`'s own doc comment: "this function only reports what happened... applying it is the caller's job").

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`ArrivalResolver.ResolveArrival`'s `destinationPlanet`/`resources`/`random` parameters are additive-optional** (Sub-Phase D's own design) — every earlier call site that omitted them still gets empty `Encounters`/`PendingCombats`, so opting in here is a pure addition, not a breaking change to Sub-Phase D's already-shipped behavior.
- **`ShipsState.PendingCombatEntry` carries the originating `Voyage`, not just the `CombatEncounter` and `ShipId`.** `ResolveArrival` clears `ActiveVoyage` immediately on arrival, but `ResolveCombatChoice` needs the original voyage's origin/destination planets (to resolve `originPlanet`/`currentPlanet`, deliberately reversed for the retreat leg) and cargo (carried into the retreat voyage unchanged) — without keeping the voyage around, a later `ResolveCombat` call would have nothing to reconstruct these from.
- **A new `ResolveKnownPlanet(planetId)` helper replaces the implicit assumption that a voyage always runs `StartingPlanet -> SecondaryDestinationPlanet`.** A retreat voyage runs the opposite direction, and both `ResolveArrival` (resolving the real `destinationPlanet` to pass into `ResolveEncounters`) and `ResolveCombat` (resolving `originPlanet`/`currentPlanet`) need to correctly identify either of the MVP's two known planets regardless of direction.
- **`ApplyEncounter(EncounterResult)` is the caller-responsibility half of `resolveEncounters.ts`'s own explicit contract**: `TradeOpportunityEncounterResult` credits the real `Wallet`; `DiscoveryEncounterResult` resolves the real `Resource` by id from `GameContent.Loaded.Resources` and adds a new 1-unit `ResourceInstance` (using the encounter's own rolled `Qualities`) to `Inventory`; a failed `HazardEncounterResult` debits the `Wallet`; a passed one only logs. This requires `ShipsPanel` to hold a reference to the shared `Inventory` for the first time — its constructor gained a new `Inventory inventory` parameter, and `MvpLoopBootstrap.cs`'s construction call was updated to pass the same shared instance every other panel already uses.
- **A `RandomFn? random = null` constructor parameter on `ShipsPanel`** is a test-injection seam, not a gameplay knob — real play always gets the default `System.Random`-backed roll (mirroring `ArrivalResolver`/`CombatChoiceResolver`'s own default-random convention), but it lets EditMode tests force a specific, assertable encounter/combat outcome instead of asserting only on genuinely-random results. This is the same "swap the implementation via constructor, keep the default for real use" shape `PlanetOwnershipState.SetSaveSystem` already established for `FileSaveSystem`.
- **A won combat leaves the ship exactly where the voyage delivered it — no automatic return-voyage UI.** Only the flee/lose retreat voyage (an automatic side effect `ResolveCombatChoice` itself produces) demonstrates a return trip; a full bidirectional travel system for a normal win is a real, deliberate scope limit for this sub-phase's Presentation, matching `InitiateVoyageToSecondaryDestination`'s own one-directional-by-design shape.

## Outputs

### 1. `Assets/Scripts/Content/ShipsState.cs` (updated)

New `PendingCombatEntry` (`CombatEncounter`, `ShipId`, `Voyage`) and `PendingCombats` list, reset by `ResetForTests()`.

### 2. `Assets/Scripts/UI/ShipsPanel.cs` (updated)

- Constructor gained `Inventory inventory` and optional `RandomFn? random = null` parameters.
- New `ResolveKnownPlanet(planetId)` helper.
- `ResolveArrival` now resolves the real `destinationPlanet` and passes it plus `GameContent.Loaded.Resources` and the injectable `_random` into `ArrivalResolver.ResolveArrival`; on a resolved arrival, applies every returned `EncounterResult` via the new `ApplyEncounter` and records every returned `CombatEncounter` into `ShipsState.PendingCombats`.
- New `ApplyEncounter(EncounterResult)` (private) applying Trade/Discovery/Hazard outcomes to `Wallet`/`Inventory`.
- New `ResolveCombat(combatEncounterId, choice)` (public trigger method) resolving a pending combat via `CombatChoiceResolver.ResolveCombatChoice`, updating the ship, the crew member benched on a loss (if any), and setting a new `ActiveVoyage` when a retreat voyage results.
- `Refresh()` now renders a pending-combat list with Attack/Flee buttons per entry.

### 3. `Assets/Scripts/UI/MvpLoopBootstrap.cs` (updated)

`_shipsPanel = new ShipsPanel(content, _inventory, Log);` — passes the shared `Inventory` `ShipsPanel` now needs.

### 4. `Assets/Tests/EditMode/ShipsPanelTests.cs` (extended)

New cases, all using the new `RandomFn` injection seam and a directly-constructed short (1-hour) `Voyage` to keep `ResolveEncounters`' own window count at exactly 1, regardless of the real inter-planet distance: `ResolveArrival_AppliesTradeOpportunityEncounterToWallet` (forces a Trade Opportunity roll, asserts the exact credited amount), `ResolveArrival_DetectsPendingCombatAndFleeInitiatesARetreatVoyage` (forces the arrival-combat-check roll to trigger, then resolves it via `"flee"` and asserts a retreat voyage back to the origin planet), and `ResolveCombat_FailsForUnknownPendingCombatId`.

## Must NOT Do

- Must not let `ShipsPanel` compute any encounter/combat formula itself — every roll and outcome traces back to `EncounterResolver`/`CombatChoiceResolver`/`InitiateCombat`, already parity-proven in Sub-Phase D.
- Must not build a return-voyage UI for a normal combat win — out of scope; only the automatic flee/lose retreat voyage demonstrates a return trip.
- Must not add ship-crew-role assignment UI here — `ShipsPanel`'s own Sub-Phase D scope note already excludes it, and `ResolveCombatChoice`'s pilot/combat-engineer lookups work correctly against `CrewState.Crew` with no assigned roles (resolving to "no bonus," not a crash), exactly as they did before this sub-phase.
- Must not make the new `RandomFn` constructor parameter change real gameplay behavior — it must default to the same `System.Random`-backed roll every other panel already uses when omitted.

## Testing Requirements

- Unity EditMode tests: all pass, including the three new `ShipsPanelTests` cases.
- Unity PlayMode tests: both existing tests pass unmodified.
- `dotnet test`: unaffected (no `ProfitableCore` logic changed by this agent, only consumed).
- `npm test`: unaffected (TypeScript source unmodified).

## Definition of Done

- A player can open `MvpLoop.unity`, travel a ship to the secondary planet, and — depending on what `ResolveArrival` genuinely rolls — see real credits gained/lost, a real resource discovered into `Inventory`, or a real pending combat they can Attack or Flee from, with a loss/flee producing a real automatic retreat voyage.
- Zero formula logic in `ShipsPanel.cs`'s new encounter/combat methods.
- All four test layers green.
- Agent 64 (Phase Integration) can close out Sub-Phase F, and the entire Migration Phase 2 checklist, without finding a wiring gap here.
