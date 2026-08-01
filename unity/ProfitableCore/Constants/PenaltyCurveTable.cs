using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/penaltyCurve.ts. GDD Section 3.3 -- threshold
// penalty curve (escalating, hard floor at 41+). This is the other table
// (alongside TierColorBreakpoints) the integer-boundary-vs-fractional
// -input bug was originally found in -- the 41+ band's "input rejected"
// state is represented as MaxPointsBelow/Multiplier both null, exactly
// mirroring the TypeScript PenaltyBand's `maxPointsBelow: null, multiplier:
// null` -- not a sentinel number, which is how re-deriving this table from
// scratch could reintroduce the bug (see
// profitable-unity-migration-gdd.md Section 3).
public sealed class PenaltyBand
{
    public int MinPointsBelow { get; init; }
    public int? MaxPointsBelow { get; init; }
    public double? Multiplier { get; init; }
}

public static class PenaltyCurveTable
{
    public static readonly IReadOnlyList<PenaltyBand> All = new[]
    {
        new PenaltyBand { MinPointsBelow = 0, MaxPointsBelow = 0, Multiplier = 1.0 },
        new PenaltyBand { MinPointsBelow = 1, MaxPointsBelow = 10, Multiplier = 0.95 },
        new PenaltyBand { MinPointsBelow = 11, MaxPointsBelow = 20, Multiplier = 0.85 },
        new PenaltyBand { MinPointsBelow = 21, MaxPointsBelow = 30, Multiplier = 0.7 },
        new PenaltyBand { MinPointsBelow = 31, MaxPointsBelow = 40, Multiplier = 0.5 },
        new PenaltyBand { MinPointsBelow = 41, MaxPointsBelow = null, Multiplier = null },
    };
}
