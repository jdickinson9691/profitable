# Agent 1 (Amendment): Data Schema — Planet Ownership (Colonists & Citadels)

**Status:** Amendment to the existing Agent 1, not a new agent.

**Creation order:** First, before Agent 37.

## Responsibility

Add the types and constants Colonist-Driven Production and Citadels need.

## Outputs

### `Planet` amendment (`src/data/types/planet.ts`)

Three new optional fields: `colonistCount?: number`, `citadelLevel?: 0 | 1 | 2 | 3`, `ownedByPlayerId?: string | null`. **Never set by `generatePlanet()`** — these live exclusively in the persisted `planetOwnershipState` side-table and are merged onto a `Planet` at read time (`mergePlanetOwnership()`).

### `PlanetOwnershipEntry` (new, `src/data/types/planetOwnershipEntry.ts`)

`{ colonistCount: number; citadelLevel: 0 | 1 | 2 | 3; ownedByPlayerId: string | null }`, plus `DEFAULT_PLANET_OWNERSHIP_ENTRY` (0 colonists, no citadel, unowned) — the value any planet with no side-table entry resolves to.

### Result types (new)

`TransportColonistsResult`, `ClaimPlanetResult` (both discriminated unions, `success: true | false`), `BuildCitadelResult` (same shape, plus reports `materialResourceId`/`materialQuantityConsumed` for the caller to consume from its own inventory — never touches `Inventory` directly).

### New constants (`src/data/constants/planetOwnership.ts`, new file)

- `COLONIST_TRANSPORT_COST: number = 15` (mutable `let` + setter).
- `MINIMUM_COLONISTS_TO_PRODUCE: number = 5` (mutable `let` + setter).
- `CITADEL_LEVEL_BENEFITS: readonly CitadelLevelBenefit[]` (3 rows, mutable via `setCitadelLevelBenefit()`) — construction cost (credits + optional material, reusing existing content — `iron-ingot` — never an invented item), refuel discount %, cargo storage flag, repair-enabled flag per level.

## Must NOT Do

- Must not make the three new `Planet` fields required — would break every planet generated before this amendment.
- Must not invent a new material resource for `CITADEL_LEVEL_BENEFITS` — reuses existing content.

## Definition of Done

- All new types/constants exist exactly as specified; every existing `Planet`-consuming test passes unmodified for a planet with no ownership fields set.
