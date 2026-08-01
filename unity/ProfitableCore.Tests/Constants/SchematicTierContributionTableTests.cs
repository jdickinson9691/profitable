using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Constants;

// Line-by-line comparison against src/data/constants/schematicTier.ts's
// SCHEMATIC_TIER_CONTRIBUTION and COMBINED_CEILING_CAP.
public class SchematicTierContributionTableTests
{
    [Theory]
    [InlineData(TierColor.Grey, 0.0, 0.0, 0.0)]
    [InlineData(TierColor.White, 0.01, -0.005, 0.05)]
    [InlineData(TierColor.Green, 0.02, -0.01, 0.1)]
    [InlineData(TierColor.Blue, 0.03, -0.015, 0.15)]
    [InlineData(TierColor.Purple, 0.04, -0.02, 0.2)]
    [InlineData(TierColor.Orange, 0.05, -0.025, 0.25)]
    [InlineData(TierColor.Gold, 0.06, -0.03, 0.35)]
    public void MatchesTypeScriptSourceExactly(
        TierColor tier, double ceilingRaise, double varianceNarrowing, double penaltyForgiveness)
    {
        var row = SchematicTierContributionTable.All.Single(r => r.Tier == tier);
        Assert.Equal(ceilingRaise, row.CeilingRaise, precision: 10);
        Assert.Equal(varianceNarrowing, row.VarianceNarrowing, precision: 10);
        Assert.Equal(penaltyForgiveness, row.PenaltyForgiveness, precision: 10);
    }

    [Fact]
    public void CombinedCeilingCapIs18Percent()
    {
        // Deliberately not the raw arithmetic sum of Grey/Gold's ceiling
        // raise (which would be 0.21 at crafter Gold + schematic Gold).
        Assert.Equal(0.18, SchematicTierContributionTable.CombinedCeilingCap, precision: 10);
    }
}
