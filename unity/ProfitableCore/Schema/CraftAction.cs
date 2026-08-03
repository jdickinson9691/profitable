namespace Profitable.Core.Schema;

// Ports src/data/types/craftAction.ts. Bundles everything Crafter.Craft
// needs besides the crafter's own tier (which comes from the CrewMember
// doing the work, not from this action): the consumed inputs, which
// recipe, and which schematic. Id is what CrewMember.AssignedCraftId
// points at once assigned.
public class CraftAction
{
    public string Id { get; set; } = string.Empty;
    public List<ResourceInstance> Inputs { get; set; } = new();
    public Recipe Recipe { get; set; } = new();
    public TierColor SchematicTier { get; set; }
}
