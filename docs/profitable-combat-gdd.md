# Profitable — Combat Game Design Document

Status: design locked (see `profitable-design-questions.md`, "Combat" section — fully resolved). This is the third of four deliberately-deferred gaps. It extends `profitable-phase5-gdd.md` and the Travel Encounters amendment directly.

---

## 1. Scope — Read This Before Assuming It's "Just Another Amendment"

Like Travel Encounters and Scanner, Combat is implemented as amendments to Agents 1, 20, 21, and 22, plus one confirmation agent — no new Core/Presentation/Content agents. **But it introduces one genuine architectural break from everything built so far, worth understanding before writing any code:**

**Every encounter resolution before Combat was fully synchronous and automatic.** `resolveEncounters()` (Travel Encounters) rolls, resolves, and reports — start to finish, in one function call, with the player possibly not even present. Combat cannot work that way: it requires a player decision (attack or flee) **before** the outcome can be computed. This means combat encounters cannot resolve inside the same synchronous pass as the other three types.

**Required approach: combat encounters are detected during the normal window-roll/arrival-check process, but resolve as a separate, deferred step.** When a combat encounter is rolled (or triggered at arrival), the system records a **pending** combat encounter (with the opponent's threat tier already rolled, for determinism — the randomness happens once, at detection time, not at resolution time) and reports it back to the player without resolving Win/lose immediately. Only once the player makes an explicit choice (attack or flee) does resolution happen, via a separate function call. `resolveArrival()`'s existing synchronous behavior for the other three encounter types, cargo delivery, and ship delivery is otherwise completely unaffected — Combat adds a new *kind* of encounter result (`pending`, then later `resolved`), it doesn't change how anything else in that function works.

**Definition of done:** a combat encounter can be detected during travel (as a weighted fourth type) or at planet arrival (a separate check), presented to the player as a pending decision, resolved via an explicit attack/flee choice using the weapon-tier-vs-opponent-threat formula, and its outcome (win/lose/flee) correctly applies the associated consequences (continue undamaged / redirect + component + crew consequence / redirect only) — all without modifying Agents 2, 8, 11, or 16, without altering `resolveArrival()`'s existing synchronous contract for non-combat encounters, and without any random/uncontrolled mutation beyond what's explicitly decided.

**Out of scope:** multi-round or real-time combat, any UI beyond a binary attack/flee choice, any ship/crew consequence beyond what's decided (no permanent loss, no destruction), and any interaction with Scanner or the map's staleness/discovery mechanics.

## 2. What's Already Decided (from `profitable-design-questions.md`)

### 2.1 Reopened Deferrals (Deliberate, Not Scope Creep)
Ship component degradation and crew loss were both explicitly deferred pending "a system like combat" existing. This is that system. Both stay **lightweight/non-permanent** per Section 2.4/2.5 below — not the permadeath/destruction that was actually ruled out.

### 2.2 Trigger Points
Combat can be detected **during travel** (a fourth, low-weighted entry in the existing weighted type-split table alongside trade-opportunity, discovery, hazard) and **at planet arrival** (a separate, new check point). Both feed into the same underlying combat-resolution mechanism; hazard is not replaced or altered.

### 2.3 Interactivity
Combat is the **one deliberate exception** to "all encounters resolve automatically." A detected combat encounter is presented to the player as a pending decision (attack or flee) rather than resolving without their input.

### 2.4 Resolution Depth & Formula
Shallow, single-roll resolution. **Player strength:** the weapon component's own tier (not derived ship tier). **Opponent threat:** a random 1-100 roll mapped through the shared tier breakpoint table, generated at detection time. Both sides apply the existing percentage-based variance (same shape as refiner/crafter/ship-tier tables). **Higher roll wins.**

### 2.5 Outcomes
- **Fight and win:** voyage continues to its original destination, no damage.
- **Fight and lose:** voyage redirected to `originPlanetId` (the "last safe planet"), via a suppressed-encounter retreat voyage; weapon component's `durability` quality takes a percentage reduction (tier recomputes); one randomly-selected owned crew member gets `unavailableUntil` set to a tunable duration out.
- **Flee:** voyage redirected the same way, no damage.
- **Cargo** is never forfeited in any outcome — it returns with the ship.

### 2.6 Retreat Mechanics
A retreat voyage reuses `initiateVoyage()`/`calculateTravelTime()`/`resolveArrival()` entirely, with a flag suppressing `resolveEncounters()` for that specific trip. No parallel travel system.

## 3. New/Extended Data Shapes

```
EncounterType = 'tradeOpportunity' | 'discovery' | 'hazard' | 'combat'   // extends the existing enum

CombatEncounter {
  id: string
  voyageId: string
  triggerContext: 'travel' | 'arrival'
  opponentThreatTier: TierColor   // rolled once, at detection time
  status: 'pending' | 'resolved'
  outcome: 'win' | 'lose' | 'flee' | null   // null while pending
  windowIndex: number | null       // null for arrival-triggered
}

Voyage {
  // ...all existing fields, unchanged...
  isRetreat: boolean               // new — when true, resolveEncounters() is skipped entirely
}

CrewMember {
  // ...all existing fields, unchanged...
  unavailableUntil: timestamp | null   // new
}
```

`ShipComponent`'s existing `qualities` field already supports the durability reduction — no new field needed there, only a mutation to an existing value.

### New constant tables/values

- **Combat's weight in the existing type-split table** — tunable, extends the existing three-way table to four.
- **Arrival-triggered combat check chance** — tunable, a separate probability from the travel-window roll.
- **Component durability damage percentage** — tunable.
- **Crew `unavailableUntil` duration** — tunable.
- **Combat variance table** — reuses the existing tier-variance table shape (no new curve to design).

## 4. Implementation Plan — Amendments, Not New Agents

### 4.1 Roster & Order

**Amendment — Agent 1 (Data Schema), Combat additions.** Extends `EncounterType`, adds `CombatEncounter`, extends `Voyage` and `CrewMember`, adds the five constants above. Created first.

**Amendment — Agent 20 (Ships & Travel Core).** The largest amendment in this project so far. Adds: combat detection (both trigger points), `initiateCombat()` (creates the pending `CombatEncounter`, rolls opponent threat, does **not** resolve win/lose yet), `resolveCombatChoice(combatEncounterId, choice: 'attack' | 'flee')` (the actual roll-and-compare, applying the correct outcome per Section 2.5, including triggering a retreat voyage when needed), and the component-durability/crew-unavailability mutations. Must not alter `resolveArrival()`'s existing synchronous behavior for the other three encounter types.

**Amendment — Agent 21 (Phase 5 Validation/Test).** Tests detection at both trigger points, the pending→resolved state transition, the win/lose formula's exact behavior at various tier pairings, all three outcome paths (including the retreat voyage's encounter-suppression), the component/crew mutations, and — critically — a regression check that the other three encounter types' fully-synchronous behavior is completely unaffected by combat's new pending-state mechanism.

**Amendment — Agent 22 (Ships & Travel Presentation).** Adds a pending-combat UI (attack/flee choice, the first interactive prompt in this entire feature set) and outcome display, integrated into the existing voyage/arrival screens.

**Agent 29: Combat Confirmation.** New, small, created last.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-combat-schema.md`, `agent-20-amendment-combat-core.md`, `agent-21-amendment-combat-test.md`, `agent-22-amendment-combat-presentation.md`, and `agent-29-combat-confirmation.md`.

## 5. Cross-Cutting Rules

Same as every prior phase, plus:

- **`resolveArrival()`'s existing synchronous, automatic behavior for trade-opportunity/discovery/hazard must remain completely unaffected.** Combat's pending-state mechanism is additive — it introduces a new possible result type, it does not change how the other three resolve.
- **No agent implements multi-round, real-time, or turn-based combat.** Single roll, single decision point, per Section 2.4.
- **No agent implements permanent loss.** Component damage is a percentage reduction, not destruction; crew unavailability is temporary, not removal from the roster. Both stay within the "lightweight" scope explicitly decided.
- **No agent implements any interaction between Combat and Scanner, or Combat and map staleness.** None was decided; none should exist.
- **Cargo is never forfeited in any Combat outcome.**

## 6. Agent 29 Confirmation

All four amendments (Agent 1 schema, Agent 20 core, Agent 21 test, Agent 22 presentation) are complete. Nine explicit confirmations, each backed by specific evidence rather than an assumption, per this agent's own contract:

**1. Definition of Done confirmed — a real example of each outcome.** Detection at both trigger points: `tests/ships/resolveEncounters.test.ts`'s `"combat: a type-split roll landing on combat creates a pending CombatEncounter (not an EncounterResult) and does not resolve an outcome"` (travel-window) and `tests/ships/resolveArrival.test.ts`'s `"combat: an arrival-triggered check on a hit creates a pending CombatEncounter with triggerContext 'arrival' and windowIndex null"` (arrival). Presented as a pending decision: live-verified in a real running dev server (not a reimplementation) — a `PendingCombat` injected via `localStorage` (same shape `onResolveArrival()` itself writes) rendered exactly `"Hostile ship encountered! Opponent threat tier: Gold."` with Attack/Flee buttons and correctly suppressed the Scan/Initiate-Voyage section underneath. All three resolved outcomes, each with a real example:
   - **Win:** `tests/ships/resolveCombatChoice.test.ts`'s `"attack, win: Gold-tier weapon vs Grey-tier opponent wins even at each side's worst-case roll -- no mutation, no retreat"` — `outcome: "win"`, `updatedShip`/`updatedCrewMember` unchanged, `retreatVoyage: null`.
   - **Lose:** the same file's `"attack, lose: Blue-tier weapon vs Gold-tier opponent loses..."` test, corroborated live: a real White-tier weapon's `durability` went 51→43 (`round(51 × 0.85)`), a real injected crew member's `unavailableUntil` was set to a real future timestamp, and a real retreat `Voyage` (`isRetreat: true`) appeared in the travel UI as `"En route to Planet-...:0"`, status line `"Combat lost! Redirected back to the last safe planet. Weapon now White tier. A Blue crew member is unavailable for a while."`
   - **Flee:** the same test file's `"flee: resolves unconditionally with zero rolls..."` test, corroborated live: status `"Fled the encounter -- redirected back to the last safe planet."`, a real retreat voyage appeared, weapon/crew untouched.

**2. `resolveArrival()`'s synchronous behavior for trade-opportunity/discovery/hazard is unaffected.** `tests/ships/resolveEncounters.test.ts`'s `"mixed scenario: a combat detection in one window does not affect a trade-opportunity resolving synchronously in another -- proving the two output channels are independent"` is the specific mixed-scenario test the contract calls for — a 2-window voyage with combat in window 0 and a real `tradeOpportunity` in window 1 confirms `encounters`/`pendingCombats` are populated independently. `tests/ships/resolveArrival.test.ts`'s `"regression: arrival timing, cargo delivery, and ship delivery are identical whether or not encounters resolve"` proves `resolved`/`updatedShip`/`cargo`/`destinationPlanetId` are byte-for-byte unaffected by the encounter-resolution opt-in generally.
   **One specific, attributable gap found on close scrutiny (per this agent's own instruction to treat this confirmation with particular care):** the two Combat-specific `resolveArrival.test.ts` tests (the arrival-detection test and the window+arrival-combined test) assert only `pendingCombats`/`encounters` contents — neither one also asserts `resolved`/`updatedShip`/`cargo`/`destinationPlanetId` in a scenario where a combat encounter *actually* triggers. The one test that does assert those fields (`"regression: arrival timing..."`) deliberately uses an arrival-check roll (`0.99`) that guarantees combat does *not* trigger, so no committed test exercises "arrival mechanics stay correct when combat also fires." This is a real, narrow test-coverage gap in Agent 21's regression suite, not a functional defect — confirmed by ad-hoc verification (a direct script call to the real `resolveArrival()` with a random sequence forcing both a window-detected *and* an arrival-detected combat in the same call) showing `resolved`/`updatedShip`/`cargo`/`destinationPlanetId` are exactly identical to a no-combat call. Attributed to Agent 21 as a follow-up hardening item, not blocking the Definition of Done below (the underlying behavior is directly verified correct, only its permanent test coverage is incomplete).

**3. No multi-round, real-time, or turn-based combat exists anywhere.** Confirmed by absence: `grep` across `initiateCombat.ts`, `resolveCombatChoice.ts`, `combatEncounter.ts`, `combatResolution.ts` for round/turn/real-time/timer language finds only `Math.round()` calls and the `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT` constant name — no loop over rounds, no `setInterval`/`setTimeout`, no turn counter anywhere. `resolveCombatChoice()` is a single, synchronous function call producing one outcome; `CombatEncounter.status` has exactly two values (`"pending" | "resolved"`), no third "in progress" state.

**4. No permanent loss exists.** Component damage: `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT = 0.15` (`tests/data/combatConstants.test.ts`'s `"COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT is a real, meaningful-but-not-total fraction"` asserts `0 < x < 1` — structurally can't reach 0 or negative). Direct evidence at real values: the hand-calculated test reduces durability 76→65 (not 0, not deleted, not `null`); the live-verified run reduced a real weapon's durability 51→43. The weapon component itself is never removed from `ship.components` — `grep` for `delete`/`destroy`/`weapon: null` inside `resolveCombatChoice.ts` returns zero matches. Crew unavailability: `CrewMember.unavailableUntil` is set to a future timestamp (`currentTime + COMBAT_CREW_UNAVAILABLE_DURATION_HOURS`, e.g. `10_000 + 24h` in the hand-calculated test, a real future epoch-ms in the live-verified run) — the affected crew member is never removed from the roster; `grep` for `removeCrewMember` inside `resolveCombatChoice.ts` returns zero matches.

**5. Opponent threat is rolled exactly once, at detection, never re-rolled at resolution.** Direct evidence: `tests/ships/resolveCombatChoice.test.ts`'s `"opponentThreatTier is never re-rolled at resolution -- only its stored value is read, with variance applied fresh"` — two encounters sharing an identical stored `opponentThreatTier` but different ids/`windowIndex`s resolve identically given the same 2-value `random()` sequence (player variance + opponent variance only); a hidden third roll re-rolling the threat tier would have thrown `queueRandom`'s "exhausted" error, and neither call did. Passing.

**6. `isRetreat` voyages produce zero encounter rolls.** Direct evidence, not just an absence of failures: `tests/ships/resolveEncounters.test.ts`'s `"isRetreat: true returns immediately with zero rolls of any kind -- an explicit proof, not just 'nothing happened to trigger'"` passes a `random` function that *throws* if called at all, then calls `resolveEncounters()` on a 5-window `isRetreat: true` voyage — the call returns `{ encounters: [], pendingCombats: [] }` without ever invoking `random()`, proving the early-return guard fires before any roll, not merely that no roll happened to trigger.

**7. Cargo is never forfeited in any outcome.** Win: cargo was already delivered by the original, unconditional `resolveArrival()` call before any pending combat is even surfaced (per Agent 20's own contract — arrival/delivery completes regardless of a pending combat), confirmed by `resolveArrival.test.ts`'s own cargo-delivery regression tests, none of which are gated on combat's absence. Lose/flee: `tests/ships/resolveCombatChoice.test.ts`'s lose test asserts `assert.deepEqual(result.retreatVoyage!.cargo, voyage().cargo)` and the flee test asserts `assert.deepEqual(result.retreatVoyage!.cargo, v.cargo)` — cargo carries to the retreat voyage completely unchanged in both outcomes that redirect the ship. Live-verified in both directions: the lose-path retreat voyage and the flee-path retreat voyage both carried the exact injected cargo (`[{ itemId: "igneous-ore", quantity: 3 }]` and `quantity: 5` respectively) through to the resulting `Voyage`.

**8. No interaction between Combat and Scanner, or Combat and map staleness.** Confirmed by absence: `grep -i "scanner|discovered|staleness"` across `initiateCombat.ts`, `resolveCombatChoice.ts`, `combatEncounter.ts`, `combatResolution.ts`, and `display.ts`'s Combat additions returns zero matches. The presentation layer's `onCombatChoice()`/`renderPendingCombat()` methods reference no scanner state (`getOwnedScanners()`, `performScan()`) and never touch `Planet.discovered`.

**9. Agents 2, 8, 11, and 16 remain unmodified.** `git status --short` across the entire Combat feature (all four amendments' combined work) shows zero changes anywhere under `src/simulation/`, `src/galaxy/`, `src/trading/`, or `src/crew/` — confirmed by an empty grep for those paths against the full change list. Corroborated behaviorally by the unchanged, still-passing `refine()`/`craft()`/`generateGalaxy()`/`purchaseListing()`/`hireCrew()` hand-calculated cases in `tests/ships/regressionCheck.test.ts`.

**Full test suite: 518/518 passing, typecheck clean.**

**Combat GDD Section 1's Definition of Done is explicitly confirmed as met.** One non-blocking gap found and attributed above (confirmation #2: `resolveArrival.test.ts`'s Combat-detection tests don't also assert `resolved`/`updatedShip`/`cargo`/`destinationPlanetId`, though the underlying behavior is independently confirmed correct) — a hardening follow-up for Agent 21, not a functional defect and not a blocker.
