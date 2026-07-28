# Agent 1 (Amendment): Data Schema — Scanner/Probe Additions

**Status:** Amendment to the existing Agent 1, not a new agent. Every prior amendment is unchanged — this file documents what's added on top for Scanner/Probe.

**Creation order:** First. The Agent 20 Scanner amendment depends on this.

## Responsibility

Extend the existing Data Schema output with the scanner types and tunable constants, without modifying or removing anything from any prior amendment's output.

## Inputs

- `profitable-scanner-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Scanner/Probe" section, for full rationale.

## Outputs

### 1. New types

```
Scanner {
  id: string
  tier: TierColor
  ownerId: string
}

ScannerPool {
  planetId: string
  availableScanners: Scanner[]
  lastRefreshedAt: timestamp
}
```

### 2. New constant tables/values

- **Scanner pool refresh interval and pool size per planet** — tunable, same pattern as `ShipyardPool`/`PlanetCrewPool`.
- **Scanner acquisition cost curve by tier** — tunable.
- **Base scan radius** — tunable.
- **Scanner tier radius-bonus table** — tunable, reusing the schematic-tier contribution table's shape (Grey +0 up to Gold's top value).

## Must NOT Do

- Must not modify any existing type from a prior phase/amendment — `Planet`, `Voyage`, `Ship`, `ShipyardPool`, etc. all stay exactly as they are. A scan action only flips existing `discovered` booleans; it does not require new fields on `Planet`.
- Must not implement any scan-resolution or purchase logic — types and tables only.
- Must not add a fifth entry to any ship-component-related type or enum — `Scanner` is deliberately separate from `ShipComponent`/`ComponentCategory`.

## Testing Requirements

- Confirm both new types validate correctly against representative example data.
- Confirm every new constant is represented exactly per the GDD, marked as tunable defaults.
- Confirm no existing type (especially `Planet` and `ShipyardPool`) was touched — diff-checkable.

## Definition of Done

- Every type and constant in the Scanner GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-amendment Agent 1 output shows only additions — `Scanner` and `ScannerPool` as new types, four new constants, nothing else changed.
