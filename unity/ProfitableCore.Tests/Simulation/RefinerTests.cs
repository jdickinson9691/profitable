using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/simulation/refine.test.ts case-for-case.
public class RefinerTests
{
    [Fact]
    public void ComputeBaseAveragesCombinesMixedResourcesViaQuantityWeightedStraightAverage()
    {
        var ore = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 2, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 80,
            [Quality.Density] = 60,
            [Quality.Potency] = 70,
            [Quality.Durability] = 50,
            [Quality.Rarity] = 40,
        });
        var crystal = TestFixtures.MakeInstance(TestFixtures.AutuniteCrystal, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = null, // Autunite Crystal has no purity
            [Quality.Density] = 90,
            [Quality.Potency] = 30,
            [Quality.Durability] = 70,
            [Quality.Rarity] = 60,
        });

        var averages = Refiner.ComputeBaseAverages(new[] { ore, crystal });

        // purity: only the ore contributes -- must NOT be zero-padded by
        // the crystal's null (that would wrongly pull it down to 160/3).
        Assert.Equal(80, averages[Quality.Purity]);
        Assert.Equal((60 * 2 + 90 * 1) / 3.0, averages[Quality.Density]);
        Assert.Equal((70 * 2 + 30 * 1) / 3.0, averages[Quality.Potency]);
        Assert.Equal((50 * 2 + 70 * 1) / 3.0, averages[Quality.Durability]);
        Assert.Equal((40 * 2 + 60 * 1) / 3.0, averages[Quality.Rarity]);
    }

    [Fact]
    public void ComputeBaseAveragesReturnsNullWhenAQualityIsNullOnEveryInput()
    {
        var crystal = TestFixtures.MakeInstance(TestFixtures.AutuniteCrystal, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = null,
            [Quality.Density] = 90,
        });
        var averages = Refiner.ComputeBaseAverages(new[] { crystal });
        Assert.Null(averages[Quality.Purity]);
    }

    public static IEnumerable<object[]> TierVarianceCases() =>
        TierVarianceTable.All.Select(row => new object[] { row.Tier, row.Negative, row.Positive });

    [Theory]
    [MemberData(nameof(TierVarianceCases))]
    public void RefineAppliesTheExactVarianceRangeForEachTier(TierColor tier, double negative, double positive)
    {
        var input = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 50,
            [Quality.Density] = 50,
            [Quality.Potency] = 50,
            [Quality.Durability] = 50,
            [Quality.Rarity] = 50,
        });

        var atFloor = Refiner.Refine(new[] { input }, tier, TestFixtures.QueueRandom(0, 1));
        var expectedFloor = (int)ClampHelper.Clamp(JsMath.Round(50 * (1 + negative)), 1, 100);
        Assert.Equal(expectedFloor, atFloor.Qualities[Quality.Purity]);

        var atCeiling = Refiner.Refine(new[] { input }, tier, TestFixtures.QueueRandom(1, 1));
        var expectedCeiling = (int)ClampHelper.Clamp(JsMath.Round(50 * (1 + positive)), 1, 100);
        Assert.Equal(expectedCeiling, atCeiling.Qualities[Quality.Purity]);
    }

    [Fact]
    public void RefineKeysRefundChanceToTheOutputTierNotTheInputsBaseTier()
    {
        // base_avg is 90 (Purple, 86-91) on every dimension, but Gold's
        // +15% variance pushes the output to 100 (Gold, 97-100). The
        // refund roll (0.20) is below Gold's 25% chance but above
        // Purple's 15% -- so it only triggers a refund if the
        // implementation correctly used the OUTPUT tier.
        var input = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 90,
            [Quality.Density] = 90,
            [Quality.Potency] = 90,
            [Quality.Durability] = 90,
            [Quality.Rarity] = 90,
        });

        var result = Refiner.Refine(new[] { input }, TierColor.Gold, TestFixtures.QueueRandom(1, 0.2, 0.5));

        Assert.Equal(TierColor.Gold, result.OutputTier);
        Assert.Equal(100, result.Qualities[Quality.Purity]);
        Assert.Equal(1, result.RefundUnits); // triggered, but no secondary bonus unit (0.5 >= 0.20)
    }

    [Fact]
    public void RefineCanAwardASecondaryRefundUnitAtGoldTier()
    {
        var input = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 90,
            [Quality.Density] = 90,
            [Quality.Potency] = 90,
            [Quality.Durability] = 90,
            [Quality.Rarity] = 90,
        });

        var result = Refiner.Refine(new[] { input }, TierColor.Gold, TestFixtures.QueueRandom(1, 0.2, 0.1));

        Assert.Equal(TierColor.Gold, result.OutputTier);
        Assert.Equal(2, result.RefundUnits); // primary refund (0.2 < 0.25) + secondary (0.1 < 0.20)
    }

    [Fact]
    public void RefineNeverFailsAndAlwaysReturnsAValidResult()
    {
        var ore = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 2, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 20,
            [Quality.Density] = 20,
            [Quality.Potency] = 20,
            [Quality.Durability] = 20,
            [Quality.Rarity] = 20,
        });
        var crystal = TestFixtures.MakeInstance(TestFixtures.AutuniteCrystal, 1, new Dictionary<Quality, int?>
        {
            [Quality.Density] = 30,
            [Quality.Potency] = 30,
            [Quality.Durability] = 30,
            [Quality.Rarity] = 30,
        });

        var result = Refiner.Refine(new[] { ore, crystal }, TierColor.Grey);

        Assert.NotNull(result.Qualities[Quality.Purity]);
        Assert.InRange(result.Qualities[Quality.Purity]!.Value, 1, 100);
        Assert.NotNull(result.Qualities[Quality.Density]);
        Assert.True(result.RefundUnits >= 0);
    }
}
