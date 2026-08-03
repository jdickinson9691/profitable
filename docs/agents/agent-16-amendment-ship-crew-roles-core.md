# Agent 16 (Amendment): Crew Core — Ship Crew Roles

**Status:** Amendment to the existing Agent 16 (`agent-16-crew-core.md`), not a new agent.

**Creation order:** Second, after the Agent 1 amendment. Depends on `ShipCrewRole`, `CREW_SLOTS_BY_TIER`, `AssignShipRoleResult`.

## Responsibility

The crew-side half of Ship Crew Roles: resolving how many role slots a ship has, and assigning an already-hired crew member into one.

## Outputs

### `getCrewSlotsForShip(ship: Ship): CrewSlotsByTierEntry` (new, `src/ships/getCrewSlotsForShip.ts`)

Pure lookup: `deriveShipTier(ship)` → the matching `CREW_SLOTS_BY_TIER` row. Throws (structural, never a normal rejection) if a tier has no table entry — should not happen with the full 7-tier table intact.

### `assignToShipRole(crewMember, ship, role, currentRoster): AssignShipRoleResult` (new, `src/ships/assignToShipRole.ts`)

Mirrors `assignToCraft()`'s shape — operates on an already-hired `CrewMember`, never touches hiring/pool/wage machinery. `currentRoster` is the player's full owned-crew list; only entries already assigned to *this* ship count against capacity.

Rejects (returns `{assigned:false, reason}`, never throws — same "normal business rejection" class as `hireCrew()`'s capacity check):
- `role === "Crafter"` and `crewMember.profession === null`.
- The role's slot pool on this ship (at its derived tier) is already full — `combatEngineerOrScienceOfficer` is checked as one combined pool for both Combat Engineer and Science Officer, not two independent caps.

On success, returns `updatedCrewMember` with `shipRole`/`assignedShipId` set to the new assignment — reassigning a crew member (including to a different role or ship) overwrites their own prior assignment automatically, since both fields live on the same record. The other 4 roles (Pilot/Combat Engineer/Science Officer/Systems Engineer) are never gated by tier or profession — any hired crew member is eligible.

## Must NOT Do

- Must not create a second way to acquire crew — `assignToShipRole()` requires an already-hired `CrewMember`, never a candidate/pool.
- Must not let a crew member hold two ship-role slots at once (same ship or different ships) — enforced structurally by both fields living on one record, not by a separate uniqueness check.
- Must not gate the 4 non-Crafter roles by tier or profession.
- Must not treat `combatEngineerOrScienceOfficer` as two independent caps.

## Testing Requirements

- `getCrewSlotsForShip()`: returns the correct tier row; re-derives tier from installed components, not the ship's stale `.tier` field.
- `assignToShipRole()`: successful assignment for all 5 roles; Crafter rejection for `profession === null`; Crafter success for a professioned crew member; slot-full rejection respecting the combined Combat-Engineer/Science-Officer pool; capacity excludes the crew member's own prior assignment on the same ship; assignments to a different ship don't count against this ship's capacity; no mutation of the input `CrewMember`.

## Definition of Done

- Both functions implemented and tested (`tests/ships/getCrewSlotsForShip.test.ts`, `tests/ships/assignToShipRole.test.ts`), full suite green.
