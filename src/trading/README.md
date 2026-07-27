# src/trading

Owned by the **Trading Core Agent** (Phase 3 GDD §4.1, agent 11).

Pure, framework-agnostic TypeScript implementing the trading loop's actual
logic — the Phase 3 equivalent of what `src/simulation` was for the MVP and
`src/galaxy` was for Phase 2. Same architectural mandate: zero Phaser/DOM/
browser API. Reuses `src/simulation`'s `computeAggregateTier()` rather than
reimplementing it (see that file's own comment on why it moved out of
`src/presentation`). Unlike `rollQuality()`/`refine()`/`craft()`, none of
this logic is randomized — GDD §2.6's drift/recovery are formula-driven, so
every function here is deterministic with no injected `RandomFn`.

- `createListing.ts` — validates the tier 6-7 global-listing restriction
  (§2.1), derives `marketTier` via `computeAggregateTier()` (§2.4), sets
  `expiresAt` from `LISTING_EXPIRY_HOURS` (§2.5).
- `purchaseListing.ts` — self-trade prevention (§2.11, hard rejection),
  partial-purchase quantity decrement, fee deduction (§2.11), and — for a
  planet listing — triggers `applyDrift()` on the affected market state.
- `drift.ts` — `applyDrift()` (§2.6, per-unit percentage move, floor/ceiling
  clamped after every unit so the bound holds even transiently) and
  `applyRecovery()` (§2.6, exponential decay of the gap to `basePrice` per
  elapsed hour).
- `globalPrice.ts` — `getGlobalPrice()` (§2.7): derived from the live
  `PlanetMarketState` collection passed in at call time, never cached — the
  specific implementation detail that makes "global never beats the best
  planet price" a structural guarantee rather than a convention.
- `expireListings.ts` — `expireListings()` (§2.5): planet listings held for
  pickup, global listings returned to inventory.
- `loadTradingContent.ts` — validates Agent 14's raw JSON (base prices,
  planet market preferences) against Agent 1's schemas and returns typed
  data, mirroring `src/simulation/loadContent.ts`'s exact shape (data-in,
  validated typed-data-out, no file I/O). Added because Agent 13's contract
  forbids reading Agent 14's raw content directly and nothing else named a
  loading path for it — same category of gap that produced `loadContent()`
  mid-build for the MVP.

## Necessary completions beyond Agent 11's literally-specified signatures

Same category as the MVP's `loadContent()`/`RefiningRecipe` additions and
Phase 2's `resources` parameter on `generateGalaxy` — documented here rather
than silently made, since the contract's own pseudocode signatures turned
out to be incomplete or, in two cases, to contradict the contract's own
purity requirement:

- **`purchaseListing`, `expireListings`, and `getGlobalPrice` take the
  actual data (`Listing`/`PlanetMarketState[]`) instead of an ID into an
  implicit store.** The contract's literal signatures
  (`purchaseListing(listingId, ...)`, `getGlobalPrice(itemId, direction)`,
  `expireListings(currentTime)`) all imply a hidden registry a pure
  function can't have — Agent 11's own testing requirement demands every
  function be "pure and deterministic given fixed inputs." Resolved in
  favor of purity, consistent with how `refine()`/`craft()`/`applyDrift()`
  already take their data directly rather than an ID. Whatever maintains
  the real listing/market-state store (Agent 13/15) does the ID lookup and
  persists the returned updated objects.
- **`createListing` takes an explicit `id` and an injectable `now`.** A
  pure function has no ID-generation scheme of its own (no hidden counter,
  no `crypto.randomUUID()` call baked in) — the caller supplies the id, the
  same way `refine()`/`craft()` take an injectable `RandomFn` rather than
  calling `Math.random()` internally by default (though here `now` really
  is just `Date.now()` by default, since nothing about determinism requires
  hiding it — only tests need to override it).
- **`PurchaseResult`, `ReturnAction`/`ListingExpiryResult`, and
  `TradeDirection` are new types added to `src/data/types/`,** not
  originally part of Agent 1's Phase 3 amendment output despite being named
  in Agent 11's contract. Same category of gap as `Resource.itemTier` in
  the amendment itself. `PurchaseResult` mirrors the existing `CraftResult`
  pattern (a discriminated union over a boolean, since a rejected purchase
  — self-trade, insufficient quantity — is a normal business outcome the
  caller must always handle, not an exceptional case).
- **`PRICE_RECOVERY_PERCENT_PER_HOUR` was added to `tradingConfig.ts`.**
  Agent 11's contract says `applyRecovery`'s "exact recovery rate is a
  tunable constant from Agent 1 — do not invent a new one here," but no
  such constant existed; the amendment only defined `BASELINE_DRIFT_PERCENT`,
  which §2.6's own text ties to per-unit-traded volume, not elapsed time.
  Added directly to Agent 1's constants file (not embedded in this agent's
  logic), the same place every other tunable lives.
- **"Currently selling"/"currently buying" in `getGlobalPrice`'s contract
  text both resolve to the same underlying query.** This project's
  `PlanetMarketState` has one `currentPrice` per planet-item pair, not a
  separate bid/ask — GDD §2.9's "sells cheap"/"buys at a premium" is a
  display judgement (`currentPrice` vs. `basePrice`), not a structural
  buy-only/sell-only split. So both directions filter the same
  `PlanetMarketState[]` by `itemId`, differing only in `min` vs. `max`.

## Boundary confirmed

`src/simulation/refine.ts`, `craft.ts`, and everything under `src/galaxy/`
are untouched by this agent — confirmed via `git status` and via
`tests/trading/regressionCheck.test.ts` re-running the exact hand-calculated
cases already proven correct pre-Phase-3.
