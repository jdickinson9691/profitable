# Functional Agent: Galactic Market

**Status: existing system, documented as-built — including the Trading Counterparty fix, now built.** Consolidates the global-market slice of Agent 11 (core, same `src/trading/` files as `planetary-markets.md`) and Agent 13 (presentation), plus their Trading Counterparty amendments. Split from Planetary Markets because it's a different screen (`GlobalMarketScene`) with genuinely different rules — no drift/season/emergency, a hard tier ceiling, and prices derived from live planet data rather than their own independent state.

**Verified gap, now fixed:** the same single-`playerId` self-trade dead-end `planetary-markets.md` found and fixed with `sellToMarket()` existed here too — `purchaseListing()`'s self-trade rejection applies identically to `location: "global"` listings, so a solo player could buy nothing they listed themselves, and nothing else existed to buy it either. **Fixed** with `sellToGlobalMarket()` (below), wired into `GlobalMarketScene` as a `> Sell Now` action.

## Responsibility

Derive a single galaxy-wide buy/sell price per item from all planets currently trading it, and let tier 1-5 items be listed/purchased globally (tier 6-7 stays planet-market-only, by design). Also provide a listing-free instant sell, mirroring `planetary-markets.md`'s `sellToMarket()`, so solo trading has a real global counterparty too.

## Inputs

- `PlanetMarketState[]` — the live collection across every planet (`planetary-markets.md` owns creating/updating these; this file only reads them).
- `createListing()`/`purchaseListing()` (`planetary-markets.md`) — reused as-is for `location: "global"`, never reimplemented here.

## Outputs

### `getGlobalPrice(itemId, direction, marketStates)` — `src/trading/globalPrice.ts`
`(itemId: string, direction: "buy" | "sell", marketStates: PlanetMarketState[]) => number`. Filters to planets currently trading the item; throws if none do (no silent fallback price). Buy price = `min(all planet prices) * (1 + GLOBAL_MARKET_MARKUP_PERCENT [0.1])`; sell price = `max(all planet prices) * (1 - GLOBAL_MARKET_DISCOUNT_PERCENT [0.1])` — structurally guarantees global buy never beats the best planet sell price and global sell never beats the best planet buy price, since it's a markup/discount **on top of** the extreme planet price, not an independent number. Pure and uncached — computed live at call time, the same "no caching" discipline `planetary-markets.md` states for drift.

### Tier restriction (shared constant, read here)
`GLOBAL_LISTABLE_MAX_ITEM_TIER = 5` (`src/data/constants/tradingConfig.ts`, owned by `planetary-markets.md`'s content but enforced at `createListing()` for both markets) — tier 6-7 items can never be listed with `location: "global"`; `createListing()` throws before a global listing can even be constructed. This file's `GlobalMarketScene` reinforces it at the UI level as defense in depth, never as the only enforcement point.

### `sellToGlobalMarket(itemInstance, quantity, marketStates, wallet, sellerPlayerId)` — **built**, `src/trading/sellToGlobalMarket.ts`
Credits the seller immediately at the derived global sell price — no `Listing`, no counterparty, mirroring `planetary-markets.md`'s `sellToMarket()`. **Pricing:** `getGlobalPrice(itemInstance.resource.id, "sell", marketStates)` (above), reused as-is — no second pricing formula. `totalValue = quantity * sellPrice`, `feeDeducted = totalValue * TRANSACTION_FEE_PERCENT`, `proceedsToSeller = totalValue - feeDeducted` (`purchaseListing()`'s exact fee shape). Returns the seller's updated `Wallet` (credited), same self-contained shape `refuelShip()` (`ship.md`) uses, not a raw-numbers-only return like `purchaseListing()`'s. **Throws, doesn't return a typed rejection** — for `itemInstance.resource.itemTier !== undefined && itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER` (mirrors `createListing()`'s own tier-restriction throw exactly, since this function bypasses `createListing()` entirely and must independently enforce the same ceiling — otherwise a tier 6-7 item could reach the global market through the instant-sell path even though it can never reach a `Listing`), and whenever `getGlobalPrice()` itself throws (no planet currently trades the item) — propagated, not caught or re-wrapped. **Drifts nothing** — see the Must-Not-Do below for why this is deliberate, not a missing feature.

### `GlobalMarketScene` — `src/presentation/scenes/GlobalMarketScene.ts`
Derived buy/sell price per `content.resources` entry (or "not currently traded anywhere" if `getGlobalPrice()` throws) + active global listings (`> Buy 1`/`> Buy All`) + list-globally-from-inventory, filtered to `itemTier <= 5` only (tier 6-7 inventory batches are excluded from this list entirely, not shown-then-rejected). Fixed 10cr/unit listing price (no suggested-price computation, unlike the planet market), now offering **both** `> List @ 10cr` (unchanged `createListing()` behavior) **and** `> Sell Now @ [derived price]cr` (`sellToGlobalMarket()`) per eligible batch — additive, matching `MarketScene`'s own resolution of the same choice. The "Sell Now" action is only rendered when `getGlobalPrice(..., "sell", ...)` doesn't throw for that item (i.e., some planet currently trades it), mirroring the derived-price display's own try/catch.

## Must NOT Do

- Must not let a tier 6-7 item reach a global listing through any path — enforced at `createListing()` (throws), reinforced at `GlobalMarketScene`'s UI (excluded from the listable set), never relying on only one of the two layers.
- Must not cache `getGlobalPrice()`'s result — every call re-derives from the live `marketStates` passed in; a stale cached global price would silently violate the "global never beats planet price" guarantee the moment any planet's price changed underneath it.
- Must not give global listings their own drift/season/emergency state — `planetary-markets.md`'s per-planet mechanics don't apply here; `purchaseListing()`'s `marketState: null` requirement for global listings is the structural enforcement.
- Must not implement rendering/DOM/browser-API code in `globalPrice.ts` or `sellToGlobalMarket.ts`.
- **Must not let `sellToGlobalMarket()` mutate any `PlanetMarketState`, directly or via `applyDrift()`** — found worth stating explicitly on review: `sellToMarket()`'s planetary version drifts a specific, owned `PlanetMarketState` down on a sale, and it would be an easy, plausible-looking mistake to copy that call here too. But global price has no state of its own to drift — it's re-derived from every planet's live price on each call — and drifting the one planet that happened to supply the `max()` price would make a global sale silently reach into a specific planet's independent economy, contradicting this file's own "no per-planet state" rule two bullets up.
- **Must not let `sellToGlobalMarket()` bypass `GLOBAL_LISTABLE_MAX_ITEM_TIER`** — it enforces the tier-6/7 ceiling independently (it does not call `createListing()`), so this must be checked directly inside `sellToGlobalMarket()` itself, not assumed inherited.
- **Must not create a `Listing` as a side effect of `sellToGlobalMarket()`** — same reasoning as `sellToMarket()`'s identical rule; a hidden auto-listing would silently reintroduce the counterparty dependency this fix removes.

## Testing Requirements

- `getGlobalPrice()`: buy price never beats the best planet sell price, sell price never beats the best planet buy price — an invariant stress test across many randomized `PlanetMarketState` sets, not just one hand-picked example; throws when no planet trades the item; only considers `PlanetMarketState` entries matching the requested `itemId`.
- `sellToGlobalMarket()`: proceeds/fee match `purchaseListing()`'s exact fee math for an equivalent quantity/price at the derived global sell price; throws for an `itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER` item; throws when `getGlobalPrice()` itself would (no planet trades the item); never creates a `Listing`; **no `PlanetMarketState` in the passed-in array is mutated or returned as changed** — the one behavior that must differ from `sellToMarket()`'s otherwise-parallel test suite; works identically for a player with zero prior global listings (the actual regression case this fixes).
- Regression: `planetary-markets.md`'s `applyDrift()`/`purchaseListing()`/`sellToMarket()` provably unaffected by anything here.

## Definition of Done

- A player can browse derived global prices for every tradeable resource, list any tier 1-5 inventory item globally, and buy/sell global listings — with tier 6-7 items never reachable through this screen or its underlying function.
- Every price shown in `GlobalMarketScene` is sourced from a live `getGlobalPrice()` call — never cached or presentation-layer-recomputed.
- A solo player can sell tier 1-5 inventory globally indefinitely via `sellToGlobalMarket()`, not just until any seed listings run out — the same class of gap `sellToMarket()` closed for planetary markets, provably closed here too, not just documented.
