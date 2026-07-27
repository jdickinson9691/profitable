# Agent 16: Crew Core Agent

**Creation order:** Second in Phase 4 (after the Agent 1 amendment). Depends on the Agent 1 Phase 4 amendment and on Agent 2's `craft()`. Precedes Agents 17–19.

## Responsibility

Implement crew hiring, assignment, background/idle production, upkeep, and attrition as plain, framework-agnostic TypeScript. Same architectural mandate as Agents 2, 8, and 11: zero dependency on Phaser, the DOM, or any browser API.

## Inputs

- Agent 1's Phase 4 amendment (types and constants — imported, never hardcoded).
- Agent 2's `craft()` — called once per simultaneous crafter (player and each active crew member), never duplicated (Phase 4 GDD Section 2.5).
- Phase 4 GDD Section 2 for the exact rules.

## Outputs

### `refreshCrewPool(planetId, seed?): PlanetCrewPool`
- Rolls new hire candidates via the same 7-tier breakpoint table used everywhere else; tier 6-7 candidates also get a rolled `profession`.
- Respects the tunable pool size and refresh interval from Agent 1's amendment.

### `hireCrew(candidateId, playerId): CrewMember | HireError`
- Rejects if the player is at crew capacity (`CrewCapacity.baseCapacity + purchasedSlots`).
- Deducts the tier-scaled hire cost.
- Removes the candidate from its `PlanetCrewPool` and creates a live `CrewMember` record with `status: 'idle'`.

### `assignToCraft(crewMemberId, craftAction): AssignResult`
- Sets `status: 'active'` and `assignedCraftId`.
- Calls Agent 2's `craft()` using this crew member's tier/profession as the crafter input — **does not reimplement any part of the crafting formula.**
- Must support this running **simultaneously** with the player's own active craft and other crew members' active crafts (Section 2.5) — no artificial single-craft-at-a-time restriction.

### `resolveBackgroundCrafting(crewMemberId, currentTime): BackgroundResult`
- Computes `elapsedTime = currentTime - crewMember.lastCheckedAt`, capped at the tunable elapsed-time maximum (Section 2.1a) — **never trusts a caller-supplied elapsed duration.**
- Resolves all background production for that elapsed time in one deterministic pass, calling Agent 2's `craft()` at the (currently placeholder, pending design resolution) reduced background rate.
- Updates `lastCheckedAt` to `currentTime` after resolution.

### `payUpkeep(crewMemberId, currentTime): PaymentResult`
- Deducts the crew member's `wageAmount` from the player's `Wallet` (Phase 3 type) at the tunable interval.
- Updates `lastPaidAt` on success.

### `checkAttrition(crewMemberId, currentTime): AttritionResult`
- If upkeep is unpaid past the tunable grace period (Section 2.7), removes the crew member from the player's active roster.
- Does **not** implement any random/chance-based loss — attrition is deterministic and upkeep-driven only.

### `dismissCrew(crewMemberId, playerId): DismissResult`
- Player-initiated, always succeeds if the crew member belongs to that player — voluntary dismissal per Section 2.7.

## Must NOT Do

- **Must not touch `refine()`/`craft()` internals (Agent 2), galaxy/planet generation (Agent 8), or trading logic (Agent 11) in any way** — same hard boundary established in Phase 2 and extended through Phase 3, now extended again. Crew Core *calls* `craft()` multiple times; it never alters what that function does.
- Must not implement combat, travel-hazard, or poaching mechanics — Section 2.7 explicitly rules out random/permadeath loss for this phase.
- Must not trust a client/caller-supplied elapsed-time value for background crafting — must always derive it from `currentTime - lastCheckedAt` (Section 2.1a's multiplayer-forward reasoning).
- Must not hardcode any constant already defined by the Agent 1 Phase 4 amendment.
- Must not implement rendering, input, save/load, or audio.

## Testing Requirements (owned by Agent 17, but this agent must be built to support it)

- All functions must be pure and deterministic given fixed inputs and a fixed `currentTime`.
- `resolveBackgroundCrafting` must be independently testable from `assignToCraft` — Agent 17 needs to verify active and background paths separately.

## Definition of Done

- `refreshCrewPool`, `hireCrew`, `assignToCraft`, `resolveBackgroundCrafting`, `payUpkeep`, `checkAttrition`, and `dismissCrew` are implemented exactly per Phase 4 GDD Section 2.
- Multiple simultaneous active crafts (player + N crew members) are provably supported — not serialized into a single-craft-at-a-time queue.
- Background crafting resolution never trusts a caller-supplied elapsed duration, verified against an attempted override.
- Agent 2's, Agent 8's, and Agent 11's functions are provably unchanged (diff or full re-run of their existing test suites with zero deviation).
- Zero imports from any rendering, DOM, or browser-API library anywhere in this agent's files.
