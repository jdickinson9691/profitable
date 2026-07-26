# Agent 11: Trading Core Agent

**Creation order:** Second in Phase 3 (after the Agent 1 amendment). Depends on the Agent 1 Phase 3 amendment. Precedes Agents 12–15.

## Responsibility

Implement the trading loop's actual logic — listing creation/purchase, price drift and recovery, global price derivation, fee deduction, self-trade prevention — as plain, framework-agnostic TypeScript. Same architectural mandate as Agents 2 and 8: zero dependency on Phaser, the DOM, or any browser API.

## Inputs

- Agent 1's Phase 3 amendment (types and constants — imported, never hardcoded).
- Phase 3 GDD Section 2 for the exact rules.

## Outputs

### `createListing(itemInstance, quantity, pricePerUnit, location, playerId): Listing`
- Validates tier restrictions per Section 2.1 (tiers 6–7 cannot be created with `location: 'global'`).
- Computes `marketTier` via the same straight-average-to-tier formula already used for crafted items' aggregate color (Section 2.4) — reuse, do not reimplement.
- Sets `expiresAt` using Agent 1's tunable duration constant.
- Records `createdByPlayerId` (Section 2.11 trade attribution).

### `purchaseListing(listingId, quantityToBuy, buyerPlayerId): PurchaseResult`
- **Must reject if `buyerPlayerId === listing.createdByPlayerId`** (self-trade prevention, Section 2.11) — not a soft warning, a hard rejection.
- Supports partial purchase: decrements `listing.quantity`; if it reaches 0, the listing is closed (not just left at zero).
- Deducts a flat transaction fee (Section 2.11) from the sale proceeds — the fee is removed from the economy, not paid to any player.
- Triggers a baseline drift update (see below) on the affected `PlanetMarketState` (planet listings only; global listings don't have their own drift state — see the Global Price function).

### `applyDrift(marketState: PlanetMarketState, unitsTraded: number, direction: 'buy' | 'sell'): PlanetMarketState`
- Applies the percentage-based drift per unit (Section 2.6) — each unit's effect is a percentage of the *current* price, not a flat amount, so consecutive units naturally diminish in absolute effect.
- Clamps the result within the floor/ceiling bounds (Section 2.6) — do not let price exit that range even transiently mid-calculation.

### `applyRecovery(marketState: PlanetMarketState, elapsedTime): PlanetMarketState`
- Drifts `currentPrice` back toward `basePrice` over time when untraded (Section 2.6). Exact recovery rate is a tunable constant from Agent 1 — do not invent a new one here.

### `getGlobalPrice(itemId, direction: 'buy' | 'sell'): number`
- **Buy:** `min(currentPrice across all planets currently selling this item) + markup` (Section 2.7).
- **Sell:** `max(currentPrice across all planets currently buying this item) - discount` (Section 2.7).
- Must query live `PlanetMarketState` data at call time — **must not maintain a separately tracked global price value that could drift out of sync** with actual planet prices. This is the specific implementation detail that makes Section 2.7's "structurally guarantees global never beats planet price" claim true; getting this wrong (e.g., caching a stale global price) would silently violate that guarantee.

### `expireListings(currentTime): { expired: Listing[], returned: ReturnAction[] }`
- Identifies listings past `expiresAt`.
- For planet listings: marks them as held-for-pickup at that planet (Section 2.5) — does not delete the item, does not auto-return it to inventory.
- For global listings: returns the item straight to the creating player's inventory (Section 2.5).

## Must NOT Do

- Must not touch `refine()`, `craft()` (Agent 2), or galaxy/planet generation logic (Agent 8) in any way — same hard boundary Phase 2 established for the simulation core, now extended to Trading Core as well.
- Must not import or reference Phaser, PixiJS, the DOM, `localStorage`, Web Audio, or any browser API.
- Must not hardcode any constant already defined by the Agent 1 Phase 3 amendment (fee %, drift %, floor/ceiling, markup/discount, expiry duration).
- Must not implement any order-book/bidding logic — Section 2.3 explicitly rules this out.
- Must not implement market manipulation *detection* logic — explicitly deferred per Section 2.11.
- Must not implement rendering, input, save/load, or audio.

## Testing Requirements (owned by Agent 12, but this agent must be built to support it)

- All functions must be pure and deterministic given fixed inputs (no hidden randomness in pricing — unlike `rollQuality`, drift/recovery are formula-driven, not random, so this should be simpler to test than Agent 2/8's functions in that respect).
- Functions must expose enough granularity that Agent 12 can test drift, recovery, global price derivation, and fee deduction as independent stages.

## Definition of Done

- `createListing`, `purchaseListing`, `applyDrift`, `applyRecovery`, `getGlobalPrice`, and `expireListings` are implemented exactly per Phase 3 GDD Section 2.
- Self-trade prevention is a hard rejection, verified against a same-player purchase attempt.
- `getGlobalPrice` is provably always ≥ the best planet sell price (for buy) or ≤ the best planet buy price (for sell) — never better for the player than the best available planet price.
- Agent 2's and Agent 8's functions are provably unchanged (diff or full re-run of their existing test suites with zero deviation).
- Zero imports from any rendering, DOM, or browser-API library anywhere in this agent's files.
