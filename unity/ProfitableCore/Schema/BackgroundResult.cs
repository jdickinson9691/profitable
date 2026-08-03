namespace Profitable.Core.Schema;

// Ports src/data/types/backgroundResult.ts's BackgroundResult =
// BackgroundResolved | BackgroundRateUnavailable discriminated union.
// UpdatedCrewMember advances LastCheckedAt to currentTime in both cases --
// "checking on" a crew member resets the clock regardless of whether the
// background rate is available.
public abstract class BackgroundResult
{
    public abstract bool Resolved { get; }
}

public sealed class BackgroundResolved : BackgroundResult
{
    public override bool Resolved => true;
    public int UnitsCompleted { get; init; }
    public List<CraftResult> Results { get; init; } = new();
    public CrewMember UpdatedCrewMember { get; init; } = new();
}

public sealed class BackgroundRateUnavailable : BackgroundResult
{
    public override bool Resolved => false;
    public string Reason { get; init; } = string.Empty;
    public CrewMember UpdatedCrewMember { get; init; } = new();
}
