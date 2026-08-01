using Profitable.Core.Constants;

namespace ProfitableCore.Tests.Constants;

// Line-by-line comparison against src/data/constants/penaltyCurve.ts's
// PENALTY_CURVE -- the other table (alongside TierColorBreakpoints) the
// integer-boundary-vs-fractional-input bug was originally found in. The
// 41+ band's null/null "input rejected" state is asserted explicitly, not
// skipped as an edge case.
public class PenaltyCurveTableTests
{
    [Theory]
    [InlineData(0, 0, 1.0)]
    [InlineData(1, 10, 0.95)]
    [InlineData(11, 20, 0.85)]
    [InlineData(21, 30, 0.7)]
    [InlineData(31, 40, 0.5)]
    public void MatchesTypeScriptSourceExactly(int min, int max, double multiplier)
    {
        var band = PenaltyCurveTable.All.Single(b => b.MinPointsBelow == min);
        Assert.Equal(max, band.MaxPointsBelow);
        Assert.Equal(multiplier, band.Multiplier!.Value, precision: 10);
    }

    [Fact]
    public void The41PlusBandIsInputRejectedNotASentinelNumber()
    {
        var band = PenaltyCurveTable.All.Single(b => b.MinPointsBelow == 41);
        Assert.Null(band.MaxPointsBelow);
        Assert.Null(band.Multiplier);
    }

    [Fact]
    public void HasExactlySixBands()
    {
        Assert.Equal(6, PenaltyCurveTable.All.Count);
    }

    [Fact]
    public void BandsAreContiguousWithNoGapOrOverlapUpToTheRejectionFloor()
    {
        var ordered = PenaltyCurveTable.All.Where(b => b.MaxPointsBelow.HasValue).ToList();
        for (var i = 1; i < ordered.Count; i++)
        {
            Assert.Equal(ordered[i - 1].MaxPointsBelow!.Value + 1, ordered[i].MinPointsBelow);
        }
        // The rejection band picks up exactly where the last bounded band ends.
        var rejection = PenaltyCurveTable.All.Single(b => b.MaxPointsBelow is null);
        Assert.Equal(ordered[^1].MaxPointsBelow!.Value + 1, rejection.MinPointsBelow);
    }
}
