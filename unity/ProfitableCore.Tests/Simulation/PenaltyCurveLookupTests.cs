using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/simulation/penaltyCurve.test.ts case-for-case, including
// the 23-combination fractional-gap regression set's representative
// cases and the near-zero-forgiveness set proving forgiveness softens
// but never erases a real violation.
public class PenaltyCurveLookupTests
{
    [Theory]
    [InlineData(0, 1.0)]
    [InlineData(1, 0.95)]
    [InlineData(10, 0.95)]
    [InlineData(11, 0.85)]
    [InlineData(20, 0.85)]
    [InlineData(21, 0.7)]
    [InlineData(30, 0.7)]
    [InlineData(31, 0.5)]
    [InlineData(40, 0.5)]
    public void MatchesTheDocumentedCurveExactly(double pointsBelow, double expected)
    {
        Assert.Equal(expected, PenaltyCurveLookup.GetPenaltyMultiplier(pointsBelow), precision: 10);
    }

    [Fact]
    public void Rejects41PlusPointsBelow()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => PenaltyCurveLookup.GetPenaltyMultiplier(41));
    }

    // Regression: craft()'s effectivePointsBelow = worstPointsBelow * (1
    // - schematic.penaltyForgiveness) produces a non-integer value
    // whenever a schematic's forgiveness is nonzero. Reproduces the real
    // crash: the MVP's own Ion-Forged Hull Plate recipe (Blue schematic,
    // 15% forgiveness) with an input 12 points below threshold -- 12 *
    // 0.85 = 10.2, previously uncaught in the TypeScript source.
    [Theory]
    [InlineData(1 * (1 - 0.15), 0.95, "Blue, 1 point below (0.85) -- gap just above 0")]
    [InlineData(12 * (1 - 0.15), 0.95, "Blue, 12 points below (10.2) -- the exact real-world crash case")]
    [InlineData(11 * (1 - 0.05), 0.95, "White, 11 points below (10.45) -- gap just above 10")]
    [InlineData(22 * (1 - 0.1), 0.85, "Green, 22 points below (20.7) -- gap just above 20")]
    [InlineData(32 * (1 - 0.05), 0.7, "White, 32 points below (30.4) -- gap just above 30")]
    [InlineData(31 * (1 - 0.35), 0.85, "Gold, 31 points below (20.15) -- gap just above 20, deepest forgiveness")]
    public void HandlesFractionalGapCases(double effectivePointsBelow, double expected, string label)
    {
        Assert.Equal(expected, PenaltyCurveLookup.GetPenaltyMultiplier(effectivePointsBelow), precision: 10);
        Assert.False(string.IsNullOrEmpty(label));
    }

    // The {0,0} band needed different handling from the other three gaps
    // (see PenaltyCurveLookup's own comment): every one of these is a
    // genuine, nonzero violation reduced by forgiveness down to just
    // under 1 -- none of them may resolve to 1.0 (no penalty), which a
    // naive uniform "extend every band's upper bound" fix would have
    // produced.
    [Theory]
    [InlineData(1 * (1 - 0.05), "White")]
    [InlineData(1 * (1 - 0.1), "Green")]
    [InlineData(1 * (1 - 0.15), "Blue")]
    [InlineData(1 * (1 - 0.2), "Purple")]
    [InlineData(1 * (1 - 0.25), "Orange")]
    [InlineData(1 * (1 - 0.35), "Gold")]
    public void NearZeroEffectivePointsBelowIsStillARealPenaltyNot1Point0(double effectivePointsBelow, string tier)
    {
        var multiplier = PenaltyCurveLookup.GetPenaltyMultiplier(effectivePointsBelow);
        Assert.Equal(0.95, multiplier, precision: 10);
        Assert.NotEqual(1.0, multiplier);
        Assert.False(string.IsNullOrEmpty(tier));
    }
}
