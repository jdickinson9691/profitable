# Agent 16 (Amendment): Crew Core — Alpha Content Additions

**Status:** Amendment to the existing Agent 16, not a new agent. Every prior behavior (`hireCrew`, `assignToCraft`, `resolveBackgroundCrafting`, `payUpkeep`, `checkAttrition`, `dismissCrew`) is unchanged — this file documents the one function this milestone touched.

**Written retroactively**, alongside `agent-01-amendment-alpha-content-schema.md` — see that file's status note and `agent-30-alpha-content-confirmation.md` for the full account of why this doc postdates its implementation.

**Creation order:** Depends on `agent-01-amendment-alpha-content-schema.md` (needs `TIER_6_7_PROFESSIONS` to exist first).

## Responsibility

Replace `refreshCrewPool()`'s placeholder tier 6-7 profession roll with a roll against the now-real `TIER_6_7_PROFESSIONS` list, changing no other Crew Core behavior.

## Inputs

- `agent-01-amendment-alpha-content-schema.md`'s `TIER_6_7_PROFESSIONS` constant.
- `src/crew/refreshCrewPool.ts`'s own prior comment, which named the placeholder as exactly this closure's trigger ("this project's convention is to mark a pending value as pending, not guess content for it").

## Outputs

### Changed function

- `rollPlaceholderProfession()` → renamed `rollProfession()`. Same signature (`(random: RandomFn) => string`), same call site (`refreshCrewPool()`'s tier 6-7 branch), same determinism guarantee (seeded `random`, same as every other roll in this file). Only the source of the returned string changes: an index into `TIER_6_7_PROFESSIONS` (5 entries) instead of `unspecified-profession-${1..3}`.

## Must NOT Do

- Must not change `refreshCrewPool()`'s tier/pool-size logic, its determinism contract, or which tiers (Orange/Gold) get a profession at all — only the profession *value* changes.
- Must not touch `hireCrew.ts`, `assignToCraft.ts`, `resolveBackgroundCrafting.ts`, `payUpkeep.ts`, `checkAttrition.ts`, or `dismissCrew.ts` — none of them read profession's value today (per `src/crew/README.md`'s "no mechanical effect on `craft()` yet" note), so none needed a change and none were touched.
- Must not add profession-to-recipe eligibility logic — explicitly out of scope, same boundary as the schema amendment above.

## Testing Requirements

- `tests/crew/refreshCrewPool.test.ts`'s existing test ("tier 6-7 candidates always have a non-null profession, tiers 3-5 always null, across many pools") must still pass unmodified — it asserts null/non-null shape, not the specific placeholder string, so it required no edit and still passes against the real professions.
- Confirm every profession `refreshCrewPool()` can now produce is a member of `TIER_6_7_PROFESSIONS`, not a stray value.

## Definition of Done

- `rollProfession()` only ever returns one of the 5 real professions for a tier 6-7 candidate.
- The full existing Crew Core test suite (`tests/crew/*.test.ts`) passes unmodified — confirmed via the retroactive validation pass's full `npm test` run (523/523 passing).
- A diff against the pre-amendment Agent 16 output shows only `refreshCrewPool.ts`'s profession-rolling internals changed — no other Crew Core file touched.
