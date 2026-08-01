using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/refundChance.ts.
public static class RefundChanceLookup
{
    public static RefundChance GetRefundChance(TierColor tier)
    {
        foreach (var entry in RefundChanceTable.All)
        {
            if (entry.Tier == tier) return entry;
        }
        throw new ArgumentOutOfRangeException(nameof(tier), tier, "no refund chance entry for this tier");
    }
}
