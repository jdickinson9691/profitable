# Profitable — Phase 5 Game Design Document: Ships & Travel

Status: **Phase 5 complete and verified** (Agent 1 amendment, Agents 20-24 all delivered; full roster committed, 397/397 tests passing, Definition of Done confirmed both live and via automated integration test). This document remains the historical record of the Phase 5 build; see `CLAUDE.md` for current project status and the next milestone (the galactic map).

**Retroactive correction (2026-07-29):** the same `getTierColor()` boundary gap affected `deriveShipTier()` specifically severely — a brute-force check of every 1-to-4-component tier combination, accounting for which of the 4 distinct slots (weapon/engine/shield/cargoHold) each tier lands in, found 296 real, buildable ship configurations that would have thrown under the old comparison logic, since `tierMidpoint()`'s values are themselves fractional for 5 of the 7 tiers. Undetected because `deriveShipTier.test.ts`'s existing test cases (uniform 4x-same-tier, a two-component Grey+Gold mix, a single-component install, and zero components) all happen to average to a value inside a tier band rather than in a gap between two bands. Fixed alongside the MVP-level fix; see `profitable-mvp-gdd.md`'s correction note for full detail. This is the most consequential of the three sites, given how commonly asymmetric component builds (the entire point of the Ships design) would trigger it.

---

## 1. Phase 5 Scope

Phase 5 builds ships and travel together, as one phase — the next link in the decided development order (galaxy generation → planet generation → resource generation → crafting recipes/schematics → trading loop → crafters → **[Phase 4 boundary]** → **ships → travel** → **[Phase 5 boundary]** → galactic map).

Ships and Travel are combined into a single phase because they're tightly coupled by design: a ship's derived tier is the input to the travel-time formula, so there's no meaningful way to build one without the other already existing.

**Definition of done for Phase 5:** a player can craft ship components (weapons, engines, shields, cargo holds) using the existing crafting system, purchase a whole ship from a planet's shipwright pool, see that ship's tier correctly derived from its installed components, select a discovered destination planet on the (existing, now travel-extended) map, see a computed travel time that reflects both the distance between planets and the ship's tier, and initiate/resolve a voyage that correctly delivers the ship (and any in-transit remote tier 6-7 sale from Phase 3) to the destination. All of this must be verifiable against known test cases, and must provably leave Agents 2, 8, 11, and 16 unmodified.

**Out of scope for Phase 5:** the full galactic map UI beyond what travel needs (that's the Map milestone), any encounter system during travel (explicitly deferred — see design doc), and multiplayer.

## 2. What's Already Decided (from `profitable-design-questions.md`)

Full rationale lives in the design doc; this is the implementation-ready summary.

### 2.1 Ship Upgrades — Individual Component Tiers
A ship's capability comes from its installed components — weapons, engines, shields, cargo holds — each rated on the **same 7-tier color scale** used everywhere else. No separate "ship level" stat exists independently of components.

### 2.2 Components Craftable + Tradeable; Whole Ships Purchased from a Market
Ship components are **craftable**, extending the existing crafting system with a new recipe category — same unified crafting formula, category+threshold inputs, schematic tier, crafter tier. Once crafted, components are ordinary crafted items and flow into the existing trading market automatically. **Whole ships** are a discoverable/purchasable unique item from a market, reusing the same shape already built for schematics and NPC crew — a small, refreshing "shipwright" pool at planet markets, tier-rolled the same way.

### 2.3 Ship Tier Derivation
A ship's overall tier is the **straight average of its installed component tiers**, mapped through the existing tier breakpoint table — same aggregation formula already used for crafted items' tiers 3-7 display color and market listing tier bucketing.

### 2.4 Ship Tier → Travel Speed
Derived ship tier applies a **percentage-based speed modifier** to the base travel-time formula (Section 2.6 below) — same shape as the refiner/crafter tier variance tables. Uses the derived ship tier, not the engine component alone.

### 2.5 Ship Component Scope
Four categories only, for now: **weapons, engines, shields, cargo holds**. Components carry the **same 5-quality data** as every other crafted item (purity, density, potency, durability, rarity) — no separate stat system. The mapping from a specific quality to a specific gameplay effect (e.g., engine potency → speed) is a balance detail, not required to be locked for Phase 5's functional build.

### 2.6 The Map — Extended, Not Separate
Travel uses the **same galactic trade map** built in Phase 3, extended with a travel-relevant layer (computed travel time to each discovered planet) alongside its existing trade-data layer. No second, dedicated travel map screen.

### 2.7 Coordinates Stay 2D
`Planet.position: {x, y}` from Phase 2 is unchanged — no `z` axis was added. Distance is computed in two dimensions.

### 2.8 Unit of Travel / Distance Formula
Travel time is a function of the **straight-line (Euclidean) distance** between two planets' `{x, y}` positions, scaled by a **tunable constant** to convert raw distance into a travel-time value, then modified by the ship-tier speed percentage (Section 2.4). Not a real-world unit (no AU) — an abstracted distance native to this game's coordinate scale.

### 2.9 Encounters During Travel — Deferred
The Phase 5 build has **no encounters**. Travel is "time passes, you arrive." A future, explicitly non-final intended shape (trade-opportunity, discovery, and ship-tier-threshold-check hazard encounters, all reusing existing mechanics) is recorded in the design doc for later — **not built in this phase.** Real combat is out of scope for Phase 5 and any near-term follow-up.

## 3. New/Extended Data Shapes

Building on Agent 1's existing types (unchanged), Phase 5 adds:

```
ComponentCategory = 'weapon' | 'engine' | 'shield' | 'cargoHold'

ShipComponent {
  id: string
  category: ComponentCategory
  qualities: QualityRoll        // reuses the existing 5-quality shape — components are ordinary crafted items
  tier: TierColor                // derived per the existing crafted-item aggregation rule
}

Ship {
  id: string
  name: string
  ownerId: string
  tier: TierColor                // derived: straight average of installed component tiers (2.3)
  components: {
    weapon: ShipComponent | null
    engine: ShipComponent | null
    shield: ShipComponent | null
    cargoHold: ShipComponent | null
  }
}

ShipyardPool {
  planetId: string
  availableShips: Ship[]          // unpurchased candidates currently listed at this planet
  lastRefreshedAt: timestamp
}

Voyage {
  id: string
  shipId: string
  originPlanetId: string
  destinationPlanetId: string
  departedAt: timestamp
  arrivesAt: timestamp            // derived from distance + ship tier speed modifier at departure time
  cargo: { itemId: string, quantity: number }[]   // supports the Phase 3 remote tier 6-7 sale item-in-transit case
}
```

### New constant tables/values (encoded as data, not embedded in logic)

- **Distance-to-travel-time scaling constant** (2.8) — tunable.
- **Ship tier speed modifier table** (2.4) — reuses the shape of the refiner/crafter variance table; exact percentages tunable.
- **Shipwright pool refresh interval and pool size per planet** (2.2) — tunable, same pattern as the Phase 4 crew pool.

`Resource`/`Recipe`/`Schematic`/`Planet`/`Listing`/`PlanetMarketState`/`Wallet`/`CrewMember` types from prior phases are unchanged; Phase 5 does not touch them. Component recipes reuse the existing `Recipe` type — no new recipe shape is needed, only new recipe *content* (Agent 23).

## 4. AI Agent Development Plan — Phase 5

Same contract pattern and cross-cutting rules as every prior phase. One schema amendment, and five new agents.

### 4.1 Roster & Creation Order

**Amendment — Agent 1 (Data Schema), Phase 5 additions.** `ComponentCategory`, `ShipComponent`, `Ship`, `ShipyardPool`, `Voyage` types; the tunable constants (distance scaling, ship-tier speed table, shipwright pool settings). Created first.

**Agent 20: Ships & Travel Core.** New. Pure, framework-agnostic TypeScript implementing ship assembly/tier derivation, shipwright pool refresh/purchase, travel-time calculation, and voyage initiation/resolution. Depends on the Phase 5 schema amendment and Agent 2's `craft()`/`getTierColor()` (called, never duplicated).

**Agent 21: Phase 5 Validation/Test.** New, created alongside Agent 20, runs continuously. Same relationship pattern as every prior phase's validation agent. Includes a regression check that Agents 2, 8, 11, and 16 remain untouched.

**Agent 22: Ships & Travel Presentation.** New. Builds the shipyard/purchase screen, the ship assembly screen (swap components), and the map's new travel layer (destination selection, computed travel time, voyage-in-progress display). Depends on Agent 20 and Agent 4's existing adapters.

**Agent 23: Ships & Travel Content.** New. Writes example component recipes (at least one per category: weapon, engine, shield, cargo hold) as config data, extending the existing recipe content pattern from Agent 6/Agent 14. Depends on the Phase 5 schema amendment only; can run in parallel with 20–22.

**Agent 24: Phase 5 Integration.** New, created last. Wires component crafting → ship assembly → shipyard purchase → map travel-time display → voyage → arrival into one verified end-to-end loop, and confirms Agents 2, 8, 11, and 16 remain unmodified. Also verifies the Phase 3 remote tier 6-7 sale's deferred travel-time mechanic now resolves correctly through a real `Voyage`.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-phase5-schema.md`, `agent-20-ships-travel-core.md`, `agent-21-phase5-validation-test.md`, `agent-22-ships-travel-presentation.md`, `agent-23-ships-travel-content.md`, and `agent-24-phase5-integration.md`. This section is intentionally a summary — see those files for the authoritative inputs/outputs/must-not-do/definition-of-done for each.

## 5. Cross-Cutting Rules

Same as every prior phase (see `docs/agents/README.md`), plus:

- **All prior isolation boundaries extend to Ships & Travel.** Nothing in Phase 5 may modify Agent 2's `refine()`/`craft()` internals, Agent 8's galaxy/planet generation logic, Agent 11's trading logic, or Agent 16's crew logic to accommodate ship/travel data. Ships & Travel Core *calls* `craft()` (for components) and reads planet position/discovery data, but never alters what any of those functions do.
- **No agent implements encounters, combat, or any travel-hazard mechanic.** Section 2.9 is explicit that this is deferred — building it now would be speculative work against a scope that doesn't exist yet, the same reasoning already applied to crew loss/attrition and trading's manipulation-detection deferral.
- **The Phase 3 remote tier 6-7 sale mechanic must resolve through a real `Voyage`, not a stub.** Phase 3 explicitly deferred exact travel-time mechanics to this milestone; Agent 24's integration report must confirm this connection actually works, not just that Ships & Travel work in isolation.
