using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/tierColor.ts.
public static class TierColorResolver
{
    // Bug fix (alpha content spot-check, ported verbatim): TIER_COLOR_BREAKPOINTS'
    // min/max are integers (Blue max=85, Purple min=86, etc.), but this is
    // also called with non-integer averages -- Refine()'s outputTier and
    // computeAggregateTier() both average 5 already-rounded-to-integer
    // qualities, and that average is only an integer 1 time in 5. A value
    // like 85.2 satisfies neither `<= 85` nor `>= 86` under a naive
    // `value <= max` check and would throw, even though it's squarely a
    // real, in-range quality value. `value < max + 1` closes every gap
    // exactly, since each tier's `max + 1` equals the next tier's `min` --
    // and still correctly includes Gold's ceiling (100 < 101).
    public static TierColor GetTierColor(double value)
    {
        foreach (var breakpoint in TierColorBreakpoints.All)
        {
            if (value >= breakpoint.Min && value < breakpoint.Max + 1)
            {
                return breakpoint.Tier;
            }
        }
        throw new ArgumentOutOfRangeException(nameof(value), value, "quality value is outside the 1-100 tier range");
    }
}
