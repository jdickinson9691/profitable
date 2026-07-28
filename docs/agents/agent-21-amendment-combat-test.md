# Agent 21 (Amendment): Phase 5 Validation/Test — Combat Additions

**Status:** Amendment to the existing Agent 21, not a new agent.

**Creation order:** Third, created alongside the Agent 20 Combat amendment and run continuously against it.

## Responsibility

Prove the Agent 20 Combat amendment matches Combat GDD Section 2 exactly, and — most critically — prove the other three encounter types' fully-synchronous behavior is completely unaffected by the new pending-state mechanism.

## Inputs

- The Agent 20 Combat amendment's functions.
- Combat GDD Section 2, and Agent 1's Combat constants.
- Agent 21's own existing test suite (Phase 5 base + Travel Encounters + Scanner amendments), as the regression baseline.

## Outputs

A test suite addition covering:

### Detection
- A travel-window roll landing on `combat` creates a `pending` `CombatEncounter` with a stored `opponentThreatTier`, and does **not** resolve an outcome.
- An arrival-triggered check, on a hit, creates a `pending` `CombatEncounter` with `triggerContext: 'arrival'` and `windowIndex: null`.
- Confirm `opponentThreatTier` is rolled exactly once at detection and never re-rolled at resolution.

### Resolution — `resolveCombatChoice()`
- **Flee:** confirm `outcome: 'flee'`, no component/crew mutation, a retreat voyage is initiated to `originPlanetId`.
- **Attack, win:** confirm `outcome: 'win'`, no mutation, no retreat voyage.
- **Attack, lose:** confirm `outcome: 'lose'`, weapon `durability` reduced by the exact configured percentage, weapon tier and ship tier both recomputed correctly, one random crew member's `unavailableUntil` set correctly (and confirm the "skip gracefully if no crew owned" path with a zero-crew test case), a retreat voyage initiated.
- Confirm the win/lose comparison itself matches a hand-calculated expected value at several weapon-tier/opponent-tier pairings.

### Retreat voyage
- Confirm cargo carries over to the retreat voyage unchanged.
- Confirm `resolveEncounters()` called on a voyage with `isRetreat: true` returns immediately with zero rolls — an explicit test proving no encounters occur, not just that none happened to trigger.

### Regression check — the most important test in this entire amendment
- Re-run the full existing Agent 21 suite (Phase 5 base + Travel Encounters + Scanner) against the Combat-amended codebase, confirming **byte-for-byte identical results** for every non-combat scenario. Specifically confirm trade-opportunity, discovery, and hazard encounters still resolve synchronously and automatically, with zero behavioral change, even in a voyage that also happens to detect a combat encounter in a different window.

## Must NOT Do

- Must not modify the Agent 20 Combat amendment's logic — report discrepancies, don't patch them.
- Must not test multi-round combat, real-time mechanics, or any consequence beyond what's decided — nothing to test because nothing should exist.

## Definition of Done

- Every rule in Combat GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The "no re-roll of opponent threat" and "isRetreat suppresses all encounters" tests explicitly pass.
- The regression check confirms zero behavioral change to the three non-combat encounter types, including in mixed scenarios where combat and another type both occur in the same voyage.
