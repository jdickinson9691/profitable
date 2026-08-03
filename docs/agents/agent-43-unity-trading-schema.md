# Agent 43: Unity Trading Schema Agent

**Creation order:** First in Migration Phase 2, Sub-Phase B. Depends on Agent 38 (Unity Galaxy/Planet Schema, for `PlanetType` reuse in `PlanetMarketPreference`) and Agent 32 (Unity Simulation Core, for `AggregateTierResolver`/`Qualities` reuse in `ListingFactory`, written by Agent 44).

## Responsibility

Port `src/data/types/{listing,listingExpiry,planetMarketPreference,planetMarketState,sellToGlobalMarketResult,sellToMarketResult,wallet}.ts`, `src/data/types/tradeDirection.ts`, `src/data/types/itemBasePrice.ts`, `src/data/types/purchaseResult.ts`, and `src/data/constants/tradingConfig.ts` to C#. Types and constants only — no formula logic (that's Agent 44's job).

## Inputs

- `docs/agents/agent-38-unity-galaxy-planet-schema.md` — established the nullable-Phase-2-field pattern this agent follows for its own new types.
- `docs/agents/agent-32-unity-simulation-core.md` — `CraftResult`/`CraftAccepted`/`CraftRejected`'s sealed-class-hierarchy idiom, reused verbatim for `PurchaseResult`/`PurchaseSucceeded`/`PurchaseRejected` and for the new `MarketLocation` union.
- The real TypeScript source files listed above, read directly (not re-derived from GDD prose).

## Design decisions (necessary completions beyond a literal 1:1 port)

- **`MarketLocation` (`"global" | { planetId: string }`) is a sealed class hierarchy** (`GlobalMarketLocation`/`PlanetMarketLocation`), not a nullable-`PlanetId`-on-one-class shape — same reasoning as `CraftResult`: preserves the TypeScript union's "you must check which case you have before reading case-specific data" property. `GlobalMarketLocation` exposes a shared `Instance` singleton since every global location is interchangeable and stateless.
- **`PurchaseResult` is a sealed class hierarchy** (`PurchaseSucceeded`/`PurchaseRejected`), directly mirroring `CraftResult`/`CraftAccepted`/`CraftRejected`'s already-established shape — an idiomatic shape change, not a meaning change, exactly the precedent Agent 32 set.
- **`TradingConfig`'s debug-tuning-panel constants are mutable `public static` properties (`{ get; set; }`), not paired `const` + `SetX()` methods.** The TypeScript source uses a mutable module-level `let` binding plus a setter function *because* ES module imports are live bindings that JS itself can't reassign directly from outside the module — every existing importer sees a value change on its next read without re-importing. C# has no import-binding restriction: a mutable public static property already gives every reader that same "always current" behavior, and any caller can already assign it directly, so a paired `SetX()` method would be pure ceremony with no functional purpose. Structural, non-tunable constants (`GlobalListableMaxItemTier`, `MaxItemTier`) stay plain `const`, exactly mirroring the TypeScript source's own const/`let` split. **This is the first sub-phase in this port to need this pattern** (Phase 1 and Sub-Phase A had no debug-tunable constants) — later sub-phases with their own `let`-based tunables (crew, ships/travel) should follow this same property-based translation, not reintroduce a `SetX()` wrapper.
- **Timestamps stay `long` (epoch milliseconds), not `DateTime`** — matches every other ported time value in this project (`PlanetResourceCycle`, `SeededRandom.GenerateSeed`) rather than introducing a new date/time representation partway through the migration.

## Outputs

### 1. New schema types (`unity/ProfitableCore/Schema/`)

`TradeDirection.cs` (enum), `MarketLocation.cs` (`MarketLocation`/`GlobalMarketLocation`/`PlanetMarketLocation`), `Listing.cs`, `PlanetMarketState.cs`, `Wallet.cs`, `PurchaseResult.cs` (`PurchaseResult`/`PurchaseSucceeded`/`PurchaseRejected`), `SellToMarketResult.cs`, `SellToGlobalMarketResult.cs`, `ListingExpiryResult.cs` (`ListingExpiryResult`/`ReturnAction`/`ReturnDestination`), `ItemBasePrice.cs`, `PlanetMarketPreference.cs`.

### 2. `unity/ProfitableCore/Constants/TradingConfig.cs` (new)

All fifteen `tradingConfig.ts` constants, split the same const/mutable-property way the source splits const/`let`.

## Must NOT Do

- Must not add any formula logic (drift, recovery, pricing, fees) to this file set — that's Agent 44's job. This agent is types and tunable numbers only.
- Must not model `MarketLocation`/`PurchaseResult` as a single class with nullable fields — breaks the "must check which case" property the TypeScript union and this project's own `CraftResult` precedent both enforce.
- Must not give the debug-tunable `TradingConfig` properties a paired `SetX()` method — a plain settable property already covers everything the TypeScript setter function exists to work around, and a wrapper method here would be needless ceremony, not a feature.

## Testing Requirements

- `dotnet build` succeeds with zero warnings/errors.
- Every new type is exercised by Agent 44's simulation code and Agent 45's parity tests — this agent has no functions of its own to unit-test directly.

## Definition of Done

- Every trading-related TypeScript type/constant Sub-Phase B needs has a C# equivalent, field-for-field, following this project's own established sealed-class-hierarchy and nullable-optional-field idioms.
- Agent 44 can port every `src/trading/*.ts` function against these types without needing to reopen this file set for a missing field.
