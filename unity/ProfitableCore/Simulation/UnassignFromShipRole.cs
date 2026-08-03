using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/unassignFromShipRole.ts. Mirrors DismissCrew's shape --
// a single, always-succeeds-unless-nothing-to-do action, no capacity/
// eligibility check needed since clearing a slot can never violate one.
public static class ShipRoleUnassigner
{
    public static UnassignShipRoleResult UnassignFromShipRole(CrewMember crewMember)
    {
        if (crewMember.ShipRole is null && crewMember.AssignedShipId is null)
        {
            return new UnassignShipRoleRejected { Reason = "crew member is not currently assigned to a ship role" };
        }

        var updatedCrewMember = new CrewMember
        {
            Id = crewMember.Id, HiredByPlayerId = crewMember.HiredByPlayerId, Tier = crewMember.Tier,
            Profession = crewMember.Profession, Status = crewMember.Status, AssignedCraftId = crewMember.AssignedCraftId,
            HiredAt = crewMember.HiredAt, LastCheckedAt = crewMember.LastCheckedAt, WageAmount = crewMember.WageAmount,
            LastPaidAt = crewMember.LastPaidAt, UnavailableUntil = crewMember.UnavailableUntil,
            ShipRole = null, AssignedShipId = null,
        };

        return new UnassignShipRoleSucceeded { UpdatedCrewMember = updatedCrewMember };
    }
}
