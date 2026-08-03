using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/aggregateTier.ts. Necessary completion for
// Migration Phase 2 (agent-39-unity-galaxy-planet-simulation-core.md) --
// not part of Migration Phase 1's ported scope, since the MVP loop's
// Refine()/Craft() never needed a standalone reusable aggregate-tier
// function. Straight average of the qualities that aren't null; returns
// null (never throws) when every quality is null -- the one place in this
// formula layer where "no valid tier" is a real, expected outcome.
public static class AggregateTierResolver
{
    public static TierColor? ComputeAggregateTier(QualityMap qualities)
    {
        var values = new List<int>();
        foreach (var quality in Qualities.All)
        {
            if (qualities.TryGetValue(quality, out var value) && value is not null)
            {
                values.Add(value.Value);
            }
        }
        if (values.Count == 0) return null;
        var average = values.Sum() / (double)values.Count;
        return TierColorResolver.GetTierColor(average);
    }
}
