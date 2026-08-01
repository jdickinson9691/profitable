# Agent 32: Unity Simulation Core Agent

**Creation order:** Second in Migration Phase 1. Depends on Agent 31 (Unity Data Schema). Agent 33 (Unity Parity Validation) is created alongside this agent and runs continuously against it, same pattern as the original Agent 2/Agent 3 relationship.

## Responsibility

Port the actual formula logic (Agent 2's `docs/agents/agent-02-simulation-core.md`) to C#: quality-roll generation, the refining formula, and the crafting formula — exactly, including the already-fixed integer-boundary-vs-fractional-input logic (`profitable-unity-migration-gdd.md` Section 3). This is the most consequential agent in the migration, same as Agent 2 was in the original build: it is the layer a future engine swap (if one is ever needed again) would need to survive untouched.

**Scope correction — `loadContent` is not part of this agent.** Agent 2's original TypeScript roster does include `loadContent()` (it lives in `src/simulation/loadContent.ts`, alongside the formula functions), and the migration GDD's Section 5.1 draft originally copied that into this agent's line too. That was redundant: Agent 31 already delivered the C# equivalent (`ContentLoader`, in `Profitable.Core.Content`) as part of its own Outputs Section 4. This agent covers `rollQuality`, `getTierColor`, `refine`, and `craft` only.

## Inputs

- `docs/agents/agent-02-simulation-core.md` — the original contract this agent ports.
- `docs/profitable-unity-migration-gdd.md` Section 3 — the integer-boundary-vs-fractional-input bug class, directly relevant here: `getTierColor()` and `getPenaltyMultiplier()` (called from within `craft()`) are the exact two functions that bug was found in.
- The current TypeScript source, in full (not an MVP-only subset this time — these are the actual live, already-bug-fixed formulas, not schema data):
  - `src/simulation/clamp.ts`, `tierColor.ts`, `tierVariance.ts`, `refundChance.ts`, `schematicTier.ts`, `penaltyCurve.ts`, `rollQuality.ts`, `refine.ts`, `craft.ts`.
  - Supporting types not yet ported by Agent 31: `src/data/types/resourceInstance.ts`, `refineResult.ts`, `craftResult.ts`, `random.ts` (see Outputs Section 1 — necessary completions).
  - Test fixtures/cases for parity: `tests/simulation/rollQuality.test.ts`, `refine.test.ts`, `craft.test.ts`, `penaltyCurve.test.ts`, `tests/fixtures/{resources,instances,random,recipes}.ts`.

## Outputs

### 1. Necessary Schema completions (added to `Profitable.Core.Schema`, not this agent's own namespace)

Four TypeScript types under `src/data/types/` are hard dependencies of the functions this agent ports, but were not among Agent 31's MVP-scope types (they are inputs/outputs of Agent 2's *functions*, not Agent 1's originally-named schema types). Same "necessary completion" pattern already established twice in this project's history (`RefiningRecipe` and `loadContent()` itself, both added mid-build to close a contract gap) — documented here rather than silently made, per that precedent:
- `ResourceInstance`: `Resource`, `Quantity` (int), `Qualities` (`QualityMap`) — what `refine()`/`craft()` actually consume.
- `RefineResult`: `Qualities` (`QualityMap`), `OutputTier` (`TierColor`), `RefundUnits` (int).
- `CraftResult`: ported as a small sealed class hierarchy (`CraftAccepted`/`CraftRejected` subclasses of an abstract `CraftResult`), not a single class with a nullable reason field — preserves the TypeScript discriminated union's "you must check which case you have" property, an idiomatic C# equivalent per the migration GDD Section 4's "shape changes, meaning doesn't" rule.
- `RandomFn`: a `delegate double RandomFn()`, matching `type RandomFn = () => number`.

These belong in `Profitable.Core.Schema`, not `Profitable.Core.Simulation`, mirroring where the TypeScript source itself places them (`data/types/`, not `simulation/`) — a data shape doesn't become simulation logic just because this agent is the one that needed it first.

### 2. `Profitable.Core.Simulation` namespace

- `GetTierColor(double value): TierColor` — the already-fixed `value >= min && value < max + 1` boundary check (not `value <= max`), ported exactly. Throws on out-of-range input, matching the TypeScript `RangeError`.
- `GetTierVariance`, `GetRefundChance`, `GetSchematicTierContribution` — simple lookups against Agent 31's constant tables, ported for parity with the TypeScript source's own separate lookup functions (`tierVariance.ts`, `refundChance.ts`, `schematicTier.ts`).
- `GetPenaltyMultiplier(double pointsBelow): double` — the already-fixed band-matching logic from `penaltyCurve.ts`, including its asymmetric handling of the `{0,0}` band (see that file's own extensive comment, ported verbatim as a code comment here too — the reasoning is load-bearing, not decorative).
- `RollQuality(Resource, RandomFn?): QualityMap` — one rolled integer 1-100 per applicable quality, `null` (never `0`) per inapplicable one.
- `ComputeBaseAverages(IReadOnlyList<ResourceInstance>): QualityAverageMap` — quantity-weighted straight average per quality, excluding (not zero-padding) inputs where that quality is `null`. Returns a **new type**, `QualityAverageMap` (`Dictionary<Quality, double?>`), not `QualityMap` (`Dictionary<Quality, int?>`) — see Must NOT Do for why this distinction is load-bearing, not stylistic.
- `Refine(IReadOnlyList<ResourceInstance>, TierColor, RandomFn?): RefineResult` — base average → asymmetric variance roll → clamp/round to final `QualityMap`, output tier derived from the final values' own straight average (not the inputs' tier), refund roll per consumed unit keyed to that output tier.
- `Craft(IReadOnlyList<ResourceInstance>, Recipe, TierColor schematicTier, TierColor crafterTier, RandomFn?): CraftResult` — ceiling raise (crafter + schematic, capped at `CombinedCeilingCap`) → variance roll narrowed toward zero → threshold penalty applied **last**, softened by schematic forgiveness, with 41+ points below producing `CraftRejected` before any rounding happens.

### 3. A rounding-semantics fix, found during porting (not present in the original TypeScript)

**JavaScript's `Math.round()` and C#'s default `Math.Round()` disagree on exact `.5` values.** JS rounds half-values up (toward `+Infinity`) unconditionally; C#'s `Math.Round(double)` defaults to banker's rounding (round-half-to-even) unless told otherwise. Every quality value in this domain is positive (1-100 range), so for this domain specifically, JS's behavior is equivalent to "round half away from zero." Every `Math.Round()` call in this agent's ported code must pass `MidpointRounding.AwayFromZero` explicitly to match — an un-annotated `Math.Round()` call would silently produce a different result than the TypeScript source on any variance/ceiling roll that happens to land on an exact `.5` boundary. This is a new risk class this porting pass found, not one the migration GDD's Section 3 already named (that section covers comparison-operator boundary gaps, not rounding-mode differences) — worth calling out explicitly for whichever agent eventually writes `docs/profitable-unity-migration-gdd.md`'s own retrospective, since it's exactly the kind of "looks like a correct translation but silently isn't" gap Section 3 warns about in general.

## Must NOT Do

- Must not implement `loadContent`/`ContentLoader` — Agent 31's completed responsibility (see Responsibility's scope correction above).
- Must not implement rendering, input handling, save/load, or audio, or reference the Unity Editor/engine APIs at all — same "zero framework dependency" rule as Agent 2's original contract, and this agent's own output must keep building via `dotnet build`/`dotnet test` alone.
- Must not hardcode any constant already defined by Agent 31 — always read from `Profitable.Core.Constants`.
- Must not silently treat a `null` quality as `0` anywhere in the formulas — correctness-critical, not a style preference, same as Agent 2's own rule.
- **Must not round `ComputeBaseAverages`'s output or `Craft`'s `preThreshold` intermediate values to `int` before their final use.** The TypeScript source's own type annotations (`QualityMap`/`QualityRoll`, nominally "integer or null") are technically loose here — `computeBaseAverages()` and `craft()`'s `preThreshold` both actually hold fractional values at those intermediate stages (a straight average, and a ceiling-raised-then-variance-rolled value), only rounded at the point each function's *final* result is produced. A literal port that took the TypeScript type names at face value and rounded early would silently change the computed result (rounding before the variance roll is applied, rather than after) — a real behavior bug, not a type-strictness nitpick. `QualityAverageMap` (`Dictionary<Quality, double?>`) exists specifically to make this distinction impossible to lose in translation.
- Must not re-derive `getTierColor()`'s or `getPenaltyMultiplier()`'s boundary logic from GDD prose instead of the current TypeScript source — these are the exact two functions the integer-boundary-vs-fractional-input bug was found in, named explicitly in the migration GDD's own Section 3 warning.

## Testing Requirements

- Unit tests (xUnit) mirroring `tests/simulation/rollQuality.test.ts`, `refine.test.ts`, `craft.test.ts`, and `penaltyCurve.test.ts` case-for-case: the same hand-calculated values, the same `queueRandom`-equivalent deterministic `RandomFn` injection pattern (a small `QueueRandom(params double[] values)` test helper), and the same regression cases (the Blue-schematic/12-points-below craft that used to crash in the TypeScript source; the four fractional-gap zones in `getPenaltyMultiplier`; the near-zero-forgiveness cases proving forgiveness softens but never erases a real violation).
- A test proving the rounding-semantics fix actually matters: a case constructed so an intermediate value lands on an exact `.5` boundary, asserting the `AwayFromZero`-rounded result matches what JS `Math.round()` would produce (not what unannotated C# `Math.Round()` would produce) — this is the one behavior in this agent that has no TypeScript equivalent to diff against line-by-line, so it needs its own explicit proof.
- `TIER_VARIANCE`/`REFUND_CHANCE`/`SCHEMATIC_TIER_CONTRIBUTION` comparison tests already exist from Agent 31 (`ProfitableCore.Tests/Constants/`) — this agent's tests exercise the *lookup functions* (`GetTierVariance` etc.) against those already-verified tables, not the table values themselves again.

## Definition of Done

- `RollQuality`, `GetTierColor`, `Refine`, `Craft` (plus their supporting lookups) are implemented exactly per the current TypeScript source, not GDD Sections 3.2-3.3's prose directly (the TypeScript source is one step closer to ground truth, having already absorbed two real bug fixes prose alone wouldn't show).
- Given the MVP content fixtures (Igneous Ore, Hydrogen Gas, Autunite Crystal, Radiant Alloy Bar, Ion-Forged Hull Plate), all functions run correctly end-to-end with no unhandled `null` cases, matching `tests/simulation/craft.test.ts`'s own end-to-end hand-calculated case.
- `dotnet test` passes with zero failures, and a reviewer can compare each test directly against its named TypeScript counterpart.
- Zero imports from any rendering, DOM, browser-API, or Unity Editor/engine library anywhere in this agent's files.
- No later Phase 1 agent (33-36) should need to hardcode a formula constant or re-derive a shape that belongs here — if they do, this agent's output is incomplete.
