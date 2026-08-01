using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/tierColor.ts. GDD Section 3.1 -- 7-tier color
// scale over the 1-100 quality range. Two of this file's boundary values
// (40/41, the Grey/White gap) are the exact table the integer-boundary-
// vs-fractional-input bug was originally found in
// (profitable-unity-migration-gdd.md Section 3) -- copied value-for-value
// from the TypeScript source, not re-derived from GDD prose.
public sealed class TierColorBreakpoint
{
    public TierColor Tier { get; init; }
    public int Min { get; init; }
    public int Max { get; init; }
}

public static class TierColorBreakpoints
{
    public static readonly IReadOnlyList<TierColorBreakpoint> All = new[]
    {
        new TierColorBreakpoint { Tier = TierColor.Grey, Min = 1, Max = 40 },
        new TierColorBreakpoint { Tier = TierColor.White, Min = 41, Max = 60 },
        new TierColorBreakpoint { Tier = TierColor.Green, Min = 61, Max = 75 },
        new TierColorBreakpoint { Tier = TierColor.Blue, Min = 76, Max = 85 },
        new TierColorBreakpoint { Tier = TierColor.Purple, Min = 86, Max = 91 },
        new TierColorBreakpoint { Tier = TierColor.Orange, Min = 92, Max = 96 },
        new TierColorBreakpoint { Tier = TierColor.Gold, Min = 97, Max = 100 },
    };
}
