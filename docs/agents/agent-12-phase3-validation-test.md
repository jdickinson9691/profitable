# Agent 12: Phase 3 Validation/Test Agent

**Creation order:** Third in Phase 3, created alongside Agent 11 and run continuously against it — same relationship Agent 3 had to Agent 2, and Agent 9 to Agent 8.

## Responsibility

Prove Agent 11's trading logic matches Phase 3 GDD Section 2 exactly, and prove the simulation-core/generation-core boundary held — that Agents 2 and 8 were not modified in the process.

## Inputs

- Agent 11's public functions.
- Phase 3 GDD Section 2, and Agent 1's Phase 3 constants, as the authoritative source of truth.
- Agent 3's and Agent 9's original test suites, as the regression baseline.

## Outputs

A test suite covering:

### Listing creation & tier restrictions
- A tier 6 or 7 item cannot be listed with `location: 'global'` — confirm this is rejected, not silently downgraded or ignored.
- Tiers 1–5 can be listed both globally and on a planet.
- `marketTier` is computed via the straight-average-to-tier formula and matches a hand-calculated expected value for a known 5-quality input.

### Purchase & self-trade prevention
- A purchase attempt where `buyerPlayerId === createdByPlayerId` is rejected outright — test this explicitly and directly, not just infer it from other passing tests.
- Partial purchases correctly decrement quantity; a listing reaching zero quantity is closed, not left dangling at zero.
- The flat transaction fee (Section 2.11) is deducted exactly per the documented percentage, and confirm it is *removed from the economy* — not paid to the buyer, seller, or any other party.

### Drift & recovery
- `applyDrift` moves price by the documented percentage per unit, and the effect diminishes on successive units (confirm this isn't accidentally a flat/linear decrease).
- Price never exits the floor/ceiling bounds, including under repeated rapid trading (a stress test with many consecutive units, not just one).
- `applyRecovery` moves an untraded price back toward `basePrice` over time, at the documented rate.

### Global price mechanism
- `getGlobalPrice('buy', ...)` always equals `min(planet sell prices) + markup` for a known set of planet prices — exact value, not an approximate range.
- `getGlobalPrice('sell', ...)` always equals `max(planet buy prices) - discount` similarly.
- **Critical invariant test:** across many randomized planet price states, confirm the global buy price is never less than the best planet sell price, and the global sell price is never more than the best planet buy price — i.e., global never structurally beats a planet's best price, under any input.

### Listing lifecycle
- A planet-market listing past `expiresAt` is marked held-for-pickup at that planet, not deleted and not auto-returned to inventory.
- A global-market listing past `expiresAt` returns straight to the creating player's inventory.

### Regression check — the most important test in this suite
- Re-run Agent 3's original MVP test suite and Agent 9's Phase 2 test suite against the current codebase, confirming **byte-for-byte identical results**. Any deviation means the planet-agnostic/simulation-core boundary was violated somewhere in Phase 3's implementation and must be reported immediately.

## Must NOT Do

- Must not modify Agent 11's logic, or Agents 2/8's logic. Report discrepancies; do not patch them to make a test pass.
- Must not test rendering or presentation concerns — those belong to Agent 13.
- Must not implement or test market manipulation *detection* logic — explicitly out of scope per Section 2.11; testing something that doesn't exist yet isn't this agent's job.

## Definition of Done

- Every rule in Phase 3 GDD Section 2 has at least one passing test asserting the exact documented behavior.
- The global-price invariant test passes across a randomized/stress-tested range of inputs, not just a single hand-picked example.
- The regression check against both prior phases' test suites passes with zero deviation.
