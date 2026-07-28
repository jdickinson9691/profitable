# Agent 29: Combat Confirmation Agent

**Creation order:** Last, after all four Combat amendments (Agent 1, Agent 20, Agent 21, Agent 22) are complete.

## Responsibility

Confirm the Combat GDD's Definition of Done is met, and explicitly confirm every guarded boundary held — especially the ones specific to Combat's new pending-state mechanism, which is the riskiest architectural change in this entire project.

## Inputs

- All four Combat amendments' completed outputs.
- Combat GDD Section 1 (Definition of Done) and Section 5 (cross-cutting rules).

## Outputs

A confirmation report stating, explicitly:

1. **Definition of Done confirmed:** a combat encounter can be detected (both trigger points), presented as a pending decision, resolved via attack/flee, and all three outcomes apply their correct consequences — demonstrated with a real example of each outcome.
2. **`resolveArrival()`'s synchronous behavior for trade-opportunity, discovery, and hazard is completely unaffected** — cite Agent 21's regression check specifically, including the mixed-scenario test (combat detected alongside another type in the same voyage).
3. **No multi-round, real-time, or turn-based combat exists anywhere** — confirmed by absence.
4. **No permanent loss exists** — component damage is a percentage reduction (not destruction), crew unavailability is temporary (not removal) — cite the specific test values used.
5. **Opponent threat is rolled exactly once, at detection, never re-rolled at resolution** — cite Agent 21's specific test.
6. **`isRetreat` voyages produce zero encounter rolls** — cite Agent 21's specific test, not just an absence of failures.
7. **Cargo is never forfeited in any outcome** — cite the test confirming this across win/lose/flee.
8. **No interaction between Combat and Scanner, or Combat and map staleness** — confirmed by absence.
9. **Agents 2, 8, 11, and 16 remain unmodified.**

## Must NOT Do

- Must not implement fixes for any gap found — report and attribute to the responsible amendment.
- Must not declare the milestone done if any of the nine confirmations above can't be made with actual evidence rather than an assumption. Given this amendment's size and the novelty of its pending-state mechanism, treat confirmation #2 (the regression check) with particular scrutiny — this is the one most likely to have a subtle gap.

## Definition of Done

- All nine confirmations in the Outputs section are stated explicitly, each backed by specific evidence (a test name, a diff, a live-verified example).
- Combat GDD Section 1's Definition of Done is explicitly confirmed as met, or a specific, attributable list of what's blocking it.
