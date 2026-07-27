# Agent 1 (Amendment): Data Schema — Phase 4 Additions

**Status:** Amendment to the existing Agent 1, not a new agent. The MVP contract and the Phase 2/Phase 3 amendments are all unchanged and still apply — this file documents what's added on top for Phase 4 (Crew Crafters).

**Creation order:** First in Phase 4 — Agent 16 depends on this amendment.

## Responsibility

Extend the existing Data Schema output with the crew types and tunable constants Phase 4 needs, without modifying or removing anything from the MVP, Phase 2, or Phase 3 output.

## Inputs

- `profitable-phase4-gdd.md` Sections 2–3.
- `profitable-design-questions.md`, "Crew Crafters" section, for full rationale.

## Outputs

### 1. New types

```
CrewMember {
  id: string
  hiredByPlayerId: string
  tier: TierColor
  profession: Profession | null
  status: 'idle' | 'active'
  assignedCraftId: string | null
  hiredAt: timestamp
  lastCheckedAt: timestamp
  wageAmount: number
  lastPaidAt: timestamp
}

CrewCapacity {
  playerId: string
  baseCapacity: number
  purchasedSlots: number
}

PlanetCrewPool {
  planetId: string
  availableHires: CrewMember[]
  lastRefreshedAt: timestamp
}
```

### 2. New constant tables/values (encoded as data, not embedded in logic)

- **Base crew capacity** and **capacity expansion cost curve** — tunable.
- **Wage curve by tier** — tunable, reuses the "higher tier = costs more" shape already used for NPC acquisition cost.
- **Upkeep grace period** before unpaid-upkeep attrition triggers — tunable.
- **Elapsed-time cap** for background/idle crafting resolution (e.g. 24-48 hours max credited) — tunable.
- **Crew pool refresh interval and pool size per planet** — tunable.
- **Background/idle output rate**, relative to active output for the same crafter — placeholder until the design doc's still-open "exact reduced rate" question is resolved; do not invent a number here, leave clearly marked as pending.

## Must NOT Do

- Must not modify or remove any MVP-era, Phase-2-era, or Phase-3-era type or constant table.
- Must not implement any crew logic (hiring, assignment, background resolution, upkeep, attrition) — types and tables only, same rule as every prior Agent 1 pass.
- Must not invent a value for the background/idle output rate constant — that question is explicitly still open in the design doc; encode it as a clearly-marked placeholder, not a guessed number.
- Must not add fields for systems still out of scope (combat, travel-hazard/poaching risk, multiplayer crew attribution beyond the already-decided `hiredByPlayerId` field).

## Testing Requirements

- Confirm all three new types validate correctly against representative valid/invalid example data.
- Confirm every new constant is represented exactly per Section 2/3 of the Phase 4 GDD, including that all values are clearly marked as tunable defaults, and that the background/idle rate is clearly marked as pending rather than silently defaulted to a guessed number.

## Definition of Done

- Every type and constant in Phase 4 GDD Sections 2–3 has a corresponding typed, data-encoded representation.
- A diff against the pre-Phase-4 Agent 1 output shows only additions.
- Agent 16 can import every constant it needs without hardcoding anything, and can clearly identify which one value (background/idle rate) still needs a real number before final tuning.
