# Functional Agent: Planet Ownership (Colonists)

**Status: Colonist-Driven Production is built — no known gaps remain.** Split from `planet.md` into its own file since this is a genuinely separate concern (investment/ownership) from generation (`planet.md`'s existing job) — same "one job per file" discipline `ship.md`/`travel.md` and `travel.md`/`encounters-combat.md` already follow.

**Retroactive removal (2026-08-04): Citadels cut from alpha scope.** Citadels (3-level planet upgrade: docking, refuel discount, depth-scaled repair) had been fully built and wired — schema, `claimPlanet()`/`buildCitadel()`, the `refuelShip()` discount, the `resolveComponentRepair()` tiered benefit, `GatherScene` actions, and the full Unity C# port, all with passing tests. It was removed as a scope reduction for alpha content authoring, not because of a design or implementation flaw — the mechanic worked as designed. Removed: `claimPlanet.ts`/`buildCitadel.ts` and their result types/tests (TS and C# both), `citadelLevel`/`ownedByPlayerId` from `Planet`/`PlanetOwnershipEntry`/`mergePlanetOwnership()`, `CITADEL_LEVEL_BENEFITS`/`CITADEL_LEVEL_2_REPAIR_RATE`/`CITADEL_LEVEL_3_REPAIR_RATE` and all citadel-aware branches in `refuelShip()`/`resolveComponentRepair()` (both reverted to their pre-Citadels signatures), and the `> Claim Planet`/`> Build Citadel` actions in `GatherScene`/`GatherPanel.cs`. **Colonist-Driven Production is entirely unaffected** — it never depended on Citadels for anything, and this file's Colonist-Driven Production section below is unchanged. Full design history preserved in `profitable-design-questions.md`'s Citadels section (also carries a retroactive note) and `profitable-tradewars-alignment.md`; not revisited unless a future scope pass reopens it.

**Real regression this removal caused, Unity-only: `> Check Repair` is now a no-op for every ship in the Unity build.** TS is unaffected — `ShipStatusScene` has real `> Assign`/`> Unassign` ship-crew-role UI, so a Systems Engineer or Crafter can actually be assigned and contribute to `resolveComponentRepair()`. Unity never got that assignment UI (`agent-56-unity-ships-travel-presentation.md`'s own scope note; `docs/unity-migration-phase2-checklist.md`'s Sub-Phase D entry lists it as deferred, not built) — no code path anywhere in `unity/ProfitableUnity/` ever calls `AssignToShipRole`, confirmed by grep. Before this removal, Citadel repair was the one rate source `> Check Repair` could still reach in Unity despite that gap (`agent-62-unity-planet-ownership-integration.md`'s own fix made sure of it). With Citadel gone and crew-role assignment still unbuilt in Unity, `ComponentRepairResolver.ResolveComponentRepair()` now has zero eligible rate sources on every call there — it still stamps `Ship.LastRepairedAt`, but restores no durability. `ShipsPanel.cs`'s `CheckRepair()` (`unity/ProfitableUnity/Assets/Scripts/UI/ShipsPanel.cs:280-289`) documents this in its own comment. Not fixed as part of this removal — fixing it means building Ship Crew Roles assignment UI in Unity, a real, separately-scoped piece of work, not a quick patch. Tracked in `CLAUDE.md` and `docs/unity-migration-phase2-checklist.md`.

**Task #89 follow-on (predates the Citadels removal above, still current):** `resolveComponentRepair()` has a real caller (`ShipStatusScene`'s `> Check Repair` action) and full test coverage (`tests/ships/resolveComponentRepair.test.ts`). Contract: `agent-01-amendment-planet-ownership-schema.md`, `agent-37-planet-ownership-core.md` (both historical records, written before the Citadels removal).

**Depends on:** `planet.md` (`Planet` type, `getCurrentPlanetResources()`, the resource reset cycle), `galaxy.md` (`startingPlanet`, `secondaryDiscoveredPlanet`, and the `discoveredPlanetIds` side-table pattern this file's own state copies), `planetary-markets.md`'s `Wallet` (colonist transport is a credits purchase, same shape as `purchaseShip()`/`refuelShip()`).

**Persistence:** `Planet` objects are never persisted — they're deterministically regenerated fresh from the galaxy seed on every load (`galaxy.md`'s "must not persist the generated planet array itself" rule). `colonistCount` below is a real fact set by discrete player actions, not derivable from the seed the way tier/type/resources are — so, exactly like `discoveredPlanetIds`, it must live in a **separate persisted side-table**, never as a field baked directly into what `generatePlanet()` produces. A `profitable:planetOwnershipState` key (`Record<planetId, { colonistCount: number }>`), read via `SaveSystem` and merged onto a freshly-generated `Planet` at read time, mirroring `getDiscoveredPlanets()`'s own "normalize the live-read value, never trust the regenerated object's own field" pattern. The `Planet.colonistCount` field referenced throughout this file is the *merged, read-time* view, not a literal field `generatePlanet()` itself sets.

## Responsibility

Gate a planet's minability behind a one-time colonist investment.

## Inputs

- `Planet` type, `getCurrentPlanetResources()` (`planet.md`) — this file adds a precondition in front of the existing resource-generation logic, never duplicates it.
- `startingPlanet` / `secondaryDiscoveredPlanet` (`galaxy.md`) — the two planets that bypass the colonist gate entirely.
- `Wallet` (`planetary-markets.md`) — colonist transport is a credits purchase, same shape as `purchaseShip()`/`refuelShip()`.

## Outputs

### Colonist-Driven Production — **built**

**Schema:** `colonistCount: number` (default 0) — lives in the `planetOwnershipState` side-table (above), keyed by `planetId`, **not** a field `generatePlanet()` sets. Constants (`src/data/constants/planetOwnership.ts`, tunable `let` + setter): `COLONIST_TRANSPORT_COST` (15cr/colonist, originated default) and `MINIMUM_COLONISTS_TO_PRODUCE` (5, originated default).

**Core:**
- **`transportColonists(ship, destinationPlanet, quantity, wallet, currentOwnershipEntry): TransportColonistsResult`** — `src/planets/transportColonists.ts`. **Requires `ship.currentPlanetId === destinationPlanet.id`, rejected otherwise** — without this check, the `ship` parameter has no real purpose, and "colonists are *transported*" would be true in name only; every other location-gated action in this design — `purchaseShip`, `purchaseScanner`, `refuelShip` — already requires physically being there. Checks funds, deducts credits, increments `colonistCount` on the returned, updated entry — takes the current entry explicitly rather than mutating `destinationPlanet` (this codebase's established immutable-update convention, same as `purchaseListing()`/`sellToMarket()`). **Colonists have no separate origin/supply** — abstracted as "arranged via credits" once docked. Not modeled as `VoyageCargoItem`s — independent of Cargo Hold Capacity's cap.
- **`getCurrentPlanetResources()` amendment** (`planet.md`) — returns an empty `producibleResourceIds` (mining unavailable) when `planet.colonistCount < MINIMUM_COLONISTS_TO_PRODUCE`, checked as the very first step. Binary gate only — once met, every existing rule in `planet.md` applies exactly as already documented. `colonistCount` itself is untouched by the reset cycle.
- **Bootstrap exception — both `startingPlanet` and `secondaryDiscoveredPlanet` (`galaxy.md`).** `ensureBootstrapColonization()` (`src/presentation/planetOwnershipState.ts`) floor-sets `colonistCount` to at least `MINIMUM_COLONISTS_TO_PRODUCE`, called from `galaxyState.ts`'s `loadOrCreateGalaxy()` fresh-seed branch (`isNewGalaxy`). Floor-set, not overwrite — safe to be idempotent, never claws back colonists transported beyond the minimum.
- **Minimal presentation** (`GatherScene.ts`): a `> Transport N Colonists` action shown when the current planet is under-colonized, above the (empty) gather button list — without this, the gate would make every non-bootstrap planet permanently unminable with no way to unlock one.

## Must NOT Do

- **Must not model colonist transport as `VoyageCargoItem`s or gate it by Cargo Hold Capacity** — a dedicated action, independent of that cap.
- **Must not let the resource reset cycle (`planet.md`) touch `colonistCount`** — permanent once set, unlike the resource subset/quality it gates access to.
- **Must not store `colonistCount` as a direct field on the object `generatePlanet()` produces** — it belongs exclusively in the persisted `planetOwnershipState` side-table, merged at read time; baking it into the deterministic generation output would silently reset every colonized planet on the next reload.
- **Must not require anything beyond the colonist binary gate for basic mining.**
- **Must not allow `transportColonists()` to succeed for a ship that isn't currently docked at the target planet** — without this, colonist "transport" would be reachable from anywhere, contradicting the whole premise that this is a location-bound investment, and leaving `transportColonists()`'s `ship` parameter with no enforced purpose.
- **Must not reintroduce Citadels' schema/functions without re-reading the retroactive-removal note above and `profitable-design-questions.md`'s Citadels section** — it was a working, tested system cut for scope reasons, not correctness ones, so reviving it is a re-scoping decision, not a bug fix.
- **Must not implement rendering/DOM/browser-API code in any core file this section adds.**

## Testing Requirements

- `transportColonists()`: rejects on insufficient funds; rejects when the ship isn't docked at `destinationPlanet`; correctly increments `colonistCount` in the `planetOwnershipState` side-table; no upper bound enforced unless one is separately decided.
- `getCurrentPlanetResources()`: returns empty `producibleResourceIds` below `MINIMUM_COLONISTS_TO_PRODUCE`; behaves exactly as `planet.md` already documents at or above it; a reset cycle never changes `colonistCount`.
- **Persistence:** a planet colonized, then the game reloaded (galaxy regenerated fresh from the same seed), still shows its correct `colonistCount` — proving the side-table merge works, not just that `generatePlanet()` runs.
- Bootstrap planets: both `startingPlanet` and `secondaryDiscoveredPlanet` show `colonistCount >= MINIMUM_COLONISTS_TO_PRODUCE` on a fresh game, verified across many seeds — the tutorial/A3/A4-viability guarantee this exception exists for.
- Regression: `planet.md`'s existing generation/reset/tutorial-guarantee tests pass unmodified when a planet has no `planetOwnershipState` entry.

## Definition of Done

- A newly-generated planet (other than the two bootstrap planets) cannot be mined until a player transports enough colonists; both bootstrap planets are always immediately minable. **Built and tested.**
- Colonist ownership state provably survives a reload — read from `planetOwnershipState`, never reset by `generatePlanet()`'s own deterministic regeneration. **Built.**
- Every existing `planet.md` guarantee (fixed quality, reset cycle, starting-planet tutorial clamp) is provably unaffected on a planet with no `planetOwnershipState` entry. **Verified via full suite.**
