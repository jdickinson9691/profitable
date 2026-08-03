# Agent 38: Unity Galaxy/Planet Schema Agent

**Creation order:** First in Migration Phase 2, Sub-Phase A (Galaxy, Planet, Mining). Depends on Agent 31 (Unity Data Schema — the MVP-scope `Planet`/`Resource`/`TierColor` this agent extends). Every other Sub-Phase A agent (39-42) depends on this agent's output. See `docs/unity-migration-phase2-checklist.md` Sub-Phase A for how this fits into Migration Phase 2 as a whole.

**Numbering note:** the highest `docs/agents/*.md` number was re-checked fresh immediately before this file was created (37, claimed by Planet Ownership Core) — per `docs/functional-agents/build.md`'s own "never trust a cached snapshot" rule — so this roster starts at 38, not any previously-assumed number.

## Responsibility

Extend Agent 31's MVP-scope `Planet` type and add the galaxy/planet-generation constant tables the current TypeScript codebase has accumulated since Phase 1 (`galaxy.md`/`planet.md`, consolidated in `docs/functional-agents/`) — the same "translate faithfully, don't redesign" rule that governed Agent 31 (`profitable-unity-migration-gdd.md` Section 1). This agent produces the shared vocabulary Agent 39 (Simulation Core) builds against.

**Scope is Sub-Phase A only.** `colonistCount`/`citadelLevel`/`ownedByPlayerId` are schema'd here (they live on the same `Planet` type) even though the *behavior* that sets and reads most of them belongs to Sub-Phase E (Planet Ownership) — per `docs/unity-migration-phase2-checklist.md`'s own note, this avoids Sub-Phase E needing to reopen `Planet.cs` later. The one exception: `MINIMUM_COLONISTS_TO_PRODUCE` is also ported here (not deferred to Sub-Phase E), because `GetCurrentPlanetResources()` (Agent 39) has a hard, direct dependency on it as its very first check — exactly mirroring how the current TypeScript `planetResourceCycle.ts` already imports it from `planetOwnership.ts` across the same file/domain boundary. No other Planet Ownership constant (`CITADEL_LEVEL_BENEFITS`, `COLONIST_TRANSPORT_COST`) is in scope here.

## Inputs

- `docs/agents/agent-31-unity-data-schema.md` — the MVP-scope `Planet`/`Resource`/`TierColor` this agent extends, never re-derives.
- `docs/functional-agents/galaxy.md`, `planet.md`, `mining.md` — the current, as-built consolidated contracts for what this schema must support.
- The current TypeScript source, read directly (not paraphrased from GDD prose, per `profitable-unity-migration-gdd.md` Section 3's re-derivation warning):
  - Types: `src/data/types/planet.ts` (the full current `Planet`, Phase 2+ optional fields included), `planetType.ts`.
  - Constants: `src/data/constants/planetTierModifier.ts`, `planetTypeEligibility.ts`, `resourceSubsetPercentage.ts`, `planetResourceCycle.ts` (the two tutorial-guarantee constants and the reset interval), and `planetOwnership.ts`'s `MINIMUM_COLONISTS_TO_PRODUCE` only (see the scope note above).
  - `src/galaxy/generateGalaxy.ts`'s exported `POSITION_RANGE` — the galaxy's real coordinate bound, already relied on by `ship.md`'s own fuel-capacity regression test (`tests/ships/calculateFuelCost.test.ts`), so it must port to the exact same value, not a re-guessed one.

## Outputs

### 1. Extended `Planet` (`Schema/Planet.cs`)

All fields beyond Agent 31's MVP scope are nullable/optional, exactly mirroring the TypeScript source's own backward-compatible-optional pattern (MVP-era content/save data must still be representable):
- `PlanetType? PlanetType` (new enum, below).
- `TierColor? Tier` — reuses Agent 31's existing `TierColor` enum, never a second one.
- `PlanetPosition? Position` (new type, below).
- `string? SpecialtyResourceId`.
- `bool? Discovered`.
- `Dictionary<string, QualityMap>? ResourceQualities` — reuses Agent 31/32's existing `QualityMap`, keyed by resource id, mirroring the TypeScript `Record<string, QualityRoll>`.
- `int? ColonistCount`, `int? CitadelLevel` (0-3, represented as a plain nullable `int` rather than a second enum — the TypeScript source itself uses a numeric literal union, not a named type, for this field), `string? OwnedByPlayerId`.

### 2. `PlanetType` (new enum, `Schema/PlanetType.cs`)

`Terrestrial`, `SuperEarth`, `Neptunian`, `GasGiant` — direct port of the TypeScript string-union, same idiomatic shape change Agent 31 already used for `TierColor`/`Quality`.

### 3. `PlanetPosition` (new type, `Schema/PlanetPosition.cs`)

`{ int X, int Y }` — a 2D-only integer coordinate pair, matching `generatePosition()`'s `Math.round()`-truncated output exactly (never a `double`, which would silently admit fractional positions the TypeScript side can never produce).

### 4. `Galaxy` (new type, `Schema/Galaxy.cs`)

`{ string Seed, List<Planet> Planets }` — direct port of `generateGalaxy.ts`'s `Galaxy` interface.

### 5. New constant tables (`Constants/`)

Direct, value-for-value translations, cross-checked line-by-line against the current TypeScript source:
- `PlanetTierModifierTable` (`PLANET_TIER_MODIFIER`, Grey -15 through Gold +30, Green = 0 as the neutral point) plus the standalone `SpecialtyQualityModifier = 15` constant.
- `PlanetTypeEligibilityTable` (`PLANET_TYPE_ELIGIBILITY` — the 4 planet types' eligible category lists).
- `ResourceSubsetPercentageTable` (`RESOURCE_SUBSET_PERCENTAGE`, Grey 0.2 through Gold 1.0).
- `PlanetResourceCycleConstants`: `PlanetResourceResetIntervalHours = 168`, `TutorialGuaranteedResourceIds` (`igneous-ore`, `autunite-crystal`, `hydrogen-gas`), `TutorialGuaranteeQualityClamp = 60`.
- `MinimumColonistsToProduce = 5` — the one Planet Ownership constant in scope here (see the Responsibility section's scope note); lives in its own small `Constants/PlanetOwnershipConstants.cs` file that Sub-Phase E's own agent will extend, not replace, when it ports the rest of `planetOwnership.ts`'s constants.
- `PositionRange = 1000` (`GalaxyGenerationConstants.cs`) — the galaxy's real coordinate bound.

## Must NOT Do

- Must not port any Sub-Phase B-F schema (trading, crew, ship, planet-ownership benefit tables beyond `MinimumColonistsToProduce`, combat) — that is later Sub-Phases' scope.
- Must not implement any formula/behavior logic (`GenerateGalaxy`, `GeneratePlanet`, resource-subset selection, quality rolling) — that is Agent 39's (Unity Simulation Core) responsibility, exactly mirroring Agent 31/32's own split.
- Must not re-derive `POSITION_RANGE`, the tier-modifier table, or the resource-subset percentages from GDD prose instead of the current TypeScript source — the same re-infection risk `profitable-unity-migration-gdd.md` Section 3 names for any table-driven value, not just the original two boundary-comparison bugs.
- Must not require the Unity Editor to build or test — Editor dependency begins at the Presentation role, not here, unchanged from Phase 1's own rule.
- Must not port `CITADEL_LEVEL_BENEFITS` or any other Planet Ownership constant beyond `MinimumColonistsToProduce` — Sub-Phase E's own scope, not this agent's.

## Testing Requirements

- Unit tests (xUnit) confirming every new type constructs and round-trips correctly, mirroring Agent 31's own per-type testing convention.
- A direct, line-by-line comparison test asserting every value in all five new constant tables against the current TypeScript source's values, including `PositionRange` matching `generateGalaxy.ts`'s exported constant exactly (this specific value is load-bearing for Agent 40's parity proof of the galaxy's worst-case-distance claim, not just an arbitrary number).
- `Planet`'s Phase 2+ fields are all provably optional — a `Planet` constructed with only Agent 31's MVP fields (`Id`/`Name`/`ProducibleResourceIds`) still compiles and behaves identically to before this agent's changes, confirming no MVP-era usage broke.

## Definition of Done

- Every galaxy/planet-generation type and constant table named above has a corresponding C# representation, built and tested without any Unity Editor dependency.
- `dotnet test` passes with zero failures, and the constant-table comparison tests give a reviewer confidence these tables were copied from the TypeScript source, not re-derived from prose.
- Agent 39 (Unity Simulation Core) should not need to hardcode a value or re-derive a shape that belongs here — if it does, this agent's output is incomplete.
