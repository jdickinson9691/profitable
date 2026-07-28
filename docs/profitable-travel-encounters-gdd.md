# Profitable — Travel Encounters (Non-Combat) Game Design Document

Status: design locked (see `profitable-design-questions.md`, "Travel Encounters (Non-Combat)" section — fully resolved). This is the first of the four deliberately-deferred gaps being picked up now that the original development order is fully built (Scanner → **Encounters** → Combat → Multiplayer). It extends `profitable-phase5-gdd.md` directly — encounters resolve as part of voyage arrival, the same system Phase 5 already built.

---

## 1. Scope

Unlike every construction phase before it, this feature requires **no new agents** — it's implemented as amendments to Agent 1 (schema), Agent 20 (Ships & Travel Core), Agent 21 (Validation/Test), and Agent 22 (Presentation), plus one small confirmation pass. This mirrors the same "amendment, not new agent" pattern already used for `loadContent()` on Agent 2 and the Phase 2/3/4/5 additions to Agent 1.

**Definition of done:** a voyage of sufficient duration correctly rolls for encounters per time window (reusing the emergency system's window/trigger-chance shape), resolves a weighted-random type when one triggers (trade-opportunity, discovery, or hazard), applies the correct automatic outcome for that type with zero player interaction required, and reports the result as part of `resolveArrival()`'s output — all without modifying Agents 2, 8, 11, or 16, and without reopening the closed "no scanner" or "arrival time locked at initiation" decisions.

**Out of scope:** any combat-type encounter (deferred to the separate Combat gap), any interactive/choice-based encounter resolution, any encounter effect on ship components or cargo, and any tier-based change to encounter *frequency* (only the hazard pass/fail roll itself is tier-modified, per the design decision).

## 2. What's Already Decided (from `profitable-design-questions.md`)

### 2.1 Trigger Mechanics
Roll once per fixed time window during travel — **same shape as the existing emergency system** (reuse the 24h window and percentage-trigger-chance pattern; exact window size a tunable to confirm against real voyage durations). A voyage spanning multiple windows gets multiple independent rolls.

### 2.2 Encounter Type Split
When a roll succeeds, a **weighted random** split determines which of three types occurs — trade-opportunity, discovery, or hazard — with hazard (the only downside type) weighted least common.

### 2.3 Automatic Resolution, All Types
All three types resolve **automatically**, with zero player interaction — consistent with `resolveArrival()`'s deterministic catch-up model (same reasoning as background crew crafting). Results are reported after the fact, not presented as an interactive choice.

### 2.4 Trade-Opportunity
A **direct, automatic currency grant** via the existing `Wallet` mechanism — no spawned `Listing`, no new data shape.

### 2.5 Discovery
A **found resource item**, generated via the existing `rollQuality()` function — reuses the gathering quality-roll mechanism exactly. **Never** sets `discovered: true` on a new planet remotely — that would functionally reopen the closed "no scanner" decision through a different door.

### 2.6 Hazard
A **single roll against a fixed threshold, modified by ship tier** (same "tier shifts a roll" pattern as planet quality/ship speed). On failure, a **scaled currency cost** using the same escalating curve shape as the crafting threshold penalty. Currency cost chosen specifically because cargo loss, voyage delay, and ship degradation each conflict with an existing rule or reintroduce combat-by-another-name.

### 2.7 Frequency Is Tier-Independent
Ship tier's influence stops at the hazard pass/fail roll (2.6) — it does not additionally reduce how often encounters (including hazards specifically) trigger in the first place. One job per tier system.

## 3. New/Extended Data Shapes

Extends `Voyage` (from the Phase 5 amendment) rather than introducing new top-level types:

```
EncounterType = 'tradeOpportunity' | 'discovery' | 'hazard'

EncounterResult {
  type: EncounterType
  outcome: {
    // tradeOpportunity: currency granted
    // discovery: the rolled Resource + QualityRoll
    // hazard: pass/fail, and currency cost if failed
  }
  windowIndex: number   // which time-window during the voyage this occurred in
}

Voyage {
  // ...all existing Phase 5 fields, unchanged...
  encounters: EncounterResult[]   // new field, populated during resolveArrival()
}
```

### New constant tables/values (encoded as data, not embedded in logic)

- **Encounter check window size** — tunable, likely reusing the emergency system's 24h window.
- **Trigger chance per window** — tunable.
- **Type weight distribution** (trade-opportunity / discovery / hazard) — tunable, hazard weighted lowest.
- **Trade-opportunity currency grant range** — tunable.
- **Hazard pass threshold and ship-tier modifier table** — tunable, reusing the shape of existing tier-modifier tables.
- **Hazard failure cost curve** — tunable, reusing the shape of the crafting threshold penalty curve.

## 4. Implementation Plan — Amendments, Not New Agents

### 4.1 Roster & Order

**Amendment — Agent 1 (Data Schema), Travel Encounters additions.** `EncounterType`, `EncounterResult`, the extended `Voyage.encounters` field, and the six constant tables above. Created first.

**Amendment — Agent 20 (Ships & Travel Core).** Adds encounter resolution logic, invoked from within `resolveArrival()` — rolls per window, resolves type, applies outcome, populates `Voyage.encounters`. Must not change `resolveArrival()`'s existing contract (arrival-time locking, cargo delivery) — encounters are additive to that function's behavior, not a replacement for any part of it.

**Amendment — Agent 21 (Phase 5 Validation/Test).** Adds encounter-specific tests: per-window roll correctness, weighted type-split distribution, each type's outcome mechanic, the hazard tier-modifier and failure-cost curve, and — critically — a regression check that `resolveArrival()`'s existing Phase 5 behavior (arrival timing, cargo delivery) is unchanged by the addition.

**Amendment — Agent 22 (Ships & Travel Presentation).** Adds encounter result display to the voyage-arrival UI — a summary of what happened during the trip, sourced entirely from `Voyage.encounters`, never computed in the presentation layer.

**Agent 27: Travel Encounters Confirmation.** New, small, created last. Confirms the Definition of Done (Section 1) is met and explicitly confirms no combat-type encounter, no interactive resolution, and no reopening of the "no scanner" or "arrival time locked" decisions occurred anywhere in the amendments above.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-travel-encounters-schema.md`, `agent-20-amendment-travel-encounters-core.md`, `agent-21-amendment-travel-encounters-test.md`, `agent-22-amendment-travel-encounters-presentation.md`, and `agent-27-travel-encounters-confirmation.md`.

## 5. Cross-Cutting Rules

Same as every prior phase (see `docs/agents/README.md`), plus:

- **No agent implements a combat-type encounter, an interactive/choice-based resolution, or any ship-component/cargo mutation as an encounter outcome.** All three are explicitly out of scope per Section 1 and the underlying design decisions (Section 2.3, 2.6).
- **`resolveArrival()`'s existing Phase 5 contract is not renegotiable.** Arrival time stays locked at voyage initiation; encounters are resolved as part of arrival processing, they do not retroactively change when a voyage arrives.
- **No agent reopens the "no scanner" decision.** A discovery encounter never sets `discovered: true` remotely, under any framing.

## 6. Agent 27 Confirmation

All four amendments (Agent 1 schema, Agent 20 core, Agent 21 test, Agent 22 presentation) are complete. Six explicit confirmations, each backed by specific evidence rather than an assumption, per this agent's own contract:

**1. Definition of Done confirmed — real example per encounter type.** A 30-day voyage (long enough to span ~30 encounter-check windows) run through the real `resolveArrival()` → `resolveEncounters()` pipeline against a real generated galaxy and real content, sampled across random seeds until all three types appeared, produced:
- `discovery`: `{ resourceId: "autunite-crystal", qualities: {density:69, potency:26, durability:59, rarity:18, purity:null} }` → displayed as `"Found derelict cargo: Autunite Crystal (White)"`.
- `tradeOpportunity`: `{ creditsGranted: 88 }` → `"Encountered a trader en route: +88 Credits"`.
- `hazard`: `{ passed: false, creditsLost: 45 }` → `"Navigational hazard: -45 Credits"`.

Every mechanic behind these is independently hand-verified in `tests/ships/resolveEncounters.test.ts`: the per-window trigger roll at the exact `ENCOUNTER_TRIGGER_CHANCE` boundary, a voyage spanning N windows getting N independent rolls, a 3000-trial statistical check confirming the type split matches `ENCOUNTER_TYPE_WEIGHTS` (hazard genuinely least common), `tradeOpportunity`'s exact credits value from a known roll, `discovery`'s output matching an independent direct `rollQuality()` call byte-for-byte, and `hazard`'s tier-modifier and escalating failure-cost curve at 5 distinct points-below-threshold values.

**2. No combat-type encounter exists anywhere.** Grepped all of `src/` and `tests/` for `combat` (case-insensitive): every match is either the milestone's own name ("Non-Combat," in comments/READMEs) or `tests/data/schemas.test.ts`'s deliberate negative test asserting the schema *rejects* `type: "combat"` — evidence a combat type was actively guarded against, not evidence one exists.

**3. No interactive/choice-based resolution exists anywhere.** `resolveEncounters()`/`resolveArrival()` contain zero `async`/`await`/`Promise`/`setTimeout` (grep-confirmed) — fully synchronous, deterministic given their inputs. `TradeMapScene.ts`'s only `setInteractive()`/`pointerdown` calls are the pre-existing "Resolve Arrival"/"Initiate Voyage" travel buttons; no encounter-specific interactive element (no accept/decline, no choice prompt) was added — encounter results render as plain text lines only.

**4. No discovery encounter ever sets `discovered: true` remotely.** Direct evidence: `tests/ships/resolveEncounters.test.ts`'s `"discovery: never sets discovered: true on any planet, across many trials with a real (not-yet-discovered) planet"` test (200 trials, snapshot-compared before/after) — passing. Corroborating structural evidence: `tests/integration/mapVerification.test.ts`'s existing regression guard still confirms `discovered: true` is written in exactly one file project-wide (`presentation/galaxyState.ts`'s two bootstrap overrides) — unchanged by this milestone.

**5. `resolveArrival()`'s existing Phase 5 contract is unchanged.** Direct evidence: `tests/ships/resolveArrival.test.ts`'s two dedicated regression tests — `"regression: resolveArrival() called without destinationPlanet/resources... is byte-for-byte unaffected"` and `"regression: arrival timing, cargo delivery, and ship delivery are identical whether or not encounters resolve"` — both passing, plus all 5 of that file's original pre-amendment tests (early-resolution rejection, exact-arrivesAt success, ship delivery, cargo reporting, no-ship-mutation) passing unchanged.

**6. Agents 2, 8, 11, and 16 remain unmodified.** `git status` across the entire Travel Encounters amendment (all four agents' work) shows zero changes to `src/simulation/refine.ts`, `craft.ts`, `rollQuality.ts`, `loadContent.ts`, anything under `src/galaxy/`, `src/trading/`, or `src/crew/`.

**Full test suite: 448/448 passing, typecheck clean.**

**Travel Encounters GDD Section 1's Definition of Done is explicitly confirmed as met.** No gaps found; nothing to attribute or route.
