# Agent 21 (Amendment): Phase 5 Validation/Test — Scanner/Probe Additions

**Status:** Amendment to the existing Agent 21, not a new agent. Every existing test (including the Travel Encounters amendment's suite) is unchanged.

**Creation order:** Third, created alongside the Agent 20 Scanner amendment and run continuously against it.

## Responsibility

Prove the Agent 20 Scanner amendment matches Scanner GDD Section 2 exactly, and prove no guarded boundary was crossed.

## Inputs

- The Agent 20 Scanner amendment's functions.
- Scanner GDD Section 2, and Agent 1's Scanner constants, as the source of truth.
- Agent 21's own existing test suite (Phase 5 base + Travel Encounters amendment), as the regression baseline.

## Outputs

A test suite addition covering:

### Pool refresh & purchase
- `refreshScannerPool` produces candidates within the tunable pool size, tiers distributed per the shared breakpoint table.
- `purchaseScanner` transfers ownership and deducts cost correctly, mirroring the existing `purchaseShip` test pattern.

### Scan action correctness
- `performScan` requires the player to be docked at an already-discovered planet — confirm rejection otherwise.
- With no scanner owned, confirm the documented default behavior (rejection, per Agent 20's contract) is what actually happens.
- With multiple scanners owned, confirm only the highest-tier one's radius is used — not a sum of all owned scanners. Test this explicitly with at least two owned scanners of different tiers.
- Confirm the effective radius (base + tier bonus) matches a hand-calculated expected value at several tiers.
- Given a known planet layout, confirm the exact set of newly-discovered planets matches what the radius calculation predicts — planets just inside the radius become discovered, planets just outside do not (a boundary test, not just an interior/exterior spot-check).

### Guardrail tests — the most important part of this amendment's suite
- **Confirm `performScan` never modifies any `Planet` field other than `discovered`.** Snapshot a planet's full record before and after a scan, diff it, and assert the only possible difference is that one field.
- **Confirm `deriveShipTier()` produces identical output regardless of whether the ship's owner owns a scanner.** This is a direct test that scanner ownership never enters the ship-tier averaging.
- **Confirm no code path in the Scanner amendment ever calls or references `resolveEncounters()` or any Travel Encounters type** — the two systems must remain provably independent.
- **Confirm no automatic/passive discovery occurs** — running `resolveArrival()` or `initiateVoyage()` in a scenario where a scan *would* discover nearby planets must not discover them; only an explicit `performScan()` call may.

### Regression check
- Re-run the full existing Agent 21 suite (Phase 5 base + Travel Encounters amendment) against the amended codebase, confirming **byte-for-byte identical results**.

## Must NOT Do

- Must not modify the Agent 20 Scanner amendment's logic — report discrepancies, don't patch them.
- Must not test any interaction between scanner and Travel Encounters, or scanner and map staleness — there should be none to test; a test proving *absence* is appropriate, a test exercising a nonexistent interaction is not.

## Definition of Done

- Every rule in Scanner GDD Section 2 has at least one passing test asserting the exact documented behavior.
- All four guardrail tests explicitly pass.
- The regression check against the full existing suite passes with zero deviation.
