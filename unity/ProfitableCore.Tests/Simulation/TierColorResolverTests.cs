using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/simulation/tierColor.test.ts case-for-case.
public class TierColorResolverTests
{
    [Theory]
    [InlineData(1, TierColor.Grey)]
    [InlineData(40, TierColor.Grey)]
    [InlineData(41, TierColor.White)]
    [InlineData(60, TierColor.White)]
    [InlineData(61, TierColor.Green)]
    [InlineData(75, TierColor.Green)]
    [InlineData(76, TierColor.Blue)]
    [InlineData(85, TierColor.Blue)]
    [InlineData(86, TierColor.Purple)]
    [InlineData(91, TierColor.Purple)]
    [InlineData(92, TierColor.Orange)]
    [InlineData(96, TierColor.Orange)]
    [InlineData(97, TierColor.Gold)]
    [InlineData(100, TierColor.Gold)]
    public void MatchesIntegerBoundariesExactly(double value, TierColor expected)
    {
        Assert.Equal(expected, TierColorResolver.GetTierColor(value));
    }

    [Fact]
    public void RejectsValuesOutside1To100()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => TierColorResolver.GetTierColor(0));
        Assert.Throws<ArgumentOutOfRangeException>(() => TierColorResolver.GetTierColor(101));
    }

    // Regression: getTierColor() is called with a non-integer average of
    // 5 already-rounded integers -- only 1 in 5 possible averages is
    // itself an integer, so a fractional value landing in one of the six
    // gaps between adjacent integer breakpoints is common, not a rare
    // edge case.
    [Theory]
    [InlineData(40.5, TierColor.Grey)]
    [InlineData(60.5, TierColor.White)]
    [InlineData(75.5, TierColor.Green)]
    [InlineData(85.2, TierColor.Blue)]
    [InlineData(91.9, TierColor.Purple)]
    [InlineData(96.1, TierColor.Orange)]
    [InlineData(99.99, TierColor.Gold)]
    public void HandlesFractionalValuesInFormerIntegerBoundaryGaps(double value, TierColor expected)
    {
        Assert.Equal(expected, TierColorResolver.GetTierColor(value));
    }
}
