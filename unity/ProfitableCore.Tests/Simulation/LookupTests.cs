using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Exercises the lookup functions (GetTierVariance, GetRefundChance,
// GetSchematicTierContribution, ResolveSchematicTier) against Agent 31's
// already-verified constant tables -- not the table values again (see
// agent-32-unity-simulation-core.md's Testing Requirements).
public class LookupTests
{
    [Theory]
    [InlineData(TierColor.Grey)]
    [InlineData(TierColor.White)]
    [InlineData(TierColor.Green)]
    [InlineData(TierColor.Blue)]
    [InlineData(TierColor.Purple)]
    [InlineData(TierColor.Orange)]
    [InlineData(TierColor.Gold)]
    public void GetTierVarianceReturnsTheMatchingTableRow(TierColor tier)
    {
        Assert.Equal(tier, TierVarianceLookup.GetTierVariance(tier).Tier);
    }

    [Theory]
    [InlineData(TierColor.Grey)]
    [InlineData(TierColor.Gold)]
    public void GetRefundChanceReturnsTheMatchingTableRow(TierColor tier)
    {
        Assert.Equal(tier, RefundChanceLookup.GetRefundChance(tier).Tier);
    }

    [Theory]
    [InlineData(TierColor.Grey)]
    [InlineData(TierColor.Gold)]
    public void GetSchematicTierContributionReturnsTheMatchingTableRow(TierColor tier)
    {
        Assert.Equal(tier, SchematicTierLookup.GetSchematicTierContribution(tier).Tier);
    }

    [Fact]
    public void ResolveSchematicTierDefaultsToGreyWhenNoSchematicIsOwned()
    {
        Assert.Equal(TierColor.Grey, SchematicTierLookup.ResolveSchematicTier(null));
    }

    [Fact]
    public void ResolveSchematicTierReturnsTheOwnedSchematicsTier()
    {
        var schematic = new Schematic { Id = "x", Name = "X", RecipeId = "r", Tier = TierColor.Blue };
        Assert.Equal(TierColor.Blue, SchematicTierLookup.ResolveSchematicTier(schematic));
    }
}
