using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/refreshScannerPool.ts. Mirrors RefreshShipyardPool's
// structure closely -- simpler only because a Scanner has no components
// to generate matching qualities for.
public static class ScannerPoolRefresher
{
    private static int RollScannerTargetValue(RandomFn random) => (int)Math.Floor(random() * 100) + 1;

    public static ScannerPool RefreshScannerPool(string planetId, string? seed, long nowMs)
    {
        var poolSeed = seed ?? SeededRandom.GenerateSeed();
        var random = SeededRandom.Create($"{poolSeed}:scanner-pool");

        var availableScanners = new List<ScannerCandidate>();
        for (var i = 0; i < ShipsAndTravelConfig.ScannerPoolSizePerPlanet; i++)
        {
            var targetValue = RollScannerTargetValue(random);
            var tier = TierColorResolver.GetTierColor(targetValue);
            availableScanners.Add(new ScannerCandidate { Id = $"scanner-candidate-{poolSeed}-{i}", Tier = tier });
        }

        return new ScannerPool { PlanetId = planetId, AvailableScanners = availableScanners, LastRefreshedAt = nowMs };
    }
}
