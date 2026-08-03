namespace Profitable.Core.Schema;

// Ports src/data/types/attritionResult.ts. Plain class, same reasoning as
// DismissResult.
public class AttritionResult
{
    public bool Departed { get; init; }
    public string? Reason { get; init; }
}
