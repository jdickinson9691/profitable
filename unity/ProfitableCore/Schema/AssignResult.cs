namespace Profitable.Core.Schema;

// Ports src/data/types/assignResult.ts's AssignResult = AssignSucceeded |
// AssignRejected discriminated union.
public abstract class AssignResult
{
    public abstract bool Assigned { get; }
}

public sealed class AssignSucceeded : AssignResult
{
    public override bool Assigned => true;
    public CrewMember UpdatedCrewMember { get; init; } = new();
    public CraftResult CraftResult { get; init; } = null!;
}

public sealed class AssignRejected : AssignResult
{
    public override bool Assigned => false;
    public string Reason { get; init; } = string.Empty;
}
