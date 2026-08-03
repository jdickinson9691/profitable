using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/calculateDistance.ts. Shared Euclidean distance helper,
// extracted out of CalculateTravelTime so PerformScan reuses the exact
// same distance math -- 2D only, no z axis.
public static class DistanceCalculator
{
    public static double CalculateDistance(PlanetPosition a, PlanetPosition b)
    {
        var dx = b.X - a.X;
        var dy = b.Y - a.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }
}
