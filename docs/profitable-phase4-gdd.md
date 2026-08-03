# Profitable — Phase 4 Game Design Document: Crew Crafters

Status: **design mostly locked** (see `profitable-design-questions.md`, "Crew Crafters" section — all Phase-4-relevant questions resolved except the exact idle-crafting rate number and genuinely-deferred multiplayer-forward questions, both intentionally tracked rather than blocking). This document is being built incrementally alongside `profitable-design-questions.md`'s "Crew Crafters" section; Section 2 below is now filled in. Sections 3–5 (data shapes, agent plan) are next. It extends `profitable-mvp-gdd.md`, `profitable-phase2-gdd.md`, and `profitable-phase3-gdd.md`; all prior scope/formulas are unchanged and not restated here except where Phase 4 touches them directly.

---

## 1. Phase 4 Scope

Phase 4 builds NPC crew crafters — the next link in the decided development order (galaxy generation → planet generation → resource generation → crafting recipes/schematics → trading loop → **[Phase 3 boundary]** → **crafters (NPC crew)** → **[Phase 4 boundary]** → travel → map).

**Carried over from Trading Market (Phase 3):** the market expands beyond the four item tiers to also include crafters themselves — specifically, hiring an NPC crafter to join your crew (not a one-off service listing or schematic/skill access sale). That's the only decision made on this system prior to Phase 4.

**Definition of done for Phase 4:** a player can hire an NPC crafter from a discovered planet's crew pool (within their current crew capacity), assign that crew member to actively work a craft **simultaneously** with the player's own crafting, leave another crew member idle and later resolve their background production via a deterministic catch-up calculation, have upkeep correctly and automatically deducted over time, and see a crew member correctly removed from the roster if upkeep goes unpaid past the grace period — or dismissed voluntarily at any time. All of this must be verifiable against known test cases, the same standard as MVP, Phase 2, and Phase 3, and must provably leave Agents 2, 8, and 11 unmodified.

**Out of scope for Phase 4:** travel, the galactic map beyond what trading already needed. Multiplayer remains deferred, per the standing single-player-first decision.

## 2. What's Being Decided (from `profitable-design-questions.md`, "Crew Crafters" section)

Filled in below as each question resolves. Full rationale for each decision lives in the design doc; this section is the implementation-ready summary, same pattern as prior phases.

### 2.1 What "Joining Your Crew" Means Mechanically
**Decided — Option C (both active and passive, with a real distinction).** A crew member can be **actively assigned** to a specific craft action (the player picks them, using their exact tier/profession — same as choosing which crafter to use), **or left idle**, in which case they can passively work on **queued/background crafts** at a reduced rate or capacity while the player is elsewhere.

This was chosen over passive-only (turns hiring into a shopping trip for stat boosts, no real player interaction) and active-only (barely differs from the existing player-crafter mechanic, makes "crew" mechanically thin) because it's the only option that gives multiple crew members genuinely distinct roles and creates a real management decision: bring this crafter along to actively work, or leave them running background production.

**Immediate follow-ons this raises** (tracked in Section 2.1a below, since they're really refinements of this same decision, not independent questions):
- How background/idle crafting is actually simulated while the player is away (tick system, catch-up-on-return calculation, or player-triggered "check on crew" resolution).
- The exact reduced rate/capacity for background vs. active output.

### 2.1a Background/Idle Simulation & Reduced-Rate Details
**Decided — Option B (catch-up calculation on return, timestamp-based).** No continuous ticking. A `lastCheckedAt` timestamp is stored (via the existing `SaveSystem`) rather than the client computing and passing in an elapsed duration directly — elapsed time is derived as `now - lastCheckedAt` at resolution time, not asserted by the caller. When the player checks on a crew member, the system resolves all background production in one deterministic pass: `(elapsedTime, crewMemberTier, recipe) → output`, the same pure-function shape already used for `refine()`, `craft()`, and `applyDrift()`.

Chosen over true real-time ticking (nothing to keep alive in a browser tab with no server — would need a catch-up path anyway for the "tab closed" case) and fixed player-triggered increments (doesn't track real elapsed time, undercutting the point of idle crafting rewarding time away). An **elapsed-time cap** (tunable, e.g. 24-48 hours max credited) prevents both an honest edge case (leaving the game running for a week) and a future dishonest one (a manipulated timestamp).

**Multiplayer-forward reasoning (re-examined per the standing single-player-first decision, same treatment as the generation seed / planet position / discovered-flag / trade-attribution fields):** a client-computed elapsed duration would be a real exploit vector under a shared economy — a player could manipulate their local clock or the value itself to claim inflated background production, directly affecting a market other players trade in. Storing a timestamp and deriving elapsed time at resolution time keeps the same pure function portable to a future server-authoritative caller with zero formula rewrite — only *where* elapsed time gets computed changes, not the function itself.

**Still open (tracked, not decided):**
- Should `lastCheckedAt` be stored now regardless, even though single-player has no immediate tamper-resistance need?
- Does a future persistent shared world need genuine server-side ticking rather than catch-up-on-check-in, since other players might want to observe a crew's production without the owner triggering resolution?
- Does a hired crew member remain strictly private to the hiring player under any future multiplayer model, or could crew members eventually be shared/tradeable/poachable — affecting whether crew data needs a `createdByPlayerId`-style field now, same pattern as trade attribution.
- Exact reduced rate/capacity for background vs. active crafting (see Section 2.2).

### 2.2 NPC Crafter Skill Representation
**Decided.** Hired NPC crafters use the **same 7-tier color scale** already used for refiner tier, crafter tier, schematic tier, and planet tier — no separate system. A hired NPC's **profession is locked at hire time, not freely reassignable**, for tiers 6-7 (the tier band where profession specialization already exists per the general crafting design; tiers 3-5 remain general/unspecialized, same as the existing player-crafter rule).

This keeps hiring a real, non-fungible decision (you found a Gold-tier weaponsmith, not a generic Gold-tier slot you can reskin), consistent with the exclusivity theme already used for tier 6-7 schematics and crafted goods, and preserves the existing tiers-3-5-general/tiers-6-7-specialized split rather than undermining it.

**Implication for Section 2.3 (Acquisition):** since profession is locked at hire time, acquisition likely means browsing/discovering specific pre-rolled hires (a tier + profession combo already assigned), not customizing a generic slot after the fact.

### 2.3 Acquisition
**Decided.** NPC crafters are found in a **small, refreshing pool of available hires at each planet's market** — reuses the "planet markets have their own state that changes over time" pattern already built for goods pricing, applied to crafters instead of items. Not a global list; not player-generated from scratch.

When a new hire candidate appears, their tier is rolled through the same 7-tier breakpoint table used everywhere else; if it lands tier 6-7, a profession is also rolled (per Section 2.2). **Cost scales with tier**, paid in the single existing currency, consistent with how every other tier system treats "better = more valuable/harder to get."

**Follow-on idea, not required to launch:** certain professions could be more likely to appear on certain Planet Types (e.g., a mining-flavored planet more likely to produce weaponsmiths for hire) — the same lever already used for raw-resource eligibility (Phase 2) and tier 6-7 trade demand (Phase 3).

Exact refresh interval, pool size, and cost numbers are left as tunables, not locked.

### 2.4 Crew Capacity
**Decided — Option C (starts small, expandable via purchasable upgrade).** A player begins with a small base capacity for hired crew, expandable by purchasing additional slots with Credits.

Chosen over unlimited capacity (would undercut the exclusivity/scarcity theme built into every other system — tier 6-7 goods, unique schematics, planet quality, non-fungible crew hires — by removing the "who do I keep" decision entirely) and a flat fixed cap (doesn't reward progression, feels arbitrary).

Capacity expansion doubles as **another currency sink**, consistent with the reasoning already used for the transaction fee. Doesn't depend on the not-yet-designed Travel/ships milestone to function now, but leaves an obvious future hook — if ships/crew quarters get designed later, capacity could naturally scale with ship size too, without a redesign.

**This hook was later picked up, but not literally as written.** Ship Crew Roles (`profitable-design-questions.md`, design-only, not yet built) does scale a crew-related number by ship tier — but it's a *separate* concept (`CREW_SLOTS_BY_TIER`, how many of a player's already-hired crew can hold a bridge-role slot on one ship) from `CrewCapacity` above (how many crew a player can hire in total), which stays exactly as designed here, untouched. The "ships/crew quarters" framing this hook imagined (a literal quarters component driving hire capacity) was explicitly considered and rejected in favor of the tier-based approach — see `docs/functional-agents/ship.md`.

Base capacity and the expansion cost curve are left as tunables, not locked.

### 2.5 Interaction With the Player's Own Crafting
**Decided — in addition to, not instead of.** Crew members are **parallel crafting capacity**, not a substitute for the player's own crafting. This follows directly from Section 2.1 — an actively-assigned crew member works on a specific craft action, and an idle one works on background production; both framings already imply each crew member is an independent actor with their own craft in progress, running alongside the player's own.

Chosen over "instead of" (would mean hiring trades away the player's own crafting capability, undermining the "crew is a real investment" framing) and "player chooses per-craft, one at a time" (makes crew members functionally identical to just picking a different crafter tier for a single action — the same "active-only barely differs from the existing mechanic" trap already avoided in 2.1; if only one craft can happen at a time regardless of crew size, having 3 crew members isn't meaningfully different from having 1).

**Concretely:** multiple crafts can be in progress simultaneously — the player's own active craft, each actively-assigned crew member's craft, and background production ticking for idle crew members — each independently calling the existing unified crafting formula with its own crafter (player skill, or that specific NPC's tier/profession). No new formula needed; this is multiple simultaneous callers of `craft()`, not a new mechanic.

### 2.6 Ongoing Cost
**Decided — upkeep/wage, not a one-time cost.** Hired crew members cost a **recurring wage**, not a single upfront payment.

Chosen for consistency with the currency-sink pattern used throughout this phase (crew capacity expansion and the trading transaction fee are both already sinks; a one-time cost doesn't keep pulling currency out of the economy the way upkeep does, and crew crafters represent genuine ongoing production capacity per Section 2.5, so a matching ongoing cost fits). Makes crew composition a continuous strategic decision rather than a one-time purchase, and creates real tension with the idle/background choice from Section 2.1 — an idle crew member still costs upkeep while producing at a reduced rate, giving a concrete reason to actually manage a crew rather than hire-and-forget.

**Wage scales with tier**, reusing the same "tier = more valuable, costs more" pattern already used for acquisition (Section 2.3). Paid automatically at a regular interval; exact wage curve and interval left as tunables.

**Connects directly to Section 2.7 (Loss/Attrition):** unpaid upkeep is a natural, mechanically-justified trigger for a crew member leaving.

### 2.7 Loss/Attrition
**Decided — two mechanisms, no random loss.** A crew member leaves via **automatic departure from unpaid upkeep** (past some grace period, per Section 2.6) — the primary trigger, reusing an already-decided mechanism rather than inventing a new one. A player can also **voluntarily dismiss** a crew member directly, which matters practically since capacity is limited/purchasable (2.4) and hires are non-fungible/locked-profession (2.2) — a player will want to swap a lower-tier hire for a better one without deliberately stopping upkeep payment as an indirect workaround.

**Explicitly ruled out for now:** random/permadeath-style loss (death, poaching, etc.) — there's no combat, risk, or travel-hazard system yet for that to hang off of; adding it now would be speculative work against systems that don't exist, same reasoning as deferring market manipulation detection until multiplayer exists. A future travel/danger system could add risk-based crew loss later as a natural extension.

## 3. New/Extended Data Shapes

Building on Agent 1's existing types (unchanged) and the Phase 3 `Wallet`/currency shapes, Phase 4 adds:

```
CrewMember {
  id: string
  hiredByPlayerId: string       // trade-attribution-style field, per the multiplayer-forward tracking note
  tier: TierColor               // same 7-tier scale used everywhere else (2.2)
  profession: Profession | null // null for tiers 3-5 (general); set and locked for tiers 6-7 (2.2)
  status: 'idle' | 'active'
  assignedCraftId: string | null  // set when status is 'active'
  hiredAt: timestamp
  lastCheckedAt: timestamp      // for background/idle catch-up resolution (2.1a)
  wageAmount: number            // recurring upkeep cost, tier-scaled (2.6)
  lastPaidAt: timestamp         // used to detect unpaid-upkeep attrition (2.7)
}
```
**As of Phase 4.** `CrewMember` was later extended twice: `unavailableUntil` (Combat, built) and `shipRole`/`assignedShipId` (Ship Crew Roles, design-only, not yet built — see `profitable-design-questions.md`'s section of that name and `docs/functional-agents/ship.md`). Hiring/wage/upkeep/attrition as described below are unchanged by either.

```
CrewCapacity {
  playerId: string
  baseCapacity: number          // starting slots (2.4)
  purchasedSlots: number        // additional slots bought with Credits (2.4)
}

PlanetCrewPool {
  planetId: string
  availableHires: CrewMember[]  // unhired candidates currently listed at this planet (2.3)
  lastRefreshedAt: timestamp
}
```

### New constant tables/values (encoded as data, not embedded in logic)

- **Base crew capacity** and **capacity expansion cost curve** (2.4) — tunable.
- **Wage curve by tier** (2.6) — tunable, reuses the "higher tier = costs more" shape already used for acquisition (2.3).
- **Upkeep grace period** before unpaid-upkeep attrition triggers (2.7) — tunable.
- **Elapsed-time cap** for background/idle crafting resolution (2.1a, e.g. 24-48 hours max credited) — tunable.
- **Crew pool refresh interval and pool size per planet** (2.3) — tunable.
- **Background/idle output rate**, relative to active output for the same crafter (still open — see Section 2's open questions) — placeholder until resolved.

`Resource`/`Recipe`/`Schematic`/`Planet`/`Listing`/`PlanetMarketState`/`Wallet` types from prior phases are unchanged; Phase 4 does not touch them.

## 4. AI Agent Development Plan — Phase 4

Same contract pattern and cross-cutting rules as MVP, Phase 2, and Phase 3. One schema amendment, and four new agents — no separate Content agent this time, since crew pools are **procedurally rolled at runtime** (per Section 2.3), not static config data the way MVP resources or Phase 3 base prices were.

### 4.1 Roster & Creation Order

**Amendment — Agent 1 (Data Schema), Phase 4 additions.** `CrewMember`, `CrewCapacity`, `PlanetCrewPool` types; the tunable constants (wage curve, capacity cost curve, grace period, elapsed-time cap, pool refresh settings) as data. Created first.

**Agent 16: Crew Core.** New. Pure, framework-agnostic TypeScript implementing hiring, assignment, background/idle resolution (the catch-up calculation from 2.1a), upkeep payment and attrition, dismissal, and crew pool refresh. Depends on the Agent 1 Phase 4 amendment and on Agent 2's `craft()` (called for each simultaneous crafter, never duplicated — per Section 2.5).

**Agent 17: Phase 4 Validation/Test.** New, created alongside Agent 16, runs continuously. Same relationship pattern as every prior phase's validation agent. Includes a regression check that Agents 2, 8, and 11 remain untouched.

**Agent 18: Crew Presentation.** New. Builds the crew management screen (hire from a planet's pool, assign to active craft, view idle/background status, dismiss) — depends on Agent 16 and Agent 4's existing adapters.

**Agent 19: Phase 4 Integration.** New, created last. Wires hiring → assignment → simultaneous crafting → background resolution → upkeep/attrition into one verified end-to-end loop, and confirms Agents 2, 8, and 11 remain unmodified.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-phase4-schema.md`, `agent-16-crew-core.md`, `agent-17-phase4-validation-test.md`, `agent-18-crew-presentation.md`, and `agent-19-phase4-integration.md`. This section is intentionally a summary — see those files for the authoritative inputs/outputs/must-not-do/definition-of-done for each.

## 5. Cross-Cutting Rules

Same as MVP, Phase 2, and Phase 3 (see `docs/agents/README.md`), plus:

- **The planet-agnostic and trading-isolation boundaries still apply, extended to crew.** Nothing in Phase 4 may modify Agent 2's `refine()`/`craft()` internals, Agent 8's galaxy/planet generation logic, or Agent 11's trading logic to accommodate crew data. Crew reads from and writes to its own new data shapes (Section 3); it *calls* `craft()` multiple times simultaneously (per Section 2.5) but never alters what that function does.
- **No agent implements random/permadeath crew loss, combat, or travel-hazard systems.** Section 2.7 is explicit that this is out of scope until a future travel/danger system exists — building it now would be speculative work against a scope that doesn't exist yet, the same reasoning already applied to trading's manipulation-detection deferral.
