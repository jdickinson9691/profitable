using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Constants;

// Line-by-line comparison against src/data/constants/refundChance.ts's
// REFUND_CHANCE.
public class RefundChanceTableTests
{
    [Theory]
    [InlineData(TierColor.Grey, 0.0)]
    [InlineData(TierColor.White, 0.0)]
    [InlineData(TierColor.Green, 0.05)]
    [InlineData(TierColor.Blue, 0.1)]
    [InlineData(TierColor.Purple, 0.15)]
    [InlineData(TierColor.Orange, 0.2)]
    [InlineData(TierColor.Gold, 0.25)]
    public void MatchesTypeScriptSourceExactly(TierColor tier, double expectedChance)
    {
        var row = RefundChanceTable.All.Single(r => r.Tier == tier);
        Assert.Equal(expectedChance, row.Chance, precision: 10);
    }

    [Fact]
    public void OnlyGoldHasASecondaryUnitChance()
    {
        foreach (var row in RefundChanceTable.All)
        {
            if (row.Tier == TierColor.Gold)
            {
                Assert.Equal(0.2, row.SecondaryUnitChance!.Value, precision: 10);
            }
            else
            {
                // Never a sentinel 0 -- absent means "no secondary chance
                // exists for this tier," distinct from Grey/White's
                // explicit Chance = 0 (no refund at all).
                Assert.Null(row.SecondaryUnitChance);
            }
        }
    }
}
