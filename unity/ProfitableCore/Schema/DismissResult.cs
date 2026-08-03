namespace Profitable.Core.Schema;

// Ports src/data/types/dismissResult.ts. A plain class, not a
// discriminated union -- unlike HireResult/PurchaseResult, the
// TypeScript source itself is a single interface (`{ dismissed: boolean;
// reason?: string }`), not a union of two shapes, since the only extra
// data on any outcome is the optional human-readable reason.
public class DismissResult
{
    public bool Dismissed { get; init; }
    public string? Reason { get; init; }
}
