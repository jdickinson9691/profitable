namespace Profitable.Core.Schema;

// Ports src/data/types/hireResult.ts's HireResult = HireSucceeded |
// HireRejected discriminated union, same sealed-class-hierarchy idiom as
// CraftResult/PurchaseResult.
public abstract class HireResult
{
    public abstract bool Hired { get; }
}

public sealed class HireSucceeded : HireResult
{
    public override bool Hired => true;
    public CrewMember CrewMember { get; init; } = new();
    public PlanetCrewPool UpdatedPool { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class HireRejected : HireResult
{
    public override bool Hired => false;
    public string Reason { get; init; } = string.Empty;
}
