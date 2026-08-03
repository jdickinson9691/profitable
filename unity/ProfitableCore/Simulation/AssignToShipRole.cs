using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/assignToShipRole.ts. Mirrors AssignToCraft's shape --
// operates on an already-hired CrewMember, never touches hiring/pool/
// wage machinery. CurrentRoster is the player's full owned-crew list.
public static class ShipRoleAssigner
{
    public static AssignShipRoleResult AssignToShipRole(CrewMember crewMember, Ship ship, ShipCrewRole role, IReadOnlyList<CrewMember> currentRoster)
    {
        // Only tier-6/7 crew (profession != null) are eligible for
        // Crafter. The other 4 roles are explicitly NOT gated by tier or
        // profession.
        if (role == ShipCrewRole.Crafter && crewMember.Profession is null)
        {
            return new AssignShipRoleRejected { Reason = "only a crew member with a profession can be assigned the Crafter role" };
        }

        var slots = ShipCrewSlotResolver.GetCrewSlotsForShip(ship);
        // CombatEngineerOrScienceOfficer is a single combined pool shared
        // by both roles, not two independent caps.
        var isCombinedPoolRole = role is ShipCrewRole.CombatEngineer or ShipCrewRole.ScienceOfficer;
        var capacity = isCombinedPoolRole
            ? slots.CombatEngineerOrScienceOfficer
            : role switch
            {
                ShipCrewRole.Pilot => slots.Pilot,
                ShipCrewRole.SystemsEngineer => slots.SystemsEngineer,
                _ => slots.Crafter,
            };

        if (capacity <= 0)
        {
            return new AssignShipRoleRejected { Reason = $"no {role} slot exists on a {ship.Tier}-tier ship" };
        }

        var occupied = currentRoster.Count(member =>
            member.Id != crewMember.Id &&
            member.AssignedShipId == ship.Id &&
            (isCombinedPoolRole
                ? member.ShipRole is ShipCrewRole.CombatEngineer or ShipCrewRole.ScienceOfficer
                : member.ShipRole == role));

        if (occupied >= capacity)
        {
            return new AssignShipRoleRejected { Reason = $"{role} slot is full ({occupied}/{capacity})" };
        }

        // Reassigning clears the previous assignment automatically --
        // both fields live on this same CrewMember record, so overwriting
        // them is the entire "clear the previous one" rule.
        var updatedCrewMember = new CrewMember
        {
            Id = crewMember.Id, HiredByPlayerId = crewMember.HiredByPlayerId, Tier = crewMember.Tier,
            Profession = crewMember.Profession, Status = crewMember.Status, AssignedCraftId = crewMember.AssignedCraftId,
            HiredAt = crewMember.HiredAt, LastCheckedAt = crewMember.LastCheckedAt, WageAmount = crewMember.WageAmount,
            LastPaidAt = crewMember.LastPaidAt, UnavailableUntil = crewMember.UnavailableUntil,
            ShipRole = role, AssignedShipId = ship.Id,
        };

        return new AssignShipRoleSucceeded { UpdatedCrewMember = updatedCrewMember };
    }
}
