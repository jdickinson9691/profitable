# Agent 51: Unity Crew Presentation Agent

**Creation order:** Fourth in Migration Phase 2, Sub-Phase C. Depends on Agent 49 (Simulation Core) and Agent 50 (Parity Validation), both complete.

## Responsibility

Add a Crew panel to the existing Unity MVP loop: hire from the starting planet's crew pool, pay upkeep, dismiss, assign an idle crew member to craft the existing Ion-Forged Hull Plate recipe, and purchase additional crew capacity.

## Inputs

- `docs/agents/agent-46-unity-trading-presentation.md` — the immediately-preceding Presentation agent's conventions.
- Agent 49's `HireCrewSimulation`/`DismissCrewSimulation`/`PayUpkeepSimulation`/`CheckAttritionSimulation`/`PurchaseCapacitySimulation`/`RefreshCrewPoolSimulation`/`AssignToCraftSimulation`, Agent 48's schema/`CrewConfig`.
- `unity/ProfitableUnity/Assets/Scripts/UI/CraftPanel.cs` (Agent 35) — the exact Ion-Forged Hull Plate recipe/material-consumption logic `CrewPanel.AssignToCraft` reuses, substituting the crew member's own tier for a player-picked crafter tier.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`UiFactory.ClearChildren` (new)** — every prior panel's button set is fixed once at construction; a crew roster and hire pool genuinely grow and shrink at runtime (hiring moves a candidate from the pool into the roster; dismissing removes one from the roster), which no existing panel needed to represent. `ClearChildren` destroys a transform's children via `Object.DestroyImmediate` outside Play mode (required so EditMode tests, which never enter Play mode, see the rebuilt hierarchy synchronously within the same test) and `Object.Destroy` inside it (required so Play mode's deferred destruction doesn't corrupt the hierarchy mid-callback) — Unity's own documented rule for which to call where, not a judgment call made up for this agent.
- **`CrewState.cs` shares `MarketState.Wallet`** rather than introducing a second wallet — hiring costs, upkeep, and capacity-expansion costs all spend the same player's Credits that gathering/selling already earns in this same session. Two independent wallets would silently double the player's spending power for no reason grounded in the design.
- **`CrewState.GetOrRefreshPool` re-rolls the pool when `LastRefreshedAt` is stale** (elapsed hours ≥ `CrewConfig.CrewPoolRefreshIntervalHours`), the same "dead pool never refreshes" fix this session's own earlier TypeScript work applied to `getCrewPool()`/`getShipyardPool()`/`getScannerPool()`. Porting the presentation layer without this check would silently reintroduce that exact regression in Unity even though the TypeScript side already has it fixed.
- **Crew-assisted crafts use a fixed Blue schematic tier**, not a second `TierPicker` widget — `CrewPanel`'s own scope is proving the hire→assign→craft wiring works, not adding a second independent tier-selection UI; the player's own manual `CraftPanel` already exposes schematic tier choice for the primary crafting path.

## Outputs

### 1. `Assets/Scripts/Content/CrewState.cs` (new)

Session-only: `Capacity` (starts at `CrewConfig.BaseCrewCapacity`/0 purchased), `Crew` (hired roster), `GetOrRefreshPool(nowMs)` (lazy + staleness-checked), `SetCapacity`/`SetPool`, `ResetForTests()`.

### 2. `Assets/Scripts/UI/UiFactory.cs` (updated)

`ClearChildren(Transform parent)` — see Design decisions.

### 3. `Assets/Scripts/UI/CrewPanel.cs` (new)

Wallet/capacity status line, a "Purchase Capacity" button, a rebuilt-per-refresh pool list (`Hire {id}` per candidate) and roster list (`Pay Upkeep`/`Dismiss`/`Assign to Craft` — the last only shown for idle members — per hired crew member). Public trigger methods: `Hire(candidateId)`, `PayCrewUpkeep(crewMemberId)` (also runs `CheckAttrition` afterward and removes a departed member), `Dismiss(crewMemberId)`, `AssignToCraft(crewMemberId)`, `PurchaseCapacity()`.

### 4. `Assets/Scripts/UI/MvpLoopBootstrap.cs` (updated)

Wires `CrewPanel` in as a sixth panel: a `Crew` nav button, included in `ShowOnly()`, refreshed from `Log()`.

### 5. `Assets/Tests/EditMode/CrewPanelTests.cs` (new)

Exercises every trigger method: hire adds to the roster and deducts the wallet, hiring an unknown candidate id fails cleanly, dismiss removes from the roster, paying upkeep immediately after hiring is correctly not-due, assign-to-craft consumes inventory and activates the crew member (and fails cleanly with materials missing, crew member staying idle), purchase-capacity increases capacity and deducts the wallet. Seeds the wallet with a large starting balance in `SetUp` specifically because the pool's rolled tier (and therefore hire cost) is genuinely random per test run with no fixed seed — a small balance would make "successful hire" flaky against an unlucky high-tier roll; that randomness itself is Agent 50's parity suite's concern, not this wiring test's.

## Must NOT Do

- Must not let `CrewPanel` compute any wage/cost/attrition/craft formula itself — every number traces back to a Simulation Core function call.
- Must not introduce a second wallet for crew-related spending — `MarketState.Wallet` is the one player wallet.
- Must not skip the pool-staleness re-roll — see Design decisions' regression-reintroduction risk.
- Must not touch `GameContent.cs`, `GalaxyState.cs`, `MarketState.cs`, or any prior panel's existing behavior beyond the additive nav-button/`ShowOnly()`/`Log()` wiring.

## Testing Requirements

- Unity EditMode tests: all pass, including the new `CrewPanelTests`.
- Unity PlayMode tests: both existing tests pass unmodified with the sixth panel present.
- `dotnet test`: unaffected (no `ProfitableCore` logic changed by this agent, only consumed).

## Definition of Done

- A player can open `MvpLoop.unity`, press Play, hire a crew member from the Crew panel, assign them to craft an Ion-Forged Hull Plate (given the right materials in Inventory), pay their upkeep, and dismiss them.
- Zero formula logic in `CrewPanel.cs`.
- All three test layers green.
- Agent 52 (Phase Integration) can close out Sub-Phase C without finding a wiring gap here.
