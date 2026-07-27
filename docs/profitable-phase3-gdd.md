# Profitable — Phase 3 Game Design Document: The Trading Loop

Status: **Phase 3 complete and verified** (Agent 1 amendment, Agents 11-15 all delivered; full roster committed). This document remains the historical record of the Phase 3 build; see `CLAUDE.md` for current project status and the next milestone (crew crafters).

---

## 1. Phase 3 Scope

Phase 3 builds the trading loop — the next link in the decided development order (galaxy generation → planet generation → resource generation → crafting recipes/schematics → **[Phase 2 boundary]** → **trading loop** → **[Phase 3 boundary]** → crafters → travel → map).

**Definition of done for Phase 3:** a player can list a gathered/refined/crafted item for sale (on a planet market or the global market, per tier restrictions), have another party purchase it (in full or partially), see the transaction reflected in that item's live price via baseline drift, and observe the trade map correctly displaying what a planet sells cheap / buys at a premium based on baseline drift + season + emergency layers. Fees are deducted as a currency sink. All of this must be verifiable against known test cases, the same standard as MVP and Phase 2.

**Out of scope for Phase 3:** NPC crew crafters (hiring a crafter into your crew — the market's ability to *list* this is Phase 4's concern, not Phase 3's), travel (exact travel-time mechanics for remote tier 6-7 sales remain deferred, per the Phase 3 design decision), the full galactic map UI beyond what's needed to display trade data, and multiplayer (market manipulation *detection* logic is explicitly deferred to whenever multiplayer arrives — see Section 2.11).

## 2. What's Already Decided (from `profitable-design-questions.md`)

Full rationale lives in the design doc; this is the implementation-ready summary.

### 2.1 Markets Are Per-Planet, Plus a Two-Tier Global Model
Each planet has its own market with buy/sell modifiers. A global market is accessible everywhere (no travel required) but never offers the best price. **Global market scope:** players may **list/sell tiers 1–5** globally, but may **buy any tier 1–7**. Tiers 6–7 are sell-restricted to planet markets (intentional exclusivity).

### 2.2 Currency
**Single, universal currency** ("Credits") across all markets, all tiers. Regional price variance comes from per-planet modifiers on this one currency, not separate regional currencies.

### 2.3 Listing Model
**Direct fixed-price listings** — a player lists X units at price Y; any other party accepts at that price. No order book, no bidding, no NPC auto-buy. **Partial purchases allowed** — a listing's quantity decrements per purchase rather than being all-or-nothing.

### 2.4 Listing Quality Representation
Listings are bucketed by a **derived "market tier"** — a straight average of the item's 5 qualities, mapped through the existing tier table (same formula already used for crafted items' aggregate color). The underlying item instance retains its full, real 5-quality data; the market tier is a display/stacking convenience only.

### 2.5 Listing Lifecycle
A listing with no buyer **expires after a set duration** (tunable, ~72 in-game hours as a starting point). On expiry: a **planet market** listing is **held at that planet for pickup**; a **global market** listing returns **straight to inventory**.

### 2.6 Baseline Drift / Soft-Cap Pricing
Each unit sold into a planet's market **drops** that item's price by a **percentage of its current price** (tunable, e.g. -2%/unit within a rolling window); each unit bought **raises** it similarly. A **floor and ceiling** (tunable, e.g. 50%–150% of base price) bounds the swing. Prices **drift back toward base over time** when untraded. This mechanism **is** the soft-cap — no separate mechanism was added on top.

### 2.7 Global Price Mechanism
Derived, not separately tracked: **global buy price = lowest current planet sell price + a fixed markup** (tunable, e.g. +10%); **global sell price = highest current planet buy price − a fixed discount** (tunable, e.g. −10%). This structurally guarantees the global market never beats the best planet price.

### 2.8 Tier 6-7 Exclusivity Details
**Multiple planets can buy the same tier 6-7 category** (not one-planet-per-item-type). **Remote sales are allowed, but only to already-**discovered** planets** (reusing the `discovered` flag from Phase 2); the item travels rather than teleporting — **exact travel-time mechanics remain deferred to the Travel milestone**. Once arrived, the sale becomes a normal planet-market listing subject to Section 2.5's lifecycle.

### 2.9 The Galactic Trade Map
Each discovered planet shows what it **sells cheap** and **buys at a premium**. Three layers drive this data:
1. **Baseline drift** (continuous) — Section 2.6, now concrete.
2. **Seasons** (slow, predictable) — determined at planet generation, based on planet tier (Phase 2).
3. **Emergencies** (rare, sudden) — randomly triggered, not caused by simulation/economy state.

### 2.10 Price History & Market-Driver Flavor
Price points are **tracked over time**, per item per planet — a natural byproduct of Section 2.6/2.9's live pricing, not a new data structure. **Market-driver flavor** (news ticker, NPC merchant flavor text, price history graphs) is a **presentation-layer idea**, not yet a locked mechanic — deferrable independently of the underlying pricing math.

### 2.11 Taxes/Fees & Market Manipulation
A **flat transaction fee** (tunable, e.g. 5%) is taken on sales, functioning as a **currency sink** against the single-currency model. Market manipulation is **partially resolved now**: **self-trade prevention** (a listing's creator cannot buy their own listing) and **trade attribution** (every listing records its creating player entity) are built now, cheaply, even though they're near-no-ops in single-player — retrofitting them once multiplayer exists would be far more disruptive. The Section 2.6 soft-cap is the stated primary defense against price-cycling exploits. **Cross-player manipulation *detection* logic is explicitly deferred** to whenever multiplayer is actually built.

## 3. New/Extended Data Shapes

Building on Agent 1's existing types (unchanged), Phase 3 adds:

```
Listing {
  id: string
  itemId: string
  quantity: number
  pricePerUnit: number        // in Credits
  marketTier: TierColor       // derived per 2.4, display/stacking only
  location: 'global' | { planetId: string }
  createdByPlayerId: string   // trade attribution, 2.11
  createdAt: timestamp
  expiresAt: timestamp        // per 2.5
}

PlanetMarketState {
  planetId: string
  itemId: string
  currentPrice: number        // moves per 2.6
  basePrice: number           // floor/ceiling reference point
  season: ...                 // Phase 2 tier-derived, referenced not redefined here
}

Wallet {
  playerId: string
  credits: number
}
```

`Resource`/`Recipe`/`Schematic`/`Planet` types from Agents 1/1-amendment are unchanged; Phase 3 does not touch them.

## 4. AI Agent Development Plan — Phase 3

Same contract pattern and cross-cutting rules as MVP and Phase 2. Five pieces: one schema amendment, and four new agents.

### 4.1 Roster & Creation Order

**Amendment — Agent 1 (Data Schema), Phase 3 additions.** `Listing`, `PlanetMarketState`, `Wallet` types; the tunable constants (fee %, drift %, floor/ceiling, markup/discount, listing expiry duration) as data. Created first.

**Agent 11: Trading Core.** New. Pure, framework-agnostic TypeScript implementing listing creation/purchase, price drift/recovery, global price derivation, fee deduction, self-trade prevention. Depends on the Agent 1 Phase 3 amendment.

**Agent 12: Phase 3 Validation/Test.** New, created alongside Agent 11, runs continuously. Same relationship Agent 3 had to Agent 2, and Agent 9 to Agent 8. Includes a regression check that Agents 2 and 8's formulas remain untouched.

**Agent 13: Trading Presentation.** New. Builds the market browse/buy/sell screens and the trade map display. Depends on Agent 11 (calls its functions, never duplicates) and Agent 4's existing adapters (unchanged).

**Agent 14: Trading Content.** New. Populates base prices per item, and initial planet buy/sell preference lists (which items each planet's market favors) — data only, same spirit as Agent 6.

**Agent 15: Trading Integration.** New, created last. Wires listing → purchase → drift → global-price-reflection → trade-map-display into one verified end-to-end loop, and confirms Agents 2 and 8 remain unmodified.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-phase3-schema.md`, `agent-11-trading-core.md`, `agent-12-phase3-validation-test.md`, `agent-13-trading-presentation.md`, `agent-14-trading-content.md`, and `agent-15-phase3-integration.md`. This section is intentionally a summary — see those files for the authoritative inputs/outputs/must-not-do/definition-of-done for each.

## 5. Cross-Cutting Rules

Same as MVP and Phase 2 (see `docs/agents/README.md`), plus:

- **The planet-agnostic boundary from Phase 2 (Section 2.6 of that GDD) still applies** — nothing in Phase 3 may modify Agent 2's `refine()`/`craft()`, or Agent 8's galaxy/planet generation logic, to accommodate market data. Trading reads from and writes to its own new data shapes (Section 3), never reaching into the simulation core's internals.
- **No agent implements market manipulation *detection* logic.** Section 2.11 is explicit that this is deferred to the multiplayer milestone — building it now would be speculative work against a scope that doesn't exist yet.
