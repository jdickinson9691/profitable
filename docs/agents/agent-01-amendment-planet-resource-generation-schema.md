# Agent 1 (Amendment): Data Schema — Planet Resource Generation

**Status:** Amendment to the existing Agent 1, not a new agent.

**Creation order:** First, before the Agent 8 amendment.

## Responsibility

Add the one new field and two new constants Planet Resource Generation needs.

## Outputs

### `Planet.resourceQualities` (amendment to `src/data/types/planet.ts`)

`resourceQualities?: Record<string, QualityRoll>` — one entry per `producibleResourceIds` id, holding that resource's fixed quality as of the planet's generation (cycle 0). Optional, so pre-this-amendment content/save data still validates unchanged.

### New constants (`src/data/constants/planetResourceCycle.ts`, new file)

- `PLANET_RESOURCE_RESET_INTERVAL_HOURS: number = 168` (mutable `let` + setter, tunable).
- `TUTORIAL_GUARANTEED_RESOURCE_IDS: readonly string[] = ["igneous-ore", "autunite-crystal", "hydrogen-gas"]` (plain `const`, structural).
- `TUTORIAL_GUARANTEE_QUALITY_CLAMP: number = 60` (plain `const`, structural — White tier's own ceiling).

## Must NOT Do

- Must not make `resourceQualities` required — would break existing content/save data with no such field.
- Must not hardcode `PLANET_RESOURCE_RESET_INTERVAL_HOURS`/`TUTORIAL_GUARANTEE_QUALITY_CLAMP` anywhere outside this file.

## Definition of Done

- `Planet` type and the three new constants exist exactly as specified, with zero breakage to any existing content/save data lacking `resourceQualities`.
