# Profitable — MVP Game Design Document

Status: MVP scope locked. All Must-Answer-for-MVP questions resolved (see `docs/profitable-design-questions.md`). This document defines what gets built, in what order, and which AI agents build it.

**Retroactive correction (2026-07-29):** `getTierColor()`'s boundary comparison (`value <= max`) had a gap at every tier boundary — a fractional quality value landing strictly between two adjacent integer breakpoints (e.g., 85.2, between Blue's max=85 and Purple's min=86) would throw a `RangeError` instead of resolving to the lower tier. This affected `refine()`'s output tier calculation, live in shipped code since the original MVP implementation (commit `7ba2917`, July 25). It was never caught by MVP verification because `refine.test.ts`'s hand-calculated regression cases used specific numbers that happened to avoid all six gap boundaries — not because the formula was exercised against real boundary cases. Found and fixed during alpha content authoring (see `docs/profitable-alpha-content-roster.md` and the `getTierColor` regression test in `tests/simulation/tierColor.test.ts`). No MVP milestone claim is retracted — the loop worked correctly for every input actually tested — but the verification's blind spot (narrow/hand-picked test inputs rather than boundary-inclusive coverage) is now documented rather than silently absorbed.

**Retroactive correction (2026-07-31):** `getPenaltyMultiplier()`'s band lookup (`pointsBelow <= entry.maxPointsBelow`) had the same class of gap as `getTierColor()` above, on `PENALTY_CURVE`'s four internal band boundaries (just above 0, 10, 20, and 30 points below threshold). `craft()` computes `effectivePointsBelow = worstPointsBelow * (1 - schematic.penaltyForgiveness)`, which is fractional whenever a schematic's forgiveness is nonzero — i.e. every schematic tier except Grey — so a value like 10.2 (the MVP's own Ion-Forged Hull Plate recipe, a real Blue schematic, an input 12 points below its durability threshold) satisfied neither the 1–10 nor the 11–20 band and threw, exactly the same failure shape as the `getTierColor()` case above. Live in shipped code since the original `craft()` implementation (commit `8b801ed`, July 25 — the same day as the `getTierColor()` bug's own origin commit). Not caught by the alpha content roster's craftability spot-check (`tests/content/alphaContentSpotCheck.test.ts`) or `craft.test.ts`'s own forgiveness test, both of which *did* exercise real fractional `effectivePointsBelow` values (e.g. 23.75, 22.5, 16.25) — none of the specific points-below/schematic-tier combinations chosen happened to land inside one of the four gap zones, each under 1 point wide. A fresh quantification across all 7 schematic tiers × every integer points-below value 1–40 (280 combinations) found 23 that land in a gap and would have crashed — notably, every non-Grey schematic tier crashes at 1 point below threshold, the mildest possible violation, not a deep edge case. Fixed with the same directional choice as `getTierColor()` (round fractional values down into the less-severe band), with one addition `getTierColor()` didn't need: `PENALTY_CURVE`'s `{0,0}` band represents "no violation at all" and needed to keep its exact boundary rather than being extended the same way as the other bands, since doing so would let a genuine (if mild) violation resolve to zero penalty — contradicting the documented "forgiveness softens but never fully erases the penalty" rule, which is itself covered by a dedicated regression test. Full regression coverage in `tests/simulation/penaltyCurve.test.ts` (boundary, all four gap zones, and the zero-band edge case) and a real-content end-to-end reproduction in `tests/simulation/craft.test.ts`. No MVP milestone claim is retracted — `craft()` worked correctly for every input actually tested — but, as with the `getTierColor()` correction, the verification blind spot (specific chosen values rather than boundary-adjacent coverage) is documented rather than silently absorbed.

---

## 1. Vision

A game systems engine for resource gathering, refining, and crafting, where every item — raw, refined, or crafted — carries the same 5 numeric qualities (purity, density, potency, durability, rarity). Quality flows through refining and crafting via a shared formula, feeding a trading market across raw resources, refined resources, recipes/schematics, and crafted items. Long-term vision includes a galaxy of planets with local markets, a galactic trade map, NPC crew crafters, and eventual multiplayer — all explicitly **out of scope for the MVP**.

## 2. MVP Scope

The MVP proves the **quality math** end-to-end before any procedural generation, trading, or travel systems are built. Per the decided development order (galaxy → planet → resource → crafting → trading → crafters → travel → map), the MVP covers only the first four links of that chain, using hardcoded content instead of generation:

| Step | Deliverable |
|---|---|
| 1 | One hardcoded planet, 2–3 resource types with their applicable qualities defined |
| 2 | Resource generation: random 1–100 quality roll per applicable quality, mapped to the 7-tier color scale |
| 3 | One refining recipe, fully working end-to-end (Option A formula, refiner tier, refund chance) |
| 4 | One crafting recipe + one schematic, fully working end-to-end (unified crafting formula) |
| 5 | Not a build step — this is the checkpoint. Once 1–4 are working and tunable, galaxy/planet generation begins for real. |

**Out of scope for MVP:** galaxy/planet generation, trading market (global or per-planet), NPC crew crafters, travel, the galactic trade map, multiplayer. These are all deferred per the decided development order.

**Definition of done for the MVP:** a player (or test harness) can gather a resource with a random quality roll, refine it into a refined resource using a specific refiner tier, and craft it into a finished item using a specific schematic and crafter tier — with output quality at every step matching the formulas and tables below, verifiable against known test inputs.

## 3. Core Systems Reference

Full detail and rationale lives in `docs/profitable-design-questions.md`; this section summarizes only what the MVP needs to implement.

### 3.1 The 5 Qualities
- Purity, density, potency, durability, rarity. Universal, but not all apply to every resource type (non-applicable = `null`, never `0`).
- Each quality: integer 1–100, mapped to a 7-tier color: Grey (1–40), White (41–60), Green (61–75), Blue (76–85), Purple (86–91), Orange (92–96), Gold (97–100).
- Qualities persist through every tier (raw → refined → crafted); tiers 1–2 display each quality's color individually, tiers 3–7 aggregate into one overall color (aggregation formula is post-MVP — stub with a straight average for MVP purposes).

### 3.2 Refining Formula
1. `base_avg` = straight average of input qualities (weighted by quantity only).
2. Variance: ±10% of `base_avg`, asymmetric by refiner tier (table below) — narrows the negative side more than it extends the positive side.
3. Refund chance: rolled per consumed input unit, keyed to the *output* tier the roll lands on (table below).
4. No failure state and no yield loss — refining always succeeds at 100% base yield.

**Refiner tier variance table** (shared with crafter tier):

| Tier | Negative side | Positive side |
|---|---|---|
| Grey | -10% | +10% |
| White | -8% | +10% |
| Green | -6% | +10% |
| Blue | -4.5% | +11% |
| Purple | -3% | +12% |
| Orange | -1.5% | +13% |
| Gold | -0.5% | +15% |

**Refund chance table** (keyed to output tier):

| Tier | Refund chance |
|---|---|
| Grey | 0% |
| White | 0% |
| Green | 5% |
| Blue | 10% |
| Purple | 15% |
| Orange | 20% |
| Gold | 25% (+ ~20% secondary chance of refunding 2 units instead of 1) |

### 3.3 Crafting Formula
1. `base_avg` = straight average of input qualities.
2. Ceiling raise: crafter tier (via the shared variance table above) + schematic tier (table below), additive, **capped at +18% combined**.
3. Variance roll around the raised ceiling, narrowed by crafter tier + schematic tier, additive.
4. Threshold penalty, applied **last**: for any input below the recipe's recommended quality threshold, apply the penalty curve below to the rolled output — softened (not bypassed) by the schematic's forgiveness bonus.
5. `output = clamp(final penalized value, 1, 100)`.

**Threshold penalty curve:**

| Points below threshold | Penalty multiplier |
|---|---|
| 0 | 1.0 |
| 1–10 | 0.95 |
| 11–20 | 0.85 |
| 21–30 | 0.70 |
| 31–40 | 0.50 |
| 41+ | Input rejected — craft cannot proceed |

**Schematic tier contribution:**

| Tier | Ceiling raise | Variance narrowing | Penalty forgiveness |
|---|---|---|---|
| Grey | +0% | -0% | 0% |
| White | +1% | -0.5% | 5% |
| Green | +2% | -1% | 10% |
| Blue | +3% | -1.5% | 15% |
| Purple | +4% | -2% | 20% |
| Orange | +5% | -2.5% | 25% |
| Gold | +6% | -3% | 35% |

### 3.4 MVP Content
- **Resources:** 2–3 hardcoded types (e.g., an ore and a gas, to exercise the "not all qualities apply" rule).
- **Refining recipe:** one n:1 recipe (e.g., 2 ore → 1 bar).
- **Crafting recipe + schematic:** one recipe with a category + threshold input requirement (e.g., "metal bar, durability 60+"), paired with one schematic at a testable tier.

## 4. Technical Architecture

- **Stack:** TypeScript + Phaser or PixiJS for the MVP; planned migration to Unity once the MVP loop is proven (migration trigger tied to MVP completion, not a calendar date).
- **Mandatory separation:** simulation (all quality/refining/crafting math) must be plain, framework-agnostic TypeScript — pure functions and data structures, zero Phaser/PixiJS objects touching them. Presentation code only handles rendering, animation, input, and screen flow.
- **Data-driven:** resources, recipes, qualities, and tier tables load from config files (JSON), not hardcoded in logic — even for the MVP's hardcoded content, it should live in config, not inline code.
- **Browser API isolation:** no DOM-based UI, no URL/cookie state. Persistence and audio each sit behind a single swappable adapter interface (`SaveSystem`, `AudioManager`) so migration to Unity swaps implementations, not call sites.

## 5. AI Agent Development Plan

Since agents are doing the heavy lifting (by design, for as long as possible — see Engine/Systems Architecture decisions), the MVP is built by a small set of specialized agents, each with a narrow, well-defined responsibility and an explicit **contract**: what it may read, what it must produce, and what "done" looks like. Contracts exist so agents can work independently without stepping on each other's output, and so a human (or an orchestrating agent) can verify each agent's work against a fixed spec rather than free-form review.

### 5.1 Agent Roster & Creation Order

Agents are created and run in this order. Each later agent depends on artifacts produced by an earlier one — this order is not arbitrary, it mirrors the dependency chain of the architecture itself.

**1. Data Schema Agent** (created first — everything depends on it)
**2. Simulation Core Agent**
**3. Validation/Test Agent** (created alongside #2, runs continuously against it)
**4. Infrastructure/Adapter Agent**
**5. Presentation Agent**
**6. Content Agent**
**7. Integration Agent** (created last — verifies the whole MVP loop)

### 5.2 Agent Contracts

---

**1. Data Schema Agent**

- **Responsibility:** Define the canonical data shapes for the whole project — resource types, the 5 qualities, tier tables (color breakpoints, refiner/crafter variance table, refund chance table, penalty curve, schematic tier table), recipes, and schematics.
- **Inputs:** This GDD (Section 3) and `docs/profitable-design-questions.md`.
- **Outputs:**
  - TypeScript type definitions (interfaces) for every data shape referenced above.
  - JSON schema files for validating config data against those types.
  - The tier/formula constant tables from Section 3, encoded as data (not hardcoded numbers scattered through logic).
- **Must NOT do:** implement any formula logic, gameplay behavior, or rendering. This agent produces shapes and constants only.
- **Definition of done:** every table and value in Section 3 of this document has a corresponding typed, validated data representation. No other agent should need to re-derive or hardcode a number from this document — they should import it from here.

---

**2. Simulation Core Agent**

- **Responsibility:** Implement the actual game logic: quality roll generation, the refining formula (Section 3.2), the crafting formula (Section 3.3), null/NA quality handling, and the threshold-penalty/forgiveness interaction.
- **Inputs:** Data Schema Agent's type definitions and constant tables. Nothing else — this agent must not read Phaser/PixiJS APIs, DOM APIs, or any rendering code.
- **Outputs:**
  - Pure functions: e.g., `rollQuality()`, `refine(inputs, refinerTier)`, `craft(inputs, recipe, schematicTier, crafterTier)`. Each takes typed data in, returns typed data out — no side effects, no framework objects.
  - Deterministic and testable: given a fixed random seed, output must be reproducible.
- **Must NOT do:** touch rendering, input, audio, save/load, or any browser API. Must not hardcode any numeric constant already defined by the Data Schema Agent — it imports them.
- **Definition of done:** every formula in Section 3.2 and 3.3 is implemented as a pure function, matches the documented tables exactly, and correctly excludes null/NA qualities from calculations per the decided rule.

---

**3. Validation/Test Agent**

- **Responsibility:** Write automated tests proving the Simulation Core Agent's output matches this document's tables and formulas — not just "it runs," but "it runs correctly" (e.g., a gold-tier refiner narrows variance to -0.5%/+15% exactly, not approximately).
- **Inputs:** Simulation Core Agent's public functions, and this document's tables as the source of truth.
- **Outputs:** A test suite (unit tests) covering: quality roll distribution and clamping (1–100), null/NA exclusion, refining formula at each refiner tier, refund chance behavior, crafting formula at each crafter/schematic tier combination, the threshold penalty curve including the hard floor at 41+ points below threshold, and the +18% combined ceiling cap.
- **Must NOT do:** modify Simulation Core logic itself — this agent only tests and reports. If a test fails, it reports the discrepancy; it does not silently "fix" the formula to make the test pass.
- **Definition of done:** every table row in Section 3.2 and 3.3 has at least one corresponding passing test asserting the exact documented value, and the full suite passes.

---

**4. Infrastructure/Adapter Agent**

- **Responsibility:** Build the browser-API isolation layer described in Section 4 — `SaveSystem` and `AudioManager` adapters — so no other agent ever calls `localStorage` or Web Audio directly.
- **Inputs:** Section 4 of this document (architectural mandate).
- **Outputs:** Two interfaces (`SaveSystem`, `AudioManager`) with one concrete browser-backed implementation each. No game logic.
- **Must NOT do:** implement any gameplay logic or import anything from Simulation Core.
- **Definition of done:** every persistence or audio need anywhere else in the codebase goes through one of these two interfaces; grep for raw `localStorage`/`Audio()` calls outside this agent's files returns nothing.

---

**5. Presentation Agent**

- **Responsibility:** Build the Phaser/PixiJS scenes for the MVP loop: the map screen (even if trivial for a single hardcoded planet), and simple animated screens for resource collection, refining, and crafting.
- **Inputs:** Simulation Core Agent's public functions (called, never modified or duplicated), Infrastructure Agent's `SaveSystem`/`AudioManager` interfaces.
- **Outputs:** Renderable Phaser/PixiJS scenes wired to Simulation Core's functions — e.g., a "gather" button calls `rollQuality()` and renders the result; a "refine" screen calls `refine()` and animates the outcome.
- **Must NOT do:** reimplement or duplicate any formula logic locally, or touch `localStorage`/Web Audio directly (must go through the Infrastructure Agent's adapters). No DOM-based UI — all UI renders inside the canvas.
- **Definition of done:** a player can click through gather → refine → craft using only this agent's scenes, and the numbers shown match what Simulation Core actually computed (no presentation-layer math).

---

**6. Content Agent**

- **Responsibility:** Populate the actual MVP content — the 2–3 resource type definitions, the one refining recipe, and the one crafting recipe + schematic — as config data conforming to the Data Schema Agent's shapes.
- **Inputs:** Data Schema Agent's schemas.
- **Outputs:** JSON config files defining the specific MVP content (Section 3.4), validated against schema.
- **Must NOT do:** write any code — this is a data-only agent. Should not need to touch TypeScript files at all.
- **Definition of done:** config files exist, validate against schema, and are rich enough to exercise every branch of the formulas (e.g., at least one resource with a null/NA quality, at least one craft input that can fall below the recipe's threshold).

---

**7. Integration Agent**

- **Responsibility:** Wire everything together and verify the full MVP loop actually works end-to-end, using the Content Agent's data, through the Presentation Agent's scenes, backed by the Simulation Core.
- **Inputs:** All other agents' outputs.
- **Outputs:** A working, playable (or scriptable/testable) MVP build, plus a report confirming the Definition of Done in Section 2 is met.
- **Must NOT do:** introduce new game logic or new content — if something doesn't work, this agent identifies which upstream agent's contract wasn't met and flags it, rather than patching around the gap itself.
- **Definition of done:** the full gather → refine → craft loop runs start to finish with real output matching hand-calculated expected values for at least one known test case per formula.

### 5.3 Cross-Cutting Contract Rules

These apply to every agent above, not just one:

- **No agent hardcodes a number that already exists in the Data Schema Agent's output.** If a value needs to change, it changes in one place.
- **No agent reaches "downward" past its declared inputs.** E.g., the Presentation Agent may call Simulation Core's public functions, but must never read Simulation Core's internal/private helpers, and must never import the Content Agent's raw JSON directly — it goes through Simulation Core's loading path.
- **Every agent's output must be independently reviewable against its Definition of Done** without needing to understand any other agent's internals — this is what makes the contract a contract rather than just a task description.

## 6. Open Items

All Must-Answer-for-MVP questions are resolved (see `docs/profitable-design-questions.md`). Anything still open in that document is explicitly post-MVP and does not block this build plan.
