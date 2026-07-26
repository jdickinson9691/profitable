# Agent 15: Phase 3 Integration Agent

**Creation order:** Last in Phase 3. Depends on the Agent 1 amendment and Agents 11–14, plus all prior MVP and Phase 2 agents as the baseline being integrated against.

## Responsibility

Wire the trading loop into the existing gather → refine → craft loop and verify the full extended loop — gather → refine → craft → **list → sell/buy → price reflects it** — works end-to-end. Verification and integration only, same spirit as Agents 7 and 10.

## Inputs

- Agent 11's trading functions.
- Agent 12's passing test suite, including its regression check.
- Agent 13's presentation scenes.
- Agent 14's base price and planet preference content.
- All prior MVP and Phase 2 agents' completed outputs, as the baseline.

## Outputs

- A working build where a player can: gather a resource on a generated planet (Phase 2), refine and craft it (MVP), list the result on that planet's market or the global market (subject to tier restrictions), have it purchased (fully or partially) by another party, observe the resulting price move via baseline drift, and see that reflected on the trade map.
- An integration report confirming Phase 3 GDD Section 1's Definition of Done is met.
- A gap list, attributed to the specific responsible agent (Agent 1 Phase 3 amendment, 11, 12, 13, 14, or an earlier MVP/Phase 2 agent whose contract turns out not to have been fully met).

## Must NOT Do

- Must not introduce new trading logic, new formulas, or new content to make integration work.
- **Must not modify Agent 2's `refine()`/`craft()` or Agent 8's generation logic** — if integration seems to require this, the boundary was violated upstream and that's what gets reported.
- Must not implement market manipulation detection logic to "complete" the trading system — explicitly out of scope per Section 2.11, not a gap to fill.

## Testing Requirements

- Run the full extended loop (gather → refine → craft → list → purchase) at least once end-to-end with real, non-mocked data.
- Confirm Agent 12's full test suite — including its regression check against Agents 3 and 9 — still passes in the integrated build.
- Hand-verify at least one complete pricing example: a known starting price, a known trade, and the resulting drifted price matching a hand-calculated expected value exactly.
- Hand-verify the global price invariant holds in the integrated build (global price never beats the best live planet price) using real generated planet data, not just Agent 12's isolated unit tests.
- Confirm the original MVP's and Phase 2's hand-calculated test cases still pass unchanged.

## Definition of Done

- The full gather → refine → craft → list → purchase loop runs start to finish using generated planets and real trading data.
- At least one hand-verified pricing example and one hand-verified global-price-invariant example are documented in the integration report.
- The original MVP's and Phase 2's hand-calculated test cases still pass with zero deviation.
- Phase 3 GDD Section 1's Definition of Done is explicitly confirmed, in writing, as met — or a specific, attributable list of what's blocking it.
