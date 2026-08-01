using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/schematicTier.ts.
public static class SchematicTierLookup
{
    public static SchematicTierContribution GetSchematicTierContribution(TierColor tier)
    {
        foreach (var entry in SchematicTierContributionTable.All)
        {
            if (entry.Tier == tier) return entry;
        }
        throw new ArgumentOutOfRangeException(nameof(tier), tier, "no schematic tier contribution for this tier");
    }

    // Locked (profitable-design-questions.md's Crafting & Recipes/
    // Schematics section): no owned schematic resolves to Grey. Grey's
    // own row is already "+0% ceiling raise, -0% variance narrowing, 0%
    // penalty forgiveness," so "no schematic" and "an owned Grey-tier
    // schematic" are already mechanically identical outcomes.
    public static TierColor ResolveSchematicTier(Schematic? schematic) =>
        schematic?.Tier ?? TierColor.Grey;
}
