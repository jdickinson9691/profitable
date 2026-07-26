# Agent 1 (Amendment): Data Schema — Phase 3 Additions

**Status:** Amendment to the existing Agent 1, not a new agent. The original MVP contract and the Phase 2 amendment are both unchanged and still apply — this file documents what's added on top for Phase 3 (Trading Loop).

**Creation order:** First in Phase 3 — Agent 11 depends on this amendment.

## Responsibility

Extend the existing Data Schema output with the trading types and tunable constants Phase 3 needs, without modifying or removing anything from the MVP or Phase 2 output.

## Inputs

- `profitable-phase3-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Trading Market" section, for full rationale.

## Outputs

### 1. New types

```
Listing {
  id: string
  itemId: string
  quantity: number
  pricePerUnit: number
  marketTier: TierColor        // reuses existing TierColor enum
  location: 'global' | { planetId: string }
  createdByPlayerId: string
  createdAt: timestamp
  expiresAt: timestamp
}

PlanetMarketState {
  planetId: string
  itemId: string
  currentPrice: number
  basePrice: number
}

Wallet {
  playerId: string
  credits: number
}
```

### 2. New constant tables/values (encoded as data, not embedded in logic)

- **Listing expiry duration:** tunable, default ~72 in-game hours.
- **Baseline drift percentage per unit traded:** tunable, default ~2%.
- **Price floor/ceiling:** tunable, default 50%/150% of base price.
- **Global market markup (buy) / discount (sell):** tunable, default ±10%.
- **Transaction fee percentage:** tunable, default 5%.
- **Global market sell-tier restriction:** tiers 1–5 listable globally, tiers 1–7 buyable globally (reuses existing `TierColor`/tier-numbering conventions already in the schema — do not invent a parallel tier system for this restriction).

## Must NOT Do

- Must not modify or remove any MVP-era or Phase-2-era type or constant table (all Refining/Crafting tables, the `Planet` type extensions from Phase 2, etc.).
- Must not implement any trading logic (listing matching, price drift, fee deduction) — types and tables only, same rule as the original Agent 1.
- Must not add fields for systems still out of scope (crew crafters, travel-time mechanics, multiplayer manipulation detection).

## Testing Requirements

- Confirm all three new types validate correctly against representative valid/invalid example data (e.g., a negative `pricePerUnit` should be rejected).
- Confirm every new constant is represented exactly per Section 2 of the Phase 3 GDD, including that all values are clearly marked as tunable defaults rather than hardcoded-as-final.

## Definition of Done

- Every type and constant in Phase 3 GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-Phase-3 Agent 1 output shows only additions.
- Agent 11 can import every constant it needs without hardcoding anything.
