namespace Profitable.Core.Schema;

// Ports src/data/types/schematicEntity.ts. Distinct from the schematic
// TIER CONTRIBUTION table (Constants/SchematicTierContributionTable.cs),
// which is the formula input this entity's Tier field feeds into.
public class Schematic
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string RecipeId { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
}
