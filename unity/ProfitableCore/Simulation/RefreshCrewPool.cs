using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/refreshCrewPool.ts. Reuses TierColorResolver.GetTierColor
// for the tier roll and SeededRandom for the random stream -- same
// pattern as PlanetGenerator.RollPlanetTier, never reimplements breakpoint
// logic. Deterministic given a seed; a real profession is rolled from the
// tier 6-7 taxonomy for Orange/Gold candidates only.
public static class RefreshCrewPoolSimulation
{
    private static TierColor RollCandidateTier(RandomFn random)
    {
        var roll = (int)Math.Floor(random() * 100) + 1;
        return TierColorResolver.GetTierColor(roll);
    }

    private static string RollProfession(RandomFn random)
    {
        var index = (int)Math.Floor(random() * CrewConfig.Tier67Professions.Count);
        return CrewConfig.Tier67Professions[index];
    }

    public static PlanetCrewPool RefreshCrewPool(string planetId, string? seed, long nowMs)
    {
        // Reuses SeededRandom.GenerateSeed() rather than a timestamp-only
        // fallback, which can collide on two rapid successive calls
        // sharing the same millisecond.
        var poolSeed = seed ?? SeededRandom.GenerateSeed();
        var random = SeededRandom.Create($"{poolSeed}:crew-pool");

        var availableHires = new List<CrewCandidate>();
        for (var i = 0; i < CrewConfig.CrewPoolSizePerPlanet; i++)
        {
            var tier = RollCandidateTier(random);
            var isSpecializedTier = tier == TierColor.Orange || tier == TierColor.Gold;
            var profession = isSpecializedTier ? RollProfession(random) : null;
            availableHires.Add(new CrewCandidate { Id = $"crew-candidate-{poolSeed}-{i}", Tier = tier, Profession = profession });
        }

        return new PlanetCrewPool { PlanetId = planetId, AvailableHires = availableHires, LastRefreshedAt = nowMs };
    }
}
