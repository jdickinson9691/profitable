# Agent 21: Phase 5 Validation/Test Agent

**Creation order:** Third in Phase 5, created alongside Agent 20 and run continuously against it — same relationship pattern as every prior phase's validation agent.

## Responsibility

Prove Agent 20's ship/travel logic matches Phase 5 GDD Section 2 exactly, and prove the simulation-core/generation-core/trading-core/crew-core boundary held — that Agents 2, 8, 11, and 16 were not modified in the process.

## Inputs

- Agent 20's public functions.
- Phase 5 GDD Section 2, and Agent 1's Phase 5 constants, as the authoritative source of truth.
- Agent 3's, Agent 9's, Agent 12's, and Agent 17's original test suites, as the regression baseline.

## Outputs

A test suite covering:

### Ship tier derivation
- `deriveShipTier` correctly computes a straight average of installed component tiers and maps it through the shared breakpoint table — confirm this reuses `getTierColor()` rather than reimplementing it.
- Confirm the documented behavior for missing/`null` component slots is applied consistently (whatever rule Agent 20 documents — test that it's actually followed, not ambiguous in practice).
- Confirm tier is recomputed after `assembleShip()` changes a component — never stale.

### Shipyard pool & purchase
- `refreshShipyardPool` produces candidates within the tunable pool size, tiers distributed per the shared breakpoint table.
- `purchaseShip` transfers ownership and deducts cost correctly; removes the ship from the pool.

### Travel time calculation
- `calculateTravelTime` correctly computes Euclidean distance between two known `{x, y}` positions and matches a hand-calculated expected value.
- Confirm the ship-tier speed modifier is applied correctly — a higher-tier ship produces a shorter travel time than a lower-tier ship for the same route, by the documented percentage.
- Confirm the calculation uses only 2D distance — no `z` axis anywhere.

### Voyage lifecycle
- `initiateVoyage` correctly locks in `arrivesAt` at departure time — confirm a later change to the ship's tier does **not** retroactively change an already-initiated voyage's arrival time.
- `resolveArrival` rejects resolution attempts before `arrivesAt` — test this explicitly with a `currentTime` before arrival.
- Confirm cargo delivery correctly connects to the Phase 3 remote tier 6-7 sale mechanic — a voyage carrying sale cargo results in that listing becoming active at the destination planet only upon arrival, not before.

### Regression check — the most important test in this suite
- Re-run Agent 3's, Agent 9's, Agent 12's, and Agent 17's original test suites against the current codebase, confirming **byte-for-byte identical results**. Any deviation means a prior-phase boundary was violated somewhere in Phase 5's implementation and must be reported immediately.

## Must NOT Do

- Must not modify Agent 20's logic, or Agents 2/8/11/16's logic. Report discrepancies; do not patch them to make a test pass.
- Must not test rendering or presentation concerns — those belong to Agent 22.
- Must not test or implement encounters/combat mechanics — explicitly out of scope per Section 2.9; nothing to test because nothing should exist.

## Definition of Done

- Every rule in Phase 5 GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The travel-time hand-calculated example test passes exactly.
- The voyage-lock and early-resolution-rejection tests explicitly pass.
- The regression check against all four prior phases' test suites passes with zero deviation.
