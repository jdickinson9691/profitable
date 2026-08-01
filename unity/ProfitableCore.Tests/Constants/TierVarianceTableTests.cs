using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Constants;

// Line-by-line comparison against src/data/constants/tierVariance.ts's
// TIER_VARIANCE.
public class TierVarianceTableTests
{
    [Theory]
    [InlineData(TierColor.Grey, -0.1, 0.1)]
    [InlineData(TierColor.White, -0.08, 0.1)]
    [InlineData(TierColor.Green, -0.06, 0.1)]
    [InlineData(TierColor.Blue, -0.045, 0.11)]
    [InlineData(TierColor.Purple, -0.03, 0.12)]
    [InlineData(TierColor.Orange, -0.015, 0.13)]
    [InlineData(TierColor.Gold, -0.005, 0.15)]
    public void MatchesTypeScriptSourceExactly(TierColor tier, double expectedNegative, double expectedPositive)
    {
        var row = TierVarianceTable.All.Single(r => r.Tier == tier);
        Assert.Equal(expectedNegative, row.Negative, precision: 10);
        Assert.Equal(expectedPositive, row.Positive, precision: 10);
    }

    [Fact]
    public void HasExactlySevenRows()
    {
        Assert.Equal(7, TierVarianceTable.All.Count);
    }
}
