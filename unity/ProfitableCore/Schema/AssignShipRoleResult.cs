namespace Profitable.Core.Schema;

// Ports src/data/types/assignShipRoleResult.ts's AssignShipRoleResult =
// AssignShipRoleSucceeded | AssignShipRoleRejected discriminated union.
public abstract class AssignShipRoleResult
{
    public abstract bool Assigned { get; }
}

public sealed class AssignShipRoleSucceeded : AssignShipRoleResult
{
    public override bool Assigned => true;
    public CrewMember UpdatedCrewMember { get; init; } = new();
}

public sealed class AssignShipRoleRejected : AssignShipRoleResult
{
    public override bool Assigned => false;
    public string Reason { get; init; } = string.Empty;
}
