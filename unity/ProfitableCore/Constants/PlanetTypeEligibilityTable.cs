using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/planetTypeEligibility.ts. A hard filter on
// eligible resource categories per Planet Type, not a bias. Categories are
// GDD's own broad vocabulary ("Solid"/"Gas"/"Crystal"), a different string
// space from Resource.Category (which stays free-form).
public sealed class PlanetTypeEligibility
{
    public PlanetType PlanetType { get; init; }
    public IReadOnlyList<string> EligibleCategories { get; init; } = Array.Empty<string>();
}

public static class PlanetTypeEligibilityTable
{
    public static readonly IReadOnlyList<PlanetTypeEligibility> All = new[]
    {
        new PlanetTypeEligibility { PlanetType = Schema.PlanetType.Terrestrial, EligibleCategories = new[] { "Solid", "Crystal" } },
        new PlanetTypeEligibility { PlanetType = Schema.PlanetType.SuperEarth, EligibleCategories = new[] { "Solid", "Crystal", "Gas" } },
        new PlanetTypeEligibility { PlanetType = Schema.PlanetType.Neptunian, EligibleCategories = new[] { "Gas", "Crystal" } },
        new PlanetTypeEligibility { PlanetType = Schema.PlanetType.GasGiant, EligibleCategories = new[] { "Gas" } },
    };
}
