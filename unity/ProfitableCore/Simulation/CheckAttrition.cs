using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/checkAttrition.ts. Deterministic and upkeep-driven only
// -- never a random/chance-based check. Measures the grace period from
// LastPaidAt, not HiredAt, so a crew member who has been reliably paid
// for months doesn't depart just because it's been a long time since they
// were hired.
public static class CheckAttritionSimulation
{
    private const double MsPerHour = 60 * 60 * 1000;

    public static AttritionResult CheckAttrition(CrewMember crewMember, long currentTimeMs)
    {
        var unpaidHours = (currentTimeMs - crewMember.LastPaidAt) / MsPerHour;
        if (unpaidHours > CrewConfig.UpkeepGracePeriodHours)
        {
            return new AttritionResult { Departed = true, Reason = "upkeep unpaid past the grace period" };
        }
        return new AttritionResult { Departed = false };
    }
}
