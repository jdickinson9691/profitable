using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/simulation/craft.test.ts case-for-case.
public class CrafterTests
{
    private static readonly Recipe NoThresholdRecipe = TestFixtures.NoThresholdRecipe;

    [Fact]
    public void CapsTheCombinedCeilingRaiseAt18PercentNotTheRaw21PercentSum()
    {
        var input = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Durability] = 70,
            [Quality.Rarity] = 70,
        });

        // Gold crafter (+15%) + Gold schematic (+6%) would sum to +21%;
        // capped at +18%. Gold's downside also narrows to exactly 0
        // (crafter -0.5% widened toward zero by schematic's -3%
        // narrowing), so this is fully deterministic regardless of the
        // random draw.
        var result = Assert.IsType<CraftAccepted>(
            Crafter.Craft(new[] { input }, NoThresholdRecipe, TierColor.Gold, TierColor.Gold));

        Assert.Equal((int)JsMath.Round(70 * 1.18), result.Qualities[Quality.Purity]);
        Assert.NotEqual((int)JsMath.Round(70 * 1.21), result.Qualities[Quality.Purity]);
    }

    [Fact]
    public void RejectsWhenAnInputIs41OrMorePointsBelowItsRecipeThreshold()
    {
        var input = TestFixtures.MakeInstance(TestFixtures.RadiantAlloyBar, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Durability] = 19, // 60 - 19 = 41 points below threshold
            [Quality.Rarity] = 70,
        });
        var gas = TestFixtures.MakeInstance(TestFixtures.HydrogenGas, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Rarity] = 70,
        });

        var result = Crafter.Craft(new[] { input, gas }, TestFixtures.IonForgedHullPlateRecipe, TierColor.Grey, TierColor.Grey);

        Assert.False(result.Accepted);
    }

    // Regression: this exact combination -- the MVP's own Ion-Forged Hull
    // Plate recipe, a real Blue schematic (15% forgiveness), and an input
    // 12 points below threshold -- used to throw an uncaught exception in
    // the TypeScript source instead of returning a result (12 * (1 -
    // 0.15) = 10.2, a fractional value the integer-only bands didn't
    // cover). This test confirms the C# port doesn't reintroduce it.
    [Fact]
    public void DoesNotThrowOnARealBelowThresholdInputAgainstANonGreySchematic()
    {
        var input = TestFixtures.MakeInstance(TestFixtures.RadiantAlloyBar, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Durability] = 48, // 60 - 48 = 12 points below threshold
            [Quality.Rarity] = 70,
        });
        var gas = TestFixtures.MakeInstance(TestFixtures.HydrogenGas, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Rarity] = 70,
        });

        var result = Crafter.Craft(new[] { input, gas }, TestFixtures.IonForgedHullPlateRecipe, TierColor.Blue, TierColor.Grey);

        Assert.True(result.Accepted);
    }

    [Fact]
    public void AppliesTheThresholdPenaltyAfterTheCeilingRaiseAndVarianceRoll()
    {
        // base_avg = 50 uniformly. Gold+Gold: ceiling capped at +18% ->
        // raised ceiling = 59 exactly, and the roll is deterministically
        // 0 (Gold's downside narrows to 0), so preThreshold = 59 for
        // every dimension regardless of the random draw.
        var input = TestFixtures.MakeInstance(TestFixtures.IgneousOre, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 50,
            [Quality.Density] = 50,
            [Quality.Potency] = 50,
            [Quality.Durability] = 50,
            [Quality.Rarity] = 50,
        });
        var recipe = new Recipe
        {
            Id = "test-order",
            Name = "Test (order of operations)",
            // durability 50 is 20 points below a threshold of 70.
            Inputs = new List<RecipeInput>
            {
                new() { Category = "any", Quantity = 1, ThresholdQuality = Quality.Durability, ThresholdValue = 70 },
            },
            OutputResourceId = "test-output",
            OutputQuantity = 1,
        };

        var result = Assert.IsType<CraftAccepted>(
            Crafter.Craft(new[] { input }, recipe, TierColor.Gold, TierColor.Gold));

        // Correct order: round(59 * 0.85) = 50. Penalty-before-ceiling
        // would instead give round(round(50 * 0.85) * 1.18) = round(43 *
        // 1.18) = 51.
        Assert.Equal(50, result.Qualities[Quality.Purity]);
        Assert.NotEqual(51, result.Qualities[Quality.Purity]);
    }

    [Fact]
    public void ExcludesANullQualityFromTheThresholdCheckEntirely()
    {
        var gas = TestFixtures.MakeInstance(TestFixtures.HydrogenGas, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 50,
            [Quality.Density] = 50,
            [Quality.Potency] = 50,
            [Quality.Rarity] = 50,
        });
        var recipe = new Recipe
        {
            Id = "test-null-threshold",
            Name = "Test (null threshold)",
            // Hydrogen Gas has no durability -- this must be excluded,
            // not treated as a catastrophic (0 - 999) violation.
            Inputs = new List<RecipeInput>
            {
                new() { Category = "gas", Quantity = 1, ThresholdQuality = Quality.Durability, ThresholdValue = 999 },
            },
            OutputResourceId = "test-output",
            OutputQuantity = 1,
        };

        var result = Assert.IsType<CraftAccepted>(
            Crafter.Craft(new[] { gas }, recipe, TierColor.Grey, TierColor.Grey));

        Assert.Null(result.Qualities[Quality.Durability]);
    }

    [Fact]
    public void RunsTheMvpRecipeEndToEndMatchingAHandCalculatedValue()
    {
        var alloyBar = TestFixtures.MakeInstance(TestFixtures.RadiantAlloyBar, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Durability] = 70,
            [Quality.Rarity] = 70,
        });
        var gas = TestFixtures.MakeInstance(TestFixtures.HydrogenGas, 1, new Dictionary<Quality, int?>
        {
            [Quality.Purity] = 70,
            [Quality.Density] = 70,
            [Quality.Potency] = 70,
            [Quality.Rarity] = 70,
        });

        // base_avg = 70 on every dimension (durability comes solely from
        // the alloy bar, since Hydrogen Gas has none -- still 70). Green
        // crafter (+10%) + Blue schematic (+3%) = +13% ceiling ->
        // raisedCeiling = 79.1. random() = 1 forces the roll to exactly 0
        // (no downside applied). Durability 70 is at/above the recipe's
        // 60 threshold, so no penalty. round(79.1) = 79 on every
        // dimension.
        var result = Assert.IsType<CraftAccepted>(Crafter.Craft(
            new[] { alloyBar, gas },
            TestFixtures.IonForgedHullPlateRecipe,
            TierColor.Blue,
            TierColor.Green,
            TestFixtures.QueueRandom(1)));

        Assert.Equal(79, result.Qualities[Quality.Purity]);
        Assert.Equal(79, result.Qualities[Quality.Density]);
        Assert.Equal(79, result.Qualities[Quality.Potency]);
        Assert.Equal(79, result.Qualities[Quality.Durability]);
        Assert.Equal(79, result.Qualities[Quality.Rarity]);
    }
}
