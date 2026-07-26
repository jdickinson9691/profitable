# Agent 13: Trading Presentation Agent

**Creation order:** Fourth in Phase 3. Depends on Agent 11 (Trading Core) and Agent 4 (Infrastructure/Adapter, unchanged from the MVP). Should not start until both exist and Agent 12's core tests are passing.

## Responsibility

Build the Phaser scenes for the trading loop: a market screen (browse/list/buy/sell, for both a planet's local market and the global market), and a trade map screen showing what each discovered planet sells cheap / buys at a premium. This agent owns everything the player sees and clicks for trading — and nothing else.

## Inputs

- Agent 11's public functions (`createListing`, `purchaseListing`, `getGlobalPrice`, `expireListings`) — called, never duplicated or reimplemented.
- Agent 4's `SaveSystem` and `AudioManager` interfaces — used for any persistence or sound, never bypassed.
- Agent 5's existing MVP scenes and Agent 13's own new scenes must coexist in the same Phaser game instance without conflicting scene keys or state.
- Phase 3 GDD Section 2.9 for the trade map's data model (three layers: baseline drift, seasons, emergencies).

## Outputs

- **Planet market screen:** lists active listings at the current planet (bucketed/displayed by `marketTier`, per Section 2.4), lets the player create a new listing (calls `createListing`) or purchase an existing one, including partial-quantity purchase.
- **Global market screen:** shows the derived global buy/sell price (via `getGlobalPrice`) for browsable items; enforces the tier 1-5 sell / tier 1-7 buy restriction at the UI level in addition to Agent 11 enforcing it at the logic level (defense in depth — the UI should not even offer to list a tier 6-7 item globally, not just fail silently if attempted).
- **Trade map screen:** for each discovered planet (per the Phase 2 `discovered` flag), displays what it sells cheap / buys at a premium, reflecting the current state of all three data layers (baseline drift, season, emergency) — this is a read-only display, it does not compute pricing itself, only renders what Agent 11/Phase 2 systems have already computed.
- **Price history display** (if built in this pass — see Must NOT Do below for scope boundary): a simple graph reading Agent 11's tracked price-history data (Section 2.10), rendered inside the canvas.

## Must NOT Do

- Must not reimplement or duplicate any pricing/drift/fee logic locally — always call Agent 11's functions.
- Must not call `localStorage` or Web Audio directly — must go through Agent 4's adapters.
- Must not build any DOM-based UI — all trading UI renders inside the Phaser canvas, same rule as Agent 5.
- Must not implement the market-driver flavor features (news ticker, NPC merchant dialogue) unless explicitly requested for this pass — Section 2.10 marks these as a deferred idea, not a required Phase 3 deliverable; a plain price history graph is the minimum bar, ticker/dialogue can be a later addition.
- Must not read Agent 11's internal/private helpers or Agent 14's raw content JSON directly — content should be accessed through Agent 11's/Agent 2's established loading paths, not read independently.

## Testing Requirements

- Manual or scripted playtest: creating a listing, purchasing it (including a partial purchase), and observing the resulting price change on the market screen must exactly match what Agent 11 actually computed — no presentation-layer math.
- Confirm the tier 6-7 global-listing restriction is enforced in the UI (the option to list globally is unavailable/disabled for a tier 6-7 item, not just silently failing).
- Confirm no DOM UI elements exist anywhere in the new trading scenes.

## Definition of Done

- A player can browse a planet market, list an item, purchase (fully or partially) another listing, and see the global market's derived price for at least one item.
- A player can view the trade map and see at least one planet's sell-cheap/buy-premium data reflecting a live baseline drift change.
- Every displayed value is sourced directly from Agent 11's function outputs — never recalculated in the presentation layer.
- All persistence/audio in these scenes goes through Agent 4's adapters exclusively.
