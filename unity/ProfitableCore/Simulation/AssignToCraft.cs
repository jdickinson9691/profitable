using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/assignToCraft.ts. Calls Crafter.Craft using this crew
// member's tier as the crafter input -- never reimplements any part of
// the formula. "Simultaneously with the player's own craft and other
// crew members' crafts" just means this call carries no shared/locked
// state with any other crafter's call: Craft is already a pure,
// independent function, so nothing here serializes multiple crew members
// into a single-craft-at-a-time queue.
//
// Profession is not passed to Craft -- there is no mechanism anywhere in
// the crafting formula for a profession bonus, and no recipe-to-
// profession eligibility mapping exists either. The real TypeScript
// function never returns a rejection either (always succeeds given a
// CraftAction) -- AssignResult's AssignRejected case exists for the
// type's own completeness, not because this function ever constructs one.
public static class AssignToCraftSimulation
{
    public static AssignResult AssignToCraft(CrewMember crewMember, CraftAction craftAction, RandomFn? random = null)
    {
        var craftResult = Crafter.Craft(craftAction.Inputs, craftAction.Recipe, craftAction.SchematicTier, crewMember.Tier, random);

        var updatedCrewMember = new CrewMember
        {
            Id = crewMember.Id,
            HiredByPlayerId = crewMember.HiredByPlayerId,
            Tier = crewMember.Tier,
            Profession = crewMember.Profession,
            Status = CrewStatus.Active,
            AssignedCraftId = craftAction.Id,
            HiredAt = crewMember.HiredAt,
            LastCheckedAt = crewMember.LastCheckedAt,
            WageAmount = crewMember.WageAmount,
            LastPaidAt = crewMember.LastPaidAt,
            UnavailableUntil = crewMember.UnavailableUntil,
            ShipRole = crewMember.ShipRole,
            AssignedShipId = crewMember.AssignedShipId,
        };

        return new AssignSucceeded { UpdatedCrewMember = updatedCrewMember, CraftResult = craftResult };
    }
}
