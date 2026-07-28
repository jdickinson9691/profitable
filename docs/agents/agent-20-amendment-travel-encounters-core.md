# Agent 20 (Amendment): Ships & Travel Core — Travel Encounters Additions

**Status:** Amendment to the existing Agent 20 (`agent-20-ships-travel-core.md`), not a new agent. Every function Agent 20 already implements (`deriveShipTier`, `refreshShipyardPool`, `purchaseShip`, `assembleShip`, `calculateTravelTime`, `initiateVoyage`, `resolveArrival`) is unchanged — this file documents what's added on top.

**Creation order:** Second, after the Agent 1 Travel Encounters amendment.

## Responsibility

Add encounter resolution logic, invoked from within the existing `resolveArrival()` function, without changing that function's existing contract (arrival-time locking, cargo delivery to a discovered/undiscovered planet, etc.).

## Inputs

- Agent 1's Travel Encounters amendment (types and constants — imported, never hardcoded).
- Agent 2's `rollQuality()` (called for the discovery encounter's resource roll — never duplicated).
- Travel Encounters GDD Section 2 for the exact rules.

## Outputs

### `resolveEncounters(voyage: Voyage): EncounterResult[]` (new function, called internally by `resolveArrival()`)
1. Compute the number of time windows the voyage spanned, using the same window-size constant as the emergency system.
2. For each window, roll the trigger chance (Section 2.1). On a hit, roll the weighted type split (Section 2.2 — hazard weighted lowest).
3. Resolve the triggered type automatically (Section 2.3 — no interactive step, no pausing, no waiting on player input):
   - **`tradeOpportunity`:** grant a currency amount within the configured range directly to the voyage owner's `Wallet` (Section 2.4). No `Listing` created.
   - **`discovery`:** call `rollQuality()` for a resource (source pool per the GDD's noted-but-unresolved detail — use a sensible default, e.g. the origin or destination planet's eligible pool, and note the choice made) and grant the resulting item to the player's inventory (Section 2.5). **Must not set `discovered: true` on any planet as part of this — verify this explicitly, it is the single most important constraint in this amendment.**
   - **`hazard`:** roll against the fixed pass threshold, modified by the voyage's ship's derived tier (via the existing tier-modifier pattern — call, don't reimplement). On failure, deduct a currency cost from the `Wallet` using the escalating curve (Section 2.6).
4. Return the full list of `EncounterResult`s for this voyage, tagged with their `windowIndex`.

### Modify `resolveArrival()` (existing function — additive change only)
- After existing arrival logic (cargo delivery, ship delivery) completes, call `resolveEncounters()` and attach the result to `voyage.encounters`.
- **Must not change `arrivesAt` timing, cargo delivery behavior, or ship delivery behavior in any way** — encounters are resolved as part of arrival processing, they never retroactively affect when or whether a voyage arrives.

## Must NOT Do

- **Must not touch `refine()`/`craft()` (Agent 2), galaxy/planet generation (Agent 8), trading logic (Agent 11), or crew logic (Agent 16)** — same hard boundary every phase has held. This amendment calls `rollQuality()`; it never alters what it does.
- **Must never set `discovered: true` on any planet from within `resolveEncounters()`** — this is the single hardest constraint in this amendment, since it's the one place a subtle mistake would silently reopen the closed "no scanner" decision.
- Must not implement any combat resolution, ship component mutation, or cargo mutation as an encounter outcome.
- Must not add any interactive/blocking step to `resolveArrival()` — it must remain a pure, synchronous, deterministic function given its inputs.
- Must not change `arrivesAt`, cargo delivery, or ship delivery behavior — additive only.
- Must not hardcode any constant already defined by the Agent 1 amendment.

## Testing Requirements (owned by the Agent 21 amendment, but this agent must be built to support it)

- `resolveEncounters()` must be independently testable from the rest of `resolveArrival()`'s existing logic.
- Must be deterministic given a fixed seed, same requirement as every other random function in this codebase.

## Definition of Done

- `resolveEncounters()` is implemented exactly per Travel Encounters GDD Section 2, and correctly integrated into `resolveArrival()` as an additive step.
- A voyage's existing arrival behavior (timing, cargo, ship delivery) is provably unchanged — verified against Agent 21's existing Phase 5 regression tests.
- No code path in this amendment ever sets `discovered: true` — explicitly verified, not assumed.
- Agent 2's, Agent 8's, Agent 11's, and Agent 16's functions remain provably unchanged.
