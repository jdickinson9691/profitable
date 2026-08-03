using Profitable.Core.Constants;

namespace Profitable.Core.Simulation;

// Ports src/trading/emergency.ts. Bug fix (Galactic Map verification): the
// GDD names "emergencies" ("rare, sudden ... randomly-triggered ...
// purely random, not caused by simulation/economy state") as the third
// trade-map layer, but it was never actually implemented. Pure function of
// (planetId, now, categories) -- no persisted state, same "always live,
// never stale" reasoning as Season. Time is divided into
// EmergencyCheckIntervalHours-long windows per planet; each window
// independently rolls whether an emergency starts at that window's own
// beginning.
//
// No advance warning: an emergency, when a window's roll triggers one, is
// active from the very first instant of that window -- there is no
// separate pre-announcement phase before its effect applies.
public sealed class ActiveEmergency
{
    public string Category { get; init; } = string.Empty;
    public long EndsAt { get; init; } // epoch ms
}

public static class Emergency
{
    private const double MsPerHour = 60 * 60 * 1000;

    public static ActiveEmergency? GetActiveEmergency(string planetId, long nowMs, IReadOnlyList<string> categories)
    {
        if (categories.Count == 0) return null;

        var windowMs = TradingConfig.EmergencyCheckIntervalHours * MsPerHour;
        var windowIndex = (long)Math.Floor(nowMs / windowMs);
        var windowStart = (long)(windowIndex * windowMs);
        var endsAt = windowStart + (long)(TradingConfig.EmergencyDurationHours * MsPerHour);

        if (nowMs >= endsAt) return null; // this window's emergency (if any) has already ended

        var random = SeededRandom.Create($"{planetId}:emergency-window:{windowIndex}");
        var triggered = random() < TradingConfig.EmergencyTriggerChance;
        if (!triggered) return null;

        var sorted = categories.OrderBy(c => c, StringComparer.Ordinal).ToList();
        var category = sorted[(int)Math.Floor(random() * sorted.Count)];

        return new ActiveEmergency { Category = category, EndsAt = endsAt };
    }

    public static double GetEmergencyPriceMultiplier(string itemCategory, ActiveEmergency? emergency)
    {
        if (emergency is null || itemCategory != emergency.Category) return 1;
        return 1 + TradingConfig.EmergencyPricePremiumPercent;
    }
}
