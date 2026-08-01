using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Proves the rounding-semantics fix documented in
// agent-32-unity-simulation-core.md's Outputs Section 3 actually matters:
// JS Math.round() rounds an exact .5 up unconditionally (for this
// domain's always-positive values, equivalent to "away from zero"), while
// C#'s default Math.Round(double) uses banker's rounding (round-half-to
// -even) and would silently disagree on exactly these inputs. This test
// has no TypeScript file to diff against line-by-line -- it's proving a
// language-semantics fact, not porting a specific function -- so it
// exists to make that fact explicit and regression-proof.
public class JsMathTests
{
    [Theory]
    [InlineData(2.5, 3)] // bare C# Math.Round(2.5) would give 2 (round-to-even)
    [InlineData(3.5, 4)] // bare C# Math.Round(3.5) would give 4 (round-to-even -- coincidentally agrees here)
    [InlineData(0.5, 1)] // bare C# Math.Round(0.5) would give 0 (round-to-even)
    [InlineData(1.5, 2)] // bare C# Math.Round(1.5) would give 2 (round-to-even -- coincidentally agrees here)
    [InlineData(79.5, 80)]
    [InlineData(84.5, 85)] // exactly the Blue/Purple tier-color boundary
    public void RoundsHalfUpMatchingJavaScriptMathRoundNotCSharpBankersRounding(double value, double expected)
    {
        Assert.Equal(expected, JsMath.Round(value));
    }

    [Fact]
    public void DemonstratesTheDisagreementWithBareMathRoundOnAtLeastOneCase()
    {
        // 2.5 and 0.5 are the two cases above where bare C# banker's
        // rounding actually diverges from JsMath.Round -- confirming the
        // fix isn't a no-op.
        Assert.NotEqual(Math.Round(2.5), JsMath.Round(2.5));
        Assert.NotEqual(Math.Round(0.5), JsMath.Round(0.5));
    }
}
