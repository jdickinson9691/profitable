using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/tierVariance.ts.
public static class TierVarianceLookup
{
    public static TierVariance GetTierVariance(TierColor tier)
    {
        foreach (var entry in TierVarianceTable.All)
        {
            if (entry.Tier == tier) return entry;
        }
        throw new ArgumentOutOfRangeException(nameof(tier), tier, "no variance table entry for this tier");
    }
}
