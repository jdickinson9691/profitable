# Agent 24: Phase 5 Integration Agent

**Creation order:** Last in Phase 5. Depends on the Agent 1 amendment and Agents 20–23, plus all prior MVP, Phase 2, Phase 3, and Phase 4 agents as the baseline being integrated against.

## Responsibility

Wire component crafting, ship assembly, shipyard purchase, map travel-time display, and voyage initiation/resolution into the existing extended loop, and verify the full loop works end-to-end. Also verify the Phase 3 remote tier 6-7 sale mechanic — deferred at the time to "the Travel milestone" — now actually resolves through a real `Voyage`, not a stub. Verification and integration only, same spirit as every prior phase's integration agent.

## Inputs

- Agent 20's ships/travel functions.
- Agent 21's passing test suite, including its regression check.
- Agent 22's presentation scenes.
- Agent 23's component recipe content.
- All prior MVP, Phase 2, Phase 3, and Phase 4 agents' completed outputs, as the baseline.

## Outputs

- A working build where a player can: craft at least one component of each category, purchase a ship from a generated planet's shipwright pool, assemble components into it and see its tier derived correctly, select a discovered destination on the (extended) map, see an accurate travel time, initiate and resolve a voyage, and — separately — confirm that a Phase 3 remote tier 6-7 sale's item now genuinely travels via a real `Voyage` and becomes an active listing only upon arrival.
- An integration report confirming Phase 5 GDD Section 1's Definition of Done is met.
- A gap list, attributed to the specific responsible agent (Agent 1 Phase 5 amendment, 20, 21, 22, 23, or an earlier MVP/Phase 2/3/4 agent whose contract turns out not to have been fully met).

## Must NOT Do

- Must not introduce new ship/travel logic, new formulas, or new content to make integration work.
- **Must not modify Agent 2's `refine()`/`craft()`, Agent 8's generation logic, Agent 11's trading logic, or Agent 16's crew logic** — if integration seems to require this, the boundary was violated upstream and that's what gets reported.
- Must not implement encounters, combat, or any travel-hazard mechanic to "complete" the travel system — explicitly out of scope per Section 2.9, not a gap to fill.

## Testing Requirements

- Run the full extended loop (craft component → assemble ship → purchase from shipyard → view travel time → initiate voyage → resolve arrival) at least once end-to-end with real, non-mocked data.
- Confirm Agent 21's full test suite — including its regression check against Agents 3, 9, 12, and 17 — still passes in the integrated build.
- Hand-verify at least one complete travel-time example: a known distance, a known ship tier, and the resulting travel time matching a hand-calculated expected value exactly.
- **Specifically confirm the Phase 3 remote tier 6-7 sale connection**: initiate a remote sale to a discovered planet, confirm the item is carried via a real `Voyage`, and confirm the listing only becomes active at the destination planet market after `resolveArrival` — not before.
- Confirm the original MVP's, Phase 2's, Phase 3's, and Phase 4's hand-calculated test cases still pass unchanged.

## Definition of Done

- The full craft → assemble → purchase → travel-time-display → voyage → arrival loop runs start to finish using generated planets and real ship/component data.
- The Phase 3 remote tier 6-7 sale mechanic is confirmed working through a real voyage, documented with a hand-verified example.
- At least one hand-verified travel-time example is documented in the integration report.
- The original MVP's, Phase 2's, Phase 3's, and Phase 4's hand-calculated test cases still pass with zero deviation.
- Phase 5 GDD Section 1's Definition of Done is explicitly confirmed, in writing, as met — or a specific, attributable list of what's blocking it.
