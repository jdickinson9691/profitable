namespace Profitable.Core.Schema;

// Ports src/data/types/crewCapacity.ts. A player's crew capacity: a small
// base plus purchasable expansion slots. Current crew count vs.
// (BaseCapacity + PurchasedSlots) is what HireCrew checks against.
public class CrewCapacity
{
    public string PlayerId { get; set; } = string.Empty;
    public int BaseCapacity { get; set; }
    public int PurchasedSlots { get; set; }
}
