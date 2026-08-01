using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/rollQuality.ts.
public static class QualityRoller
{
    private static readonly Random SharedRandom = new();
    private static double DefaultRandom() => SharedRandom.NextDouble();

    public static QualityMap RollQuality(Resource resource, RandomFn? random = null)
    {
        random ??= DefaultRandom;
        var roll = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var applicable = resource.ApplicableQualities.TryGetValue(quality, out var value) && value;
            roll[quality] = applicable ? RollValue(random) : (int?)null;
        }
        return roll;
    }

    private static int RollValue(RandomFn random) => (int)Math.Floor(random() * 100) + 1;
}
