# Agent 1 (Amendment): Data Schema — Phase 5 Additions

**Status:** Amendment to the existing Agent 1, not a new agent. The MVP contract and the Phase 2/3/4 amendments are all unchanged and still apply — this file documents what's added on top for Phase 5 (Ships & Travel).

**Creation order:** First in Phase 5 — Agent 20 depends on this amendment.

## Responsibility

Extend the existing Data Schema output with the ship and travel types and tunable constants Phase 5 needs, without modifying or removing anything from the MVP, Phase 2, Phase 3, or Phase 4 output.

## Inputs

- `profitable-phase5-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Ships" and "Travel" sections, for full rationale.

## Outputs

### 1. New types

```
ComponentCategory = 'weapon' | 'engine' | 'shield' | 'cargoHold'

ShipComponent {
  id: string
  category: ComponentCategory
  qualities: QualityRoll
  tier: TierColor
}

Ship {
  id: string
  name: string
  ownerId: string
  tier: TierColor
  components: {
    weapon: ShipComponent | null
    engine: ShipComponent | null
    shield: ShipComponent | null
    cargoHold: ShipComponent | null
  }
}

ShipyardPool {
  planetId: string
  availableShips: Ship[]
  lastRefreshedAt: timestamp
}

Voyage {
  id: string
  shipId: string
  originPlanetId: string
  destinationPlanetId: string
  departedAt: timestamp
  arrivesAt: timestamp
  cargo: { itemId: string, quantity: number }[]
}
```

### 2. New constant tables/values (encoded as data, not embedded in logic)

- **Distance-to-travel-time scaling constant** — tunable.
- **Ship tier speed modifier table** — reuses the shape of the refiner/crafter variance table (asymmetric or symmetric, per design doc); exact percentages tunable.
- **Shipwright pool refresh interval and pool size per planet** — tunable, same pattern as the Phase 4 crew pool.

### 3. Component recipe support (no new Recipe shape)

Confirm the existing `Recipe` type (from Agent 1's MVP output) is sufficient to express component recipes (category + threshold inputs, output = a `ShipComponent` of a given `ComponentCategory`) without modification. If a gap is found, report it rather than redesigning `Recipe` unilaterally.

## Must NOT Do

- Must not modify or remove any MVP-era, Phase-2-era, Phase-3-era, or Phase-4-era type or constant table.
- Must not implement any ship assembly, travel-time, or voyage logic — types and tables only, same rule as every prior Agent 1 pass.
- Must not add fields for systems still out of scope (combat, encounters, the galactic map beyond travel's needs).

## Testing Requirements

- Confirm all new types validate correctly against representative valid/invalid example data (e.g., a `Ship` with all four component slots `null` should still be valid — a ship under construction — but its `tier` computation must handle this case, per Agent 20's contract, not this one).
- Confirm every new constant is represented exactly per Section 2/3 of the Phase 5 GDD, marked as tunable defaults.
- Confirm the existing `Recipe` type is confirmed sufficient for component recipes, or the gap is explicitly reported.

## Definition of Done

- Every type and constant in Phase 5 GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-Phase-5 Agent 1 output shows only additions.
- Agent 20 can import every constant it needs without hardcoding anything.
