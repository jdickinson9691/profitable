# Agent 17: Phase 4 Validation/Test Agent

**Creation order:** Third in Phase 4, created alongside Agent 16 and run continuously against it — same relationship pattern as every prior phase's validation agent.

## Responsibility

Prove Agent 16's crew logic matches Phase 4 GDD Section 2 exactly, and prove the simulation-core/generation-core/trading-core boundary held — that Agents 2, 8, and 11 were not modified in the process.

## Inputs

- Agent 16's public functions.
- Phase 4 GDD Section 2, and Agent 1's Phase 4 constants, as the authoritative source of truth.
- Agent 3's, Agent 9's, and Agent 12's original test suites, as the regression baseline.

## Outputs

A test suite covering:

### Crew pool & hiring
- `refreshCrewPool` produces candidates within the tunable pool size, with tiers distributed per the shared breakpoint table.
- Tier 6-7 candidates always have a non-null `profession`; tiers 3-5 always have `profession: null`.
- `hireCrew` rejects when the player is at capacity (`baseCapacity + purchasedSlots`), and correctly deducts the tier-scaled cost on success.

### Assignment & simultaneous crafting
- `assignToCraft` correctly calls Agent 2's `craft()` with the crew member's tier/profession — confirm no local reimplementation of any crafting math.
- **Simultaneity test:** the player's own active craft and multiple crew members' active crafts can all be in progress at once — confirm this is not silently serialized into one-at-a-time.

### Background/idle resolution
- `resolveBackgroundCrafting` correctly derives elapsed time from `currentTime - lastCheckedAt` — confirm a caller cannot override this with a supplied duration.
- The elapsed-time cap is enforced — confirm a very large gap (e.g., simulated week-long absence) is still capped at the tunable maximum, not credited in full.
- `lastCheckedAt` updates correctly after resolution.

### Upkeep & attrition
- `payUpkeep` deducts the correct tier-scaled wage from the player's `Wallet` and updates `lastPaidAt`.
- `checkAttrition` removes a crew member exactly when upkeep is unpaid past the grace period — not before, not silently later.
- Confirm attrition is **never** triggered by anything other than unpaid upkeep or voluntary dismissal — no random-chance loss exists anywhere in the implementation.
- `dismissCrew` always succeeds for a crew member's actual owner, and fails/rejects for a non-owner.

### Regression check — the most important test in this suite
- Re-run Agent 3's, Agent 9's, and Agent 12's original test suites against the current codebase, confirming **byte-for-byte identical results**. Any deviation means a prior-phase boundary was violated somewhere in Phase 4's implementation and must be reported immediately.

## Must NOT Do

- Must not modify Agent 16's logic, or Agents 2/8/11's logic. Report discrepancies; do not patch them to make a test pass.
- Must not test rendering or presentation concerns — those belong to Agent 18.
- Must not test or implement combat/travel-hazard/random-loss mechanics — explicitly out of scope per Section 2.7; there is nothing to test because nothing should exist.

## Definition of Done

- Every rule in Phase 4 GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The simultaneity test explicitly passes (multiple concurrent crafts, not serialized).
- The elapsed-time-cap and no-caller-override tests explicitly pass.
- The regression check against all three prior phases' test suites passes with zero deviation.
