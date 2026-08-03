# Agent 13 (Amendment): Trading Presentation — Trading Counterparty (Instant Sell)

**Status:** Amendment to the existing Agent 13 (`agent-13-trading-presentation.md`), not a new agent.

**Creation order:** Second in this amendment pair, after the Agent 11 amendment. Depends on it.

## Responsibility

Give the player an instant "Sell Now" action alongside the existing "List @ my own price" action, on both `MarketScene` and `GlobalMarketScene`, so both trading screens close the solo-trading dead end, not just one.

## Inputs

- `sellToMarket()`/`sellToGlobalMarket()` (Agent 11 amendment) — called, never reimplemented.

## Outputs

### `MarketScene.ts`

- The existing "Sell from inventory" section's per-batch row gains a second action alongside the existing `> List @ Xcr`: **`> Sell Now @ Xcr`**, calling `sellToMarket()` at the planet's current live price (the same `suggestedPrice` already computed for the list action). On success: apply `updatedWallet`/`updatedMarketState`, remove the sold batch from inventory, show proceeds/fee in the status line. Both actions stay available — this is additive, not a replacement (`planetary-markets.md`'s own "either way sellToMarket() is what closes the actual gap" note).

### `GlobalMarketScene.ts`

- Same pattern: the existing "List globally from inventory" section's per-batch row gains **`> Sell Now @ [derived price]cr`**, calling `sellToGlobalMarket()`. Only rendered when `getGlobalPrice(..., "sell", ...)` doesn't throw (i.e., at least one planet currently trades the item) — if it would throw, show "(not currently tradeable anywhere)" instead of a dead button, mirroring the derived-price display's own existing try/catch pattern. The existing tier-6/7 exclusion (`canListGlobally()`) applies to this action too — global instant-sell has the same tier ceiling as global listing.

## Must NOT Do

- Must not remove the existing `> List @ Xcr` / `> List globally` actions — both instant-sell and list-and-wait stay available side by side.
- Must not recompute `sellToMarket()`/`sellToGlobalMarket()`'s pricing/fee math in the scene — display their return values directly.
- Must not offer "Sell Now" for a tier 6-7 item on `GlobalMarketScene` — same UI-level guard as the existing list action.

## Testing Requirements

- Owned by manual/integration verification (this project's existing pattern for Phaser scene behavior — no automated Phaser test harness exists).
- Playtest: sell an item via "Sell Now" on `MarketScene` as the sole player, confirm credits increase and the item leaves inventory with no listing created; repeat on `GlobalMarketScene` for a tier 1-5 item; confirm a tier 6-7 item never shows a "Sell Now" button on `GlobalMarketScene`.

## Definition of Done

- Both `MarketScene` and `GlobalMarketScene` offer a working "Sell Now" action, sourced directly from the Agent 11 amendment's functions.
- A solo player can sell indefinitely on both screens — the actual playtest-verified closure of the gap.
