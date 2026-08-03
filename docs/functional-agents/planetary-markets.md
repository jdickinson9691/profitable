# Functional Agent: Planetary Markets

**Status: existing system, documented as-built — including the Trading Counterparty fix, now built.** Consolidates the planet-local trading slice of Agent 11 (core), Agent 13 (presentation), Agent 14 (content), plus Agent 11/13's Trading Counterparty amendments (`agent-11-amendment-trading-counterparty-core.md`, `agent-13-amendment-trading-counterparty-presentation.md`). Sibling to `galactic-market.md` (same core file, `src/trading/`, different function set) — split here because they're presented on two different screens (`MarketScene` vs. `GlobalMarketScene`) with genuinely different rules (tier restriction, drift, season/emergency all apply to planetary markets only).

**Verified gap, found via `docs/profitable-tradewars-alignment.md`'s comparison against TradeWars 2000/2002's permanent-NPC-port model, now fixed:** in single-player mode there is exactly one `playerId` (`PLAYER_ID`, `src/presentation/tradingState.ts`). `purchaseListing()`'s self-trade rejection (below) meant **a player could never buy their own listing**, and since no other player exists, **nothing else could either** — every listing created via `MarketScene`'s sell action was permanently unpurchasable past the one-time `SEED_MARKET_PLAYER_ID` seed listings. **Fixed** with `sellToMarket()` (below) — a listing-free instant sell, wired into `MarketScene` as a `> Sell Now` action alongside the existing `> List` action.

## Responsibility

List and purchase items at a specific planet's market, with price drift/recovery, seasonal swings, and emergencies — all live-computed, never cached.

## Inputs

- `ResourceInstance`, `Wallet` (`src/data/types/wallet.ts`), `PlanetMarketState` (`src/data/types/planetMarketState.ts`) — the mutable per-planet-per-item price state (`{ planetId, itemId, currentPrice, basePrice }`).
- `content.tradingBasePrices` / `content.planetMarketPreferences` (`recipes-schematics.md`'s content-authoring sibling role, same file set pattern).

## Outputs

### `createListing(itemInstance, quantity, pricePerUnit, location, playerId, id, now?)` — `src/trading/createListing.ts`
Rejects (throws) a tier 6-7 item listed with `location: "global"` — `GLOBAL_LISTABLE_MAX_ITEM_TIER = 5` (`src/data/constants/tradingConfig.ts`); an item with no `itemTier` set is treated as unrestricted. Computes `marketTier` via `computeAggregateTier()` (straight average of the item's own 5 qualities, `src/simulation/aggregateTier.ts` — shared with Ship's `deriveShipTier()`-adjacent tier math). Sets `expiresAt` via `LISTING_EXPIRY_HOURS = 72`. `id`/`now` are caller-supplied (pure function, no hidden identity/clock).

### `purchaseListing(listing, quantityToBuy, buyerPlayerId, marketState)` — `src/trading/purchaseListing.ts`
Rejects self-trade (`buyerPlayerId === listing.createdByPlayerId`) as a hard rejection, not a soft warning. Rejects non-positive or over-quantity purchases. Deducts `TRANSACTION_FEE_PERCENT = 0.05` (removed from the economy, not paid to the seller). For a planet listing, requires and updates `marketState` via `applyDrift()`; a global listing requires `marketState === null` (no per-planet drift state exists for it) and returns `updatedMarketState: null`.

### `applyDrift(marketState, direction)` / `applyRecovery(marketState, elapsedHours)` — `src/trading/drift.ts`
Each unit bought/sold shifts `currentPrice` by `BASELINE_DRIFT_PERCENT = 0.02` (2%), diminishing on successive units within one call (not linear), bounded to `PRICE_FLOOR_PERCENT = 0.5` / `PRICE_CEILING_PERCENT = 1.5` of `basePrice`. `applyRecovery()` pulls `currentPrice` back toward `basePrice` at `PRICE_RECOVERY_PERCENT_PER_HOUR = 0.01` per elapsed hour, approaching but never overshooting.

### `getCurrentSeason`/`getSeasonalEffect`/`getSeasonalPriceMultiplier` — `src/trading/season.ts`
A planet's season cycles every `SEASON_CYCLE_HOURS = 12`, phase-offset per planet (not globally synced). An active season picks one cheap and one premium category from a given planet's live-traded categories, applying `SEASON_PRICE_SWING_PERCENT = 0.08` in opposite directions.

### `getActiveEmergency`/`getEmergencyPriceMultiplier` — `src/trading/emergency.ts`
Rolled per `EMERGENCY_CHECK_INTERVAL_HOURS = 24` window at `EMERGENCY_TRIGGER_CHANCE = 0.15`, lasting `EMERGENCY_DURATION_HOURS = 4` (always `<` the check interval — an active emergency can never bleed into the next window's own roll), applying `EMERGENCY_PRICE_PREMIUM_PERCENT = 0.3` to the affected category. No advance warning — the duration itself is the reaction window (`profitable-design-questions.md`, Galactic Map section).

### `sellToMarket(itemInstance, quantity, marketState, wallet, sellerPlayerId)` — **built**, `src/trading/sellToMarket.ts`
Credits the seller immediately at the planet's current live price — no `Listing`, no counterparty. `totalValue = quantity * marketState.currentPrice`, `feeDeducted = totalValue * TRANSACTION_FEE_PERCENT`, `proceedsToSeller = totalValue - feeDeducted` (exactly `purchaseListing()`'s fee shape, applied symmetrically). Returns the seller's updated `Wallet` (credited) — the same self-contained "takes a `Wallet`, returns it updated" shape `refuelShip()` (`ship.md`) uses, not `purchaseListing()`'s raw-numbers-only return. Drift: `applyDrift(marketState, quantity, "sell")` — no new drift logic; `"sell"` already means "added supply, price drops" from `drift.ts`'s own existing direction semantics. No tier restriction beyond what planetary markets already allow (tier 6-7 included; only global listings are tier-capped). **Throws rather than returning a typed rejection** — clarified on review, since this wasn't stated explicitly before: there's no normal business-rejection case for selling your own inventory (unlike `purchaseListing()`'s self-trade/over-quantity, which react to another player's independent action), so this function has no `Result` union at all, matching `createListing()`'s throw-only posture. **Global-market sibling: resolved, not deferred.** `galactic-market.md`'s identical self-trade structure was confirmed (not just plausible) to have the same gap on a later review pass, and now has its own fix, `sellToGlobalMarket()` — see that file. Deliberately **not** the same function with a global flag: global pricing is a derived, stateless value (`getGlobalPrice()`), so the global sibling drifts no `PlanetMarketState` at all, a real behavioral difference from this function, not just a different price source.

### `MarketScene` — `src/presentation/scenes/MarketScene.ts`
Planet-local listings (`> Buy 1`/`> Buy All`) + sell-from-inventory at a precomputed suggested price (current planet price, no manual price entry), now offering **both** `> List` (unchanged `createListing()` behavior) **and** `> Sell Now` (`sellToMarket()`) per inventory batch — implemented as additive, not a replacement, resolving the "implementation-time call" this file previously left open in favor of keeping both.

## Must NOT Do

- Must not implement order-book/bidding logic — a flat listing/buy model only, by design.
- Must not let global listings touch `PlanetMarketState`/drift at all — structurally separate, enforced by `purchaseListing()`'s `marketState === null` requirement for global listings.
- Must not cache or snapshot price state anywhere — every price-affecting function reads live state at call time (`getGlobalPrice()`'s sibling rule in `galactic-market.md` states the same thing; it's one shared discipline).
- Must not implement market manipulation *detection* — explicitly deferred to Multiplayer (`profitable-design-questions.md`), which doesn't exist yet.
- Must not implement rendering/DOM/browser-API code in any `src/trading/` file.
- **Must not give `sellToMarket()` its own drift formula or fee rule** — reuses `applyDrift()`/`TRANSACTION_FEE_PERCENT` exactly as `purchaseListing()` does; a second pricing mechanism for the same market would break the "one place a value changes" rule.
- **Must not create a `Listing` as a side effect of `sellToMarket()`** — the whole point is a listing-free transaction; a hidden auto-listing would silently reintroduce the counterparty dependency this fix exists to remove.

## Testing Requirements

- `createListing()`: tier 6-7 rejected only for `global` location; a missing `itemTier` is unrestricted; `marketTier` derives correctly; throws (not a soft failure) when every quality is null.
- `purchaseListing()`: self-trade always rejected; fee deducted exactly; planet purchases require and correctly update `marketState`; global purchases require `marketState === null` and return `updatedMarketState: null`.
- `sellToMarket()`: proceeds/fee match `purchaseListing()`'s exact fee math for an equivalent quantity/price; `marketState` drifts down (`"sell"` direction), verified against `applyDrift()`'s own existing tests rather than a new formula; never creates a `Listing`; works identically for a player with zero prior listings (the actual regression case this fixes).
- `applyDrift()`: diminishing-on-successive-units verified; floor/ceiling never exceeded under many consecutive units; never mutates the input state.
- `applyRecovery()`: zero elapsed time is a no-op; approaches but never overshoots `basePrice` from either direction.
- Emergency: duration never exceeds the check interval (structural invariant); no advance warning (active from the first instant of its window).

## Definition of Done

- A player can list an inventory item at a planet market and see it purchasable by another listing's non-creator; drift/recovery/season/emergency all visibly affect price over time and usage, matching their documented formulas exactly.
- Every price shown in `MarketScene` is sourced from a live call to these functions — never a cached or presentation-layer-recomputed value.
- A solo player can sell indefinitely via `sellToMarket()`, not just until the seed-market listings run out — the gap above is provably closed, not just documented.
