# Agent 20 (Amendment): Ships & Travel Core — Ship Fuel, Cargo Hold Capacity, Ship Crew Roles (Pilot/Combat Engineer/Science Officer)

**Status:** Amendment to the existing Agent 20 (`agent-20-ships-travel-core.md`), also folding in the Combat/Scanner amendments' own `resolveCombatChoice()`/`performScan()` functions. Not a new agent.

**Creation order:** Third, after the Agent 1 and Agent 16 amendments. Depends on both.

## Responsibility

Fuel/cargo preconditions on voyage initiation, refueling, and the three non-repair, non-Crafter Ship Crew Roles effects (Pilot, Combat Engineer, Science Officer) reaching into the functions that already own the systems they modify — never a parallel/duplicate formula.

## Outputs

### `calculateFuelCost(originPlanet, destinationPlanet): number` (new, `src/ships/calculateFuelCost.ts`)

`calculateDistance(...) * FUEL_COST_PER_DISTANCE_UNIT`. Throws if either planet lacks `.position` — same structural-precondition throw `calculateTravelTime()` already uses.

### `refuelShip(ship, wallet, amount): RefuelShipResult` (new, `src/ships/refuelShip.ts`)

Same shape as `purchaseScanner()`: checks funds, checks capacity (rejects an over-fill rather than silently clamping), deducts credits, adds fuel. No pool, no tier-rolled candidate, no refresh interval.

### `initiateVoyage()` amendment (`src/ships/initiateVoyage.ts`)

- **Fuel precondition:** throws if `ship.currentFuel < calculateFuelCost(originPlanet, destinationPlanet)`. On success, deducts the cost into `updatedShip`.
- **Cargo precondition:** throws if the summed `cargo` quantity exceeds `CARGO_HOLD_CAPACITY_BY_TIER` for the ship's installed `cargoHold` component tier (defaults to Grey capacity if no `cargoHold` installed).
- **Both checks are skipped entirely when `isRetreat === true`** — a forced retreat must never fail for fuel or cargo reasons (the same "never strand the player" reasoning `resolveEncounters()` already applies to retreat voyages being encounter-free). A retreat voyage's `updatedShip` is unchanged from the input.
- **New optional trailing `pilot?: CrewMember | null` parameter**, forwarded into `calculateTravelTime()` unmodified — this function does not resolve which crew member is assigned Pilot itself.
- **Return shape changed** from a bare `Voyage` to `InitiateVoyageResult` (`{voyage, updatedShip}`) — every call site (including `resolveCombatChoice()`'s two internal retreat-voyage calls) updated to destructure accordingly.

### `calculateTravelTime()` amendment (`src/ships/calculateTravelTime.ts`)

New optional trailing `pilot: CrewMember | null = null` parameter. When present, looks up `PILOT_SPEED_BONUS_BY_TIER` for the pilot's own crew tier and multiplies it into the existing `baseTravelTimeHours * speedModifier` computation. The caller is trusted to have already resolved which crew member is actually assigned as Pilot on this ship — this function does not re-validate `shipRole`/`assignedShipId`. Omitting the parameter (or passing `null`) reproduces pre-amendment behavior exactly.

### `resolveCombatChoice()` amendment (`src/ships/resolveCombatChoice.ts`)

- **Combat Engineer:** finds an assigned Combat Engineer on `ship` from the existing `ownedCrew` parameter (`assignedShipId === ship.id && shipRole === "Combat Engineer"`). If found, `COMBAT_ENGINEER_MITIGATION_BY_TIER` for their tier scales down both `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT` and `COMBAT_CREW_UNAVAILABLE_DURATION_HOURS` on a loss — mitigates the cost of losing, never the win/lose roll itself.
- **Pilot:** finds an assigned Pilot the same way, passed into both internal `initiateVoyage(..., true, pilot)` calls (flee and lose) so a retreat voyage benefits from the same speed bonus a forward voyage would.

### `performScan()` amendment (`src/ships/performScan.ts`)

New optional trailing `scienceOfficer: CrewMember | null = null` parameter. When present, `SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER` for their tier stacks additively onto the effective scan radius, on top of the owned scanner's own `SCANNER_TIER_RADIUS_BONUS`. Still rejects with "no scanner owned" if `ownedScanners` is empty, even with a Science Officer assigned — this is an additional lever on scan range, not a replacement for owning a scanner.

## Must NOT Do

- Must not let fuel/cargo preconditions apply to a retreat voyage.
- Must not re-derive or duplicate `PILOT_SPEED_BONUS_BY_TIER`/`COMBAT_ENGINEER_MITIGATION_BY_TIER`/`SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER` lookups outside the one place each is applied.
- Must not have `calculateTravelTime()`/`performScan()`/`resolveCombatChoice()` re-validate a passed crew member's `shipRole`/`assignedShipId` — the caller (or, for `resolveCombatChoice()`, its own `ownedCrew`-scoped lookup) owns that resolution.
- Must not let Combat Engineer affect the win/lose roll — mitigation only, applied after the outcome is decided.

## Testing Requirements

- `calculateFuelCost()`: distance-proportional, throws on missing position.
- `refuelShip()`: funds/capacity rejection, exact credit/fuel deltas.
- `initiateVoyage()`: fuel rejection/deduction/non-mutation; cargo rejection/success/Grey-default; both checks skipped for `isRetreat`; return shape is `{voyage, updatedShip}`.
- `calculateTravelTime()`: no-pilot argument matches pre-amendment output exactly; pilot bonus stacks multiplicatively with the ship-tier modifier; Grey-tier pilot (1.0x) is a no-op.
- `resolveCombatChoice()`: Combat Engineer mitigates both durability damage and crew-unavailable duration by the exact tier-scaled fraction; an engineer assigned to a *different* ship provides no mitigation; an assigned Pilot speeds up the retreat voyage; a pilot assigned elsewhere has no effect.
- `performScan()`: no-scienceOfficer argument matches pre-amendment output; bonus stacks on top of the scanner's own radius; still rejects with zero scanners owned even with a Science Officer assigned.

## Definition of Done

- All functions/amendments implemented and tested (`tests/ships/calculateFuelCost.test.ts`, `refuelShip.test.ts`, `initiateVoyage.test.ts`, `calculateTravelTime.test.ts`, `resolveCombatChoice.test.ts`, `performScan.test.ts`), full suite green with zero regressions.
- Systems Engineer's repair mechanic and the Crafter role's own repair effect (`resolveComponentRepair()`) are explicitly **out of scope** for this amendment — deferred to task #89, tracked in `docs/functional-agents/ship.md`.
