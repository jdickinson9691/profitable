# Agent 47: Unity Trading Phase Integration Agent

**Creation order:** Fifth and last in Migration Phase 2, Sub-Phase B. Depends on all four prior agents' completed outputs (43-46).

## Responsibility

Wire everything together and verify Sub-Phase B actually works end-to-end in Unity — mirrors Agent 36/42's own role for the prior phase/sub-phase exactly: verification and integration, not new construction. Confirms Agent 45's parity proof holds all the way through the real presentation layer (Agent 46), and confirms Sub-Phase A's own integration (Agent 42) still holds — a regression, not just new-feature correctness.

## Inputs

All four prior agents' completed outputs:
- Agent 43: `Listing`/`PlanetMarketState`/`Wallet`/`MarketLocation`/`PurchaseResult`/`ItemBasePrice`/`PlanetMarketPreference` schema, `TradingConfig`.
- Agent 44: `Drift`, `Season`, `Emergency`, `ListingFactory`, `GlobalPrice`, `PurchaseListingSimulation`, `SellToMarketSimulation`, `SellToGlobalMarketSimulation`, `ExpireListingsSimulation`, `TradingContentLoader`.
- Agent 45: 30-case real-content parity corpus plus 20 direct unit tests, all passing against the TypeScript source.
- Agent 46: `MarketState.cs`, `MarketPanel.cs`, `MvpLoopBootstrap.cs`'s fifth-panel wiring, `MarketPanelTests.cs`.

Also, directly: `Assets/Tests/PlayMode/FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` (Migration Phase 1/Sub-Phase A's own real-scene tests) — confirmed to need **zero modification** for Sub-Phase B, reused here as regression proof that adding a fifth panel didn't disturb the existing four.

## Outputs

### Integration report (below)

This document's own Definition of Done section, filled in after running the full verification sweep.

## Must NOT Do

- Must not introduce new game logic, new formulas, or new content to "make things work" — a gap found here is reported and attributed to the specific upstream agent whose contract wasn't fully met.
- Must not write a new real-click-through PlayMode test for Market specifically when `MarketPanelTests.cs` (EditMode) already exercises the real wiring and the existing PlayMode tests already prove the scene builds/runs correctly with the fifth panel present — a `FullLoopClickThroughTest`-style click-through that also clicks Market buttons is a reasonable *future* addition once Sub-Phase C+ adds more panels to click through, but isn't required to close Sub-Phase B out; the existing PlayMode coverage already proves the scene doesn't break.
- Must not exercise Sub-Phase D (travel, multi-planet market states) or the full Listing create/browse/purchase flow — both explicitly out of Agent 46's scope, not a gap to patch here.

## Testing Requirements

- Run the full verification sweep together: `dotnet test` (`ProfitableCore.Tests`), Unity `EditMode`, Unity `PlayMode`, and `npm test`.
- Confirm `FullLoopClickThroughTest.cs`/`MvpLoopSceneSmokeTest.cs` pass unmodified with the fifth panel present.
- Confirm `docs/unity-migration-phase2-checklist.md` has every Sub-Phase B box checked.

## Definition of Done

- Sub-Phase B (Trading) is fully integrated: a player can open `MvpLoop.unity`, press Play, gather/refine/craft, switch to Market, and sell for Credits via either the planet or global market.
- `dotnet test`, Unity `EditMode`, Unity `PlayMode`, and `npm test` all pass together as one verification sweep.
- `docs/unity-migration-phase2-checklist.md` has every Sub-Phase B box checked.

---

## Integration report

**Sub-Phase B's Definition of Done is met.** All four agents' outputs (43-46) integrate correctly; the Market panel drives real Credits/quantity changes through the existing gather → refine → craft loop, and nothing about Sub-Phase A's own integration regressed.

1. **Presentation layer proof**: `MarketPanel` shows all 5 known resources' held quantity and live planet price, and both `SellToPlanet`/`SellToGlobal` correctly move inventory to Credits — confirmed by `MarketPanelTests.cs`'s `SellToPlanet_DriftsThePlanetPriceDown` (proves the panel's sale actually reaches `Drift.ApplyDrift`, not a bypassed shortcut) and the wallet-credit-exactness assertions in both sell-path tests.
2. **Regression proof, reused unmodified**: `FullLoopClickThroughTest.cs` and `MvpLoopSceneSmokeTest.cs` (Migration Phase 1/Sub-Phase A) needed zero changes and still pass with the fifth panel present — the strongest available proof that adding Market didn't disturb Map/Gather/Refine/Craft's existing wiring.
3. **No gaps found.** No upstream agent's contract was violated. One scope boundary made explicit rather than silently decided: `MarketPanel` covers only the Trading Counterparty instant-sell functions, not the full Listing flow (no second player exists in this Unity MVP to ever resolve one) — exactly Agent 46's own stated scope.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 591/591 passed (541 through Sub-Phase A + 30 Trading parity cases + 20 Trading direct unit tests).
- Unity `EditMode` (`Unity.exe -batchmode -runTests -testPlatform EditMode`): 33/33 passed (28 through Sub-Phase A + 5 new `MarketPanelTests`).
- Unity `PlayMode` (`-testPlatform PlayMode`): 2/2 passed, both unmodified from Sub-Phase A.
- `npm test` (the TypeScript source Sub-Phase B ports from, unaffected by this migration): 687/687 passed.

**Migration Phase 2 Sub-Phase B (Trading) is complete.** `createListing`, `purchaseListing`, `drift`/`recovery`, `season`, `emergency`, `globalPrice`, `sellToMarket`, `sellToGlobalMarket`, `expireListings`, and `loadTradingContent` are all ported to C#, proven numerically identical to the TypeScript source (Agent 45's 30-case real-content parity corpus), and driving a real Unity scene a player can open and click through. Sub-Phases C-F (Crew → Ships/Travel → Planet Ownership → Combat) are out of this document's scope — see `docs/unity-migration-phase2-checklist.md`.
