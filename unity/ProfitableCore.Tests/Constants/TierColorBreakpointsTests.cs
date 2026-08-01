using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Constants;

// Line-by-line comparison against src/data/constants/tierColor.ts's
// TIER_COLOR_BREAKPOINTS -- one of the two tables the integer-boundary
// -vs-fractional-input bug was originally found in (see
// agent-31-unity-data-schema.md). Every boundary value is asserted
// explicitly, not just spot-checked.
public class TierColorBreakpointsTests
{
    [Fact]
    public void HasSevenTiersInGreyToGoldOrder()
    {
        Assert.Equal(7, TierColorBreakpoints.All.Count);
        Assert.Equal(
            new[] { TierColor.Grey, TierColor.White, TierColor.Green, TierColor.Blue, TierColor.Purple, TierColor.Orange, TierColor.Gold },
            TierColorBreakpoints.All.Select(b => b.Tier));
    }

    [Theory]
    [InlineData(TierColor.Grey, 1, 40)]
    [InlineData(TierColor.White, 41, 60)]
    [InlineData(TierColor.Green, 61, 75)]
    [InlineData(TierColor.Blue, 76, 85)]
    [InlineData(TierColor.Purple, 86, 91)]
    [InlineData(TierColor.Orange, 92, 96)]
    [InlineData(TierColor.Gold, 97, 100)]
    public void MatchesTypeScriptSourceExactly(TierColor tier, int expectedMin, int expectedMax)
    {
        var breakpoint = TierColorBreakpoints.All.Single(b => b.Tier == tier);
        Assert.Equal(expectedMin, breakpoint.Min);
        Assert.Equal(expectedMax, breakpoint.Max);
    }

    [Fact]
    public void AdjacentTiersAreContiguousWithNoGapOrOverlap()
    {
        var ordered = TierColorBreakpoints.All.ToList();
        for (var i = 1; i < ordered.Count; i++)
        {
            Assert.Equal(ordered[i - 1].Max + 1, ordered[i].Min);
        }
    }
}
