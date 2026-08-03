# Agent 40: Unity Galaxy/Planet Parity Validation Agent

**Creation order:** Third in Migration Phase 2, Sub-Phase A. Created alongside Agent 39 (Unity Galaxy/Planet Simulation Core) and runs continuously against it, same pattern as Agent 32/33's original relationship and Agent 33's own Migration Phase 1 precedent.

## Responsibility

Prove Agent 39's C# port produces numerically identical output to the current TypeScript implementation for the same inputs — not "the C# code passes its own tests," but "the C# code agrees with the TypeScript code," exactly Agent 33's own standard restated for Sub-Phase A's scope. This is the strongest verification this migration performs: it exercises `SeededRandom`, `PlanetGenerator`, `ResourceSubsetSelector`, `PlanetQualityRoller`, and `PlanetResourceCycle` together, end-to-end, against the real content catalog — not each function in isolation.

## Inputs

- `docs/agents/agent-33-unity-parity-validation.md` — the original harness/comparison pattern this agent extends, not re-invents (`scripts/parityHarness.ts` generates a corpus from the real TypeScript functions; `ProfitableCore.Tests/Parity/*.cs` re-runs it through the C# port and asserts equality).
- The real, current content catalog (`content/resources.json` and siblings, already copied into `ProfitableCore.Tests/Fixtures/` by Agent 31 and confirmed byte-identical this pass) — used directly, not a synthetic 4-resource fixture set, so the `ItemTier == 1` eligibility bug-fix gets genuine coverage against all 60 real resources, not a toy catalog too small to exercise it.
- Agent 39's own output (`Profitable.Core.Simulation.GalaxyGenerator`/`PlanetGenerator`/`ResourceSubsetSelector`/`PlanetQualityRoller`/`PlanetResourceCycle`).

## Outputs

### 1. Extended `scripts/parityHarness.ts`

Three new corpus sections, generated via the REAL `generateGalaxy()`/`generateResourcesForCycle()`/`getCurrentPlanetResources()` against the real content catalog (loaded via `loadContent()`, not the harness's existing small fixture set):
- `galaxyCases` — 3 seeds × 2 planet counts (5 and 50, the latter matching real alpha-scale), each capturing the full serialized `Galaxy` (every planet's id/name/type/tier/position/producible ids/specialty/resource qualities/discovered flag).
- `planetResourceCycleCases` — 3 (seed, tier, planetType) subjects × 4 cycle indices each (0, 1, 2, and a distant 41), proving both within-cycle determinism and real cross-cycle divergence.
- `gcprCases` — 5 `getCurrentPlanetResources()` scenarios: below/at/above the colonist threshold, and the starting-planet tutorial guarantee at cycle 0 and cycle 3 (not just cycle 0 — `planet.md`'s own flagged testing requirement that the tutorial guarantee's idempotency claim needs a real multi-cycle proof).

Unlike the existing `rollQualityCases`/`refineCases`/`craftCases` (which record a `RandomFn`'s exact recorded sequence and replay it), these three sections record only the **seed string** and **real content** — matching how `generateGalaxy()` et al. actually take a seed, not an injected `RandomFn`, as their entry point. The comparison proves the entire `SeededRandom → PlanetGenerator → ResourceSubsetSelector → PlanetQualityRoller` chain agrees, not one function replayed with pre-recorded numbers.

### 2. Extended `ProfitableCore.Tests/Parity/ParityCorpus.cs`

New deserialization types: `GalaxyCase`/`ExpectedGalaxy`/`SerializedPlanet`/`SerializedPosition`, `PlanetResourceCycleCase`/`ExpectedResourcesForCycle`, `GcprCase`. `SerializedPlanet` includes `ColonistCount` (needed to reconstruct a `Planet` for the `gcpr` cases' colonist-gate scenarios) even though it isn't part of Agent 38's originally-listed serialization fields — a necessary completion, same class as this whole migration's repeated "found missing, added, documented" pattern.

### 3. `ProfitableCore.Tests/Parity/GalaxyPlanetParityTests.cs`

Three `[Theory]`/`[MemberData]` test methods (`GenerateGalaxyMatchesTypeScript`, `GenerateResourcesForCycleMatchesTypeScript`, `GetCurrentPlanetResourcesMatchesTypeScript`), each reading the corpus and asserting field-for-field equality — including `AssertResourceQualitiesMatch`'s explicit key-set comparison (`Assert.Equal(expected.Keys.OrderBy(...), actual.Keys.OrderBy(...))`) before comparing individual quality maps, so a resource silently missing from one side's output fails loudly rather than the loop simply not iterating it.

## Must NOT Do

- Must not accept Agent 39's own unit tests passing as a substitute for this comparison — parity is proving the C# and TypeScript *agree*, not that the C# is merely self-consistent, exactly Agent 33's own restated rule.
- Must not generate the corpus against a synthetic/toy resource catalog — must use the real `content/*.json` files (via the already-verified-not-stale `Fixtures/` copies), so the `ItemTier`-based eligibility fix and the real 4-planet-type distribution both get genuine exercise.
- Must not record a `RandomFn` sequence for the three new sections the way the existing sections do — `generateGalaxy()`/`generateResourcesForCycle()`/`getCurrentPlanetResources()` take a seed string, not an injected `RandomFn`; recording anything else would test a different (weaker) claim than "the same seed produces the same result end-to-end."
- Must not re-derive the expected values from GDD prose or hand-calculation — every expected value in the corpus comes directly from running the real, current TypeScript functions, per this whole migration's Section 3 discipline.

## Testing Requirements

- All 23 new corpus cases pass: 6 `galaxyCases` (including both galaxy sizes), 12 `planetResourceCycleCases` (proving cross-cycle divergence: cycle 0 vs. 1 vs. 2 vs. 41 for the same seed/tier/type produce different resource qualities), 5 `gcprCases` (colonist gate at 3 boundary positions, tutorial guarantee at 2 different cycles).
- Regenerating the corpus (`npm run parity`) and re-running `dotnet test` reproduces the same pass result — confirms the comparison isn't coincidentally tied to one specific corpus snapshot.

## Definition of Done

- `dotnet test` passes with zero failures across all 541 tests (504 from Migration Phase 1 + 37 from Sub-Phase A: 23 parity + 14 direct unit tests), and a reviewer can regenerate the corpus and re-run to reproduce the same result independently.
- Every Sub-Phase A Simulation Core function (Agent 39) has at least one real-content parity case exercising it, not just isolated hand-picked unit-test inputs.
- No later Sub-Phase A agent (41-42, Presentation/Integration) should discover a numeric disagreement between the C# and TypeScript implementations this agent's corpus should have already caught.
