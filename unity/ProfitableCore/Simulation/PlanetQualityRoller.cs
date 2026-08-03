using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/rollQualityOnPlanet.ts. Wraps the existing
// QualityRoller.RollQuality rather than modifying it or duplicating its
// logic: rolls normally, then adds the planet's tier modifier (and
// specialty bonus, if this resource is the planet's specialty) to each
// applicable dimension, clamping back to 1-100. A planet with no Tier
// applies no modifier at all, so this is safe to call on any planet.
public static class PlanetQualityRoller
{
    public static QualityMap RollQualityOnPlanet(
        Resource resource,
        TierColor? tier,
        string? specialtyResourceId,
        RandomFn? random = null)
    {
        var baseRoll = QualityRoller.RollQuality(resource, random);

        var tierModifier = tier is not null
            ? (PlanetTierModifierTable.All.FirstOrDefault(e => e.Tier == tier.Value)?.QualityRollModifier ?? 0)
            : 0;
        var specialtyModifier = resource.Id == specialtyResourceId ? PlanetTierModifierTable.SpecialtyQualityModifier : 0;
        var totalModifier = tierModifier + specialtyModifier;

        if (totalModifier == 0)
        {
            return baseRoll;
        }

        var modified = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var value = baseRoll.TryGetValue(quality, out var v) ? v : null;
            modified[quality] = value is null
                ? (int?)null
                : (int)ClampHelper.Clamp(value.Value + totalModifier, QualityValueRange.Min, QualityValueRange.Max);
        }
        return modified;
    }
}
