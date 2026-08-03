# Agent 11 (Amendment): Trading Core — Trading Counterparty (Instant Sell)

**Status:** Amendment to the existing Agent 11 (`agent-11-trading-core.md`), not a new agent. Every function Agent 11 already implements (`createListing`, `purchaseListing`, `applyDrift`, `applyRecovery`, `getGlobalPrice`, `expireListings`) is unchanged — this file documents what's added on top.

**Creation order:** First in this amendment pair, before the Agent 13 amendment. Fixes the verified single-player self-trade dead end found in `docs/profitable-tradewars-alignment.md` and locked in `profitable-design-questions.md`'s "Trading Counterparty" section.

## Responsibility

Add two listing-free instant-sell functions — `sellToMarket()` (planetary) and `sellToGlobalMarket()` (global) — so a solo player can sell inventory indefinitely instead of only until the seed-market listings expire. Neither creates a `Listing`; neither needs a counterparty.

## Inputs

- `profitable-design-questions.md`'s "Trading Counterparty" section for the exact decisions.
- `docs/functional-agents/planetary-markets.md`/`galactic-market.md` for the consolidated contract.
- `TRANSACTION_FEE_PERCENT` (existing), `applyDrift()` (existing), `getGlobalPrice()` (existing) — reused as-is, never reimplemented.

## Outputs

### `sellToMarket(itemInstance: ResourceInstance, quantity: number, marketState: PlanetMarketState, wallet: Wallet, sellerPlayerId: string): SellToMarketResult`

**Simplified from the original design entry's speculative `now?` parameter** — dropped during implementation: nothing in this function's output is time-dependent (no `expiresAt`, no `createdAt`), unlike `createListing()`'s genuine need for a clock. An unused parameter existing only for signature-consistency with other functions isn't this codebase's style; `sellToGlobalMarket()` below is the same.

New file, `src/trading/sellToMarket.ts`.

- `totalValue = quantity * marketState.currentPrice`, `feeDeducted = totalValue * TRANSACTION_FEE_PERCENT`, `proceedsToSeller = totalValue - feeDeducted` — exactly `purchaseListing()`'s fee shape.
- `updatedWallet = { ...wallet, credits: wallet.credits + proceedsToSeller }` — this function credits the wallet itself and returns it updated, unlike `purchaseListing()`'s raw-numbers-only return (mirrors `refuelShip()`'s self-contained shape, per `ship.md`).
- `updatedMarketState = applyDrift(marketState, quantity, "sell")` — no new drift logic; `"sell"` already means "added supply, price drops" per `drift.ts`'s own existing direction semantics.
- No tier restriction — planetary markets already allow tier 6-7 items.
- **Throws**, does not return a typed rejection, for `quantity <= 0` — the only failure mode, a contract violation a correctly-built UI should never trigger (mirrors `createListing()`'s throw-only posture, not `purchaseListing()`'s `Result` union, since there's no normal business-rejection case for selling your own inventory).

### `sellToGlobalMarket(itemInstance: ResourceInstance, quantity: number, marketStates: PlanetMarketState[], wallet: Wallet, sellerPlayerId: string): SellToGlobalMarketResult`

New file, `src/trading/sellToGlobalMarket.ts`.

- Pricing: `getGlobalPrice(itemInstance.resource.id, "sell", marketStates)` — reused as-is. Throws when it would (no planet currently trades the item) — propagated, not caught.
- `totalValue = quantity * sellPrice`, `feeDeducted`/`proceedsToSeller` same shape as above.
- `updatedWallet` same shape as above.
- **Throws** for `quantity <= 0` (same as `sellToMarket()`) and for `itemInstance.resource.itemTier !== undefined && itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER` — the latter enforces the tier ceiling independently, since this function never calls `createListing()`.
- **Drifts no `PlanetMarketState`.** Global price is derived, not owned — there is no specific planet's state to update. Returns no `updatedMarketState` field at all (not even `null` — there's nothing analogous to update, unlike `purchaseListing()`'s global-listing case which does return `updatedMarketState: null` because that function's return shape is shared with the planet case).

### New result types (`src/data/types/`)

```ts
export interface SellToMarketResult {
  quantitySold: number;
  totalValue: number;
  feeDeducted: number;
  proceedsToSeller: number;
  updatedWallet: Wallet;
  updatedMarketState: PlanetMarketState;
}

export interface SellToGlobalMarketResult {
  quantitySold: number;
  totalValue: number;
  feeDeducted: number;
  proceedsToSeller: number;
  updatedWallet: Wallet;
}
```

Not a discriminated union like `PurchaseResult` — both functions throw for their (small, contract-violation-only) failure modes instead, so every successful call returns this one shape directly, same as `createListing()` returning `Listing` directly.

## Must NOT Do

- Must not create a `Listing` as a side effect of either function — the whole point is a listing-free transaction.
- Must not give either function its own drift/pricing formula — reuse `applyDrift()`/`getGlobalPrice()`/`TRANSACTION_FEE_PERCENT` exactly.
- Must not let `sellToGlobalMarket()` mutate or return any `PlanetMarketState` — global price has no owned state.
- Must not let `sellToGlobalMarket()` bypass `GLOBAL_LISTABLE_MAX_ITEM_TIER`.
- Must not touch `createListing()`/`purchaseListing()`/`applyDrift()`/`applyRecovery()`/`getGlobalPrice()`/`expireListings()` — purely additive.
- Must not implement rendering, input, save/load, or audio.

## Testing Requirements (owned by this amendment's own test file)

- `sellToMarket()`: fee math matches `purchaseListing()`'s exactly for an equivalent quantity/price; drifts the market state down (`"sell"` direction); throws on non-positive quantity; never creates a `Listing`.
- `sellToGlobalMarket()`: fee math matches; throws for `itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER`; throws when `getGlobalPrice()` would; never creates a `Listing`; never returns/mutates any `PlanetMarketState`.
- Regression: `createListing`, `purchaseListing`, `applyDrift`, `applyRecovery`, `getGlobalPrice`, `expireListings` all provably unchanged.

## Definition of Done

- `sellToMarket()` and `sellToGlobalMarket()` implemented exactly per `docs/functional-agents/planetary-markets.md`/`galactic-market.md`.
- A solo player (single `playerId`) can sell indefinitely via either function — verified with a test scenario using only one player id throughout, the actual regression case this closes.
- Zero imports from any rendering, DOM, or browser-API library.
