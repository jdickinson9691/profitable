using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/calculateFuelCost.ts. No Ship parameter -- fuel cost is
// deliberately not tier-modified, unlike travel time (tier's fuel-relevant
// effect is capacity, not efficiency).
public static class FuelCostCalculator
{
    public static double CalculateFuelCost(Planet origin, Planet destination)
    {
        if (origin.Position is null || destination.Position is null)
        {
            throw new InvalidOperationException("CalculateFuelCost: both planets must have a generated position");
        }
        return DistanceCalculator.CalculateDistance(origin.Position, destination.Position) * ShipsAndTravelConfig.FuelCostPerDistanceUnit;
    }
}
