using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/dismissCrew.ts. Voluntary dismissal, always succeeds for
// the crew member's actual owner.
public static class DismissCrewSimulation
{
    public static DismissResult DismissCrew(CrewMember crewMember, string playerId)
    {
        if (crewMember.HiredByPlayerId != playerId)
        {
            return new DismissResult { Dismissed = false, Reason = "player does not own this crew member" };
        }
        return new DismissResult { Dismissed = true };
    }
}
