# Agent 1 (Amendment): Data Schema — Ship Fuel, Cargo Hold Capacity, Ship Crew Roles

**Status:** Amendment to the existing Agent 1, not a new agent.

**Creation order:** First, before Agent 16's and Agent 20's amendments below (both depend on these types/constants existing).

## Responsibility

Add the types and constants Ship Fuel, Cargo Hold Capacity, and Ship Crew Roles need — three design-questions.md sections closed together since all three amend the same `Ship`/`CrewMember` schema and the same constants file.

## Outputs

### `Ship` amendment (`src/data/types/ship.ts`)

Two new **required** fields: `fuelCapacity: number`, `currentFuel: number`. Required, not optional — same precedent `currentPlanetId` itself set (added required, every fixture/call site updated), not `Voyage.isRetreat`'s backward-compatible-optional pattern. `fuelCapacity` is derived from tier (`deriveFuelCapacity()`), recomputed by `assembleShip()` on every component change, the same moment `tier` itself recomputes — never set directly except by the starting-ship bootstrap exception (`STARTING_SHIP_FUEL_CAPACITY`, currently unreachable — no real new-game starting-ship bootstrap exists in the codebase yet; only `purchaseShip()` and `assembleShip()` set these fields today).

### `CrewMember` amendment (`src/data/types/crewMember.ts`)

Two new **optional/nullable** fields: `shipRole?: ShipCrewRole | null`, `assignedShipId?: string | null` — backward-compatible, same shape as `unavailableUntil`. Missing and `null` both mean "not assigned to any ship role."

### `ShipCrewRole` (new, `src/data/types/shipCrewRole.ts`)

`export type ShipCrewRole = "Pilot" | "Combat Engineer" | "Science Officer" | "Systems Engineer" | "Crafter";`

### New result types

- `InitiateVoyageResult` (`{ voyage: Voyage; updatedShip: Ship }`) — replaces `initiateVoyage()`'s old bare-`Voyage` return; fuel deduction is a real `Ship` state change the caller must persist.
- `RefuelShipResult` — discriminated union, same shape as `HireResult`/`PurchaseScannerResult`.
- `AssignShipRoleResult` — discriminated union (`{assigned:true, updatedCrewMember} | {assigned:false, reason}`), same shape as `AssignResult`/`HireResult`.

### New/amended constants (`src/data/constants/shipsAndTravelConfig.ts`)

- `FUEL_CAPACITY_BY_TIER` (Grey 50 → Gold 190), `FUEL_COST_PER_DISTANCE_UNIT = 0.03`, `REFUEL_COST_PER_UNIT = 2`, `STARTING_SHIP_FUEL_CAPACITY = 100` (bootstrap-exception constant, currently unused in any real code path — see the Definition of Done note below).
- `CARGO_HOLD_CAPACITY_BY_TIER` (Grey 5 → Gold 50) — constrains `Voyage.cargo` only, never general inventory.
- `CREW_SLOTS_BY_TIER` (`CrewSlotsByTierEntry`: `{tier, pilot, combatEngineerOrScienceOfficer, systemsEngineer, crafter}`, 7 rows) — `combatEngineerOrScienceOfficer` is one combined pool shared by both roles, not two independent caps.
- `PILOT_SPEED_BONUS_BY_TIER`, `COMBAT_ENGINEER_MITIGATION_BY_TIER`, `SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER`, `ARTISAN_MATERIAL_DISCOUNT_BY_TIER` — role-effect magnitude tables, all originated defaults/tunables per the design entry's own "not locked here" status.

All new tables follow the existing mutable-array-with-setter convention (`export let`/`export const readonly [] + setXForTier()`).

## Must NOT Do

- Must not make `Ship.fuelCapacity`/`currentFuel` optional — every code path that constructs a `Ship` (purchase, assemble, seed) sets them for real; there is no legacy pre-amendment save data to stay compatible with in this codebase's actual test/fixture set.
- Must not make `CrewMember.shipRole`/`assignedShipId` required — pre-amendment `CrewMember` records (hired before this shipped) have neither field.
- Must not split `combatEngineerOrScienceOfficer` into two separate fields — the design entry is explicit this is one shared pool.
- Must not invent a 5th `ComponentCategory` for crew capacity — `CREW_SLOTS_BY_TIER` scales by ship tier, same pattern as `FUEL_CAPACITY_BY_TIER`/`SHIP_TIER_SPEED_MODIFIER`.

## Definition of Done

- All new types/constants exist exactly as specified; every existing `Ship`/`CrewMember`-consuming test passes (fixtures updated to include the two new required `Ship` fields).
- Honestly flagged, not silently ignored: `STARTING_SHIP_FUEL_CAPACITY` has no applying code path — every `Ship` in the current codebase is either purchased (`purchaseShip()`, full tank at its own tier's `deriveFuelCapacity()`) or produced by `assembleShip()`'s recompute. A real "pre-assigned starting ship" bootstrap doesn't exist yet (only the debug-only `devSeed.ts`, never wired into onboarding).
