# Agent 1 (Amendment): Data Schema — Phase 2 Additions

**Status:** Amendment to the existing Agent 1, not a new agent. Original MVP contract in `agent-01-data-schema.md` is unchanged and still applies — this file documents what's added on top of it for Phase 2 (Galaxy & Planet Generation).

**Creation order:** First in Phase 2 — Agent 8 depends on this amendment.

## Responsibility

Extend the existing Data Schema output with the new types and tables Phase 2 needs, without modifying or removing anything from the MVP output.

## Inputs

- `profitable-phase2-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Galaxy & Planet Generation" section, for full rationale if deeper context is needed.

## Outputs

### 1. New type: `PlanetType`
- Enum: `Terrestrial | SuperEarth | Neptunian | GasGiant`.

### 2. New constant table: Planet-Type-to-eligible-category lookup

| Planet Type | Eligible Resource Categories |
|---|---|
| Terrestrial | Solid, Crystal |
| Super-Earth | Solid, Crystal, (occasionally Gas) |
| Neptunian | Gas, Crystal (icy) |
| Gas Giant | Gas |

### 3. New constant table: Planet tier quality roll modifier

| Planet Tier | Quality Roll Modifier |
|---|---|
| Grey | -15 |
| White | -8 |
| Green | +0 |
| Blue | +8 |
| Purple | +15 |
| Orange | +22 |
| Gold | +30 |

Note the neutral point is **Green**, not Grey — do not reuse the refiner/crafter/schematic table's "Grey = no bonus" convention here.

### 4. New constant table: Resource subset percentage by tier

| Planet Tier | % of eligible resources available |
|---|---|
| Grey | 20% |
| White | 35% |
| Green | 50% |
| Blue | 65% |
| Purple | 80% |
| Orange | 90% |
| Gold | 100% |

### 5. New constant: Specialty modifier
- Flat `+15` quality modifier, additive on top of the planet tier modifier (table 3 above).

### 6. Extended `Planet` type

```
Planet {
  id: string
  name: string
  planetType: PlanetType
  tier: TierColor              // reuses the existing TierColor enum — no new tier system
  position: { x: number, y: number }
  producibleResourceIds: string[]
  specialtyResourceId: string | null   // null for Grey-tier planets
  discovered: boolean          // defaults false except the starting planet
}
```

This **extends** the MVP's minimal `Planet` type (`id`, `name`, `producibleResourceIds`) — those three fields keep their original meaning and shape.

## Must NOT Do

- Must not modify or remove any MVP-era constant table or type (tier breakpoints, refiner/crafter variance table, refund chance table, penalty curve, schematic contribution table, the original minimal `Planet` fields).
- Must not implement any generation logic, gameplay behavior, or rendering — types and tables only, same rule as the original Agent 1.
- Must not add fields or tables for systems still out of scope (trading market, travel, crew) — keep to exactly what Phase 2 GDD Sections 2–3 specify.

## Testing Requirements

- Confirm the extended `Planet` type still validates all existing MVP content (Delta Rigelus) without requiring changes to that data — i.e., the extension is additive/backward-compatible, not breaking.
- Confirm every new table above is represented exactly — spot-check against the GDD's tables, including the Green-as-neutral-point boundary case.

## Definition of Done

- Every table and type in Phase 2 GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the original (pre-Phase-2) Agent 1 output shows only additions — zero modifications to any MVP-era table, type, or field.
- Agent 8 can import every constant it needs from this amendment without hardcoding anything.
