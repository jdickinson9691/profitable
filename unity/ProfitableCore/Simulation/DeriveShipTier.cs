using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/deriveShipTier.ts.
public static class ShipTierDeriver
{
    // Reuses the existing tier breakpoint table's own min/max per tier to
    // get a representative number for each installed component (the
    // midpoint of its range), then maps back through TierColorResolver --
    // never reimplements breakpoint logic. Exported (used directly by
    // ResolveCombatChoice, which needs the exact same tier-to-number
    // conversion for a weapon's/opponent's TierColor before applying
    // variance).
    public static double TierMidpoint(TierColor tier)
    {
        foreach (var breakpoint in TierColorBreakpoints.All)
        {
            if (breakpoint.Tier == tier) return (breakpoint.Min + breakpoint.Max) / 2.0;
        }
        throw new InvalidOperationException($"no breakpoint defined for tier {tier}");
    }

    // A null slot is EXCLUDED from the average -- a ship with 1-3
    // components installed is rated on what it has. A ship with ZERO
    // components installed has nothing to average, so it falls back to
    // Grey -- an unrated/incomplete ship is treated as the lowest tier.
    public static TierColor DeriveShipTier(Ship ship)
    {
        var installed = ship.Components.AsPairs()
            .Select(p => p.Value)
            .Where(component => component is not null)
            .Select(component => component!)
            .ToList();

        if (installed.Count == 0) return TierColor.Grey;

        var average = installed.Sum(component => TierMidpoint(component.Tier)) / installed.Count;
        return TierColorResolver.GetTierColor(average);
    }
}
