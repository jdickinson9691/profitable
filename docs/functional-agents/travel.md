# Functional Agent: Travel

**Status: existing system, documented as-built; Ship Fuel/Cargo Hold Capacity/Pilot amendment now built too.** Consolidates the travel slice of Agent 20 (core) + its Scanner amendment, Agent 22 (presentation) + its Scanner amendment, and Agent 23 (content). Cross-references `ship.md` for the fuel/cargo-capacity gates on `initiateVoyage()` (built) and `encounters-combat.md` for what happens once a voyage is under way. **Real doc/code drift found and fixed this pass:** this file already claimed the shipyard/scanner pools "refresh" on their documented intervals, but `getShipyardPool()`/`getScannerPool()` (`src/presentation/shipsState.ts`) generated a pool once and cached it forever — the interval constants existed and were tunable, but nothing ever compared elapsed time against them (the same gap `crew.md` found and fixed for `getCrewPool()`). Both getters now correctly re-roll once their own interval has elapsed since the stored pool's `lastRefreshedAt`; the "refreshed every N hours" language below is accurate as of this fix, not before it.

## Responsibility

Compute travel time between planets, run the shipyard/scanner acquisition pools, and initiate/resolve voyages — delivering a ship and its carried cargo (capped by `ship.md`'s Cargo Hold Capacity) to its destination.

## Inputs

- `Ship`, `Planet` (specifically `.position`), `TierColor` (`ship.md`).
- `deriveShipTier()`/`assembleShip()` (`ship.md`) — read/called, never reimplemented.
- `Wallet` (`planetary-markets.md`).

## Outputs

### `calculateDistance(a, b)` — `src/ships/calculateDistance.ts`
`(a: PlanetPosition, b: PlanetPosition) => number`. Euclidean, 2D only — no `z` coordinate, ever (Phase 2's galaxy generation is explicitly 2D).

### `calculateTravelTime(origin, destination, ship, pilot?)` — `src/ships/calculateTravelTime.ts`
`(origin: Planet, destination: Planet, ship: Ship, pilot?: CrewMember | null) => number` (milliseconds). `calculateDistance(...) * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT [0.01] * SHIP_TIER_SPEED_MODIFIER[ship.tier] * pilotMultiplier * MS_PER_HOUR`. `SHIP_TIER_SPEED_MODIFIER` (`src/data/constants/shipsAndTravelConfig.ts`): Grey 1.0 (baseline) down to Gold 0.45 (fastest). Throws if either planet lacks `.position`. **Built (`ship.md`'s Ship Crew Roles, Pilot):** `pilot` is a new, optional trailing parameter — when a Pilot crew member is passed, `PILOT_SPEED_BONUS_BY_TIER` for their own crew tier multiplies in on top of the ship-tier modifier; omitted or `null` reproduces pre-amendment output exactly. The caller resolves which crew member is actually assigned Pilot; this function doesn't re-validate the assignment itself.

### `initiateVoyage(ship, origin, destination, cargo, currentTime, id, isRetreat?, pilot?)` — `src/ships/initiateVoyage.ts`
`arrivesAt` computed **once**, via `calculateTravelTime()`, and never recomputed mid-flight — the single hardest-locked rule in this whole system (Hazard's and Combat's designs both explicitly reasoned around never breaking it). `isRetreat` (optional) suppresses `resolveEncounters()` for that one voyage (`encounters-combat.md`). **Built (`ship.md`'s Ship Fuel/Cargo Hold Capacity):** two precondition checks run before `arrivesAt` is computed, both hard rejections (throw): fuel sufficiency (`ship.currentFuel < calculateFuelCost(origin, destination)`, deducted into the returned `updatedShip` on success) and cargo-quantity-vs-`CARGO_HOLD_CAPACITY_BY_TIER` (Grey-tier default if no `cargoHold` installed). **Both checks are skipped entirely when `isRetreat === true`** — a forced retreat never fails for fuel/cargo reasons. Return shape changed from a bare `Voyage` to `{voyage, updatedShip}` (`InitiateVoyageResult`) to carry the fuel deduction back to the caller. `pilot` (optional) is forwarded into `calculateTravelTime()` unchanged.

### `resolveArrival(voyage, ship, currentTime, destinationPlanet?, resources?, random?)` — `src/ships/resolveArrival.ts`
Rejects if `currentTime < voyage.arrivesAt`. Updates `ship.currentPlanetId`. Reports `cargo` in its result but **never creates a `Listing`** — the Phase 3 remote-sale mechanic's `Listing` creation is a caller/integration responsibility, still not wired into any scene (`TradeMapScene` always initiates voyages with `cargo: []`; `ship.md`'s Cargo Hold Capacity gives the field a real limit but doesn't itself fix this UI gap). Optionally rolls travel-window + arrival-check encounters/combat when `destinationPlanet` + `resources` are supplied (`encounters-combat.md`).

### Shipyard pool/purchase — `src/ships/refreshShipyardPool.ts`, `purchaseShip.ts`
`SHIPYARD_POOL_SIZE_PER_PLANET = 3`, refreshed every `SHIPYARD_POOL_REFRESH_INTERVAL_HOURS = 24`. `SHIP_PURCHASE_COST_BY_TIER`: Grey 300 → Gold 9000. **No ownership-capacity limit** — `purchaseShip.ts`'s own comment confirms this was a deliberate non-decision (no analog to `CrewCapacity` was ever designed for ships), not an oversight to fix here. A freshly-purchased ship gets a full tank at its own tier's `deriveFuelCapacity()`, never `STARTING_SHIP_FUEL_CAPACITY` (that constant's bootstrap exception has no applying code path — see `ship.md`'s status note).

### Refuel — `src/ships/refuelShip.ts` (built, `ship.md`'s Ship Fuel)
`refuelShip(ship, wallet, amount): RefuelShipResult`. Same shape as `purchaseScanner()`: checks funds (`amount * REFUEL_COST_PER_UNIT`), checks capacity (rejects an over-fill rather than clamping), deducts credits, adds fuel. No pool, no refresh interval — a flat-rate action available at any planet with a shipyard, wired into `ShipyardScene`.

### Scanner pool/purchase/scan — `src/ships/refreshScannerPool.ts`, `purchaseScanner.ts`, `performScan.ts`
Mirrors the shipyard pattern: `SCANNER_POOL_SIZE_PER_PLANET = 2` / `48h` refresh, `SCANNER_PURCHASE_COST_BY_TIER` 200 → 12,800 (doubling per tier). `performScan(ship, dockedPlanet, ownedScanners, allPlanets, scienceOfficer?)` rejects if not docked, the planet is undiscovered, or no scanner is owned; radius = `SCANNER_BASE_SCAN_RADIUS [120]` + the **highest-tier owned scanner's** bonus only (`SCANNER_TIER_RADIUS_BONUS`, Grey +0 → Gold +350 — never summed across multiple owned scanners). A scanner is a standalone item, structurally separate from `ComponentCategory` — never a 5th ship component, never folded into `deriveShipTier()`'s averaging (`profitable-design-questions.md`, Scanner/Probe section). **Built (`ship.md`'s Ship Crew Roles, Science Officer):** `scienceOfficer` is a new, optional trailing parameter — when present, `SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER` for their crew tier stacks additively on top of the scanner's own bonus. Still rejects with zero scanners owned, even with a Science Officer assigned.

### Presentation — `ShipyardScene.ts`, `TradeMapScene.ts`, `ShipStatusScene.ts`
`ShipyardScene`: browse/purchase ships and scanners, owned-ship/scanner lists (now with a fuel readout and `> Refuel` action per docked ship), read-only otherwise. `TradeMapScene`: per-discovered-planet market display (reads `planetary-markets.md`'s live state) + a Travel section acting on `getShipRoster()[0]` (the "active ship" — no in-game picker exists; the Debug panel's `[ Make Active ]` reordering is a debug-only workaround, not a real feature) showing pending combat, in-flight voyages with a `> Resolve Arrival` action once arrived, and, when docked, `> Scan` and per-destination `> Initiate Voyage` (now surfacing an insufficient-fuel/cargo rejection message instead of crashing). `ShipStatusScene` (new, `ship.md`): a consolidated per-ship status screen — fuel, cargo hold capacity, components, and crew role assignment.

## Must NOT Do

- Must not recompute `arrivesAt` after voyage initiation, for any reason (fuel, cargo, hazard, or otherwise) — locked since Phase 5, restated by every subsequent amendment's own design reasoning.
- Must not touch `refine()`/`craft()`, galaxy/planet generation, trading, or crew logic to accommodate travel data.
- Must not implement any travel-hazard mechanic beyond what Encounters/Combat already define (`encounters-combat.md`) — no new hazard type invented here.
- Must not add a real-time/continuous ship position — travel resolves via deterministic catch-up (`resolveArrival()`), by design; a scanner's discovery-range check reuses `calculateDistance()` against a *docked* planet's position, never a mid-voyage coordinate.
- Must not stack multiple owned scanners' radius bonuses — highest-tier only.
- Must not implement rendering/DOM/browser-API code anywhere in `src/ships/`.

## Testing Requirements

- `calculateTravelTime()`: matches a hand-calculated example combining distance and ship-tier modifier exactly.
- `initiateVoyage()`/`resolveArrival()`: a voyage cannot resolve before `arrivesAt`; `ship.currentPlanetId` updates correctly on arrival; `isRetreat` correctly suppresses encounter rolling.
- `performScan()`: rejects when undocked, planet undiscovered, or no scanner owned; radius uses highest-tier-owned only, verified against a multi-scanner-ownership case.
- Regression: `refine()`/`craft()`/galaxy generation/trading/crew provably unaffected.

## Definition of Done

- A player can purchase a ship and scanner, see accurate travel times reflecting both distance and ship tier, scan for new planets while docked, initiate a voyage to any discovered planet, and resolve it correctly on arrival.
- `arrivesAt` is provably locked at initiation across every code path that touches a `Voyage` — no test or code path recomputes it.
- Every displayed value in `ShipyardScene`/`TradeMapScene`'s travel section is sourced directly from this file's functions — never recalculated in the presentation layer.
