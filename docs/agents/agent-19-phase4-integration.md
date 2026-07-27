# Agent 19: Phase 4 Integration Agent

**Creation order:** Last in Phase 4. Depends on the Agent 1 amendment and Agents 16–18, plus all prior MVP, Phase 2, and Phase 3 agents as the baseline being integrated against.

## Responsibility

Wire crew hiring, assignment, and background production into the existing gather → refine → craft → list → purchase loop, and verify the full extended loop works end-to-end with real simultaneous crafting. Verification and integration only, same spirit as every prior phase's integration agent.

## Inputs

- Agent 16's crew functions.
- Agent 17's passing test suite, including its regression check.
- Agent 18's presentation scenes.
- All prior MVP, Phase 2, and Phase 3 agents' completed outputs, as the baseline.

## Outputs

- A working build where a player can: hire a crew member from a generated planet's crew pool, assign them to an active craft that runs **simultaneously** with the player's own crafting, leave another crew member idle and later resolve their background production via the catch-up calculation, have upkeep correctly deducted over time, and see a crew member correctly removed if upkeep goes unpaid past the grace period (or dismissed voluntarily).
- An integration report confirming Phase 4 GDD Section 1's Definition of Done is met (once written — see GDD note).
- A gap list, attributed to the specific responsible agent (Agent 1 Phase 4 amendment, 16, 17, 18, or an earlier MVP/Phase 2/Phase 3 agent whose contract turns out not to have been fully met).

## Must NOT Do

- Must not introduce new crew logic, new formulas, or new content to make integration work.
- **Must not modify Agent 2's `refine()`/`craft()`, Agent 8's generation logic, or Agent 11's trading logic** — if integration seems to require this, the boundary was violated upstream and that's what gets reported.
- Must not implement combat, travel-hazard, or random-loss mechanics to "complete" the crew system — explicitly out of scope per Section 2.7, not a gap to fill.

## Testing Requirements

- Run the full extended loop (hire → assign → simultaneous active crafting alongside the player's own craft → idle background resolution → upkeep payment) at least once end-to-end with real, non-mocked data.
- Confirm Agent 17's full test suite — including its regression check against Agents 3, 9, and 12 — still passes in the integrated build.
- Hand-verify at least one complete background-production example: a known `lastCheckedAt`, a known elapsed time, and the resulting output matching a hand-calculated expected value exactly (using whatever background-rate number is current at integration time — flag clearly if that number is still a placeholder per Agent 1's amendment).
- Confirm the original MVP's, Phase 2's, and Phase 3's hand-calculated test cases still pass unchanged.

## Definition of Done

- The full hire → assign → simultaneous craft → background resolution → upkeep loop runs start to finish using generated planets and real crew data.
- At least one hand-verified background-production example is documented in the integration report.
- The original MVP's, Phase 2's, and Phase 3's hand-calculated test cases still pass with zero deviation.
- Phase 4 GDD Section 1's Definition of Done is explicitly confirmed, in writing, as met — or a specific, attributable list of what's blocking it.
