# Functional Agent: Encounters & Combat

**Status: existing system, documented as-built.** Consolidates the Travel Encounters amendment (Agent 20/21/22, non-combat) and the Combat amendment (Agent 20/21/22) into one file — they share a trigger mechanism and a resolution entry point in `resolveArrival()`, so splitting them across two functional files would separate two things that were deliberately built together.

## Responsibility

Roll for and resolve the four encounter types (trade opportunity, discovery, hazard, combat) during travel and at arrival, ranging from fully-automatic (the first three) to the one interactive, deferred-resolution mechanic in the game (combat).

## Inputs

- `Voyage`, `Ship`, `Planet`, `Resource[]` (`travel.md`, `ship.md`).
- `resolveArrival()` (`travel.md`) — the sole entry point that invokes this file's logic; nothing here is called from anywhere else.

## Outputs

### `resolveEncounters(voyage, ship, destinationPlanet, resources, random?)` — `src/ships/resolveEncounters.ts`
One roll per `ENCOUNTER_CHECK_WINDOW_HOURS [24]` window the voyage's travel time spans, at `ENCOUNTER_TRIGGER_CHANCE [0.2]` per window — a longer voyage gets more independent rolls, not a higher flat chance. On a trigger, a weighted split via `ENCOUNTER_TYPE_WEIGHTS` (`src/data/constants/shipsAndTravelConfig.ts`: tradeOpportunity 0.4, discovery 0.35, hazard 0.2, combat 0.05 — upside-favored, combat rarest). **Short-circuits to an empty result if `voyage.isRetreat`** — a retreat trip (Combat's forced-return mechanic) is guaranteed encounter-free, by design.
- **Trade opportunity:** a direct `Wallet` credit grant (`ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS [50]`–`MAX_CREDITS [200]`) — never a spawned `Listing`.
- **Discovery:** a resource item via `rollQuality()` (`mining.md`'s base roll, renamed from "Gathering" this session, reused directly) — never sets `discovered: true` on any planet remotely, under any framing (that would functionally be a second scanner, reopening `travel.md`'s Scanner decision through a different door).
- **Hazard:** a roll modified by `HAZARD_SHIP_TIER_MODIFIER` (Grey +0 → Gold +30) against `HAZARD_PASS_THRESHOLD [50]`; on failure, a scaled currency cost via `HAZARD_BASE_FAILURE_COST [50]` × `HAZARD_FAILURE_COST_CURVE` (5 escalating bands). Currency-only — never cargo loss, a voyage delay, or component degradation (all explicitly rejected in favor of reusing the `Wallet` mechanism cleanly).

### `initiateCombat(id, voyageId, triggerContext, windowIndex, random)` — `src/ships/initiateCombat.ts`
Rolls `opponentThreatTier` **once**, at detection — never re-rolled at resolution. `triggerContext` is `"travel"` (a window roll, same weighted table as the other three types) or `"arrival"` (a separate, additional check at arrival: `ARRIVAL_COMBAT_CHECK_CHANCE [0.1]`, not a second draw through the window table). Produces a `pending` `CombatEncounter` — never auto-resolved.

### `resolveCombatChoice(combatEncounter, choice, voyage, ship, originPlanet, currentPlanet, ownedCrew, currentTime, retreatVoyageId, random?)` — `src/ships/resolveCombatChoice.ts`
Throws if `combatEncounter.status !== "pending"`. `choice: "attack" | "flee"`. Attack: player's **weapon component tier specifically** (not derived ship tier — the one deliberate departure from "use averaged ship tier," since combat is the one context a specific component should matter more than the average) rolled with tier-variance against the pre-rolled `opponentThreatTier`, higher wins. **Three outcomes:**
- **Win:** continue to original destination, no damage.
- **Lose:** weapon component's `durability` reduced by `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT [0.15]` (tier recomputes immediately via the same `assembleShip()` "recompute on change" pattern); one random owned crew member gets `unavailableUntil` set `COMBAT_CREW_UNAVAILABLE_DURATION_HOURS [24]` out (a new status field, not a stat reduction — crew has nothing quality-based to reduce); forced retreat.
- **Flee:** forced retreat, no damage.
- **Retreat mechanic** (loss or flee, identical): a new `Voyage` back to `voyage.originPlanetId` ("last safe planet" — no separately-tracked location field), via the normal `initiateVoyage()`/`calculateTravelTime()` path, with `isRetreat: true` so `resolveEncounters()` skips it, and fuel/cargo preconditions skipped too (`ship.md`'s Ship Fuel/Cargo Hold Capacity — a forced retreat must never fail or strand the player). **Cargo is never forfeited** — it returns with the ship, the redirect itself being the only consequence for the Phase 3 remote-sale case.
- **Built (`ship.md`'s Ship Crew Roles):** an assigned Combat Engineer (found in `ownedCrew`, scoped to this ship) mitigates a loss's cost — `COMBAT_ENGINEER_MITIGATION_BY_TIER` for their crew tier scales down both `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT` and `COMBAT_CREW_UNAVAILABLE_DURATION_HOURS`, never the win/lose roll itself. An assigned Pilot (same scoping) is passed into both retreat-voyage `initiateVoyage()` calls, so `PILOT_SPEED_BONUS_BY_TIER` speeds up a retreat the same way it would a forward voyage.

## Must NOT Do

- Must not make trade-opportunity, discovery, or hazard interactive — combat is the one deliberate exception to "all encounters resolve automatically," not a template for making the other three interactive too.
- Must not re-roll `opponentThreatTier` at resolution — rolled once, at detection, only.
- Must not let a discovery encounter set `discovered: true` on any planet, remotely, ever — the guardrail Travel Encounters' own design wrote specifically anticipating Scanner.
- Must not forfeit cargo on any combat outcome, and must not add a fourth loss consequence beyond component damage / crew unavailability / forced retreat.
- Must not let Combat's interactive/deferred-resolution flow alter the other three encounter types' synchronous, automatic behavior in any way, including in mixed scenarios (a voyage rolling both a hazard and a combat encounter across different windows).
- Must not extend ship tier's encounter influence beyond the pass/fail roll it already has (hazard) or the weapon-vs-threat roll it already has (combat) — trigger *frequency* stays tier-independent, by design.
- Must not implement rendering/DOM/browser-API code in `resolveEncounters.ts`, `initiateCombat.ts`, or `resolveCombatChoice.ts` — the interactive attack/flee prompt lives in `travel.md`'s `TradeMapScene`, not here.

## Testing Requirements

- `resolveEncounters()`: correct window count for a given travel duration; trigger chance and type-weight distribution verified as structural invariants (roughly-N%-of-many-trials, not an exact count); `isRetreat` voyages always produce an empty result.
- Discovery: negative test proving `discovered` is never set to `true` by any discovery-encounter code path.
- Hazard: cost curve band boundaries verified; ship-tier modifier applied correctly.
- `resolveCombatChoice()`: throws on a non-`pending` encounter; all three outcomes verified; component durability reduction is exact and tier recomputes immediately; crew selection is random among owned crew and correctly sets `unavailableUntil`; cargo is provably preserved through a retreat.
- Regression: the other three encounter types' fully-synchronous behavior is provably unaffected by Combat's presence, including in a mixed multi-encounter voyage — this is the single most load-bearing regression check in this file, per Combat's own original amendment contract's emphasis.

## Definition of Done

- A voyage can roll any of the 4 encounter types across its travel window(s) plus an arrival check, with trade/discovery/hazard resolving automatically and combat presenting an attack/flee choice.
- All three combat outcomes are verified against the exact consequences documented above — no more, no less.
- Every result displayed anywhere in `travel.md`'s `TradeMapScene` is sourced directly from this file's functions — never recalculated in the presentation layer.
