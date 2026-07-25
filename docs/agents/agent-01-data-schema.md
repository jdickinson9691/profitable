# Agent 1: Data Schema Agent

**Creation order:** First. Every other agent depends on this agent's output.

## Responsibility

Define the canonical data shapes for the entire project: resource types, the 5 qualities, all tier/formula lookup tables, recipes, and schematics. This agent produces the shared vocabulary every other agent builds against — nothing downstream should ever need to re-derive or hardcode a number or shape that belongs here.

## Inputs

- `docs/profitable-mvp-gdd.md` (Section 3: Core Systems Reference, Section 3.4: MVP Content)
- `docs/profitable-design-questions.md` (full formula rationale, if deeper context is needed)

## Outputs

### 1. TypeScript type definitions
- `Resource`: id, name, resource category (solid/gas/crystal/etc.), and a per-quality applicability map (each of the 5 qualities is either a numeric 1–100 value or `null`/N/A — never `0` for non-applicable).
- `Quality`: an enum or union of the 5 qualities — purity, density, potency, durability, rarity.
- `TierColor`: an enum of the 7 tiers — Grey, White, Green, Blue, Purple, Orange, Gold.
- `Recipe`: id, name, list of required input categories, each with a recommended quality threshold (quality + numeric floor), output resource/item id, and output quantity.
- `Schematic`: id, name, associated recipe id, tier (TierColor).
- `Planet`: id, name, list of producible resource ids. (Deliberately minimal for MVP — no modifiers, seasons, or tier fields yet; do not add speculative fields for post-MVP planet mechanics.)

### 2. JSON schema files
One schema per type above, for validating config data (used by the Content Agent) against these shapes at load time.

### 3. Constant tables (encoded as data, not embedded in logic)
- **Tier color breakpoints:** Grey 1–40, White 41–60, Green 61–75, Blue 76–85, Purple 86–91, Orange 92–96, Gold 97–100.
- **Refiner/crafter tier variance table** (shared by both roles):

  | Tier | Negative side | Positive side |
  |---|---|---|
  | Grey | -10% | +10% |
  | White | -8% | +10% |
  | Green | -6% | +10% |
  | Blue | -4.5% | +11% |
  | Purple | -3% | +12% |
  | Orange | -1.5% | +13% |
  | Gold | -0.5% | +15% |

- **Refund chance table** (keyed to refining output tier):

  | Tier | Refund chance |
  |---|---|
  | Grey | 0% |
  | White | 0% |
  | Green | 5% |
  | Blue | 10% |
  | Purple | 15% |
  | Orange | 20% |
  | Gold | 25% (+ ~20% secondary chance of 2 units instead of 1) |

- **Threshold penalty curve** (crafting):

  | Points below threshold | Penalty multiplier |
  |---|---|
  | 0 | 1.0 |
  | 1–10 | 0.95 |
  | 11–20 | 0.85 |
  | 21–30 | 0.70 |
  | 31–40 | 0.50 |
  | 41+ | Input rejected |

- **Schematic tier contribution table:**

  | Tier | Ceiling raise | Variance narrowing | Penalty forgiveness |
  |---|---|---|---|
  | Grey | +0% | -0% | 0% |
  | White | +1% | -0.5% | 5% |
  | Green | +2% | -1% | 10% |
  | Blue | +3% | -1.5% | 15% |
  | Purple | +4% | -2% | 20% |
  | Orange | +5% | -2.5% | 25% |
  | Gold | +6% | -3% | 35% |

- **Combined ceiling cap:** crafter tier + schematic tier ceiling raise capped at +18% combined (not the arithmetic sum, which would be +21% at max/max).
- **Base refining/crafting variance:** ±10% of the input average, before tier adjustment.

## Must NOT Do

- Must not implement any formula logic (rolling, refining, crafting math). This agent produces types, schemas, and constants only — no behavior.
- Must not implement gameplay behavior or rendering.
- Must not add fields or tables for post-MVP systems (planet modifiers, seasons, market data, multiplayer) — keep scope strictly to what Section 3 of the GDD requires.

## Testing Requirements

- JSON schema validation: confirm each schema correctly accepts valid example data and rejects invalid data (e.g., a quality value of 101, or a negative threshold).
- Confirm every constant table above is represented exactly — a spot-check against the GDD's tables should show zero discrepancies, including boundary values (e.g., quality of exactly 40 vs. 41 for tier boundaries).

## Definition of Done

- Every table and data shape in GDD Section 3 has a corresponding typed, schema-validated representation.
- No other agent's contract should require them to hardcode a number or field shape that exists here — if they do, this agent's output is incomplete.
- A reviewer can check this agent's output against the GDD tables directly, without needing to run any code.
