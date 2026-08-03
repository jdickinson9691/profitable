# Agent 60: Unity Planet Ownership Parity Validation Agent

**Creation order:** Third in Migration Phase 2, Sub-Phase E. Created alongside Agent 59 and runs continuously against it.

## Responsibility

Prove Agent 59's C# port produces numerically identical output to the current TypeScript implementation for the same inputs, across all four ported functions.

## Inputs

- `docs/agents/agent-55-unity-ships-travel-parity-validation.md` — the harness/comparison pattern extended, not re-invented.
- `content/recipes.json`'s real `iron-ingot` resource id — `buildCitadel`'s Level 2/3 material requirement references it directly, so the corpus uses the real id rather than a placeholder string.
- Agent 59's own output.

## Outputs

### 1. Extended `scripts/parityHarness.ts`

Four new corpus sections: `transportColonistsCases` (3 — successful transport, ship-not-docked rejection, insufficient-funds rejection), `claimPlanetCases` (3 — successful claim, below-colonist-threshold rejection, already-claimed rejection), `buildCitadelCases` (4 — successful Level 1 with no material requirement, successful Level 2 with the real `iron-ingot` material, level-skipping rejection, insufficient-material rejection), `mergePlanetOwnershipCases` (2 — no entry uses defaults, a real entry is applied).

### 2. Extended `ProfitableCore.Tests/Parity/ParityCorpus.cs`

New DTOs for every section, including `SerializedPlanetOwnershipEntry`.

### 3. `ProfitableCore.Tests/Parity/PlanetOwnershipParityTests.cs`

Four `[Theory]`/`[MemberData]` test methods, one per corpus section.

## Must NOT Do

- Must not accept Agent 59's own unit tests passing as a substitute for this comparison.
- Must not invent a synthetic material resource id for `buildCitadelCases` — `iron-ingot` is the real content id `CITADEL_LEVEL_BENEFITS` itself names, used directly.

## Testing Requirements

- All 12 new corpus cases pass, and regenerating the corpus (`npm run parity`) and re-running `dotnet test` reproduces the same result.
- Every Sub-Phase E Simulation Core function has at least one parity case exercising it.

## Definition of Done

- `dotnet test` passes with zero failures across all 743 tests (716 through Sub-Phase D + 12 parity + 15 direct unit tests).
- A reviewer can regenerate the corpus and re-run to reproduce the same result independently.
- No later Sub-Phase E agent should discover a numeric disagreement between the C# and TypeScript implementations this agent's corpus should have already caught.
