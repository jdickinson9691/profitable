# Agent 31: Unity Data Schema Agent

**Creation order:** First in Migration Phase 1. Every other Phase 1 agent (32-36) depends on this agent's output. See `docs/profitable-unity-migration-gdd.md` Sections 2 and 5.1 for how this agent fits into the migration as a whole.

**Numbering note:** the migration GDD originally assigned this roster Agents 30-35, on the stated assumption that Agent 29 (Combat Confirmation) was the last agent number used. That assumption was stale — Agent 30 was already claimed by `agent-30-alpha-content-confirmation.md` (the Alpha Content Authoring milestone, completed after Combat). This roster is renumbered 31-36 to resolve the collision; see the migration GDD's own updated Section 5.1 for the corrected roster.

## Responsibility

Port Agent 1's MVP-scope base schema (`docs/agents/agent-01-data-schema.md`) to C#, and write a `ContentLoader` that consumes the existing JSON content files directly — the same "translate faithfully, don't redesign" rule that governs every layer of this migration (`profitable-unity-migration-gdd.md` Section 1). This agent produces the shared vocabulary every later Phase 1 agent builds against, exactly as Agent 1 did for the original TypeScript build.

**Scope is MVP-only, not the full current schema.** The live TypeScript codebase has accumulated Phase 2-5 and deferred-gap amendments (galaxy/planet fields, trading, crew, ships, scanner, combat) on top of Agent 1's original types. Per the migration GDD's Section 2 sequencing, none of that is in scope here — only the fields Agent 1's original contract specified, which the current TypeScript source still marks explicitly as MVP-required vs. later-optional (e.g. `planet.ts`'s own comment: "MVP fields (id, name, producibleResourceIds) stay required and unchanged. Phase 2 fields are optional"). Porting a later-amended optional field is scope creep into Migration Phase 2+ and must not happen here.

## Inputs

- `docs/agents/agent-01-data-schema.md` — the original contract this agent ports.
- `docs/profitable-unity-migration-gdd.md` Sections 1, 3, 4 — the port-vs-rewrite rules and the fractional-boundary-bug warning (Section 3 applies directly: the tier-color-breakpoint and penalty-curve tables ported here are exactly the two tables that bug was originally found in).
- The current TypeScript source, read for its MVP-scoped subset only:
  - Types: `src/data/types/resource.ts`, `quality.ts`, `tierColor.ts`, `recipe.ts`, `refiningRecipe.ts`, `schematicEntity.ts`, `planet.ts`.
  - Constants: `src/data/constants/tierColor.ts`, `tierVariance.ts`, `refundChance.ts`, `penaltyCurve.ts`, `schematicTier.ts`.
  - JSON schemas (for validation-rule parity, not literal reuse): `src/data/schemas/resource.schema.json`, `recipe.schema.json`, `refiningRecipe.schema.json`, `schematic.schema.json`, `planet.schema.json`, `quality.schema.json`, `tierColor.schema.json`.
  - Loader contract: `src/simulation/loadContent.ts` (defines `RawContentConfig`/`LoadedContent` and the load/validate flow this agent's `ContentLoader` must match the behavior of).
  - The real content files this loader must successfully parse: `content/resources.json`, `recipes.json`, `refiningRecipes.json`, `schematics.json`, `planets.json` — reused as-is per the migration GDD's Section 1 Content row, not re-authored or trimmed to an MVP-only subset.

## Outputs

### 1. A standalone .NET class library (no Unity Editor dependency)

Agent 31's output must build and test entirely via `dotnet build`/`dotnet test` — it does not need the Unity Editor. Unity Editor dependency begins at Agent 35 (Presentation), not before; keeping the schema/loader layer Editor-independent matches this project's existing "no GUI-editor dependency" agent-friendliness rationale (`CLAUDE.md` Section 2) and keeps this agent's output independently testable in CI-like conditions.

### 2. C# type definitions

Direct translations of the TypeScript shapes named in Inputs, MVP-scope fields only:
- `Quality` (enum: Purity, Density, Potency, Durability, Rarity) and `QualityValue`/`QualityMap` (a value is `int?` — nullable, never `0` for not-applicable, exactly like the TypeScript `QualityValue = number | null`).
- `TierColor` (enum: Grey, White, Green, Blue, Purple, Orange, Gold).
- `Resource`: `Id`, `Name`, `Category` (string), `ApplicableQualities` (a map/dictionary keyed by `Quality` to `bool`, all 5 required). **One deliberate exception to MVP-only scope:** also include the Phase 3 `ItemTier` field (nullable `int`, 1-7) — the real `content/resources.json` sets this on all 60 resources, so excluding it would make `ContentLoader` unable to parse the actual current content files, contradicting this agent's own Outputs Section 4 requirement. Not implementing any Phase 3 *behavior* around it (no trading logic) — just not silently dropping a field the real data already carries.
- `RecipeInput`: `Category`, `Quantity`, optional `ThresholdQuality`/`ThresholdValue` pair (both present or both absent — enforce this invariant explicitly, since C# has no native "dependent optional fields" shape the way the JSON schema's `dependencies` keyword expresses it).
- `Recipe`: `Id`, `Name`, `Inputs` (list of `RecipeInput`), `OutputResourceId`, `OutputQuantity`.
- `RefiningRecipeInput`: `ResourceId`, `Quantity`.
- `RefiningRecipe`: `Id`, `Name`, `Inputs` (list of `RefiningRecipeInput`), `OutputResourceId`, `OutputQuantity`.
- `Schematic`: `Id`, `Name`, `RecipeId`, `Tier` (`TierColor`).
- `Planet`: `Id`, `Name`, `ProducibleResourceIds` (list of string) — MVP-required fields only. Do not add the Phase 2+ optional fields (`PlanetType`, `Tier`, `Position`, `SpecialtyResourceId`, `Discovered`).

### 3. C# constant tables

Direct, value-for-value translations of the five MVP constant tables — cross-checked line-by-line against the current TypeScript source (not re-derived from the GDD prose, which is one level further from the source of truth):
- `TierColorBreakpoints` (Grey 1-40 ... Gold 97-100).
- `TierVariance` (per-tier negative/positive, Grey through Gold).
- `RefundChance` (per-tier chance, plus Gold's `SecondaryUnitChance`).
- `PenaltyCurve` (the 6-band table, including the 41+ band's "input rejected" state — represent this as a nullable multiplier, exactly mirroring the TypeScript `PenaltyBand`'s `maxPointsBelow: null, multiplier: null`, not a sentinel number).
- `SchematicTierContribution` (per-tier ceiling raise/variance narrowing/penalty forgiveness) plus the standalone `CombinedCeilingCap = 0.18` constant.

### 4. `ContentLoader`

A C# equivalent of `loadContent()`'s contract: takes raw parsed JSON (via `System.Text.Json`, already in the .NET base class library — no new external JSON dependency needed) and returns typed content, or a validation-error report naming every problem found (not just the first), matching `loadContent.ts`'s "report every invalid item across sections" behavior confirmed by its own test suite.

**Validation-rule translation, not schema-file reuse.** The TypeScript loader validates against compiled JSON Schema files via Ajv. C# has no equivalent already in the base class library, and pulling in a JSON Schema NuGet package to validate the same five rule sets this loader already knows in full would be exactly the kind of dependency this project avoids elsewhere. Translate each schema's rules (required fields, `additionalProperties: false`, numeric ranges, the threshold-pair dependency) into explicit C# validation code instead — same behavior, idiomatic shape change, per the migration GDD Section 4's "shape changes, meaning doesn't" rule. Do not silently drop a validation rule in translation (e.g. `additionalProperties: false`'s "reject unknown fields" behavior must have a C# equivalent, even though `System.Text.Json`'s default deserialization ignores unknown members by default).

**Must successfully parse the real content files.** `ContentLoader` is proven against the actual `content/*.json` files copied into the C# project's test fixtures, not synthetic toy data — this is the parity proof that the "port, don't redesign" claim is real for this layer.

## Must NOT Do

- Must not port any Phase 2+ amendment field (galaxy/planet extensions, trading, crew, ships, scanner, combat schema) — that is Migration Phase 2+ scope, not this document's.
- Must not implement any formula/behavior logic (`rollQuality`, `getTierColor`, `refine`, `craft`) — that is Agent 32's (Unity Simulation Core) responsibility. This agent produces types, constant tables, and a content loader only, exactly mirroring Agent 1's own "no behavior" boundary.
- Must not re-author or trim the existing JSON content files — reused as-is, per the migration GDD Section 1's Content row.
- Must not require the Unity Editor to build or test — that dependency begins at Agent 35, not here.
- Must not "clean up" or re-derive the five constant tables' values from GDD prose instead of the current TypeScript source — Section 3 of the migration GDD names exactly this kind of re-derivation as the re-infection risk for the boundary-comparison bug class, and two of these five tables (tier color breakpoints, penalty curve) are the exact tables that bug was originally found in.
- Must not add a JSON Schema validation NuGet dependency as a shortcut around writing the C# validation rules explicitly (see Outputs Section 4).

## Testing Requirements

- Unit tests (xUnit, run via `dotnet test`) for every type's valid/invalid construction path, mirroring Agent 1's own testing requirement: a `Resource` with a `false` `ApplicableQualities` entry (representing "not applicable to this resource") validates fine, but a `Resource` missing one of the 5 required quality keys is rejected by `ContentLoader` — the current `resource.ts` implements this map as `Record<Quality, boolean>`, not the numeric-or-null shape Agent 1's original contract prose first imagined, so port the boolean-map behavior actually implemented, not the prose (the numeric-or-null "never 0 for non-applicable" rule applies to `QualityValue`/`QualityMap`, the output of `rollQuality()` — Agent 32's concern, not this agent's). A `Recipe` with only one of `ThresholdQuality`/`ThresholdValue` set is rejected by `ContentLoader`, matching the TypeScript schema's `dependencies` rule.
- A direct, line-by-line comparison test asserting every value in all five C# constant tables against the current TypeScript source's values — including every boundary value (e.g. quality of exactly 40 vs. 41 for the Grey/White tier-color breakpoint, exactly as Agent 1's own testing requirement specifies) and the two nullable "no value" cases (`PenaltyBand`'s 41+ band, a non-applicable `QualityValue`).
- `ContentLoader` integration tests that load the real `content/resources.json`, `recipes.json`, `refiningRecipes.json`, `schematics.json`, and `planets.json` (copied as test fixtures) and confirm: (a) the item counts match the TypeScript `loadContent()`'s output for the same files, (b) at least one hand-picked resource/recipe/schematic/planet's every field matches its TypeScript counterpart exactly, and (c) a deliberately corrupted copy of one file (one invalid item per section) produces a C# validation-error report naming every corrupted item, not just the first — mirroring `loadContent.test.ts`'s own "reports every invalid item across sections" test.

## Definition of Done

- Every MVP-scope type and all five constant tables from Agent 1's original contract have a corresponding C# representation, built and tested without any Unity Editor dependency.
- `ContentLoader` successfully parses the real, current `content/*.json` files end-to-end, with typed output verified field-for-field against the TypeScript `loadContent()`'s output for the same files.
- `dotnet test` passes with zero failures, and the constant-table comparison tests give a reviewer confidence this agent's tables were copied from the TypeScript source, not re-derived from prose.
- A reviewer can check this agent's output against `agent-01-data-schema.md` and the current TypeScript source directly, without needing to open Unity or run any TypeScript code themselves.
- No later Phase 1 agent (32-36) should need to hardcode a value or re-derive a shape that belongs here — if they do, this agent's output is incomplete.
