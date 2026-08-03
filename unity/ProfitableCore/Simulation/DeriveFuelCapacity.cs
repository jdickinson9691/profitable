using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/deriveFuelCapacity.ts. A pure tier-keyed lookup, never
// reimplemented inline anywhere fuel capacity is needed.
public static class FuelCapacityDeriver
{
    public static double DeriveFuelCapacity(TierColor tier)
    {
        if (!ShipsAndTravelConfig.FuelCapacityByTier.TryGetValue(tier, out var capacity))
        {
            throw new InvalidOperationException($"no fuel capacity defined for tier {tier}");
        }
        return capacity;
    }
}
