using Profitable.Core.Constants;

namespace Profitable.Core.Simulation;

// Ports src/trading/season.ts. Bug fix (Galactic Map verification): the
// GDD names "seasons" as one of the trade map's three data layers, but it
// was never actually implemented -- only baseline drift existed. Pure
// function of (planetId, now) -- no persisted state, so this can never go
// stale. A planet's own seed-derived phase offset keeps its cycle out of
// sync with every other planet, rather than the whole galaxy entering the
// same season simultaneously.
public enum Season
{
    Spring,
    Summer,
    Autumn,
    Winter,
}

public sealed class SeasonalEffect
{
    public Season Season { get; init; }
    public string CheapCategory { get; init; } = string.Empty;
    public string PremiumCategory { get; init; } = string.Empty;
}

public static class SeasonSimulation
{
    private static readonly Season[] Seasons = { Season.Spring, Season.Summer, Season.Autumn, Season.Winter };
    private const double MsPerHour = 60 * 60 * 1000;

    private static double PlanetPhaseOffsetHours(string planetId)
    {
        var random = SeededRandom.Create($"{planetId}:season-phase");
        return Math.Floor(random() * Seasons.Length) * TradingConfig.SeasonCycleHours;
    }

    public static Season GetCurrentSeason(string planetId, long nowMs)
    {
        var offsetMs = PlanetPhaseOffsetHours(planetId) * MsPerHour;
        var cycleMs = TradingConfig.SeasonCycleHours * MsPerHour;
        var index = (int)Math.Floor((nowMs + offsetMs) / cycleMs) % Seasons.Length;
        return Seasons[index];
    }

    // Which category this planet's current season favors (sells cheap)
    // and which it disfavors (buys at a premium) -- "swings its buy/sell
    // lists" realized concretely. Deterministic per (planetId, season),
    // drawn only from categories the caller says are actually
    // live-traded on this planet, so this never names a category with no
    // real market data behind it.
    public static SeasonalEffect? GetSeasonalEffect(string planetId, long nowMs, IReadOnlyList<string> categories)
    {
        if (categories.Count == 0) return null;

        var season = GetCurrentSeason(planetId, nowMs);
        var random = SeededRandom.Create($"{planetId}:{season}:season-effect");
        var sorted = categories.OrderBy(c => c, StringComparer.Ordinal).ToList(); // stable regardless of caller's input order

        var cheapCategory = sorted[(int)Math.Floor(random() * sorted.Count)];
        var remaining = sorted.Where(c => c != cheapCategory).ToList();
        var premiumCategory = remaining.Count > 0
            ? remaining[(int)Math.Floor(random() * remaining.Count)]
            : cheapCategory;

        return new SeasonalEffect { Season = season, CheapCategory = cheapCategory, PremiumCategory = premiumCategory };
    }

    public static double GetSeasonalPriceMultiplier(string itemCategory, SeasonalEffect? effect)
    {
        if (effect is null) return 1;
        if (itemCategory == effect.CheapCategory) return 1 - TradingConfig.SeasonPriceSwingPercent;
        if (itemCategory == effect.PremiumCategory) return 1 + TradingConfig.SeasonPriceSwingPercent;
        return 1;
    }
}
