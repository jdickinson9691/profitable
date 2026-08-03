# Agent 56: Unity Ships & Travel Presentation Agent

**Creation order:** Fourth in Migration Phase 2, Sub-Phase D. Depends on Agent 54 (Simulation Core) and Agent 55 (Parity Validation), both complete.

## Responsibility

Add a Ships panel to the existing Unity MVP loop covering the real core ships/travel loop: purchase a ship from a shipyard pool, refuel it, check repair, initiate a voyage to a real second galaxy planet, and resolve arrival.

## Inputs

- `docs/agents/agent-51-unity-crew-presentation.md` — the immediately-preceding Presentation agent's own conventions (dynamic-rebuild UI via `UiFactory.ClearChildren`, a new `*State.cs` class, shared `MarketState.Wallet`).
- Agent 54's `ShipPurchaser`, `ShipRefueler`, `ComponentRepairResolver`, `VoyageInitiator`, `ArrivalResolver`, `ShipyardPoolRefresher`.
- `src/presentation/galaxyState.ts`'s own `secondaryDiscoveredPlanet` — the real TypeScript precedent for "travel needs at least one real reachable destination to demonstrate against," read directly rather than inventing a different travel-demo shape.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **Scoped to purchase → refuel → check-repair → travel → resolve-arrival only.** Deliberately excludes:
  - **Ship-crew-role assignment UI** (Pilot/Combat Engineer/Science Officer/Systems Engineer/Crafter) — `CrewPanel`'s roster and `ShipsPanel`'s ships are two different lists this agent doesn't cross-wire; `AssignToShipRole`/`GetCrewSlotsForShip` are proven at the Simulation Core/parity layers (Agents 54/55), not exercised through this panel's UI.
  - **Scanner purchase/scan UI** — `PerformScan`/`ScannerPool` exist and are parity-tested, but no scanner panel or scan button is built here.
  - **Combat/encounter resolution UI** — `ResolveEncounters`/`ResolveCombatChoice`/`InitiateCombat` were ported in Sub-Phase D as a schema/function dependency (Agent 53's own Design decisions), not as a claim that their presentation is in scope here. Sub-Phase F's own Presentation agent builds the attack/flee choice UI and pending-combat indicator.
  
  Each is a real, separate presentation surface with its own scope, the same reasoning Sub-Phase B's `MarketPanel` used to defer the full Listing flow (`agent-46-unity-trading-presentation.md`).
- **`GalaxyState.SecondaryDestinationPlanet` (new, `Galaxy.Planets[1]`, forced `Discovered = true`)** mirrors `galaxyState.ts`'s own `secondaryDiscoveredPlanet` exactly — the second planet in the generated list, existing solely as a travel destination (no colonist floor, unlike the starting planet — this planet isn't meant to be gathered from yet, only traveled to).
- **Only one active voyage is tracked at a time** (`ShipsState.ActiveVoyage`, a single nullable field, not a per-ship dictionary) — matches this MVP's existing "one thing at a time" simplicity (one `Inventory`, one `Wallet`, one crew pool) rather than building a multi-ship concurrent-voyage manager this sub-phase's own scope doesn't require.
- **`CheckRepair` always calls `ResolveComponentRepair` with an empty owned-crew list** (no Systems Engineer/Crafter/Citadel context) — real and correctly wired (exercises the same function, updates `LastRepairedAt` exactly as a real assigned-crew call would), but with zero repair-rate sources since this panel doesn't cross-reference `CrewPanel`'s roster for ship-role assignments (see the first bullet above).

## Outputs

### 1. `Assets/Scripts/Content/GalaxyState.cs` (updated)

`SecondaryDestinationPlanet` property added alongside `StartingPlanet`.

### 2. `Assets/Scripts/Content/ShipsState.cs` (new)

Session-only: `OwnedShips` (list), `GetOrRefreshShipyardPool(nowMs)` (lazy + staleness-checked, same pattern as `CrewState.GetOrRefreshPool`), `ActiveVoyage`, `ReplaceShip`/`SetShipyardPool`/`SetActiveVoyage`, `ResetForTests()`.

### 3. `Assets/Scripts/UI/ShipsPanel.cs` (new)

Wallet/voyage status line, a rebuilt-per-refresh shipyard candidate list (`Purchase {id}` per candidate) and owned-ships list (`Refuel`/`Check Repair`/`Travel` or `Resolve Arrival`, depending on whether a voyage is active, per owned ship). Public trigger methods: `PurchaseShip(candidateId)`, `RefuelShip(shipId, amount)`, `CheckRepair(shipId)`, `InitiateVoyageToSecondaryDestination(shipId)`, `ResolveArrival(shipId)`.

### 4. `Assets/Scripts/UI/MvpLoopBootstrap.cs` (updated)

Wires `ShipsPanel` in as a seventh panel: a `Ships` nav button, included in `ShowOnly()`, refreshed from `Log()`.

### 5. `Assets/Tests/EditMode/ShipsPanelTests.cs` (new)

Exercises every trigger method: purchase adds to owned ships and deducts the wallet (fails cleanly for an unknown candidate id), refuel increases fuel and deducts the wallet, check-repair sets `LastRepairedAt`, initiate-voyage deducts fuel and sets the active voyage, resolve-arrival correctly reports not-yet-due immediately after departure and fails cleanly with no active voyage for that ship. Voyage-related tests override the purchased ship's fuel capacity to a large fixed value before traveling — the shipyard pool's rolled tier (and therefore real fuel capacity, e.g. Grey's 50) is genuinely random per test run, and the real distance to `GalaxyState.SecondaryDestinationPlanet` could legitimately exceed a low-tier ship's range (a real routing constraint, not a bug) — these tests care about the wiring, not the fuel-capacity-vs-distance formula itself (Agent 55's job).

## Must NOT Do

- Must not let `ShipsPanel` compute any distance/travel-time/fuel-cost/repair-rate formula itself — every number traces back to a Simulation Core function call.
- Must not build ship-crew-role assignment, scanner, or combat/encounter UI — all three are explicitly out of scope here (see Design decisions).
- Must not introduce a second wallet — reuses `MarketState.Wallet`.
- Must not touch `GameContent.cs`, `MarketState.cs`, `CrewState.cs`, or any prior panel's existing behavior beyond `GalaxyState`'s additive `SecondaryDestinationPlanet` property and the additive nav-button/`ShowOnly()`/`Log()` wiring in `MvpLoopBootstrap`.

## Testing Requirements

- Unity EditMode tests: all pass, including the new `ShipsPanelTests`.
- Unity PlayMode tests: both existing tests pass unmodified with the seventh panel present.
- `dotnet test`: unaffected (no `ProfitableCore` logic changed by this agent, only consumed).

## Definition of Done

- A player can open `MvpLoop.unity`, press Play, purchase a ship from the Ships panel, refuel it, check its repair status, travel it to the second galaxy planet, and resolve arrival once the voyage completes.
- Zero formula logic in `ShipsPanel.cs`.
- All three test layers green.
- Agent 57 (Phase Integration) can close out Sub-Phase D without finding a wiring gap here.
