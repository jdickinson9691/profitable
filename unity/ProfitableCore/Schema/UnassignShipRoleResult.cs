namespace Profitable.Core.Schema;

// Ports src/data/types/unassignShipRoleResult.ts's UnassignShipRoleResult
// = UnassignShipRoleSucceeded | UnassignShipRoleRejected discriminated
// union.
public abstract class UnassignShipRoleResult
{
    public abstract bool Unassigned { get; }
}

public sealed class UnassignShipRoleSucceeded : UnassignShipRoleResult
{
    public override bool Unassigned => true;
    public CrewMember UpdatedCrewMember { get; init; } = new();
}

public sealed class UnassignShipRoleRejected : UnassignShipRoleResult
{
    public override bool Unassigned => false;
    public string Reason { get; init; } = string.Empty;
}
