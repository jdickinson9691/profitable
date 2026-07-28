# Agent 21 (Amendment): Phase 5 Validation/Test — Travel Encounters Additions

**Status:** Amendment to the existing Agent 21 (`agent-21-phase5-validation-test.md`), not a new agent. Every existing test in Agent 21's suite is unchanged — this file documents what's added.

**Creation order:** Third, created alongside the Agent 20 amendment and run continuously against it — same relationship pattern as every prior core+validation pairing.

## Responsibility

Prove the Agent 20 amendment's `resolveEncounters()` matches Travel Encounters GDD Section 2 exactly, and prove `resolveArrival()`'s existing Phase 5 behavior is unchanged by the addition.

## Inputs

- The Agent 20 amendment's `resolveEncounters()` and modified `resolveArrival()`.
- Travel Encounters GDD Section 2, and Agent 1's new constants, as the authoritative source of truth.
- Agent 21's own original Phase 5 test suite, as the regression baseline for this specific amendment.

## Outputs

A test suite addition covering:

### Trigger mechanics
- Confirm the per-window roll uses the configured window size and trigger chance exactly.
- Confirm a voyage spanning N windows gets N independent rolls, not one roll for the whole voyage.

### Type split
- Over many trials, confirm the type distribution matches the configured weights (statistical test, appropriate here since this is inherently a distribution claim, unlike the exact-value tests used elsewhere).
- Confirm hazard is genuinely the least common of the three at the configured weights.

### Trade-opportunity
- Confirm a triggered trade-opportunity grants the correct currency amount range directly to `Wallet`, with no `Listing` created anywhere.

### Discovery
- Confirm a triggered discovery calls `rollQuality()` (not a reimplemented version) and grants the resulting item to inventory.
- **Explicitly test that no discovery encounter, across many trials, ever sets `discovered: true` on any planet.** This is the single most important test in this amendment — a negative-result test proving absence, not just presence of the expected behavior.

### Hazard
- Confirm the pass/fail roll is correctly modified by the voyage's ship's derived tier.
- Confirm the failure cost curve matches the escalating shape exactly at several distance-below-threshold values.
- Confirm a *passed* hazard roll produces no currency deduction.

### Regression check — the most important test in this suite
- Re-run Agent 21's original Phase 5 tests (arrival timing, cargo delivery, ship delivery) against the amended `resolveArrival()`, confirming **byte-for-byte identical results** for voyages with zero encounters, and confirming arrival timing/cargo/ship delivery are unaffected even for voyages *with* encounters. Any deviation means the "additive only" constraint was violated.

## Must NOT Do

- Must not modify the Agent 20 amendment's logic — report discrepancies, don't patch them.
- Must not test combat, interactive resolution, or any out-of-scope mechanic — nothing to test because nothing should exist.

## Definition of Done

- Every rule in Travel Encounters GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The discovery "never sets `discovered: true`" negative test explicitly passes across many trials.
- The regression check against Agent 21's original Phase 5 suite passes with zero deviation, for both zero-encounter and encounter-present voyages.
