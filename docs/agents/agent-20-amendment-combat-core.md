# Agent 20 (Amendment): Ships & Travel Core — Combat Additions

**Status:** Amendment to the existing Agent 20, not a new agent. Every function Agent 20 already implements (including Travel Encounters' `resolveEncounters()` and Scanner's `performScan()`) is unchanged.

**Creation order:** Second, after the Agent 1 Combat amendment. **This is the largest and highest-risk amendment in the project so far** — read the full GDD Section 1 before starting, not just this contract.

## Responsibility

Add combat detection at both trigger points, a deferred (pending → resolved) resolution flow, and the associated component/crew mutations — without altering `resolveArrival()`'s existing fully-synchronous behavior for the other three encounter types.

## Inputs

- Agent 1's Combat amendment (types and constants — imported, never hardcoded).
- Agent 20's own existing `resolveEncounters()` (Travel Encounters amendment), `initiateVoyage()`, `resolveArrival()`, `deriveShipTier()`, `getTierColor()`.
- Combat GDD Section 2 for the exact rules.

## Outputs

### Detection — integrated into existing flows, additive only

**Within the existing per-window roll (inside `resolveEncounters()`'s logic):** if the weighted type-split roll lands on `combat`, **do not resolve an outcome**. Instead, create a `CombatEncounter` with `status: 'pending'`, roll and store `opponentThreatTier` immediately (the only randomness that happens at detection time), and record it — this becomes part of what `resolveArrival()` returns, but as a pending item, not a completed one. **All other window rolls (trade-opportunity, discovery, hazard) continue resolving exactly as before, synchronously, in the same pass.**

**At arrival (new check, separate from the window-roll mechanism):** after a voyage's normal arrival processing, roll the arrival-triggered combat check chance. On a hit, create a `CombatEncounter` with `triggerContext: 'arrival'`, `windowIndex: null`, same pending/threat-roll behavior as above.

### `resolveCombatChoice(combatEncounterId: string, choice: 'attack' | 'flee'): CombatResolution`
1. If `choice === 'flee'`: set `outcome: 'flee'`, `status: 'resolved'`. Trigger a retreat voyage (see below). No component/crew mutation.
2. If `choice === 'attack'`:
   - Roll the player's combat value: the ship's equipped **weapon component's tier**, with the existing percentage-based variance applied (reuse the existing variance-table logic — do not reimplement).
   - Roll the opponent's combat value: the already-stored `opponentThreatTier` (rolled at detection time), with the same variance formula applied fresh at resolution time.
   - **Higher value wins.**
   - **On win:** set `outcome: 'win'`, `status: 'resolved'`. No further action — the original voyage's arrival/delivery already completed normally (or continues normally, if this was a travel-window detection) since combat's pending state never blocked the rest of arrival processing.
   - **On lose:** set `outcome: 'lose'`, `status: 'resolved'`. Apply component damage (reduce the weapon's `qualities.durability` by the configured percentage, then recompute the weapon's tier via `getTierColor()`, then recompute `deriveShipTier()` for the ship — reuse `assembleShip()`'s existing recompute pattern). Apply crew consequence (if the player owns at least one crew member, pick one at random and set `unavailableUntil` to `now + configured duration`; if none owned, skip this step entirely — do not error). Trigger a retreat voyage.

### Retreat voyage (shared by flee and lose outcomes)
- Call the existing `initiateVoyage()` with destination = the original voyage's `originPlanetId`, and `isRetreat: true`.
- Cargo from the original voyage carries over to the retreat voyage unchanged — never forfeited.
- When `resolveEncounters()` is invoked for a voyage with `isRetreat: true`, it must return immediately with no rolls — **this is the one place `resolveEncounters()`'s behavior changes, and it must be a simple, early-return guard, not a rewrite of its internals.**

## Must NOT Do

- **Must not make `resolveArrival()` block, pause, or become asynchronous for the other three encounter types.** Combat's pending state must not leak into or slow down trade-opportunity/discovery/hazard resolution in any way.
- **Must not touch `refine()`/`craft()` (Agent 2), Agent 8's generation logic, Agent 11's trading logic, or Agent 16's crew logic.**
- Must not resolve a combat outcome without an explicit `resolveCombatChoice()` call — no auto-resolution, no timeout-based default, no resolution as a side effect of any other function.
- Must not roll the opponent's threat tier more than once per `CombatEncounter` — it's fixed at detection time; only the variance application happens fresh at resolution time.
- Must not implement multi-round combat, damage beyond the single decided percentage, or any consequence beyond what's in Section 2.5.
- Must not forfeit cargo under any outcome.
- Must not hardcode any constant already defined by the Agent 1 amendment.

## Testing Requirements (owned by the Agent 21 amendment, but this agent must be built to support it)

- Detection and resolution must be independently testable — a `CombatEncounter` can exist in `pending` state and be inspected before `resolveCombatChoice()` is ever called.
- All rolls must be deterministic given a fixed seed.

## Definition of Done

- Combat encounters are correctly detected at both trigger points, without altering the synchronous resolution of the other three types.
- `resolveCombatChoice()` correctly implements all three outcomes exactly per Section 2.5, including the retreat voyage and its cargo/encounter-suppression behavior.
- Component and crew mutations are correctly scoped (weapon-only, durability-only, percentage-based; crew — one random member, timestamp-only, skip gracefully if none owned).
- Agent 2's, Agent 8's, Agent 11's, and Agent 16's functions remain provably unchanged.
- Agent 20's own prior functions (`resolveEncounters()` for non-combat types, `performScan()`, `deriveShipTier()`, etc.) are provably unchanged in behavior except for the documented `isRetreat` early-return guard.
