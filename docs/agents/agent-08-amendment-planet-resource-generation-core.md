# Agent 8 (Amendment): Galaxy & Planet Generation — Planet Resource Generation

**Status:** Amendment to the existing Agent 8 (`agent-08-galaxy-planet-generation.md`), not a new agent. Every function Agent 8 already implements (`rollPlanetTier`, `choosePlanetType`, `getEligibleResources`, `computeSubsetCount`, `selectResourceSubset`, `generatePlanet`) keeps its existing observable behavior — this amendment changes *when* quality rolls happen (once per resource per cycle instead of once per gather click) and adds the reset cycle and starting-planet tutorial guarantee on top.

**Creation order:** Second, after the Agent 1 amendment. Also amends Agent 5/Gathering's presentation (`GatherScene`), since the whole point is moving the roll out of the gather action.

## Responsibility

Give each producible resource on a planet one *fixed* quality per reset cycle (not re-rolled per gather), add a periodic reset cycle that re-rolls the resource subset/specialty/qualities together, and guarantee the starting planet's 3 tutorial resources are always producible at Grey or White.

## Inputs

- Agent 1's amendment (the new field/constants).
- `rollQualityOnPlanet()` (existing, `src/galaxy/rollQualityOnPlanet.ts`) — reused unmodified for quality rolling. Its parameter type was narrowed from `Planet` to `Pick<Planet, "tier" | "specialtyResourceId">` (the only two fields it ever read) so it can be called before a full `Planet` object exists — a signature widening, not a behavior change; every existing caller passing a full `Planet` is unaffected.
- `getCurrentSeason()`'s exact phase-offset technique (`src/trading/season.ts`) — reused for the reset cycle's own phase offset.
- `computeAggregateTier()` (`src/simulation/aggregateTier.ts`) — reused for the tutorial guarantee's Grey/White check.

## Outputs

### `getEligibleResources`/`computeSubsetCount`/`selectResourceSubset` — moved, `src/galaxy/resourceSubset.ts`

Extracted out of `generatePlanet.ts` unchanged (formula-identical) to break a circular import (`generatePlanet.ts` now calls into the new `planetResourceCycle.ts`, which needs these three functions too). Re-exported from `generatePlanet.ts` so no existing import path changed.

### `getPlanetResourceCycleIndex(planetId, now)` — new, `src/galaxy/planetResourceCycle.ts`

`(planetId: string, now: number) => number`. Same phase-offset-then-floor-divide technique as `getCurrentSeason()`: a seeded offset derived from `planetId` (so planets don't reset in lockstep), added to `now`, divided by `PLANET_RESOURCE_RESET_INTERVAL_HOURS`. Zero persisted state.

### `generateResourcesForCycle(seed, tier, planetType, resources, cycleIndex)` — new, `src/galaxy/planetResourceCycle.ts`

Factors subset selection + the new per-resource quality roll into one cycle-parameterized function, re-seeded per cycle (`${seed}:resources:${cycleIndex}`). `generatePlanet()` calls it with `cycleIndex = 0`; `getCurrentPlanetResources()` calls it with whatever cycle is live. One implementation either way.

### `getCurrentPlanetResources(planet, resources, now, isStartingPlanet?)` — new, `src/galaxy/planetResourceCycle.ts`

**Necessary completion:** the design entry's signature omitted the resource catalog parameter — added as a required `resources: Resource[]` argument, since regenerating a cycle's subset structurally needs it (the same class of completion as the MVP's `loadContent()` additions). The live read every gameplay caller now uses instead of `planet.producibleResourceIds`/`specialtyResourceId`/`resourceQualities` directly. Throws if `planet.tier`/`planet.planetType` are missing (pre-Phase-2 legacy content only). When `isStartingPlanet` is true, applies the tutorial-guarantee clamp as a final step.

### `generatePlanet(seed, position, resources)` — amended, `src/galaxy/generatePlanet.ts`

Signature unchanged. Now calls `generateResourcesForCycle(id, tier, planetType, resources, 0)` for its initial snapshot instead of inlining subset selection. Tier/type still roll on the original `seed` stream unchanged; only the resource subset's own random draw moved to an independently-seeded stream (`${id}:resources:0`) — confirmed safe, no test or real save data depends on the exact subset a specific seed previously produced.

### `GatherScene` — amended, `src/presentation/scenes/GatherScene.ts`

No longer calls `rollQualityOnPlanet()` at gather time. Reads `getCurrentPlanetResources(planet, content.resources, Date.now(), isStartingPlanet)` once per `create()`, and every button/display (gatherable list, tier/specialty header, gather action, inventory display) sources from that one live read.

## Must NOT Do

- Must not roll a resource's quality more than once per cycle, anywhere — `rollQualityOnPlanet()` is called once per resource per cycle by `generateResourcesForCycle()`, never again at gather time.
- Must not persist a "last reset" timestamp or any other new stored state for the resource cycle — `getPlanetResourceCycleIndex()` stays a pure function of `(planetId, now)`.
- Must not retroactively change an already-mined inventory batch's quality on reset.
- Must not re-roll tier, type, or position on any reset cycle — only the resource subset, specialty, and their fixed qualities cycle.
- Must not implement the tutorial guarantee as a reroll-until-valid loop — a direct clamp, always.
- Must not extend the resource-quality tutorial guarantee beyond the starting planet.
- Must not call `getCurrentPlanetResources()` with a raw, unmerged `Planet` object once Colonist-Driven Production lands (not yet built — no gate exists to violate yet, but the future contract point is here).
- Must not call `Math.random()` directly anywhere in this amendment's functions.
- Must not implement rendering/DOM/browser-API code in `planetResourceCycle.ts` or `resourceSubset.ts`.

## Testing Requirements

- `getPlanetResourceCycleIndex()`: deterministic for a fixed `(planetId, now)`; different planets phase-offset differently; increments exactly once per full `PLANET_RESOURCE_RESET_INTERVAL_HOURS` elapsed (tested offset-independently: `index(now + interval) === index(now) + 1` for an arbitrary `now`, not assumed to sit at a cycle boundary).
- `generateResourcesForCycle()`: deterministic for `(seed, cycleIndex)`; different `cycleIndex` values produce independently different output; exactly one `QualityRoll` per `producibleResourceIds` entry; throws for an empty eligible pool.
- `getCurrentPlanetResources()`: matches `planet.resourceQualities` at cycle 0; diverges once `now` crosses into a later cycle; never mutates the passed-in `Planet`; throws for a planet missing `tier`/`planetType`.
- Tutorial guarantee: all 3 resources present at Grey/White across many seeds, at cycle 0 and at later cycles (idempotency); a non-starting planet gets no override (proven by finding at least one seed where the 3 don't naturally all appear).
- Regression: `refine()`/`craft()`, `generateGalaxy()` provably unaffected — confirmed via full suite (591 tests, zero failures).

## Definition of Done

- Every generated planet's `producibleResourceIds` has exactly one fixed `QualityRoll`, unchanged until the next reset cycle.
- `getCurrentPlanetResources()` is the single source of truth for "what can be mined right now" — `GatherScene` reads exclusively through it.
- The starting planet provably supports the tutorial chain (Igneous Ore, Autunite Crystal, Hydrogen Gas, each Grey/White) at cycle 0 and at every later reset cycle tested, and provably only the starting planet.
- The resource reset cycle is provably stateless.
- `generatePlanet()` remains provably deterministic and position-agnostic.
- Full test suite green (591 tests), zero regressions.
