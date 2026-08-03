# Functional Agent: Planet Ownership (Colonists & Citadels)

**Status: mostly built — Colonist-Driven Production fully; Citadels' claim/build actions and schema fully, but the Level 2/3 benefits (refuel discount, cargo storage, repair) not yet wired.** Split from `planet.md` into its own file since these are a genuinely separate concern (investment/ownership) from generation (`planet.md`'s existing job) — same "one job per file" discipline `ship.md`/`travel.md` and `travel.md`/`encounters-combat.md` already follow. **Why the benefits still aren't wired:** `refuelShip()` and `Voyage.cargo` capacity now both exist (Ship Fuel/Cargo Hold Capacity, `ship.md`, built) but neither one's Citadel-discount/storage-exemption hook was added as part of that pass; `resolveComponentRepair()` still doesn't exist at all (deferred to task #89). `CITADEL_LEVEL_BENEFITS` already records what each level unlocks; wiring the three hooks remains open follow-on work. Contract: `agent-01-amendment-planet-ownership-schema.md`, `agent-37-planet-ownership-core.md`.

**Depends on:** `planet.md` (`Planet` type, `getCurrentPlanetResources()`, the resource reset cycle), `galaxy.md` (`startingPlanet`, `secondaryDiscoveredPlanet`, and — new, found reviewing this file against `galaxy.md`'s own persistence rule — the `discoveredPlanetIds` side-table pattern this file's own state must copy), `ship.md`'s Ship Crew Roles section (the Systems Engineer repair mechanic a Citadel's repair benefit accelerates), `travel.md` (fuel/refuel, which a Citadel discounts).

**Persistence, found missing when this file was cross-checked against `galaxy.md`'s own rule:** `Planet` objects are never persisted — they're deterministically regenerated fresh from the galaxy seed on every load (`galaxy.md`'s "must not persist the generated planet array itself" rule). `colonistCount`/`citadelLevel`/`ownedByPlayerId` below are real facts set by discrete player actions, not derivable from the seed the way tier/type/resources are — so, exactly like `discoveredPlanetIds`, they must live in a **separate persisted side-table**, never as fields baked directly into what `generatePlanet()` produces. A new `profitable:planetOwnershipState` key (`Record<planetId, { colonistCount: number, citadelLevel: 0|1|2|3, ownedByPlayerId: string | null }>`), read via `SaveSystem` and merged onto a freshly-generated `Planet` at read time, mirroring `getDiscoveredPlanets()`'s own "normalize the live-read value, never trust the regenerated object's own field" pattern. The `Planet.colonistCount`/`citadelLevel`/`ownedByPlayerId` fields referenced throughout this file are the *merged, read-time* view, not literal fields `generatePlanet()` itself sets.

## Responsibility

Gate a planet's minability behind a one-time colonist investment, and let a colonized planet be developed further into an owned Citadel providing real single-player infrastructure value (repair, refuel discount, cargo storage) — deliberately not defense, since no invasion threat model exists in this game yet.

## Inputs

- `Planet` type, `getCurrentPlanetResources()` (`planet.md`) — this file adds a precondition in front of the existing resource-generation logic, never duplicates it.
- `startingPlanet` / `secondaryDiscoveredPlanet` (`galaxy.md`) — the two planets that bypass the colonist gate entirely.
- `Wallet` (`planetary-markets.md`) — colonist transport and Citadel construction are both credits purchases, same shape as `purchaseShip()`/`refuelShip()`.
- `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT`, the Systems Engineer repair recommendation (`ship.md`) — a Citadel's repair benefit is an accelerant/enabler for that mechanic, not a separate repair formula.
- `REFUEL_COST_PER_UNIT` (`ship.md`) — a Citadel's refuel discount is a percentage off this existing constant, never a second fuel-pricing mechanism.

## Outputs

### Colonist-Driven Production — **built**

**Schema:** `colonistCount: number` (default 0) — lives in the `planetOwnershipState` side-table (above), keyed by `planetId`, **not** a field `generatePlanet()` sets. Constants (`src/data/constants/planetOwnership.ts`, tunable `let` + setter): `COLONIST_TRANSPORT_COST` (15cr/colonist, originated default) and `MINIMUM_COLONISTS_TO_PRODUCE` (5, originated default).

**Core:**
- **`transportColonists(ship, destinationPlanet, quantity, wallet, currentOwnershipEntry): TransportColonistsResult`** — `src/planets/transportColonists.ts`. **Requires `ship.currentPlanetId === destinationPlanet.id`, rejected otherwise** — without this check, the `ship` parameter has no real purpose, and "colonists are *transported*" would be true in name only; every other location-gated action in this design — `purchaseShip`, `purchaseScanner`, `refuelShip` — already requires physically being there. Checks funds, deducts credits, increments `colonistCount` on the returned, updated entry — takes the current entry explicitly rather than mutating `destinationPlanet` (this codebase's established immutable-update convention, same as `purchaseListing()`/`sellToMarket()`). **Colonists have no separate origin/supply** — abstracted as "arranged via credits" once docked. Not modeled as `VoyageCargoItem`s — independent of Cargo Hold Capacity's cap.
- **`getCurrentPlanetResources()` amendment** (`planet.md`) — returns an empty `producibleResourceIds` (mining unavailable) when `planet.colonistCount < MINIMUM_COLONISTS_TO_PRODUCE`, checked as the very first step. Binary gate only — once met, every existing rule in `planet.md` applies exactly as already documented. `colonistCount` itself is untouched by the reset cycle.
- **Bootstrap exception — both `startingPlanet` and `secondaryDiscoveredPlanet` (`galaxy.md`).** `ensureBootstrapColonization()` (`src/presentation/planetOwnershipState.ts`) floor-sets `colonistCount` to at least `MINIMUM_COLONISTS_TO_PRODUCE`, called from `galaxyState.ts`'s `loadOrCreateGalaxy()` fresh-seed branch (`isNewGalaxy`). Floor-set, not overwrite — safe to be idempotent, never claws back colonists transported beyond the minimum.
- **Minimal presentation** (`GatherScene.ts`): a `> Transport N Colonists` action shown when the current planet is under-colonized, above the (empty) gather button list — without this, the gate would make every non-bootstrap planet permanently unminable with no way to unlock one.

### Citadels — **schema and claim/build actions built; Level 2/3 benefits not yet wired**

**Schema:** `citadelLevel: 0 | 1 | 2 | 3` (0 = none), `ownedByPlayerId: string | null` — both live in the same `planetOwnershipState` side-table entry as `colonistCount`. Constant `CITADEL_LEVEL_BENEFITS` (`src/data/constants/planetOwnership.ts`, 3 rows, tunable): Level 1 — docking only, no mechanical effect; Level 2 — refuel discount + cargo storage; Level 3 — adds the repair benefit. Construction cost per level is credits + an optional material (Level 2/3 both use `iron-ingot`, reusing existing content, never an invented item). **Level 1 is honestly, deliberately inert** — TW2002's own level-1 citadel benefit is safety while logged off, protecting against an invasion threat this game has no model of at all. Kept as a named rung anyway for level-progression parity.

**Core — built:**
- **`claimPlanet(ship, planet, playerId, currentOwnershipEntry): ClaimPlanetResult`** — `src/planets/claimPlanet.ts`. Requires the claiming ship be docked at `planet`. Requires `colonistCount >= MINIMUM_COLONISTS_TO_PRODUCE` and not already claimed; sets `ownedByPlayerId`. Single-player-only concern as designed — contested claims once Multiplayer exists are explicitly not resolved here.
- **`buildCitadel(ship, planet, targetLevel, wallet, materialQuantityAvailable, currentOwnershipEntry): BuildCitadelResult`** — `src/planets/buildCitadel.ts`. Requires docking and ownership, requires `targetLevel === citadelLevel + 1` (sequential, no level-skipping), checks/deducts credits. **Never touches `Inventory` directly** — `materialQuantityAvailable` is pre-resolved by the caller (`totalQuantity(inventory, resourceId)`), and a successful result reports `materialResourceId`/`materialQuantityConsumed` for the caller to `consume()` afterward, the same boundary `craft()` already holds against the `Inventory` container.
- **Minimal presentation** (`GatherScene.ts`): `> Claim Planet` / `> Build Citadel Level N (cost)` actions, shown in the same next-action section colonist transport uses.

**Not yet wired — `ship.md`'s Ship Fuel/Cargo Hold Capacity are now built, but these three hooks into them were never part of that pass and remain open:**
- **Refuel discount (Level 2+):** designed to read the docked ship's current planet's `citadelLevel` and discount `REFUEL_COST_PER_UNIT` for that transaction. `refuelShip()` itself now exists and is wired into `ShipyardScene` — it just always charges the flat rate; the Citadel-discount branch was never added.
- **Cargo storage (Level 2+):** designed to hold `Voyage.cargo` while docked without occupying `cargoHold` capacity. `Voyage.cargo`/Cargo Hold Capacity are now built (`initiateVoyage()`'s capacity check) — the storage exemption itself was never added.
- **Repair (Level 3):** the resolved 3-way interaction with Systems Engineer (`ship.md`'s `resolveComponentRepair()`) — additively stacking, mutually exclusive with the Crafter role's own repair effect by construction (docked vs. traveling). Fully specified, still waiting on `resolveComponentRepair()` (task #89).

## Must NOT Do

- **Must not add any garrison/fighter/defense field or mechanic to `Planet` or a Citadel** — explicitly out of scope; no invasion threat model exists, and Multiplayer's own locked design is asynchronous with no shared real-time presence. Revisit only if that changes.
- **Must not model colonist transport as `VoyageCargoItem`s or gate it by Cargo Hold Capacity** — a dedicated action, independent of that cap.
- **Must not let the resource reset cycle (`planet.md`) touch `colonistCount`, `citadelLevel`, or `ownedByPlayerId`** — all three are permanent once set, unlike the resource subset/quality they gate access to.
- **Must not store `colonistCount`/`citadelLevel`/`ownedByPlayerId` as direct fields on the object `generatePlanet()` produces** — they belong exclusively in the persisted `planetOwnershipState` side-table, merged at read time; baking them into the deterministic generation output would silently reset every colonized/claimed planet on the next reload.
- **Must not let Citadel ownership affect discovery** — `getDiscoveredPlanets()`/`markPlanetDiscovered()` (`galaxy.md`) are untouched; a Citadel doesn't reveal or extend range to any other planet, that's Scanner's exclusive job.
- **Must not require a Citadel for basic mining** — the colonist binary gate is the only mining prerequisite; a Citadel is a further, optional investment on an already-productive planet.
- **Must not give the refuel discount or repair benefit its own pricing/repair formula** — both are percentage modifiers on `ship.md`'s existing constants/mechanics, never a second parallel system.
- **Must not allow `transportColonists()`, `claimPlanet()`, or `buildCitadel()` to succeed for a ship that isn't currently docked at the target planet** — found missing on review; without this, colonist "transport" and on-planet claiming/building would be reachable from anywhere, contradicting the whole premise that these are location-bound investments, and leaving `transportColonists()`'s `ship` parameter with no enforced purpose.
- **Must not implement rendering/DOM/browser-API code in any core file this section adds.**

## Testing Requirements

- `transportColonists()`: rejects on insufficient funds; rejects when the ship isn't docked at `destinationPlanet`; correctly increments `colonistCount` in the `planetOwnershipState` side-table; no upper bound enforced unless one is separately decided.
- `getCurrentPlanetResources()`: returns empty `producibleResourceIds` below `MINIMUM_COLONISTS_TO_PRODUCE`; behaves exactly as `planet.md` already documents at or above it; a reset cycle never changes `colonistCount`.
- **Persistence (the regression case this pass specifically found):** a planet colonized/claimed/built-up, then the game reloaded (galaxy regenerated fresh from the same seed), still shows its correct `colonistCount`/`citadelLevel`/`ownedByPlayerId` — proving the side-table merge works, not just that `generatePlanet()` runs.
- Bootstrap planets: both `startingPlanet` and `secondaryDiscoveredPlanet` show `colonistCount >= MINIMUM_COLONISTS_TO_PRODUCE` on a fresh game, verified across many seeds — the tutorial/A3/A4-viability guarantee this exception exists for.
- `claimPlanet()`/`buildCitadel()`: both rejected when the ship isn't docked at the target planet; claim rejected below the colonist threshold; build rejected out of sequence (can't skip from level 0 to 2) or without ownership; funds/materials deducted exactly.
- **Pending, once `ship.md` lands:** refuel discount / cargo storage / repair, each verified present only at its stated `citadelLevel` and only for the owning player. Repair specifically: additive with a simultaneously-assigned Systems Engineer (`ship.md`'s `resolveComponentRepair()` test suite owns the full 3-way matrix; this file's own tests only need to confirm the Citadel-side gate is correctly wired in).
- Regression: `planet.md`'s existing generation/reset/tutorial-guarantee tests pass unmodified when a planet has no `planetOwnershipState` entry — confirmed via full suite (617 tests, zero failures).

## Definition of Done

- A newly-generated planet (other than the two bootstrap planets) cannot be mined until a player transports enough colonists; both bootstrap planets are always immediately minable. **Built and tested.**
- A player can claim a sufficiently-colonized planet and build a Citadel up through level 3 via `GatherScene`. **Built and tested** — refuel discount, cargo storage, and repair benefits are recorded in `CITADEL_LEVEL_BENEFITS` but not yet wired into any gameplay effect (pending `ship.md`).
- Colonist/citadel/ownership state provably survives a reload — read from `planetOwnershipState`, never reset by `generatePlanet()`'s own deterministic regeneration. **Built.**
- No defense/garrison mechanic exists anywhere in this file's scope.
- Every existing `planet.md` guarantee (fixed quality, reset cycle, starting-planet tutorial clamp) is provably unaffected on a planet with no `planetOwnershipState` entry. **Verified via full suite.**
