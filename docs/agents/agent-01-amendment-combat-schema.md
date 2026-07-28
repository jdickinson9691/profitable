# Agent 1 (Amendment): Data Schema — Combat Additions

**Status:** Amendment to the existing Agent 1, not a new agent. Every prior amendment (MVP through Scanner) is unchanged.

**Creation order:** First. The Agent 20 Combat amendment depends on this.

## Responsibility

Extend the Data Schema output with Combat's types and constants, without modifying or removing anything from any prior amendment's output — including not modifying `ShipComponent`'s existing `qualities` field shape (durability reduction is a value mutation, not a schema change).

## Inputs

- `profitable-combat-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Combat" section, for full rationale.

## Outputs

### 1. Extended type

```
EncounterType = 'tradeOpportunity' | 'discovery' | 'hazard' | 'combat'
```

### 2. New type

```
CombatEncounter {
  id: string
  voyageId: string
  triggerContext: 'travel' | 'arrival'
  opponentThreatTier: TierColor
  status: 'pending' | 'resolved'
  outcome: 'win' | 'lose' | 'flee' | null
  windowIndex: number | null
}
```

### 3. Extended types

```
Voyage {
  // ...all existing fields, UNCHANGED...
  isRetreat: boolean   // new field only
}

CrewMember {
  // ...all existing fields, UNCHANGED...
  unavailableUntil: timestamp | null   // new field only
}
```

### 4. New constant tables/values

- **Combat's weight in the existing type-split table** — tunable; extends the existing three-way (trade-opportunity/discovery/hazard) weight table to four entries. **Must update the existing table, not create a parallel one** — there is only ever one weighted type-split table.
- **Arrival-triggered combat check chance** — tunable, separate from the travel-window trigger chance.
- **Component durability damage percentage** — tunable.
- **Crew `unavailableUntil` duration** — tunable.
- **Combat variance table** — confirm the existing tier-variance table (already defined in the Ships/Travel amendment) is reused directly; do not create a second, duplicate table for combat specifically.

## Must NOT Do

- Must not modify any existing field on any prior type — `EncounterType`'s extension and the two new fields on `Voyage`/`CrewMember` are strictly additive.
- Must not add a new "durability" or "combat stats" field to `ShipComponent` — the existing `qualities.durability` value is what gets mutated; no new field is needed or wanted.
- Must not implement any detection, resolution, or mutation logic — types and tables only.
- Must not create a duplicate variance table for combat — reuse the existing one.

## Testing Requirements

- Confirm the extended `EncounterType` and new `CombatEncounter` type validate correctly.
- Confirm `Voyage` and `CrewMember` still validate all existing prior-phase data without requiring changes — backward-compatible, additive only.
- Confirm the type-split table now has four weighted entries summing correctly (however the existing table's weighting scheme is structured — percentages, relative weights, etc. — confirm the new entry is integrated into that same scheme, not appended inconsistently).

## Definition of Done

- Every type and constant in Combat GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-Combat-amendment Agent 1 output shows only additions.
- The existing weighted type-split table (from Travel Encounters) is confirmed extended, not duplicated.
