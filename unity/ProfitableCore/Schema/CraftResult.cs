namespace Profitable.Core.Schema;

// Ports src/data/types/craftResult.ts's CraftResult = CraftAccepted |
// CraftRejected discriminated union. Necessary completion (see
// agent-32-unity-simulation-core.md's Outputs Section 1) -- modeled as a
// small sealed class hierarchy rather than one class with a nullable
// reason field, preserving the TypeScript union's "you must check which
// case you have before reading case-specific data" property. An
// idiomatic shape change, not a meaning change (migration GDD Section 4).
public abstract class CraftResult
{
    public abstract bool Accepted { get; }
}

public sealed class CraftAccepted : CraftResult
{
    public override bool Accepted => true;
    public QualityMap Qualities { get; init; } = new();
}

public sealed class CraftRejected : CraftResult
{
    public override bool Accepted => false;

    // Human-readable explanation (e.g. which input, how far below threshold).
    public string Reason { get; init; } = string.Empty;
}
