# Agent 44: Unity Trading Simulation Core Agent

**Creation order:** Second in Migration Phase 2, Sub-Phase B. Depends on Agent 43 (Schema).

## Responsibility

Port `src/trading/{createListing,drift,season,emergency,globalPrice,purchaseListing,sellToMarket,sellToGlobalMarket,expireListings,loadTradingContent}.ts` to C#, exactly — formula logic only, no presentation, no persistence.

## Inputs

- Agent 43's schema/constants.
- `unity/ProfitableCore/Simulation/SeededRandom.cs` (Agent 39) — reused directly by `Season`/`Emergency`, not re-ported; both TypeScript sources import the same `createSeededRandom` Agent 39 already ported bit-for-bit.
- `unity/ProfitableCore/Simulation/AggregateTierResolver.cs` (Agent 39) — reused directly by `ListingFactory.CreateListing`.
- `unity/ProfitableCore/Simulation/ClampHelper.cs` (Phase 1) — reused directly by `Drift.ApplyDrift`.
- `unity/ProfitableCore/Content/ContentLoader.cs` (Agent 31) — the established "validation-rule translation, not schema-file reuse" pattern `TradingContentLoader` follows for `loadTradingContent.ts` (no AJV/JSON-Schema NuGet dependency, same as Phase 1's own reasoning).

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`CreateListing`/`PurchaseListing`/etc. live in classes named after their file, not their single exported function** (`ListingFactory.CreateListing`, not a static class named `CreateListing` with a method of the same name) — C# disallows a type and one of its own members sharing an identical fully-qualified path in the way that would read most naturally, so `ListingFactory`/`PurchaseListingSimulation`/`SellToMarketSimulation`/`SellToGlobalMarketSimulation`/`ExpireListingsSimulation` each carry a `Simulation`/`Factory` suffix distinguishing the class from its own primary method. `Drift`, `SeasonSimulation`, `Emergency`, `GlobalPrice` needed no such suffix since they don't have a single method matching the class's most obvious name.
- **`TradingContentLoader` is a new class, not an extension of `ContentLoader`** — mirrors the TypeScript source's own file split (`loadContent.ts` vs. `loadTradingContent.ts` are separate modules with separate schemas), and keeps Phase 1's `ContentLoader` untouched.
- **`Season`/`Emergency`'s "planet-local phase offset" reuses `SeededRandom.Create` with the exact same seed-string format** (`"{planetId}:season-phase"`, `"{planetId}:{season}:season-effect"`, `"{planetId}:emergency-window:{windowIndex}"`) as the TypeScript source — the seed string itself is part of the ported behavior (a different string would still "work" but would silently diverge from the TypeScript output for the same inputs, failing parity for no visible reason).

## Outputs (`unity/ProfitableCore/Simulation/`)

- `Drift.cs` — `ApplyDrift` (one-unit-at-a-time compounding, floor/ceiling clamped every step), `ApplyRecovery` (exponential decay toward `BasePrice`).
- `Season.cs` — `Season` enum, `SeasonalEffect`, `SeasonSimulation.GetCurrentSeason`/`GetSeasonalEffect`/`GetSeasonalPriceMultiplier`.
- `Emergency.cs` — `ActiveEmergency`, `Emergency.GetActiveEmergency`/`GetEmergencyPriceMultiplier`.
- `ListingFactory.cs` — `CreateListing` (tier-ceiling check for global listings, `AggregateTierResolver` for `MarketTier`, expiry computed from `TradingConfig.ListingExpiryHours`).
- `GlobalPrice.cs` — `GetGlobalPrice` (lowest planet sell + markup for buy; highest planet buy - discount for sell).
- `PurchaseListing.cs` — `PurchaseListingSimulation.PurchaseListing` (self-trade rejection, quantity validation, planet-vs-global `PlanetMarketState` requirement check, drift application).
- `SellToMarket.cs` / `SellToGlobalMarket.cs` — the Trading Counterparty instant-sell functions, both reusing `Drift`/`GlobalPrice` rather than duplicating price logic.
- `ExpireListings.cs` — `ExpireListingsSimulation.ExpireListings` (global → inventory return, planet → planet-pickup return, zero-quantity listings excluded from `Returned`).
- `unity/ProfitableCore/Content/TradingContentLoader.cs` — `Load`/`LoadFromFiles` for `tradingBasePrices.json`/`planetMarketPreferences.json`.

## Must NOT Do

- Must not duplicate `Drift.ApplyDrift`'s price-movement formula inside `PurchaseListing`/`SellToMarket` — both call the shared function, exactly matching the TypeScript source's own reuse.
- Must not duplicate `GlobalPrice.GetGlobalPrice` inside `SellToGlobalMarket` — same reuse rule.
- Must not "improve" `Season`/`Emergency`'s negative-time/edge-case behavior beyond what the TypeScript source actually does — this project ports bugs faithfully when found (per the migration's own §6 rule); no negative-`now` case is reachable by any real caller, so none was special-cased in either direction.
- Must not read `content/tradingBasePrices.json`/`content/planetMarketPreferences.json` through any path except `TradingContentLoader` — mirrors `ContentLoader`'s own "one sanctioned call site" rule.

## Testing Requirements

- Direct unit tests (`ProfitableCore.Tests/Simulation/TradingSimulationTests.cs`) covering every throw path real content can't reach: global-tier-ceiling violation, all-qualities-null `MarketTier` failure, planet-listing-missing-`MarketState`/global-listing-given-`MarketState` mismatches, non-positive-quantity rejections, `GetGlobalPrice`'s no-planet-trades-this-item failure.
- `ProfitableCore.Tests/Content/TradingContentLoaderTests.cs` (synthetic config, mirroring `loadTradingContent.test.ts`) and `TradingContentLoaderRealFilesTests.cs` (real `content/tradingBasePrices.json`/`content/planetMarketPreferences.json`, copied into `Fixtures/`).
- Agent 45's parity corpus is the primary correctness proof for the non-error paths — this agent's own direct tests exist to cover what that corpus structurally can't (error paths with no real-content trigger).

## Definition of Done

- Every `src/trading/*.ts` function (except `loadTradingContent.ts`'s AJV-specific validation mechanism, translated per Agent 31's own established pattern) has a byte-for-byte-equivalent C# port.
- `dotnet build`/`dotnet test` pass with zero warnings/errors.
- Agent 45 can generate a real-content parity corpus against every function here without finding a missing case.
