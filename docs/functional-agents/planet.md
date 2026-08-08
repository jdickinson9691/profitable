# Functional Agent: Planet

**Status: existing system, documented as-built — including the Resource Quality/Reset/Tutorial-Guarantee sections, now built.** Consolidates the per-planet generation slice of Agent 8 (galaxy/planet generation) plus its Planet Resource Generation amendment (`agent-08-amendment-planet-resource-generation-core.md`), distinct from `galaxy.md`'s container-level concerns (how many planets, where they sit, which are discovered). Planet is the explicit owner of **Planet Types**, **one planet's own tier/type/resource generation**, and **fixed per-resource quality, the periodic resource reset cycle, and the starting-planet tutorial guarantee**. This is where future development of any planet-level modifier should be tracked going forward.

**This file knowingly reopens previously-"resolved" design** (Mining's [renamed from "Gathering" this session — terminology only] roll-at-mine-time premise, Galaxy & Planet Generation's original once-and-permanent resource assignment) — see the design-questions.md entry for the full reasoning; this file is that entry's consolidated forward-looking contract, existing-system documentation and new scope together, clearly marked which is which throughout.

**See also `docs/functional-agents/planet-ownership.md`** — Colonist-Driven Production adds a precondition in front of this file's `getCurrentPlanetResources()` (a planet must be sufficiently colonized before it's minable at all, the starting planet excepted). Kept as a separate file since ownership/investment is a genuinely different job from generation, not a change to any formula in this file. (Citadels originally built further on that ownership concept — retroactively cut from alpha scope 2026-08-04, see `planet-ownership.md`'s own note; doesn't affect anything in this file.)

## Responsibility

Own Planet Types and what each is eligible to produce. Generate one planet's tier, type, position-independent resource subset, and (new) each producible resource's fixed quality — deterministic, reproducible, live-derived per reset cycle with zero persisted state. Guarantee the starting planet can always support the MVP tutorial chain.

## Inputs

- `Resource[]` (the full loaded catalog) — filtered down to what's actually eligible for this planet, never assumed pre-filtered by the caller.
- `PlanetPosition` (`galaxy.md`) — passed straight through into the returned `Planet`, never read or used in any roll here.
- `createSeededRandom(seed)` (`galaxy.md`) — this file's only source of randomness; no direct `Math.random()` call anywhere except through an injected `RandomFn`.
- `computeAggregateTier()` (`recipes-schematics.md`'s sibling, `src/simulation/aggregateTier.ts`) — reused, never reimplemented, for the tutorial guarantee's Grey/White band check.
- `getCurrentSeason()`'s phase-offset technique (`planetary-markets.md`, `src/trading/season.ts`) — the exact architecture the new reset-cycle function reuses (hash the planet's own id into a phase offset, floor-divide elapsed time by the interval, zero persisted state).
- **`colonistCount` (`planet-ownership.md`'s `planetOwnershipState` side-table)** — `getCurrentPlanetResources()` reads this directly off its `planet` parameter, never as a separate argument. This only works correctly if the caller passes in a `Planet` object **already merged** with `planetOwnershipState` (`galaxy.md`'s merge-at-read-time pattern) — see that function's own note and this file's Must-Not-Do below.

## Outputs

### Planet Types (owned by this file)
`PlanetType` (`src/data/types/planetType.ts`): `"Terrestrial" | "SuperEarth" | "Neptunian" | "GasGiant"`, exactly 4, deliberately minimal. `PLANET_TYPE_ELIGIBILITY` (`src/data/constants/planetTypeEligibility.ts`) ties each type to the broad resource categories it can produce — **Terrestrial** → Solid+Crystal, **SuperEarth** → Solid+Crystal+Gas (richest type — has everything), **Neptunian** → Gas+Crystal, **GasGiant** → Gas only (no solid surface). **Confirmed indicative of resource type** (`profitable-design-questions.md`'s own review): the mapping reads as a coherent progression from "produces everything" to "gas only," not an arbitrary label set — no renaming or new types needed. Any future addition to this table is this file's call, not a byproduct of a content or mining change.

### `rollPlanetTier(random)` / `choosePlanetType(random)` — `src/galaxy/generatePlanet.ts`
Unchanged from the existing implementation. `rollPlanetTier`: a random 1-100 roll through the shared tier breakpoint table (`getTierColor()`). `choosePlanetType`: uniform among the 4 types.

### `getEligibleResources(planetType, resources)` — `src/galaxy/generatePlanet.ts`
`(planetType: PlanetType, resources: Resource[]) => Resource[]`. Filters via `PLANET_TYPE_ELIGIBILITY`, matched by case-insensitive substring against `Resource.category`, **and requiring `(resource.itemTier ?? 1) === 1`** (raw only). The `itemTier` check is a correctness fix made this session — see the file history / `tests/galaxy/generatePlanet.test.ts` for the regression case (a refined/crafted resource's self-referential category can accidentally substring-match a broad category by name coincidence; `itemTier` closes that regardless of naming). **Not yet written up as its own numbered `docs/agents/` amendment** — real follow-on work if the phase-based roster should stay current too.

### `computeSubsetCount(tier, eligibleCount)` / `selectResourceSubset(eligibleResources, tier, count, random)` — `src/galaxy/generatePlanet.ts`
Unchanged. `computeSubsetCount`: `max(1, ceil(RESOURCE_SUBSET_PERCENTAGE[tier] * eligibleCount))`, Grey 20% → Gold 100%. `selectResourceSubset`: the reserved-slot rule — White+ tiers get exactly one specialty, picked first, never crowded out; Grey never gets one.

### `Planet.resourceQualities` — **built**, `src/data/types/planet.ts`
`Record<string, QualityRoll>`, one entry per `producibleResourceIds` id, holding that resource's **fixed** quality as of the planet's generation (cycle 0). Computed by calling the existing, unchanged `rollQualityOnPlanet()` (`mining.md`) **once per resource at generation time** instead of once per mine action. `generatePlanet()`'s signature is otherwise unchanged; this is an additive field, not a new parameter.

### `getPlanetResourceCycleIndex(planetId, now)` — **built**, `src/galaxy/planetResourceCycle.ts`
`(planetId: string, now: number) => number`. Reuses `getCurrentSeason()`'s exact technique: a seeded phase offset derived from `planetId` (so planets don't all reset in lockstep) added to `now`, floor-divided by `PLANET_RESOURCE_RESET_INTERVAL_HOURS` (`src/data/constants/planetResourceCycle.ts`, originated default **168 hours**, tunable). Zero persisted state — a pure function of `(planetId, now)`, the same "always live, never stale" property `galaxy.md` already guarantees extended to one more layer.

### `generateResourcesForCycle(seed, tier, planetType, resources, cycleIndex)` — **built**, `src/galaxy/planetResourceCycle.ts`
`(seed, tier, planetType, resources, cycleIndex) => { producibleResourceIds, specialtyResourceId, resourceQualities }`. Factors the subset-selection + fixed-quality-rolling logic out of `generatePlanet()` into a shared, cycle-parameterized function — re-seeded per cycle (`${seed}:resources:${cycleIndex}`), so `generatePlanet()` calling it with `cycleIndex = 0` and any later live read calling it with a higher index both go through **one** implementation, never two copies of the same formula. Tier, type, and position are **not** parameters here — they're rolled once on the base seed stream and never re-rolled by this function, by design. **`getEligibleResources`/`computeSubsetCount`/`selectResourceSubset` moved to `src/galaxy/resourceSubset.ts`** (re-exported from `generatePlanet.ts` unchanged) to avoid a circular import once `generatePlanet()` started calling into this file.

### `getCurrentPlanetResources(planet, resources, now, isStartingPlanet?)` — **built**, `src/galaxy/planetResourceCycle.ts`
`(planet: Planet, resources: Resource[], now: number, isStartingPlanet = false) => { producibleResourceIds, specialtyResourceId, resourceQualities }`. **Necessary completion found during implementation:** the `resources` parameter wasn't in this entry's original signature, added because regenerating a cycle's subset structurally needs the catalog to resolve ids into real `Resource` objects — the same class of completion as the MVP's `loadContent()` additions. The live read path every gameplay caller (`mining.md`'s `GatherScene`, built; `travel.md`'s market display, `encounters-combat.md`'s discovery-resource pool, both still reading `Planet`'s static fields directly for now) switches to using **instead of** reading `planet.producibleResourceIds`/`specialtyResourceId`/`resourceQualities` directly. Throws if `planet.tier`/`planet.planetType` are missing (pre-Phase-2 legacy content only). **Colonist gate — not yet built:** `planet-ownership.md`'s amendment (`planet.colonistCount < MINIMUM_COLONISTS_TO_PRODUCE` → empty `producibleResourceIds`) is still pending; this function currently always computes the full cycle. When `isStartingPlanet` is true, applies the tutorial-guarantee clamp (below) as a final step — this part is built.

### Two separate bootstrap exceptions, not one — worth stating explicitly to avoid reading them as contradictory
`galaxy.md`'s two bootstrap planets (`startingPlanet`, `secondaryDiscoveredPlanet`) each get a *different* special-case, from two different files, via two different mechanisms:
- **Colonization** (`planet-ownership.md`): **both** bootstrap planets are pre-colonized, so neither is ever blocked by the `colonistCount` check above. Applied via merged `planetOwnershipState` — no flag passed to this function.
- **Resource-quality tutorial guarantee** (this file, below): **starting planet only** — the specific Igneous-Ore/Autunite-Crystal/Hydrogen-Gas/Grey-White clamp exists for the MVP's A1/A2 refining/crafting chain specifically, which only needs one guaranteed planet. Applied via the explicit `isStartingPlanet` boolean parameter.

Both are real, both are deliberate, and they don't overlap — `secondaryDiscoveredPlanet` is minable but gets no resource-quality guarantee; `startingPlanet` gets both.

### Starting-planet tutorial guarantee — **built**, inside `getCurrentPlanetResources()`
Guarantees Igneous Ore, Autunite Crystal, and Hydrogen Gas are always producible with their `computeAggregateTier()` landing in **Grey or White**. Mechanism: if any of the 3 isn't in the cycle's naturally-rolled `producibleResourceIds`, it's added directly (bypassing the normal subset draw for just these slots); if a resource's rolled quality would aggregate above White (i.e. any dimension pushes the average past 60), **every dimension of that resource's `QualityRoll` is clamped to 60** — a direct, closed-form override, not a retry-until-valid loop (this codebase has never used one). **Reapplied every cycle, including every reset** — idempotent, never a one-time bootstrap that can drift away after a reset. **Scoped to `galaxy.md`'s `startingPlanet` only** — see the note above for why this is narrower than the colonization exception.

### `generatePlanet(seed, position, resources)` — `src/galaxy/generatePlanet.ts`
Signature **unchanged**. Orchestrates tier → type → eligible pool → (new) `generateResourcesForCycle(..., cycleIndex: 0)` for the initial snapshot stored in `producibleResourceIds`/`specialtyResourceId`/`resourceQualities`. `id`/`name` still derive from the seed. Always starts `discovered: false`. Still throws if the eligible pool is empty for the rolled type.

## Must NOT Do

- Must not read or depend on `PlanetPosition`/coordinates for any tier/type/resource/quality roll — position stays orthogonal.
- Must not let a refined or crafted resource become eligible for any `PlanetType` — the `itemTier === 1` guard holds regardless of category-name coincidence.
- Must not crowd out or duplicate the specialty slot; must not give a Grey-tier planet a specialty.
- **Must not roll a resource's quality more than once per cycle, anywhere** — `rollQualityOnPlanet()` is called once per resource per cycle by `generateResourcesForCycle()`, never again at mine time. If `mining.md`'s `GatherScene` (or any other caller) is found calling `rollQualityOnPlanet()` directly instead of reading `getCurrentPlanetResources()`'s output, that's a violation of this file's ownership of resource quality, not a valid shortcut.
- **Must not persist a "last reset" timestamp or any other new stored state for the resource cycle** — `getPlanetResourceCycleIndex()` must stay a pure function of `(planetId, now)`, matching `getCurrentSeason()`'s own zero-persistence guarantee.
- **Must not retroactively change an already-mined inventory batch's quality on reset** — a reset only affects what a planet offers going forward; nothing here ever reaches into `src/presentation/inventory.ts`.
- **Must not re-roll tier, type, or position on any reset cycle** — only the resource subset, specialty, and their fixed qualities cycle; everything else is permanent from the planet's original generation.
- **Must not implement the tutorial guarantee as a reroll-until-valid loop** — a direct clamp, always.
- **Must not extend the resource-quality tutorial guarantee beyond the starting planet** — `secondaryDiscoveredPlanet` gets the *colonization* exception (`planet-ownership.md`), never this one; every other planet rolls normally either way.
- **Must not call `getCurrentPlanetResources()` with a raw, freshly-generated `Planet` object** — `colonistCount` only reads correctly off a `Planet` already merged with `planetOwnershipState` (`galaxy.md`'s merge-at-read-time pattern); an unmerged object always has `colonistCount` implicitly 0, which would make every colonized planet silently read as unminable. This is a real integration risk, not a hypothetical — flag it in code review, not just here.
- Must not call `Math.random()` directly anywhere in this file's functions — every roll goes through an injected `RandomFn`.
- Must not implement rendering/DOM/browser-API code anywhere in this file.

## Testing Requirements

- `getEligibleResources()`: existing coverage (hard-filter per type, `itemTier` regression) unchanged.
- `Planet.resourceQualities`: generated once per `producibleResourceIds` entry at `generatePlanet()` time; deterministic for a fixed seed.
- `getPlanetResourceCycleIndex()`: same `(planetId, now)` always returns the same index; different planets phase-offset differently (not all resetting in lockstep, verified across many planet ids); index increments exactly once per full `PLANET_RESOURCE_RESET_INTERVAL_HOURS` elapsed.
- `generateResourcesForCycle()`: same `(seed, cycleIndex)` reproduces identical output; different `cycleIndex` values (same seed) produce independently different resource subsets/qualities, not a trivial shift of the same roll.
- `getCurrentPlanetResources()`: matches `planet.producibleResourceIds`/`resourceQualities` exactly at `now` within cycle 0; diverges correctly once `now` crosses into a later cycle; never mutates the passed-in `Planet` object.
- Tutorial guarantee: the starting planet always includes all 3 tutorial resources with `computeAggregateTier()` in Grey or White, verified across many seeds and across several simulated reset cycles (not just cycle 0) — the idempotency claim needs a real multi-cycle test, not just a single-generation check. A non-starting planet is verified to receive **no** such override under the same conditions — **including `secondaryDiscoveredPlanet`**, which gets the colonization exception but must not also get this one.
- Colonist-gate integration: `getCurrentPlanetResources()` called with an unmerged `Planet` (no `planetOwnershipState` applied) returns empty `producibleResourceIds` even for an otherwise-colonized planet — the exact failure mode the Must-Not-Do above exists to prevent, worth a real regression test given how silent the failure would otherwise be.

## Definition of Done

- Every generated planet's `producibleResourceIds` contains only genuinely raw resources matching its `PlanetType`'s eligible categories, each with exactly one fixed `QualityRoll`.
- `getCurrentPlanetResources()` is provably the single source of truth for "what can be mined right now" — every gameplay caller reads through it, none reads `Planet`'s static fields directly for live gameplay purposes.
- The starting planet provably supports the tutorial chain (Igneous Ore, Autunite Crystal, Hydrogen Gas, each Grey/White) at cycle 0 and at every later reset cycle tested, with zero exceptions — and provably *only* the starting planet, not `secondaryDiscoveredPlanet` too.
- `getCurrentPlanetResources()` provably requires a merged `Planet` object to behave correctly — the failure mode of passing an unmerged one is covered by a real test, not just documented as a risk.
- The resource reset cycle is provably stateless — deleting and regenerating a `Planet` object from the same seed and the same `now` reproduces identical current resources, with nothing extra persisted anywhere.
- `generatePlanet()` remains provably deterministic and position-agnostic, exactly as before this change.
