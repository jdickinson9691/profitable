# Agent 22 (Amendment): Ships & Travel Presentation — Ship Fuel, Cargo Hold Capacity, Ship Crew Roles

**Status:** Amendment to the existing Agent 22 (`agent-22-ships-travel-presentation.md`), also touching `CrewScene.ts` (Agent 18's domain) and `CraftScene.ts` (Agent 5's domain). Not a new agent.

**Creation order:** Fourth, after the Agent 20 amendment. Depends on it.

## Responsibility

Surface fuel, cargo capacity, ship components, and crew role assignment in the UI; give the player a refuel action; show the Artisan material discount where crafting actually happens.

## Outputs

### `ShipyardScene.ts` amendment

The existing ship roster row gains a fuel readout (`fuel {currentFuel}/{fuelCapacity}`) and, only for a ship docked at the current planet with less than a full tank, a `> Refuel` action that tops off to `fuelCapacity` via `refuelShip()`. Every number shown (fuel amounts, cost) is `refuelShip()`'s own return value — never recomputed in the scene.

### `ShipStatusScene.ts` (new)

A consolidated per-ship status screen, closing the "no screen shows any of this" gap: name, current planet, fuel, cargo hold capacity (by installed `cargoHold` tier), all 4 component slots with a one-line description of what each actually affects, current crew-role occupancy per role (via `getCrewSlotsForShip()`), and an assignment control per owned crew member — one `> {role}` button per eligible role (Crafter omitted entirely for a crew member with no profession, never shown disabled), calling `assignToShipRole()`. Registered in `nav.ts` (`SCENE_KEYS.shipStatus`, label "Ship") and `main.ts`.

### `CrewScene.ts` amendment

The existing roster row gains a read-only `shipRole`/`assignedShipId` indicator (e.g. `, Pilot on ship-1`) when set — independent of `status`/`assignedCraftId`, since a crew member can be simultaneously "active" on a craft and holding a ship role. Actual assignment happens on `ShipStatusScene`, the one place that also knows per-role slot capacity; `CrewScene` never duplicates that control.

### `CraftScene.ts` amendment

An Artisan assigned as `ShipCrewRole: "Crafter"` on the active ship (`getShipRoster()[0]`, the same single-player "the ship" convention `TradeMapScene` already uses) discounts each general recipe's input-slot quantity by `ARTISAN_MATERIAL_DISCOUNT_BY_TIER` for their tier — rounded down, never below 1 unit — applied identically everywhere a slot quantity is read (`hasEnoughInputs()`, the status display, and the actual `consume()` call in `doCraft()`). Entirely upstream of `craft()`: `craft()`'s own signature, and `src/simulation/craft.ts` generally, are untouched.

## Must NOT Do

- Must not recompute `refuelShip()`/`assignToShipRole()`/`getCrewSlotsForShip()`'s own math in a scene — display their return values directly.
- Must not offer a `> Refuel` action for a ship not currently docked at the viewed planet.
- Must not add ship-role assignment controls to `CrewScene.ts` — that stays `ShipStatusScene`'s exclusive job, so per-role capacity is only ever checked in one place.
- Must not touch `craft()`'s signature or add a crew read anywhere in `src/simulation/craft.ts` for the Artisan discount.
- Must not apply the Artisan discount to component-recipe crafting (`ShipAssemblyScene.ts`) — the design entry scopes this to *general* (non-component) recipes only, `CraftScene`'s own exclusive domain.

## Testing Requirements

- Owned by manual/integration verification (this project's existing pattern for Phaser scene behavior — no automated Phaser test harness exists).
- Playtest: refuel a docked ship at the Shipyard and confirm the exact credit/fuel deltas; open `ShipStatusScene` for an owned ship and confirm fuel/cargo/component/crew-role numbers match what the core functions report; assign a crew member to each of the 5 roles and confirm `CrewScene`'s indicator updates; assign an Artisan as Crafter and confirm `CraftScene`'s displayed/consumed quantities drop by the correct tier-scaled fraction, floored, never below 1.

## Definition of Done

- All four scene changes implemented; `ShipStatusScene` registered in `nav.ts`/`main.ts`; a full playthrough (purchase a ship, refuel it, assemble components, assign crew to roles, craft with and without an assigned Artisan) matches the underlying core functions' outputs exactly.
