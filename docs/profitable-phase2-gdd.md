# Profitable — Phase 2 Game Design Document: Galaxy & Planet Generation

Status: **Phase 2 complete and verified** (Agent 1 amendment, Agent 8, Agent 9, and Agent 10 all delivered; full roster committed). This document remains the historical record of the Phase 2 build; see `CLAUDE.md` for current project status and the next milestone (the trading loop).

**Later, materially superseded (design-only, not yet built):** this document describes gathering as a **per-action random roll** — a fresh `rollQuality()` call every time a player gathers, modified by the planet's tier/specialty. The "Planet Resource Generation" decision in `profitable-design-questions.md` replaces that: each planet-resource pair now gets **one fixed quality**, rolled once at generation (and again on a periodic reset cycle), with gathering itself becoming a deterministic read. The tier-modifier/specialty-bonus *formula* below is unchanged — only *when* it's applied moved, from every gather action to planet generation/reset. See `docs/functional-agents/planet.md` and `gathering.md` for the current, consolidated contract.

---

## 1. Phase 2 Scope

Phase 2 replaces the MVP's single hardcoded planet (Delta Rigelus) with real, procedural galaxy and planet generation — the next link in the decided development order (galaxy generation → planet generation → resource generation → crafting recipes/schematics → **[Phase 2 boundary]** → trading loop → crafters → travel → map).

**Definition of done for Phase 2:** given a seed, the system generates a fixed set of planets, each with a Planet Type, tier, position, optional specialty resource, discovery flag, and a resource-availability list — and gathering on any generated planet correctly applies that planet's tier modifier and specialty bonus to the existing `rollQuality()` function, with refining and crafting completely unaffected (planet-agnostic, per the locked design decision). The same seed must reproduce the same galaxy.

**Out of scope for Phase 2:** travel, the galactic trade map, per-planet/global markets, NPC crew crafters, and multiplayer. These remain sequenced after Phase 2 per the decided development order. The `discovered` flag and planet position are generated now (cheap to add, expensive to retrofit) but have **no behavior** yet — nothing reads or acts on them until travel/map exist.

## 2. What's Already Decided (from `profitable-design-questions.md`)

Full rationale lives in the design doc; this is the summary Phase 2 agents build against.

### 2.1 Planet Tier
Assigned via a random 1–100 roll at generation, mapped through the **same tier breakpoint table used everywhere else** (Grey 1–40 / White 41–60 / Green 61–75 / Blue 76–85 / Purple 86–91 / Orange 92–96 / Gold 97–100).

### 2.2 Planet Tier Quality Roll Modifier
A flat additive modifier applied to `rollQuality()`'s base 1–100 roll before clamping. **Green is the neutral point** (unlike refiner/crafter/schematic tables, where Grey is neutral) — a planet isn't a skill investment, it's a place, and most places should be unremarkable.

| Planet Tier | Quality Roll Modifier |
|---|---|
| Grey | -15 |
| White | -8 |
| Green | +0 |
| Blue | +8 |
| Purple | +15 |
| Orange | +22 |
| Gold | +30 |

### 2.3 Planet Type (governs eligible resource categories)
Adapted from **NASA's real exoplanet classification system** (public domain, not fictional IP). Planet Type is a **hard filter**, not a bias — a Gas Giant cannot roll a solid resource.

| Planet Type | Eligible Resource Categories |
|---|---|
| Terrestrial | Solid, Crystal |
| Super-Earth | Solid, Crystal, (occasionally Gas) |
| Neptunian | Gas, Crystal (icy) |
| Gas Giant | Gas |

### 2.4 Resource Subset Selection
Subset size is **percentage-based**, scaled by planet tier, applied to the count of resources eligible for that planet's type:

| Planet Tier | % of eligible resources available |
|---|---|
| Grey | 20% |
| White | 35% |
| Green | 50% |
| Blue | 65% |
| Purple | 80% |
| Orange | 90% |
| Gold | 100% |

`count = max(1, ceil(percentage × eligible_count))`. The `max(1, ...)` floor guarantees no planet ever has zero producible resources. Selection within that count is a **uniform random draw, no weighting**.

### 2.5 Planet Specialties
Planets **tier White or higher** get exactly **one** specialty resource, randomly selected from their eligible pool, granting a **flat +15 quality modifier** on top of the tier modifier. **Grey planets never get a specialty.** Solved via a **reserved-slot rule**, not an inflated count: the specialty is chosen first and occupies one of the slots the Section 2.4 formula already produces; the remaining `count - 1` slots are filled by the normal uniform draw, excluding the already-placed specialty. Subset size stays a pure function of tier — a specialty planet doesn't produce more resources overall, only a better version of one.

### 2.6 Planet Tier Scope: Gathering Only
Planet tier's mechanical effect (modifier + specialty) applies **exclusively to the gather roll**. The refining and crafting formulas remain **completely planet-agnostic** — no additional stacking on top of the already-capped crafter tier + schematic tier (+18% combined). This is a hard boundary: Agent 2's `refine()` and `craft()` functions must not change in Phase 2.

### 2.7 Galaxy Structure
A **fixed, finite set of planets generated once** — not an infinite/streaming procedural system. Each planet gets a **simple position (x/y coordinate)** at generation, even though travel is post-MVP. **No formal "region" data structure** — a flat list of planets with coordinates; regions can be derived from coordinates later if wanted.

### 2.8 Generation Seed & Naming
Galaxy/planet generation is **seeded by default**, consistent with Agent 2's existing requirement that every random function be seedable/deterministic. If no seed is supplied, one is generated and **stored** so the galaxy can be reproduced. **Name generation is explicitly deferred** — use placeholder names (e.g., `"Planet-{id}"`) for now; nothing else in the design depends on planet names.

### 2.9 Discovery State
A `discovered: boolean` field on `Planet`, defaulting to `false` except the starting planet. **No behavior yet** — exists only so travel/map features don't require a retrofit later.

## 3. Extended `Planet` Data Shape

Agent 1's MVP `Planet` type (`id`, `name`, `producibleResourceIds`) is extended, not replaced:

```
Planet {
  id: string
  name: string              // placeholder scheme for now, per 2.8
  planetType: PlanetType     // new enum: Terrestrial | SuperEarth | Neptunian | GasGiant
  tier: TierColor            // new — reuses existing TierColor enum
  position: { x: number, y: number }  // new
  producibleResourceIds: string[]     // unchanged shape, now populated by generation logic
  specialtyResourceId: string | null  // new — null for Grey-tier planets
  discovered: boolean        // new — defaults false except starting planet
}
```

No planet modifiers/seasons/market fields are added yet — those remain out of scope per Section 1.

## 4. AI Agent Development Plan — Phase 2

Phase 2 reuses the MVP's contract pattern (narrow responsibility, explicit inputs/outputs/must-not-do/definition-of-done) and the same cross-cutting rules from `docs/agents/README.md`. Three agents are needed: one amendment to an existing agent, and two new agents.

### 4.1 Roster & Creation Order

**Amendment — Agent 1 (Data Schema), extended.** Add `PlanetType` enum, the tier modifier table (2.2), the resource-subset percentage table (2.4), and the extended `Planet` shape (Section 3) to Agent 1's existing outputs. This is an amendment to existing files, not a new agent — same pattern as adding `loadContent` to Agent 2 during the MVP.

**Agent 8: Galaxy/Planet Generation Core.** New. Depends on the Agent 1 amendment above and on Agent 2's existing `rollQuality`/`getTierColor` (called, never duplicated). Implements the actual generation logic as pure, framework-agnostic TypeScript — same "zero browser API" rule as Agent 2.

**Agent 9: Phase 2 Validation/Test.** New, created alongside Agent 8 and run continuously against it — same relationship Agent 3 had with Agent 2 during the MVP. Tests Agent 8's output against every table in Section 2.

**Agent 10: Phase 2 Integration.** New, created last. Wires Agent 8's generated galaxy into the existing gather/refine/craft loop (Agents 2, 5, 6 from the MVP), confirms the full loop still works end-to-end with generated (not hardcoded) planets, and — critically — confirms Agent 2's `refine()` and `craft()` remain untouched and planet-agnostic (a regression check, not just a new-feature check).

### 4.2 Agent Contracts

---

**Agent 1 Amendment: Data Schema (Phase 2 additions)**

- **Responsibility:** Extend the existing Data Schema Agent's output with the new Phase 2 types and tables — do not modify or remove anything from the MVP output.
- **Inputs:** This document, Sections 2–3.
- **Outputs:**
  - `PlanetType` enum: `Terrestrial | SuperEarth | Neptunian | GasGiant`.
  - Planet-Type-to-eligible-category lookup table (Section 2.3).
  - Planet tier quality modifier table (Section 2.2), encoded as data.
  - Resource subset percentage table (Section 2.4), encoded as data.
  - Extended `Planet` type per Section 3.
- **Must NOT do:** modify the MVP's existing constant tables or types (tier breakpoints, refiner/crafter variance table, refund chance table, penalty curve, schematic table) — those are unchanged. Must not implement any generation logic — types and tables only.
- **Definition of done:** every table in Section 2 has a typed, data-encoded representation; the extended `Planet` type matches Section 3 exactly; a diff against the original Agent 1 output shows only additions, no modifications to MVP content.

---

**Agent 8: Galaxy/Planet Generation Core**

- **Responsibility:** Implement galaxy and planet generation as pure, framework-agnostic TypeScript. Same architectural mandate as Agent 2 — zero Phaser, zero DOM, zero browser API.
- **Inputs:** Agent 1's Phase 2 types/tables (imported, never hardcoded). Agent 2's `rollQuality()` and `getTierColor()` (called for the actual quality-roll and tier-mapping work — never reimplemented).
- **Outputs:**
  - `generateGalaxy(planetCount: number, seed?: string): { seed: string, planets: Planet[] }` — if no seed given, one is generated and returned (per 2.8, must be stored by the caller).
  - `generatePlanet(seed, position): Planet` — assigns tier (2.1), Planet Type (2.3, random choice among the four types — exact distribution not yet specified, uniform is an acceptable default unless/until decided otherwise), resource subset with reserved specialty slot (2.4–2.5), and sets `discovered: false`.
  - Must apply the **reserved-slot rule exactly** per 2.5 — specialty selected first, remaining slots filled from the eligible pool minus the specialty, never the reverse order.
  - Must **not** modify `rollQuality()`'s signature or behavior in a way that breaks MVP callers — the planet tier modifier is applied by Galaxy/Planet Generation Core when a gather action calls `rollQuality()` with a planet argument, not baked into `rollQuality()` itself as a hidden side effect. (If this requires a signature change to `rollQuality()`, that change must be additive/backward-compatible — e.g., an optional planet-modifier parameter — not a breaking change to MVP call sites.)
- **Must NOT do:** touch `refine()` or `craft()` in any way — Section 2.6 is a hard boundary. Must not implement rendering, input, save/load, or audio. Must not hardcode any constant defined by the Agent 1 amendment.
- **Definition of done:** given a fixed seed, `generateGalaxy()` produces an identical galaxy on repeated calls. Every planet's tier, Planet Type, resource subset, and specialty (if any) match the rules in Section 2 exactly on manual/spot-check verification. `refine()` and `craft()` are provably unchanged (e.g., a diff or a passing re-run of Agent 3's original MVP test suite with zero modifications).

---

**Agent 9: Phase 2 Validation/Test**

- **Responsibility:** Prove Agent 8's output matches Section 2's tables and rules exactly — same relationship to Agent 8 that Agent 3 had to Agent 2.
- **Inputs:** Agent 8's public functions, Section 2 of this document as the source of truth.
- **Outputs:** A test suite covering:
  - Seeded reproducibility: same seed → identical galaxy, across multiple runs.
  - Planet tier distribution: confirm the tier roll correctly maps through the shared breakpoint table (boundary tests at 40/41, 60/61, etc., same as the original MVP tier tests).
  - Quality modifier table: confirm each of the 7 tier modifiers (Section 2.2) is applied exactly, and that Green is genuinely neutral (+0), not treated as a baseline the way Grey is elsewhere.
  - Planet Type eligibility: confirm a Gas Giant never produces a solid resource, a Terrestrial planet never produces a pure-gas-only resource, etc. — the hard filter from Section 2.3, not just a bias.
  - Resource subset count: confirm the percentage table (Section 2.4) produces the exact expected count at each tier for a known eligible-resource-count, including the `max(1, ...)` floor at Grey with a small eligible pool.
  - Specialty reserved-slot rule: confirm White+ planets always have exactly one specialty, Grey planets never do, the specialty always appears within the resource subset (never crowded out), and the specialty modifier (+15) is additive on top of the tier modifier, not a replacement for it.
  - **Regression check:** confirm Agent 2's `refine()` and `craft()` produce byte-for-byte identical output to the original MVP test suite (Agent 3's tests), proving Section 2.6's planet-agnostic boundary held.
- **Must NOT do:** modify Agent 8's (or Agent 2's) logic — report discrepancies, don't patch them. Must not test rendering/presentation/integration concerns — those belong to Agent 10.
- **Definition of done:** every rule in Section 2 has at least one passing test asserting the exact documented behavior; the regression check against the original MVP formulas passes with zero deviation.

---

**Agent 10: Phase 2 Integration**

- **Responsibility:** Wire Agent 8's generated galaxy into the existing MVP loop (Agents 2, 5, 6) and verify the full gather → refine → craft loop still works end-to-end, now sourced from generated planets instead of hardcoded Delta Rigelus content.
- **Inputs:** Agent 8's generation functions, Agent 9's passing test suite, and the original MVP agents' outputs (2, 4, 5, 6, 7) as the baseline to integrate against.
- **Outputs:**
  - A working build where gathering happens on a generated planet (with that planet's tier/specialty correctly affecting the roll), and the resulting resource can still be refined and crafted using the unchanged Agent 2 formulas.
  - An integration report confirming Section 1's Definition of Done is met.
  - A gap list, attributed to the specific agent (1 amendment, 8, 9, or an original MVP agent) whose contract wasn't fully met — same reporting pattern as the original Agent 7.
- **Must NOT do:** introduce new generation logic, new formulas, or modify Agent 2's `refine()`/`craft()` to "make integration work" — any such need is a contract violation to report, not a gap to patch around.
- **Definition of done:** the full gather → refine → craft loop runs start to finish using a generated (seeded) galaxy, with at least one hand-verified example of a specialty planet's bonus correctly affecting a gather roll, and the original MVP's hand-calculated refining/crafting test cases still passing unchanged.

## 5. Cross-Cutting Rules

Same rules as the MVP (see `docs/agents/README.md`), plus one Phase-2-specific addition:

- **The planet-agnostic boundary (Section 2.6) is non-negotiable.** Any agent whose work would require modifying `refine()` or `craft()` to accommodate planet data must stop and report it as a design conflict, not resolve it unilaterally — this boundary was a deliberate decision to avoid a fourth stacking modifier on an already-capped formula.
