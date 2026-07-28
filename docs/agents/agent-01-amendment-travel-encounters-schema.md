# Agent 1 (Amendment): Data Schema — Travel Encounters Additions

**Status:** Amendment to the existing Agent 1, not a new agent. Every prior amendment (MVP through Phase 5) is unchanged and still applies — this file documents what's added on top for Travel Encounters (Non-Combat).

**Creation order:** First. The Agent 20 amendment depends on this.

## Responsibility

Extend the existing Data Schema output with the encounter types and tunable constants this feature needs, without modifying or removing anything from any prior phase's output — including not modifying the existing `Voyage` type's prior fields, only adding to it.

## Inputs

- `profitable-travel-encounters-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Travel Encounters (Non-Combat)" section, for full rationale.

## Outputs

### 1. New types

```
EncounterType = 'tradeOpportunity' | 'discovery' | 'hazard'

EncounterResult {
  type: EncounterType
  outcome: {
    // shape varies by type — see Agent 20's contract for the exact per-type payload
  }
  windowIndex: number
}
```

### 2. Extended type

```
Voyage {
  // ...all existing Phase 5 fields, UNCHANGED...
  encounters: EncounterResult[]   // new field only
}
```

### 3. New constant tables/values

- **Encounter check window size** — tunable, likely equal to the existing emergency system's window.
- **Trigger chance per window** — tunable.
- **Type weight distribution** (trade-opportunity / discovery / hazard, hazard lowest) — tunable.
- **Trade-opportunity currency grant range** — tunable.
- **Hazard pass threshold and ship-tier modifier table** — tunable, reusing the shape of existing tier-modifier tables (e.g., the refiner/crafter/ship-speed tables).
- **Hazard failure cost curve** — tunable, reusing the shape of the crafting threshold penalty curve.

## Must NOT Do

- Must not modify any existing field on `Voyage` or any other prior-phase type — additive only.
- Must not implement any encounter resolution logic — types and tables only.
- Must not add fields supporting combat, interactive resolution, or ship/cargo mutation — none of these are in scope (see GDD Section 1).

## Testing Requirements

- Confirm the extended `Voyage` type still validates all existing Phase 5 voyage data without requiring changes to that data — backward-compatible, additive only.
- Confirm every new constant is represented exactly per the GDD, marked as tunable defaults.

## Definition of Done

- Every type and constant in the Travel Encounters GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-amendment Agent 1 output shows only additions, including on `Voyage` specifically (no field removed or changed, only `encounters` added).
