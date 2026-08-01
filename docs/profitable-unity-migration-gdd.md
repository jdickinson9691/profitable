# Profitable — Unity Migration Game Design Document

Status: scope locked, Migration Phase 1 roster ready to build. This is the moment the original tech-stack decision's trigger condition ("once the core loop is fun and the systems are locked") was built around — see `profitable-design-questions.md`'s Engine/Systems Architecture section for the original reasoning. This document does not reopen any game-design decision; it governs *how* the already-locked design moves to a new engine, not *what* the design is.

---

## 1. Scope & the Port-vs-Rewrite Line

The simulation/presentation separation (`CLAUDE.md`'s architectural mandate, held since the MVP) exists specifically to make this moment cheap. Confirmed split:

| Layer | Treatment | Why |
|---|---|---|
| **Simulation core** (Agents 2, 8, 11, 16, 20 + every amendment) | **Port** — translate faithfully, don't redesign | Pure functions, zero framework dependencies, exhaustively documented in `profitable-design-questions.md`. This is the layer the architecture was built to protect. |
| **Data schemas** (Agent 1 + every amendment) | **Port with translation** | TypeScript types/JSON schemas → C# classes. Shape changes (language idiom), meaning doesn't. |
| **Content** (the 60-item/39-recipe roster, tuning values) | **Reuse as-is** | The existing JSON content files are consumed directly by a new C# loader — not re-authored in a Unity-native format. No reason to duplicate content that already exists and is already validated. |
| **Infrastructure adapters** (Agent 4: `SaveSystem`, `AudioManager`) | **Swap implementation, keep the interface** | Same pattern already proven with the Electron `SaveSystem` swap — Unity gets its own concrete implementation (file I/O or `PlayerPrefs`, Unity's audio system) behind the same interface contract. |
| **Presentation** (Agents 5, 13, 18, 22 + every amendment, including the debug/tuning panel) | **Full rewrite** | Every Phaser scene becomes a real Unity scene. Nothing here ports mechanically — this is genuinely new work. |

**The web/Electron build stays live and deployable throughout.** This is not a cutover — the existing build continues to exist as a working alpha while Unity migration proceeds in parallel, the same way Phase 2 didn't retire the MVP.

**Unity MCP** is the tooling used to build this migration (Editor-driven work via MCP tools, not hand-edited scene/prefab files) — not itself a deliverable of any migration phase.

## 2. Migration Sequencing

Mirrors the original build order exactly — prove the core loop first, then work outward the same way the game itself was built:

**Migration Phase 1 (this document's roster): MVP core loop.** Port `rollQuality`, `getTierColor`, `refine`, `craft`, `loadContent` + Agent 1's base schema. Build minimal Unity presentation for gather/refine/craft. Prove numeric parity against the existing TypeScript test suite before anything else proceeds.

**Migration Phase 2+ (future GDDs, not scoped here):** Galaxy/Planets → Trading → Crew → Ships/Travel → the four deferred gaps (Map, Travel Encounters, Scanner, Combat), each following the same port-simulation/rewrite-presentation split, each requiring its own parity proof against its own existing test suite before moving to the next.

**Infrastructure adapters can start in parallel with Phase 1**, same as their original build — they don't block or depend on simulation-core porting.

## 3. The Critical Risk: Integer-Boundary-vs-Fractional-Input Bugs

**This is the single most important thing for every porting agent to internalize before writing any C# code.** Two structurally identical bugs were found in the TypeScript codebase — `getTierColor()`'s boundary comparison and `penaltyCurve.ts`'s band lookup — both live since the same commit day (July 25), both caused by comparing a fractional real-world value (an average of qualities, a forgiveness-scaled points-below-threshold) against integer-only boundary logic. Both were caught late, by accident, because narrow/symmetric test inputs happened to avoid the gaps for months.

**This is a genuine re-infection risk during porting**, not just historical trivia: a literal, careless translation from JavaScript to C# could either (a) correctly preserve the *already-fixed* comparison logic, or (b) subtly reintroduce the bug if someone "cleans up" or re-derives the comparison during translation without understanding why the current fix looks the way it does.

**Hard rule for every porting agent:** port the **current, already-fixed** state of `tierColor.ts` and `penaltyCurve.ts` exactly, and the new C# test suite must include the **exact same fractional-boundary test cases** already proven necessary in the TypeScript suite (`fractionalGapCases`, the 23-combination `penaltyCurve` regression set) — not just "does the happy path work," the specific gap-boundary values that caused real crashes.

## 4. New/Ported Data Shapes

No new *design* — this section just names the translation targets:

- `Resource`, `Recipe`, `Schematic`, `TierColor`, `QualityRoll` (Agent 1's base types) → C# classes/structs.
- The existing JSON content files (resources, recipes, schematics) → consumed by a new C# `ContentLoader`, not re-expressed as ScriptableObjects unless a later phase finds a concrete reason to.
- `SaveSystem`/`AudioManager` interfaces → C# interfaces, with Unity-specific concrete implementations.

## 5. AI Agent Development Plan — Migration Phase 1

Same contract pattern as every prior phase. Continuing the sequential agent numbering.

**Numbering note:** this roster was originally drafted as Agents 30-35, on the assumption that Agent 29 (Combat Confirmation) was the last agent number used. That assumption was stale by the time this roster was actually started: Agent 30 was already claimed by `agent-30-alpha-content-confirmation.md` (the Alpha Content Authoring milestone's confirmation agent, completed after Combat but not accounted for when this GDD was first drafted). Renumbered 31-36 below to resolve the collision — see `agent-31-unity-data-schema.md`'s own numbering note for the same history.

### 5.1 Roster & Creation Order

**Agent 31: Unity Data Schema.** Ports Agent 1's base types to C#. Writes the `ContentLoader` that consumes the existing JSON content files as-is. Created first.

**Agent 32: Unity Simulation Core.** Ports `rollQuality`, `getTierColor`, `refine`, `craft`, `loadContent` from Agent 2's TypeScript implementation to C#, exactly — including the already-fixed boundary logic from Section 3. Depends on Agent 31.

**Agent 33: Unity Parity Validation.** The most important agent in this phase. Proves the C# port produces numerically identical output to the existing TypeScript implementation for the same inputs — not just "the C# code passes its own tests," but "the C# code agrees with the TypeScript code." Created alongside Agent 32, runs continuously.

**Agent 34: Unity Infrastructure Adapters.** Ports `SaveSystem`/`AudioManager` interfaces and their Unity-specific implementations (file I/O or `PlayerPrefs`, Unity audio). Independent of 32/33 — can run in parallel.

**Agent 35: Unity MVP Presentation.** Builds minimal Unity scenes for gather/refine/craft, calling Agent 32's ported functions — no simulation logic in scene code, same rule as every Phaser presentation agent before it. Depends on Agent 32 and Agent 34.

**Agent 36: Unity Migration Phase 1 Integration.** Wires everything together, verifies the full gather→refine→craft loop works in Unity, and confirms Agent 33's parity proof holds end-to-end, not just per-function. Created last.

### 5.2 Agent Contracts

Full individual contracts to be written as `docs/agents/agent-31-unity-data-schema.md` through `agent-36-unity-migration-phase1-integration.md`, following the same structure (Responsibility/Inputs/Outputs/Must-Not-Do/Testing/Definition-of-Done) as every prior agent contract.

## 6. Cross-Cutting Rules

Same discipline as every prior phase (see `docs/agents/README.md`), plus rules specific to migration work:

- **The master rule: numeric parity is non-negotiable.** Every ported function must be proven to produce the same output as its TypeScript counterpart for the same inputs, via Agent 32's explicit comparison testing — not assumed from "the C# code looks like a correct translation."
- **No agent uses porting as an opportunity to change game behavior.** If a C# translation reveals what looks like a design improvement, that's a design conversation to have explicitly, not a change to make silently mid-port. The design is locked; only its host language is changing.
- **No agent re-derives already-fixed logic from scratch.** Section 3's boundary-comparison rule applies to every ported formula, not just the two functions where it was originally found — any comparison against a table/breakpoint/threshold must be checked for the same fractional-gap risk during porting, even if the original TypeScript version never exhibited the bug (it may simply not have been tested with a value that would trigger it).
- **Content is reused, never re-authored**, per Section 1's table — a porting agent finding it's "easier" to hand-write new content data in C# should stop and report that instead of doing it.
- **The existing web/Electron build is not modified by migration work** — this is new, additive work in a separate Unity project, not a change to the shipping alpha.
