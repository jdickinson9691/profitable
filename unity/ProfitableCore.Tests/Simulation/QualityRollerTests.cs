using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/simulation/rollQuality.test.ts case-for-case.
public class QualityRollerTests
{
    [Fact]
    public void ReturnsAnIntegerIn1To100ForEveryApplicableQuality()
    {
        for (var i = 0; i < 50; i++)
        {
            var roll = QualityRoller.RollQuality(TestFixtures.IgneousOre);
            foreach (var quality in Qualities.All)
            {
                var value = roll[quality];
                Assert.NotNull(value);
                Assert.InRange(value!.Value, 1, 100);
            }
        }
    }

    [Fact]
    public void ReturnsNullNeverZeroForHydrogenGasDurability()
    {
        var roll = QualityRoller.RollQuality(TestFixtures.HydrogenGas);
        Assert.Null(roll[Quality.Durability]);
    }

    [Fact]
    public void ReturnsNullNeverZeroForAutuniteCrystalPurity()
    {
        var roll = QualityRoller.RollQuality(TestFixtures.AutuniteCrystal);
        Assert.Null(roll[Quality.Purity]);
    }

    [Fact]
    public void IsExactGivenAnInjectedRandomFunction()
    {
        var rollAtFloor = QualityRoller.RollQuality(TestFixtures.IgneousOre, () => 0);
        foreach (var quality in Qualities.All)
        {
            Assert.Equal(1, rollAtFloor[quality]);
        }

        var rollAtCeiling = QualityRoller.RollQuality(TestFixtures.IgneousOre, () => 0.9999999);
        foreach (var quality in Qualities.All)
        {
            Assert.Equal(100, rollAtCeiling[quality]);
        }
    }

    [Fact]
    public void ProducesExactlyThe5QualityKeys()
    {
        var roll = QualityRoller.RollQuality(TestFixtures.IgneousOre);
        Assert.Equal(Qualities.All.OrderBy(q => q), roll.Keys.OrderBy(q => q));
    }
}
