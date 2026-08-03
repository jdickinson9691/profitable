# Agent 37: Planet Ownership Core

**Creation order:** After the Agent 1 amendment. New agent number, not an amendment to an existing core agent — Colonist-Driven Production and Citadels don't extend any single existing subsystem (not Agent 8's generation job, not Agent 20's ship/travel job), the same reasoning Trading (Agent 11) and Crew (Agent 16) each got their own number when first introduced.

## Responsibility

Implement colonist transport, planet claiming, and Citadel construction as pure, framework-agnostic TypeScript, plus the persisted side-table and merge function that let this state survive a reload without being baked into `generatePlanet()`'s deterministic output.

## Inputs

- Agent 1's amendment (types/constants).
- `getCurrentPlanetResources()`'s amendment (`agent-08-amendment-planet-resource-generation-core.md`) — this agent's colonist gate is implemented *there*, not here; this file only produces the state that gate reads.

## Outputs

### `mergePlanetOwnership(planet, entry)` — `src/planets/mergePlanetOwnership.ts`

Pure function. Merges a `PlanetOwnershipEntry` (or the default, if `undefined`) onto a `Planet`, returning a new object — never mutates the input. The "normalize the live-read value" pattern `getDiscoveredPlanets()` already established for `discovered`, extended to ownership.

### `transportColonists(ship, destinationPlanet, quantity, wallet, currentOwnershipEntry)` — `src/planets/transportColonists.ts`

Requires `ship.currentPlanetId === destinationPlanet.id`. Checks funds (`quantity * COLONIST_TRANSPORT_COST`), deducts credits, increments `colonistCount`. Colonists have no separate origin/supply — abstracted as "arranged via credits" once docked.

### `claimPlanet(ship, planet, playerId, currentOwnershipEntry)` — `src/planets/claimPlanet.ts`

Requires docking, requires `colonistCount >= MINIMUM_COLONISTS_TO_PRODUCE`, requires not already claimed. Sets `ownedByPlayerId`.

### `buildCitadel(ship, planet, targetLevel, wallet, materialQuantityAvailable, currentOwnershipEntry)` — `src/planets/buildCitadel.ts`

Requires docking, ownership, sequential leveling (`targetLevel === citadelLevel + 1`). Checks/deducts credits; checks (never consumes) materials — `materialQuantityAvailable` is pre-resolved by the caller (`totalQuantity(inventory, resourceId)`), and a successful result reports `materialResourceId`/`materialQuantityConsumed` for the caller to `consume()` from its own inventory afterward. Never imports `Inventory` — same boundary `craft()` already holds.

### Persisted side-table — `src/presentation/planetOwnershipState.ts`

`profitable:planetOwnershipState`, `Record<planetId, PlanetOwnershipEntry>`, same `SaveSystem`-backed pattern `discoveredPlanetIds` uses. `getPlanetOwnershipEntry()`/`setPlanetOwnershipEntry()`, `withPlanetOwnership(planet)` (the merge-at-read-time entry point every gameplay caller uses), and `ensureBootstrapColonization(planetIds)` — floor-sets `colonistCount` to at least `MINIMUM_COLONISTS_TO_PRODUCE` for the given planet ids, called once from `galaxyState.ts`'s `loadOrCreateGalaxy()` fresh-seed branch for `startingPlanet`/`secondaryDiscoveredPlanet`.

### Integration points (amendments to existing presentation files)

- `galaxyState.ts`: `loadOrCreateGalaxy()` now distinguishes a genuinely new seed from a reload (`isNewGalaxy`); `startingPlanet`/`secondaryDiscoveredPlanet`/`getDiscoveredPlanets()` all return ownership-merged `Planet` objects.
- `currentPlanet.ts`: `getCurrentPlanet()`'s raw `galaxy.planets.find()` fallback now also merges ownership (previously only the `getDiscoveredPlanets()` path did).
- `GatherScene.ts`: minimal presentation hook — a single next-action section (Transport Colonists → Claim Planet → Build Citadel, in order) rendered above the gather button list, since shipping the colonist gate without any way to unlock a planet would be a real regression, not just an incomplete feature.

## Must NOT Do

- Must not let any of the three core functions succeed for a ship that isn't docked at the target planet.
- Must not let `buildCitadel()` touch `Inventory` directly, or consume materials itself — reports what to consume, the caller consumes.
- Must not store `colonistCount`/`citadelLevel`/`ownedByPlayerId` as direct fields `generatePlanet()` sets.
- Must not let the bootstrap exception run on every load — only on a genuinely new seed (`isNewGalaxy`), though it's also safe (floor-set, idempotent) if it did.
- Must not implement rendering/DOM/browser-API code in any `src/planets/` file.

## Testing Requirements

- `transportColonists()`/`claimPlanet()`/`buildCitadel()`: each rejects when undocked; funds/materials/sequencing checks verified exactly; `mergePlanetOwnership()` never mutates its input and correctly applies the default when no entry exists.
- Regression: `getCurrentPlanetResources()`'s existing (pre-colonist-gate) behavior is unaffected for a planet passed with `colonistCount` already at/above the minimum.
- Full suite green (617 tests as of this agent), zero regressions.

## Definition of Done

- A newly-generated planet (other than the two bootstrap planets) cannot be mined until colonized; both bootstrap planets are always immediately minable, verified across many seeds.
- A player can claim a colonized planet and build a Citadel through level 3 via `GatherScene`'s new action section.
- Ownership state survives a reload, read from `planetOwnershipState`, never reset by `generatePlanet()`'s regeneration.
- Refuel discount / cargo storage / repair benefits are **not yet wired** — `CITADEL_LEVEL_BENEFITS` records what each level unlocks, but `refuelShip()`, `Voyage.cargo` capacity, and `resolveComponentRepair()` don't exist in the codebase yet (Ship Fuel/Cargo/Crew Roles, not yet built). Wiring those three hooks is that future work's job, not this agent's.
