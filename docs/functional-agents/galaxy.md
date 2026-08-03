# Functional Agent: Galaxy

**Status: existing system, documented as-built.** Consolidates the galaxy-level (container/generation-orchestration) slice of Agent 8 (galaxy/planet generation) and Agent 10 (Phase 2 integration) — specifically the parts that operate on the *whole* galaxy rather than one planet's own roll, which is `planet.md`'s domain. This is also where future development of galaxy-level modifiers (generation parameters, discovery pacing, position/coordinate rules) should be tracked going forward, per this folder's own purpose.

## Responsibility

Generate a deterministic, seeded set of planets with positions, persist the seed (never the generated data itself), and track which planets a player has discovered. Owns the *container* — how many planets exist, where they sit in space, which are visible to the player — not any single planet's own tier/type/resource roll (`planet.md`).

## Inputs

- `Resource[]` (the loaded content catalog) — passed through to `planet.md`'s `generatePlanet()` for each index; this file never reads resource data itself beyond forwarding it.
- `createSeededRandom(seed)` / `generateRandomSeed()` (`src/galaxy/seededRandom.ts`) — the shared deterministic PRNG every seeded system in this project uses (galaxy positions, planet rolls, shipyard/scanner/crew pools). A small self-contained `mulberry32` PRNG seeded via a djb2-style string hash — not cryptographic, not a new dependency. `generateRandomSeed()` (real `Math.random()`, the one sanctioned non-deterministic call in this whole system) is used **only** when no seed is supplied at all, to produce the seed everything downstream then derives from deterministically.
- `SaveSystem` (`src/adapters/saveSystem.ts`) — the persistence adapter; this file's only interaction with it is saving/loading one string (the seed).

## Outputs

### `generateGalaxy(planetCount, resources, seed?)` — `src/galaxy/generateGalaxy.ts`
`(planetCount: number, resources: Resource[], seed?: string) => Galaxy` where `Galaxy = { seed: string, planets: Planet[] }`. If no `seed` is supplied, one is generated via `generateRandomSeed()` and returned so the caller can persist it. Positions are drawn from a **separate random stream** keyed `${gameSeed}:positions` (via `generatePosition()`, uniform within `POSITION_RANGE = ±1000` on both axes — a 2000×2000 square, `x`/`y` rounded to integers) so generating positions never perturbs any individual planet's own tier/type/resource-subset rolls. Each planet's own seed is `${gameSeed}:${index}` — **independent of `planetCount`**, confirmed empirically this session (re-verified when `PLANET_COUNT` changed from 5 to 50: planets 0-4's rolls were provably unaffected by how many more got generated after them). A fixed, finite set generated **once**, never a streaming/infinite generator.

### `galaxyState.ts` — `src/presentation/galaxyState.ts`
The presentation-layer module owning the *one* galaxy a running game actually has:
- `PLANET_COUNT = 50` — locked in Alpha Section 3 (`profitable-alpha-scale-performance-plan.md`): large enough that the map can't be taken in at a glance, round enough to reason about. Was 5 through Phase 2-5.
- `loadOrCreateGalaxy()` — loads a stored seed (`profitable:galaxySeed`) if one exists, else generates and persists a new one. **Only the seed round-trips through `SaveSystem`** — `generateGalaxy()` is deterministic given it, so the full planet array is never itself persisted (the same "small persisted key, large derived value" pattern `Ship.tier` and `CrewMember`'s derived fields don't use, since those genuinely mutate, but galaxy generation never does once rolled). **Pending amendment, found reviewing this file against `universe.md`:** the branch that generates a genuinely *new* seed (not one loaded from an existing save) is also where `universe.md`'s one-time Galaxy registry event belongs — `loadOrCreateGalaxy()` is the only place in the codebase that can tell "brand new galaxy" apart from "existing save reloading," which is exactly the distinction the registry needs and currently has no hook into. Not yet wired; `universe.md` describes the responsibility, this file doesn't implement it yet.
- `startingPlanet` / `secondaryDiscoveredPlanet` — `galaxy.planets[0]` / `[1]`, each overridden to `discovered: true` (every other generated planet starts `discovered: false`; picking/revealing a starting planet is this file's integration concern, not `planet.md`'s generation concern). **This file is also the source of truth for *which* planets are the two bootstrap planets**, which matters beyond discovery now: `planet.md`'s tutorial-guarantee clamp and `planet-ownership.md`'s colonist bootstrap exception (both apply to `startingPlanet` **and**, as of that file's own review pass, `secondaryDiscoveredPlanet` too) both key off this file's identification of the two — any caller needs this file's `startingPlanet`/`secondaryDiscoveredPlanet` to know which planets get which bootstrap treatment. `galaxy.md` itself never applies either guarantee; it only identifies the two planets `planet.md`/`planet-ownership.md` should apply them to.
- `getDiscoveredPlanets()` / `markPlanetDiscovered(planetId)` — the single source of truth for "which planets can the player currently see/travel to": the two bootstrap planets above, plus any planet id in a separately-persisted `discoveredPlanetIds` list (`profitable:discoveredPlanetIds`). A **necessary side-table**, not a mutation of `galaxy.planets` in place — `generatePlanet()` is deterministic and always reproduces `discovered: false` on reload, so discovery state can't live on the regenerated planet objects themselves. Every planet `getDiscoveredPlanets()` returns is normalized to `discovered: true` (the field on the raw `galaxy.planets` array is never trustworthy on its own). Called from a successful `resolveArrival()` (physical visitation) and `performScan()` (`travel.md`) — confirmed (via a dedicated map-verification test) to be the **only two** discovery paths anywhere in the codebase.

## Must NOT Do

- Must not persist the generated planet array itself — only the seed. Regenerating from a stored seed must always reproduce identical output; any change that breaks this (e.g., a non-deterministic step sneaking into `generateGalaxy()`) is a correctness bug, not a style choice.
- Must not let position generation influence any individual planet's tier/type/resource rolls, or vice versa — the two random streams (`:positions` vs `:${index}`) must stay independent, confirmed by every regeneration at a different `planetCount` needing to reproduce identical existing planets' rolls.
- Must not add a `z` coordinate or any 3D distance concept — 2D only, restated from `travel.md`'s own boundary on `calculateDistance()`.
- Must not add a second discovery path beyond physical arrival (`resolveArrival()`) and scanning (`performScan()`) — reopening "no scanner"-adjacent decisions through a new door is exactly what Travel Encounters' discovery-type guardrail exists to prevent (`encounters-combat.md`).
- Must not implement rendering/DOM/browser-API code in `generateGalaxy.ts` or `seededRandom.ts` — `galaxyState.ts` is presentation-adjacent (it owns `SaveSystem` interaction) but still contains no Phaser/DOM code itself.

## Testing Requirements

- `generateGalaxy()`: same seed reproduces an identical galaxy (regression-locked); each planet's own roll is unaffected by `planetCount`, verified by generating at two different counts from the same seed and diffing the first N planets; position values stay within `±POSITION_RANGE` on both axes.
- `createSeededRandom()`: same seed produces the same sequence; different seeds produce different sequences (no accidental collision for the specific seed strings this project actually uses).
- `getDiscoveredPlanets()`/`markPlanetDiscovered()`: bootstrap planets always included; a scanned-or-arrived planet is included after being marked, not before; re-marking an already-discovered planet is a no-op, not a duplicate entry.
- Regression (map verification): no code path anywhere sets `discovered: true` other than the two sanctioned ones — a negative test, not just a positive-path check.

## Definition of Done

- A new game generates (or a saved game reloads) an identical, reproducible galaxy from a single persisted seed string.
- A player's discovered-planet set is provably driven by exactly two mechanisms (physical arrival, scanning) — verified by a negative test, not assumed.
- `planet.md`'s `generatePlanet()` is called once per index with this file's own generated position and the shared resource catalog — never with any galaxy-level state this file didn't hand it explicitly.
