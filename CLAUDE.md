# CLAUDE.md — Profitable

This is the root reference for Claude Code (or any agent) working in this repository. It summarizes the locked design, the architecture, and the AI agent plan that governs how this codebase gets built. Full rationale for every decision below lives in `docs/profitable-design-questions.md`; the build plan lives in `docs/profitable-mvp-gdd.md`; per-agent contracts live in `docs/agents/`.

**Read this file first in any session.** If you're about to implement a formula, add a data shape, or wire a scene together, check the relevant agent contract in `docs/agents/` before writing code — it defines exactly what you may and may not touch.

---

## 1. Project Overview

**Profitable** is a game systems engine: resource gathering → refining → crafting → trading. Every item (raw, refined, or crafted) carries the same 5 numeric qualities. Quality flows through refining and crafting via shared formulas, ultimately feeding a trading market across raw resources, refined resources, recipes/schematics, and crafted items.

**This is a specific implementation for one game, not a reusable engine/framework.** Single-player for the initial build; multiplayer (shared economy or otherwise) is a planned future evolution, not in current scope.

**Current phase: Alpha** — all four deferred-gaps design work is complete (Travel Encounters, Scanner/Probe, Combat all implemented and verified; Multiplayer's design is fully resolved but its implementation is deliberately deferred until the project moves toward being an app — see `profitable-design-questions.md`'s Multiplayer section). The project has pivoted to turning the verified proof-of-concept into a first-playable alpha. See Section 6 below and `docs/product-alpha.md` for the active checklist.

**Original development order (fully complete):**
galaxy generation → planet generation → resource generation → crafting recipes/schematics → trading loop → crafters (NPC crew) → ships → travel → galactic map.

**Deferred-gaps sequence (all resolved):**
~~Scanner~~ (deferred, picked up second) → **Travel Encounters (complete)** → **Scanner (complete)** → **Combat (complete)** → **Multiplayer (design complete, implementation deferred)**.

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
  - **Tiers 3–7 (crafted):** the 5 qualities **aggregate into a single overall color tier** via a **straight average** (formally locked 2026-07-29, see `profitable-design-questions.md`'s Resources & 5 Qualities section — matches ship tier and market listing tier, which already used this formula), used for at-a-glance rarity and to help drive sell value.

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

**Travel Encounters (Non-Combat) is complete and verified.** Full scope, decisions, and agent contracts live in `docs/profitable-travel-encounters-gdd.md` (Section 6 holds the Agent 27 confirmation) and `docs/agents/agent-01-amendment-travel-encounters-schema.md`, `agent-20-amendment-travel-encounters-core.md`, `agent-21-amendment-travel-encounters-test.md`, `agent-22-amendment-travel-encounters-presentation.md`, `agent-27-travel-encounters-confirmation.md`.

**Scanner/Probe is complete and verified.** Full scope, decisions, and agent contracts live in `docs/profitable-scanner-gdd.md` (Section 6 holds the Agent 28 confirmation) and `docs/agents/agent-01-amendment-scanner-schema.md`, `agent-20-amendment-scanner-core.md`, `agent-21-amendment-scanner-test.md`, `agent-22-amendment-scanner-presentation.md`, `agent-28-scanner-confirmation.md`. Both milestones used the same "amendments to existing agents (1, 20, 21, 22), not new Core/Presentation/Content agents" pattern.

The Galactic Map verification milestone is complete — all three bugs found (seasons/emergencies never built, discovery-by-travel not wired up, canvas/nav overflow) are fixed and re-verified. Full detail in `docs/profitable-map-gdd.md` Section 7.

**Combat is complete and verified.** Full scope, decisions, and agent contracts live in `docs/profitable-combat-gdd.md` (Section 6 holds the Agent 29 confirmation) and `docs/agents/agent-01-amendment-combat-schema.md`, `agent-20-amendment-combat-core.md`, `agent-21-amendment-combat-test.md`, `agent-22-amendment-combat-presentation.md`, `agent-29-combat-confirmation.md`. Same "amendments to existing agents (1, 20, 21, 22), not new Core/Presentation/Content agents" pattern as Travel Encounters/Scanner — Combat's own twist is this codebase's first pending/deferred-resolution mechanic (a combat encounter is detected and reported as `pending`, then resolves later via a separate explicit attack/flee choice); read GDD Section 1 before touching this milestone. One non-blocking follow-up noted in the Agent 29 confirmation: `resolveArrival.test.ts`'s two Combat-detection tests don't also assert `resolved`/`updatedShip`/`cargo`/`destinationPlanetId` in a scenario where combat actually triggers (the behavior itself is independently confirmed correct — this is a test-coverage gap, not a functional defect).

**Multiplayer's design pass is complete** (see `profitable-design-questions.md`'s Multiplayer section): asynchronous, market-and-leaderboard-only scope, no shared real-time presence. Two channels of player interaction: a Universe layer (private per-player galaxies report anonymized aggregate trade signal to a backend, which computes a per-item universal price modifier feeding into the existing `getGlobalPrice()`) and identity-attached leaderboards (net worth, trading volume, highest crafted tier at launch). This is the first system in the project requiring an actual backend. **Implementation is deliberately deferred** to when the project moves toward being an app rather than purely web-driven — roughly aligned with Electron packaging (Section 5 of the alpha plan). Building the Universe backend and any Unity migration are orthogonal decisions.

**Active now: Alpha.** With all four deferred gaps resolved (three built, Multiplayer designed-but-deferred), the project pivoted to turning the verified proof-of-concept into a first-playable alpha rather than building Multiplayer's backend immediately. Full plan lives in `docs/product-alpha-plan.md` (rationale) and `docs/product-alpha.md` (the trackable checklist), with detail docs `docs/profitable-alpha-tuning-values.md`, `docs/profitable-alpha-scale-performance-plan.md`, `docs/profitable-alpha-uiux-onboarding-plan.md`, and `docs/profitable-alpha-electron-plan.md`. Five sections, sequenced (each depends on the one before): **1. Content Authoring** (21 resources, 10 refining recipes, 13 crafting recipes, 16 ship component recipes, schematics, crew professions, ship-build presets — current content set is only the original MVP/milestone placeholders, nowhere near enough to actually play) → **2. Balance Tuning** (every numeric value is a functionally-correct placeholder, never tuned through real play) → **3. Scale & Performance** (fix galaxy at 50 planets, verify map/travel rendering and `getGlobalPrice()` performance at that scale) → **4. UI/UX & Onboarding** (skippable tutorial flow, settings screen, debug/tuning panel, tier-color legibility pass) → **5. Electron Packaging** (wrap the existing Vite/Phaser build, swap `SaveSystem` to filesystem access, package for Windows/macOS). Electron packaging's last item is a deliberate decision point: whether to begin Multiplayer backend work once the app-conversion milestone is reached, or keep deferring it.

**Still explicitly out of scope:**

- The Galactic Map's two still-undecided recorded ideas (emergency advance warning, a new galaxy-wide/zoom-out view) — the other two (map data staleness, a scanner/probe mechanic) are resolved: staleness was confirmed a non-issue during map verification, and Scanner/Probe is now built
- Multi-round/real-time combat, any UI beyond a binary attack/flee choice, and any permanent ship/crew loss — all explicitly ruled out by the Combat GDD itself and confirmed absent by Agent 29 (component damage and crew unavailability are both temporary, not destruction/removal)
- Multiplayer's actual implementation (design complete per above, but deliberately unbuilt for now; also the groundwork already laid throughout — trade attribution, self-trade prevention, timestamp-not-duration for background crafting — exists specifically for when this milestone arrives)
- Any Unity migration work, and any new gameplay system beyond what's already designed — alpha is about making the *existing* design playable, not extending it

---

## 7. Reference Documents

- `docs/profitable-design-questions.md` — full design rationale for every decision across the entire project, including the deferred-gaps sections (Travel Encounters, Scanner/Probe, Combat, and Multiplayer — all design-resolved; Multiplayer's implementation is deliberately deferred).
- `docs/profitable-mvp-gdd.md` — MVP (resource/refine/craft core loop). Complete.
- `docs/profitable-phase2-gdd.md` — Galaxy & Planet Generation. Complete.
- `docs/profitable-phase3-gdd.md` — Trading Loop. Complete (seasons/emergencies gap closed during Galactic Map verification).
- `docs/profitable-phase4-gdd.md` — Crew Crafters. Complete.
- `docs/profitable-phase5-gdd.md` — Ships & Travel. Complete.
- `docs/profitable-map-gdd.md` — Galactic Map verification. Complete; Section 7 holds the full bug report from this milestone.
- `docs/profitable-travel-encounters-gdd.md` — Travel Encounters (Non-Combat). Complete.
- `docs/profitable-scanner-gdd.md` — Scanner/Probe. Complete.
- `docs/profitable-combat-gdd.md` — Combat. Complete; Section 6 holds the Agent 29 confirmation.
- `docs/agents/README.md` — agent contract index and cross-cutting rules in full, including the boundary rules each phase has added.
- `docs/agents/agent-*.md` — individual agent contracts; numbering and amendment relationships are explained in `README.md`.
- `docs/product-alpha-plan.md` — rationale and recommendations behind the alpha checklist (content volume, tuning approach, scale targets, UI/UX scope, packaging plan, suggested sequencing).
- `docs/product-alpha.md` — the trackable alpha checklist itself (5 sections); current active work.
- `docs/profitable-alpha-tuning-values.md`, `docs/profitable-alpha-scale-performance-plan.md`, `docs/profitable-alpha-uiux-onboarding-plan.md`, `docs/profitable-alpha-electron-plan.md` — detail docs for alpha Sections 2-5 respectively.
