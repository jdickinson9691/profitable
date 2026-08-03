namespace Profitable.Core.Schema;

// Ports src/data/types/shipCrewRole.ts. Pilot/Combat Engineer/Science
// Officer/Systems Engineer are open to any hired crew member, any tier;
// Crafter requires Profession != null (tier 6-7 only), enforced by
// Sub-Phase D's AssignToShipRole (not yet ported), not by this type.
//
// Scoped early, same reasoning as Sub-Phase A's PlanetOwnershipConstants:
// CrewMember.ShipRole (Sub-Phase C's own schema) needs this enum to exist
// now even though the assignment logic that reads/writes it meaningfully
// (AssignToShipRole, GetCrewSlotsForShip) is Sub-Phase D's scope.
public enum ShipCrewRole
{
    Pilot,
    CombatEngineer,
    ScienceOfficer,
    SystemsEngineer,
    Crafter,
}
