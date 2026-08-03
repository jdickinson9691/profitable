# Agent 46: Unity Trading Presentation Agent

**Creation order:** Fourth in Migration Phase 2, Sub-Phase B. Depends on Agent 44 (Simulation Core) and Agent 45 (Parity Validation), both complete. Follows Agent 35/41's own Unity Presentation conventions.

## Responsibility

Add a Market panel to the existing Unity MVP loop, letting the player sell gathered/refined/crafted resources for Credits. Scoped to the Trading Counterparty instant-sell functions (`SellToMarket`/`SellToGlobalMarket`) only — the full Listing create/browse/purchase flow needs another player's independent action to ever resolve (a listing you create can never be bought by you), and this single-player Unity MVP has no second player yet. That's exactly the dead end the real Trading Counterparty fix (`sellToMarket.ts`/`sellToGlobalMarket.ts`) was built to route around, so building the full multi-party Listing flow here would need a fake counterparty simulation this migration doesn't need yet.

## Inputs

- `docs/agents/agent-41-unity-galaxy-planet-presentation.md` — the immediately-preceding Presentation agent's conventions (a new `*State.cs` class parallel to `GameContent`/`GalaxyState`, panels as plain C# classes with a `Refresh()` method and public trigger methods, wired into `MvpLoopBootstrap`).
- Agent 44's `SellToMarketSimulation`/`SellToGlobalMarketSimulation`/`GlobalPrice`, Agent 43's `Wallet`/`PlanetMarketState`/`ItemBasePrice`.
- `content/tradingBasePrices.json` — confirmed every one of the 5 resources this MVP loop can ever produce (`igneous-ore`, `hydrogen-gas`, `autunite-crystal`, `radiant-alloy-bar`, `ion-forged-hull-plate`) has a real base price entry, so the panel's fixed button set has no gaps.

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`MarketState.cs` (new) is session-only, no persistence, single starting-planet market state per item** — same scope limit `GalaxyState.cs` already draws (no `SaveSystem` wiring; ship travel to any other planet is Sub-Phase D's job, so only one planet's `PlanetMarketState` per item can ever exist here). `Wallet` starts at a flat 100 credits, a presentation-layer stopgap (the TypeScript source has no single canonical "starting credits" value documented at this migration's scope either) — clearly a placeholder, not a balance decision, and easy to find/change later since it's one named constant.
- **`GetGlobalPrice`'s multi-planet "best across the galaxy" comparison is exercised against a genuinely single-element list** — the only planet currently reachable is also the only planet with a live `PlanetMarketState`, so `SellToGlobalMarket`'s call here is a real (if degenerate) use of the same function Sub-Phase D's later multi-planet travel will exercise more fully. Not a special case in the code — `MarketState.AllKnownMarketStatesFor` just happens to return one element today.
- **`MarketPanel`'s button set is fixed** (5 resources × 2 sell destinations = 10 buttons), not dynamic per-current-inventory-contents — matches Agent 35's own "fixed buttons for a small known set" convention rather than introducing dynamic UI-hierarchy rebuilding this project has no precedent for yet. `Refresh()` (called after every panel action, and from `MvpLoopBootstrap.Log()` after every gather/refine/craft/sell) updates only the status text, exactly `RefinePanel.Refresh()`'s own pattern.

## Outputs

### 1. `Assets/Scripts/Content/MarketState.cs` (new)

Lazy static class: `Wallet` (mutable, session-only), `GetOrCreateMarketState(itemId)` (seeds `PlanetMarketState.CurrentPrice = BasePrice` from the real `ItemBasePrice` on first access, then returns the same cached instance so drift persists across sells within the session), `SetMarketState`/`SetWallet` (post-sell updates), `AllKnownMarketStatesFor(itemId)`, `ResetForTests()`.

### 2. `content/tradingBasePrices.json`/`content/planetMarketPreferences.json` copied to `Assets/StreamingAssets/Content/`

Same "reuse as-is" convention as the other 5 content files, read by `MarketState.Load()` via `TradingContentLoader.LoadFromFiles(Application.streamingAssetsPath + ...)`.

### 3. `Assets/Scripts/UI/MarketPanel.cs` (new)

Wallet display, per-resource row (held quantity + current planet price) for all 5 known resources, `Sell {Name} (Planet)`/`Sell {Name} (Global)` buttons per row. `SellToPlanet(resourceId)`/`SellToGlobal(resourceId)` are the public trigger methods: take 1 unit from `Inventory`, call the real simulation function, write the result back to `MarketState`, log the proceeds/fee, refresh.

### 4. `Assets/Scripts/UI/MvpLoopBootstrap.cs` (updated)

Wires `MarketPanel` in as a fifth panel: a `Market` nav button, included in `ShowOnly()`'s panel set, refreshed from `Log()` alongside Refine/Craft.

### 5. `Assets/Tests/EditMode/MarketPanelTests.cs` (new)

Exercises `SellToPlanet`/`SellToGlobal` directly: fails cleanly with nothing to sell, sells one unit and credits the wallet by exactly `ProceedsToSeller`, and confirms a planet sale actually drifts `CurrentPrice` down (the one behavior a wiring test can prove without duplicating Agent 44's own formula tests).

## Must NOT Do

- Must not build the full Listing create/browse/purchase flow — no second player exists in this Unity MVP to ever resolve one; that's explicitly out of scope here (see Responsibility).
- Must not let `MarketPanel` compute price/fee/drift itself — every number comes from `SellToMarketSimulation`/`SellToGlobalMarketSimulation`/`GlobalPrice`, never recomputed in the panel.
- Must not wire `MarketState.Wallet`/market states through `Adapters.ISaveSystem` — session-only, same scope limit as `Inventory`/`GalaxyState`.
- Must not touch `GameContent.cs`, `GalaxyState.cs`, or any Sub-Phase A panel's existing behavior.

## Testing Requirements

- Unity EditMode tests: all pass, including the 5 new `MarketPanelTests`.
- Unity PlayMode tests: both existing tests (`MvpLoopSceneSmokeTest`, `FullLoopClickThroughTest`) pass unmodified — neither asserts an exact button count that the 11 new buttons (10 sell + 1 nav) would invalidate, and neither interacts with Market at all.
- `dotnet test`: unaffected (no `ProfitableCore` logic changed by this agent, only consumed).

## Definition of Done

- A player can open `MvpLoop.unity`, press Play, gather/refine/craft something, switch to the Market panel, and sell it for Credits via either the planet or global market button.
- Zero price/fee/drift logic in `MarketPanel.cs` — every number traces back to a Simulation Core function call.
- All three test layers green.
- Agent 47 (Phase Integration) can close out Sub-Phase B without finding a wiring gap here.
