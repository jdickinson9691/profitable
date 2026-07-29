# Agent 1 (Amendment): Data Schema — Alpha Content Additions

**Status:** Amendment to the existing Agent 1, not a new agent. Every prior amendment is unchanged — this file documents what's added on top for the Alpha Content Authoring milestone (`docs/profitable-alpha-content-roster.md`).

**Written retroactively.** Unlike every prior amendment in this project (each written *before* its dependent implementation), this file was written after the alpha content roster was already implemented (commit `2fae2d5`), during a validation pass that checked the commit against this project's own documented process. The two constants below were added directly to `src/data/constants/crewConfig.ts` without a contract doc preceding them — a real process deviation from this project's established discipline (every other cross-agent-boundary change got its contract written first). Documented now, honestly, rather than silently left unrecorded. See `agent-30-alpha-content-confirmation.md` for the full account.

**Creation order:** Retroactively first among the three alpha-content amendments (1, 16, 22) — the Agent 16 amendment below depends on `TIER_6_7_PROFESSIONS` existing here.

## Responsibility

Extend the existing Data Schema output with the tier 6-7 crew profession taxonomy, without modifying or removing anything from any prior amendment's output.

## Inputs

- `docs/profitable-alpha-content-roster.md` Section 6 (Tier 6-7 Crew Professions).
- `src/data/types/profession.ts`'s own comment, which named the taxonomy as an explicitly open design question this closes.

## Outputs

### New constant

- **`TIER_6_7_PROFESSIONS`** (`src/data/constants/crewConfig.ts`) — `readonly string[]` of the 5 tier 6-7 professions: Weaponsmith, Engineer, Shield Technician, Cargo Specialist, Artisan. Same tunable-constant pattern as every other table in this file (`CREW_HIRE_COST_BY_TIER`, `CREW_WAGE_BY_TIER`, etc.).

### Updated comment (no type change)

- `src/data/types/profession.ts` — `Profession` stays `type Profession = string` (unchanged shape). Its comment is updated to note the taxonomy is now decided (pointing at `TIER_6_7_PROFESSIONS`) rather than still-open, and to explain why the type itself isn't narrowed to a literal union: nothing currently branches on profession value (`assignToCraft()`/`craft()` don't take profession as an input), so there's no consumer to justify tightening the type yet.

## Must NOT Do

- Must not modify any existing type or constant from a prior phase/amendment — `CrewMember`, `CrewCandidate`, `CREW_HIRE_COST_BY_TIER`, `CREW_WAGE_BY_TIER`, etc. all stay exactly as they are.
- Must not narrow `Profession` to a literal union/enum — no consumer depends on exhaustive compile-time profession checking yet; doing so would be speculative tightening beyond what this milestone needs.
- Must not invent a profession-to-recipe eligibility mapping — that remains explicitly separate, still-open future work per `src/crew/README.md`'s own note ("Profession has no mechanical effect on `craft()` yet").

## Testing Requirements

- Confirm `TIER_6_7_PROFESSIONS` has exactly 5 entries, matching the roster's Section 6 table exactly (verified by direct comparison during the retroactive validation pass — see `agent-30-alpha-content-confirmation.md`).
- Confirm no existing type or constant was altered — diff-checkable (`git show 2fae2d5 -- src/data/constants/crewConfig.ts src/data/types/profession.ts` shows only additions/comment changes).

## Definition of Done

- `TIER_6_7_PROFESSIONS` exists, exactly matching the roster's 5-profession list.
- `profession.ts`'s comment accurately reflects the taxonomy is closed, without changing `Profession`'s type.
- A diff against the pre-amendment Agent 1 output shows only the new constant and a comment update — nothing else changed.
