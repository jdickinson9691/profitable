# CLAUDE.md — Profitable

This is the root reference for Claude Code (or any agent) working in this repository. It summarizes the locked design, the architecture, and the AI agent plan that governs how this codebase gets built. Full rationale for every decision below lives in `docs/profitable-design-questions.md`; the build plan lives in `docs/profitable-mvp-gdd.md`; per-agent contracts live in `docs/agents/`.

**Read this file first in any session.** If you're about to implement a formula, add a data shape, or wire a scene together, check the relevant agent contract in `docs/agents/` before writing code — it defines exactly what you may and may not touch.

---

## 1. Project Overview

**Profitable** is a game systems engine: resource gathering → refining → crafting → trading. Every item (raw, refined, or crafted) carries the same 5 numeric qualities. Quality flows through refining and crafting via shared formulas, ultimately feeding a trading market across raw resources, refined resources, recipes/schematics, and crafted items.

**This is a specific implementation for one game, not a reusable engine/framework.** Single-player for the initial build; multiplayer (shared economy or otherwise) is a planned future evolution, not in current scope.

**Current phase: Galactic Map verification milestone — complete.** MVP, Phase 2, Phase 3, Phase 4, Phase 5, and the Galactic Map verification pass are all done. The Galactic Map's design questions all resolved to "the existing system already does this," so this milestone verified that claim (Agents 25/26) rather than building new features — verification surfaced 3 attributable bugs in the Phase 3/5 implementation, **all 3 now fixed** (discovery-by-travel, seasons/emergencies, map/nav canvas overflow). See `profitable-map-gdd.md` Sections 6-7 and Section 6 below.

**Full development order (all planned phases complete):**
galaxy generation → planet generation → resource generation → crafting recipes/schematics → **[MVP boundary]** → trading loop → **[Phase 3 boundary]** → crafters (NPC crew) → **[Phase 4 boundary]** → ships → travel → **[Phase 5 boundary]** → galactic map **[currently here — verification complete, all follow-on bugs fixed]**.

---

## 2. Tech Stack & Architecture

- **Stack:** TypeScript + Phaser, for now.
- **Why Phaser over PixiJS:** PixiJS is a rendering layer only — Phaser is a full 2D game framework (scene management, tweening, input abstraction, asset pipeline) built on similar rendering capability. Phaser's `Scene` class maps directly onto the MVP's four screens, its built-in tweening covers "simple animated 2D screens" natively, and its input handling is the idiomatic way to satisfy the "no raw DOM input" mandate below. PixiJS would only win for heavy custom rendering (particle systems, shaders) — not needed for the MVP's four screens.
- **Planned migration:** to **Unity**, once the MVP loop is built and feels right. The migration trigger is tied to the status of the initial loop, not a calendar date — evaluate once Section 4's five steps are complete and tunable.
- **Why this stack, and why Unity as the eventual target:** the project intends to use AI agents to do the heavy lifting of development for as long as possible. A plain-text, framework-light web stack is far more agent-friendly (large training data, automatable browser-based testing, no GUI-editor dependency) than Unity's or Godot's editor-driven workflows. Unity was chosen over Godot as the eventual target in part because Unity/C# is also comparatively agent-friendly.

### Architectural mandate — read before writing any game logic

To keep the eventual Unity migration a **port, not a rewrite**, this codebase enforces a hard separation:

- **Simulation layer** (quality-roll formulas, refining/crafting math, market state, planet data): plain, framework-agnostic TypeScript. Pure functions and data structures only. **Zero Phaser objects, zero DOM, zero browser API of any kind may touch this layer.**
- **Presentation layer** (Phaser scenes): rendering, animation, input, screen flow only. Calls into the simulation layer's public functions — never duplicates or reimplements its math.

### Browser API isolation — isolate, don't eliminate

- **Avoid entirely, anywhere in the codebase:** DOM-based UI (HTML/CSS overlays), URL params/cookies/browser routing for game state, raw DOM input event handling. Render all UI inside the Phaser canvas; use the engine's input abstraction.
- **Isolate behind one swappable adapter each** (see `docs/agents/agent-04-infrastructure-adapter.md`):
  - `SaveSystem` — wraps `localStorage`. No other file may call `localStorage` directly.
  - `AudioManager` — wraps Web Audio. No other file may call Web Audio directly.
  - `NetworkAdapter` — stub only for MVP (thin interface over WebSockets), built now so multiplayer costs nothing to add later.
- **Fine as-is:** the canvas rendering surface itself — not a migration risk.

### Data-driven design

Resources, recipes, qualities, and every tier/formula table are defined in **config files (JSON)**, not hardcoded in logic — even the MVP's hardcoded content lives in config. See `docs/agents/agent-01-data-schema.md` for the schemas and `docs/agents/agent-06-content.md` for the actual MVP values.

---

## 3. The Core Systems (apply everywhere, not just MVP)

### 3.1 The 5 Qualities

**Purity, density, potency, durability, rarity.** Universal — every resource type has all 5 defined — but not every quality is *applicable* to every resource type (e.g., gases have no durability).

- **Non-applicable qualities are `null`/N/A in data — never `0`.** Zero would misleadingly imply "worst possible quality" rather than "doesn't apply."
- **If a recipe references a quality that's null/NA on an input, that reference does not influence the formula or output at all.** Excluded from calculation entirely — not treated as zero, and does not invalidate the input.
- Each quality is an integer **1–100**, mapped to a **7-tier color scale**:

| Tier | Range | Width |
|---|---|---|
| Grey | 1–40 | 40 |
| White | 41–60 | 20 |
| Green | 61–75 | 15 |
| Blue | 76–85 | 10 |
| Purple | 86–91 | 6 |
| Orange | 92–96 | 5 |
| Gold | 97–100 | 4 |

- Qualities **persist at every item tier** (raw → refined → crafted, tiers 1–7) — no conversion into a separate stat system, no relabeling.
- **Color display differs by tier band:**
  - **Tiers 1–2 (raw/refined):** each of the 5 qualities displays its **own individual color tier**.
  - **Tiers 3–7 (crafted):** the 5 qualities **aggregate into a single overall color tier** (exact aggregation formula is post-MVP — stub with a straight average for now), used for at-a-glance rarity and to help drive sell value.

### 3.2 Refining Formula

Refining is **n:1**: multiple units of a resource combine into one output, and this extends to multiple *different* resources as inputs (e.g., 2 Igneous Ore + 1 Autunite Crystal → 1 output).

1. `base_avg` = **straight average** of input qualities, weighted by quantity only (never weighted toward best/worst — the threshold penalty in crafting already punishes weak individual inputs, so this stays simple).
2. Apply variance: **±10% of `base_avg`**, adjusted asymmetrically by refiner tier (table below) — narrows the negative side more than it extends the positive side.
3. Refund chance: rolled per consumed input unit, **keyed to the output tier the roll lands on** (not the input tier) — rewards refiners who consistently land near a high tier, even from mediocre inputs.
4. **Refining never fails.** No failure state, no yield loss — always 100% base yield, plus any refund.
5. A quality that's `null` on all relevant inputs is excluded from the average entirely — never treated as 0.

**Refiner/crafter tier variance table** (shared by both roles):

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
| Gold | 25% (+ ~20% secondary chance of 2 units instead of 1) |

### 3.3 Crafting Formula

Recipes are **not fixed to specific materials** — a recipe specifies a **category + recommended quality threshold** per input (e.g., "metal bar, durability 60+"). Inputs below threshold are still usable but degrade output quality.

**Unified crafting formula** (one pass, not independently stacked modifiers):

1. `base_avg` = straight average of input qualities (same rule as refining).
2. **Ceiling raise:** crafter tier (via the shared variance table above) + schematic tier (table below), **additive**, then **capped at +18% combined** — not the arithmetic sum (which would be +21% at max/max).
3. **Variance roll** around the raised ceiling, narrowed by crafter tier + schematic tier, also additive.
4. **Threshold penalty — applied LAST**, after steps 1–3 produce a raw value: penalize per the curve below, softened (not bypassed) by the schematic's forgiveness %. A great crafter and great schematic **cannot fully compensate for under-threshold inputs**, since this penalty comes after their influence.
5. `output = clamp(final penalized value, 1, 100)`.
6. A recipe referencing a `null`/N/A quality on an input is excluded from the threshold check and the formula entirely — never an automatic failure or a 0.

**Threshold penalty curve** (escalating, with a hard floor):

| Points below threshold | Penalty multiplier |
|---|---|
| 0 | 1.0 |
| 1–10 | 0.95 |
| 11–20 | 0.85 |
| 21–30 | 0.70 |
| 31–40 | 0.50 |
| 41+ | **Input rejected — craft cannot proceed** |

**Schematic tier contribution** (additive on top of crafter tier, deliberately smaller in scale — a schematic is equipment, not a skill investment):

| Tier | Ceiling raise | Variance narrowing | Penalty forgiveness |
|---|---|---|---|
| Grey | +0% | -0% | 0% |
| White | +1% | -0.5% | 5% |
| Green | +2% | -1% | 10% |
| Blue | +3% | -1.5% | 15% |
| Purple | +4% | -2% | 20% |
| Orange | +5% | -2.5% | 25% |
| Gold | +6% | -3% | 35% |

**Schematics are unique items** — discoverable/purchasable from planetary markets, not just permanent unlocks (full market mechanics are post-MVP). **Crafter skill is not universal** — tier 6–7 crafters have defined professions/specialties (full scope post-MVP); lower tiers may share a more general skill.

---

## 4. MVP Scope — Complete

**Status: done and verified.** The MVP proved the quality math end-to-end on one hardcoded planet, before any procedural generation, trading, or travel systems were built. This section is kept as the historical record of what was built and verified — do not re-open or re-scope it. See Section 6 for what's next.

The MVP proved the quality math end-to-end on **one hardcoded planet**, before investing in procedural generation.

**Definition of done:** a player (or test harness) can gather a resource with a random quality roll, refine it using a chosen refiner tier, and craft it into a finished item using a chosen schematic and crafter tier — with output quality at every step matching Section 3's formulas, verifiable against known test inputs.

### MVP Content (already decided — do not invent alternatives)

| Resource | Type | Purity | Density | Potency | Durability | Rarity |
|---|---|---|---|---|---|---|
| Igneous Ore | Solid | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hydrogen Gas | Gas | ✓ | ✓ | ✓ | **N/A** | ✓ |
| Autunite Crystal | Radioactive crystal | **N/A** | ✓ | ✓ | ✓ | ✓ |

- **Refining recipe:** 2× Igneous Ore + 1× Autunite Crystal → 1× **Radiant Alloy Bar**.
- **Crafting recipe + schematic:** 1× Radiant Alloy Bar (durability 60+ recommended) + 1× Hydrogen Gas → 1× **Ion-Forged Hull Plate**, schematic at a testable tier (e.g., Blue).
- **Planet:** **Delta Rigelus** — id/name + producible resource list only. No modifiers, seasons, or tier. Deliberately thin; not load-bearing.

### The Five MVP Build Steps

1. Hardcoded planet (Delta Rigelus), 2–3 resource types with applicable qualities defined.
2. Resource generation: random 1–100 quality roll per applicable quality, mapped to the 7-tier scale.
3. One refining recipe, fully working end-to-end.
4. One crafting recipe + one schematic, fully working end-to-end.
5. **Checkpoint, not a build step** — once 1–4 are working and tunable, real galaxy/planet generation begins.

---

## 5. AI Agent Development Plan

The MVP is built by 7 specialized agents, each with a narrow responsibility and an explicit **contract** (what it reads, what it must produce, what it must never do, and its definition of done). Full contracts live in `docs/agents/`; this is the index.

**Creation order — each depends on artifacts from the one(s) before it:**

1. **Data Schema Agent** (`docs/agents/agent-01-data-schema.md`) — types, JSON schemas, all constant tables from Section 3. Everything else depends on this. Produces shapes/constants only, no logic.
2. **Simulation Core Agent** (`docs/agents/agent-02-simulation-core.md`) — `rollQuality`, `getTierColor`, `refine`, `craft`, and `loadContent(rawConfig)` as pure, framework-agnostic functions. Zero Phaser/DOM/browser API. **`loadContent` is the single sanctioned path** for turning Agent 6's raw JSON into typed objects — added mid-build to close a contract gap where Agent 5 and Agent 6 both referenced "Agent 2's loading path" before it was ever defined as an output.
3. **Validation/Test Agent** (`docs/agents/agent-03-validation-test.md`) — created alongside #2, runs continuously. Tests Agent 2's output against Section 3's documented tables exactly. Reports discrepancies; never patches Agent 2 itself.
4. **Infrastructure/Adapter Agent** (`docs/agents/agent-04-infrastructure-adapter.md`) — `SaveSystem`, `AudioManager`, stub `NetworkAdapter`. Independent of Agents 2/3's internals; must exist before Agent 5.
5. **Presentation Agent** (`docs/agents/agent-05-presentation.md`) — Phaser scenes (map, gather, refine, craft). Depends on Agents 2 and 4. Never duplicates formula logic; never touches browser APIs directly; no DOM UI.
6. **Content Agent** (`docs/agents/agent-06-content.md`) — writes the actual MVP config data (Section 4's resources/planet/recipes) as JSON validated against Agent 1's schemas. Data-only, no code.
7. **Integration Agent** (`docs/agents/agent-07-integration.md`) — created last. Wires everything together, verifies the full MVP loop, and attributes any gap to the specific upstream agent whose contract wasn't met. Does not introduce new logic or content to patch around problems.

### Cross-Cutting Rules (bind every agent)

- **No agent hardcodes a number that already exists in Agent 1's output.** Change it in exactly one place.
- **No agent reaches "downward" past its declared inputs** (e.g., Presentation may call Simulation Core's public functions, but never its internals, and never Content's raw JSON directly).
- **Every agent's output must be independently reviewable against its own Definition of Done**, without needing to understand any other agent's internals.
- **Mismatches between agents are integration bugs, not license to freelance** — report and attribute, don't silently patch around.

---

## 6. Current Milestone & What's Still Out of Scope

**Galactic Map verification is complete.** Agent 25 audited the existing Phase 3 (trade layer) + Phase 5 (travel layer) map against the four decided properties (`docs/profitable-map-gdd.md` Section 2); Agent 26 confirmed the milestone's own Definition of Done is met — the milestone's job was "verify and report," not "make everything perfect," and that verification is done. Two properties passed cleanly (no staleness; no scanner/probe code exists). Two surfaced **real, attributed bugs in the underlying Phase 3/5 implementation** — not new Galactic Map scope, and not fixed by this milestone per its own "report, don't patch" rule:

1. ~~Seasons and emergencies were never implemented~~ — **fixed.** `src/trading/season.ts`/`emergency.ts` (pure, zero persisted state) now feed `TradeMapScene`'s classification alongside baseline drift. Live-verified, including an emergency's larger premium correctly overriding its own planet's milder season discount on the same category. See `src/trading/README.md`'s and `src/presentation/README.md`'s "Galactic Map bug fix" notes.
2. ~~Discovery is never extended by travel~~ — **fixed.** `galaxyState.ts` now persists a `discoveredPlanetIds` side-table and marks a planet discovered on every successful `resolveArrival()`, verified to survive a real page reload. See `src/presentation/README.md`'s "Galactic Map bug fix" note.
3. ~~`TradeMapScene` and the shared nav bar both overflow the 800×500 canvas~~ — **fixed.** `scenes/nav.ts` now wraps to a second row instead of running off the canvas edge; `TradeMapScene.ts`'s content now renders inside a mask-clipped, mouse-wheel-scrollable container, with interactive buttons correctly disabled while scrolled out of view. Live-verified: nav wraps, scrolling reveals previously-unreachable content. See `src/presentation/README.md`'s "Galactic Map bug fix" note.

Full evidence and per-property detail: `docs/profitable-map-gdd.md` Sections 6-7. **All three items originally carried forward are now fixed** — nothing outstanding remains from the Galactic Map verification pass.

**No further phase is currently planned beyond this.** The originally-scoped development order (galaxy → planets → resources → crafting → trading → crew → ships/travel → galactic map) is now fully built and verified, with zero known open bugs.

**Still explicitly out of scope:**

- The four recorded-but-deferred map ideas (emergency advance warning, map staleness, a scanner/probe mechanic, a new galaxy-wide view) — until a real need for one emerges
- Encounters during travel, combat, and any travel-hazard mechanic (deferred; intended shape recorded in the design doc, not built)
- Multiplayer (planned future evolution, single-player only for now)

---

## 7. Reference Documents

- `docs/profitable-design-questions.md` — full design rationale, every decision and why, plus remaining open questions split into "Must Be Answered for MVP" (currently empty — all resolved) and "Can Wait Until After MVP."
- `docs/profitable-mvp-gdd.md` — the MVP Game Design Document (this file's source for Sections 3 and 4 above).
- `docs/agents/README.md` — agent contract index and cross-cutting rules in full.
- `docs/agents/agent-0[1-7]-*.md` — individual agent contracts.
