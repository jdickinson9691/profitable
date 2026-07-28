# Agent 20 (Amendment): Ships & Travel Core — Scanner/Probe Additions

**Status:** Amendment to the existing Agent 20, not a new agent. Every function Agent 20 already implements (including the Travel Encounters amendment's `resolveEncounters()`) is unchanged.

**Creation order:** Second, after the Agent 1 Scanner amendment.

## Responsibility

Add scanner pool refresh/purchase and the scan action itself, mirroring the existing `refreshShipyardPool()`/`purchaseShip()` pattern and reusing `calculateTravelTime()`'s distance math.

## Inputs

- Agent 1's Scanner amendment (types and constants — imported, never hardcoded).
- Agent 20's own existing `calculateTravelTime()` (or its underlying distance calculation, extracted into a shared helper if not already factored out — do not duplicate the Euclidean distance formula a second time).
- Scanner GDD Section 2 for the exact rules.

## Outputs

### `refreshScannerPool(planetId, seed?): ScannerPool`
- Rolls new scanner candidates via the same 7-tier breakpoint table used everywhere else.
- Respects the tunable pool size and refresh interval from Agent 1's amendment. Mirrors `refreshShipyardPool()`'s structure closely — this should look and behave like a sibling function, not a divergent one-off.

### `purchaseScanner(scannerId, playerId): Scanner | PurchaseError`
- Removes the scanner from its `ScannerPool`, transfers ownership, deducts tier-scaled cost. Mirrors `purchaseShip()`.

### `performScan(playerId, dockedPlanetId): { newlyDiscovered: Planet[] }`
1. Requires the player to actually be docked at `dockedPlanetId`, and that planet must already be `discovered: true` — reject otherwise.
2. Determine the player's owned scanner(s). If none owned, either reject the action or use the base radius with zero tier bonus (confirm which per the GDD — default to rejecting if no scanner owned, since the base-radius case is ambiguous in the design doc and worth a conservative default).
3. If multiple scanners are owned, use only the **highest-tier one** (Section 2.4's default) — do not sum bonuses across multiple owned scanners.
4. Compute the effective radius: base radius + tier bonus from the (single, highest-tier) scanner's tier.
5. For every planet **not already discovered**, compute Euclidean distance from `dockedPlanetId`'s coordinates (same formula as `calculateTravelTime()`'s distance step — reuse, don't reimplement).
6. For every planet within the effective radius, set `discovered: true`. **This is the only field this function may ever change on a `Planet` record.**
7. Return the list of newly-discovered planets.

## Must NOT Do

- **Must not touch `refine()`/`craft()` (Agent 2), Agent 8's generation logic, Agent 11's trading logic, or Agent 16's crew logic.**
- **Must never modify any `Planet` field other than `discovered`** — no side effects on tier, position, resource lists, or anything else, even accidentally.
- **Must not affect `deriveShipTier()` in any way** — a scanner is not a component; it must never be read by or passed into that function.
- **Must not implement passive/automatic discovery** — `performScan()` must only ever run as an explicit, player-triggered action while docked; it must never be invoked as a side effect of `resolveArrival()`, `initiateVoyage()`, or any other existing function.
- Must not implement any interaction with the Travel Encounters amendment's `resolveEncounters()` or `EncounterResult` types — fully independent, per the design decision.
- Must not hardcode any constant already defined by the Agent 1 amendment.

## Testing Requirements (owned by the Agent 21 amendment, but this agent must be built to support it)

- All functions must be pure and deterministic given fixed inputs/seed.
- `performScan()` must be testable with a known planet layout and a known scanner tier, producing an exact expected set of newly-discovered planets.

## Definition of Done

- `refreshScannerPool`, `purchaseScanner`, and `performScan` are implemented exactly per Scanner GDD Section 2.
- `performScan()` is provably incapable of modifying any `Planet` field other than `discovered`.
- `deriveShipTier()` is provably unaffected by any scanner ownership or use — verified against Agent 21's existing Phase 5 tests for that function.
- Agent 2's, Agent 8's, Agent 11's, and Agent 16's functions remain provably unchanged.
