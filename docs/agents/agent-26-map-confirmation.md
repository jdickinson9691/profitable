# Agent 26: Map Confirmation Agent

**Creation order:** Second and last in the Galactic Map milestone. Depends on Agent 25's verification report.

## Responsibility

Produce the final milestone report for the Galactic Map: confirm the Definition of Done from `profitable-map-gdd.md` Section 1 is met, explicitly confirm none of the four deferred future ideas were implemented anywhere in the codebase, and route any gap Agent 25 found to the correct upstream agent as a bug report rather than absorbing it as new scope.

## Inputs

- Agent 25's verification report.
- `profitable-map-gdd.md` Section 1 (Definition of Done) and Section 2.5 (recorded future ideas, explicitly not to be built).

## Outputs

- A milestone confirmation report stating, for each of Sections 2.1–2.4: confirmed working as designed, or a specific bug report (which file/agent, expected vs. actual behavior) if Agent 25 found a discrepancy.
- An explicit statement confirming none of the four deferred future ideas (Section 2.5) were implemented during this milestone — a direct, checkable claim, not an assumption.
- If any bug reports were generated, they're attributed to the specific prior-phase agent responsible (most likely Agent 13, Agent 20, or Agent 22) — this milestone does not fix them directly.

## Must NOT Do

- Must not implement fixes for any bug Agent 25 found — report and attribute, same discipline as every prior phase's integration agent.
- Must not implement any of the four deferred future ideas, even if a bug report makes one seem tempting to "just add while fixing this."
- Must not declare the milestone done if Section 1's Definition of Done isn't actually met — a report with open bug items is a valid, honest outcome; a report that glosses over them is not.

## Definition of Done

- `profitable-map-gdd.md` Section 1's Definition of Done is explicitly confirmed as met, or a specific, attributable list of what's blocking it (existing bugs found in Phase 3/5 code, not new Phase 6 scope).
- Explicit written confirmation that none of the four deferred future ideas exist in the codebase as of this milestone's close.
