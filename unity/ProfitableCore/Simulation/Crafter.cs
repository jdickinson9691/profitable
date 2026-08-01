using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/craft.ts.
public static class Crafter
{
    private static readonly Random SharedRandom = new();
    private static double DefaultRandom() => SharedRandom.NextDouble();

    public static CraftResult Craft(
        IReadOnlyList<ResourceInstance> inputs,
        Recipe recipe,
        TierColor schematicTier,
        TierColor crafterTier,
        RandomFn? random = null)
    {
        random ??= DefaultRandom;
        var baseAverages = Refiner.ComputeBaseAverages(inputs);
        var crafterVariance = TierVarianceLookup.GetTierVariance(crafterTier);
        var schematic = SchematicTierLookup.GetSchematicTierContribution(schematicTier);

        var combinedCeilingRaise = Math.Min(
            crafterVariance.Positive + schematic.CeilingRaise,
            SchematicTierContributionTable.CombinedCeilingCap);

        // The ceiling is a true cap, not just a new center -- schematic's
        // narrowing widens the crafter's already-narrow downside back
        // toward zero (never past it), so the roll only ever pulls DOWN
        // from the raised ceiling.
        var combinedNegative = Math.Min(
            crafterVariance.Negative + Math.Abs(schematic.VarianceNarrowing),
            0);

        // One shared roll (mirroring Refiner.Refine()) applied
        // proportionally across all 5 dimensions.
        var rollFraction = combinedNegative + random() * (0 - combinedNegative);

        var preThreshold = new QualityAverageMap();
        foreach (var quality in Qualities.All)
        {
            var baseValue = baseAverages[quality];
            if (baseValue is null)
            {
                preThreshold[quality] = null;
                continue;
            }
            var raisedCeiling = baseValue.Value * (1 + combinedCeilingRaise);
            preThreshold[quality] = raisedCeiling * (1 + rollFraction);
        }

        // Threshold penalty, applied LAST -- recipe input slots are
        // matched positionally against `inputs`. A quality that's
        // null/N/A on the matching input is excluded from the threshold
        // check entirely (never an automatic failure or a 0). Across
        // multiple thresholded slots, the single worst (largest)
        // points-below-threshold governs the penalty.
        var worstPointsBelow = 0;
        for (var i = 0; i < recipe.Inputs.Count; i++)
        {
            var slot = recipe.Inputs[i];
            if (slot.ThresholdQuality is null || slot.ThresholdValue is null) continue;
            if (i >= inputs.Count) continue;
            var value = inputs[i].Qualities.TryGetValue(slot.ThresholdQuality.Value, out var v) ? v : null;
            if (value is null) continue;
            var pointsBelow = Math.Max(slot.ThresholdValue.Value - value.Value, 0);
            if (pointsBelow > worstPointsBelow) worstPointsBelow = pointsBelow;
        }

        if (worstPointsBelow > 40)
        {
            return new CraftRejected
            {
                Reason = $"an input is {worstPointsBelow} points below its recipe threshold (41+ is rejected)",
            };
        }

        var effectivePointsBelow = worstPointsBelow * (1 - schematic.PenaltyForgiveness);
        var multiplier = PenaltyCurveLookup.GetPenaltyMultiplier(effectivePointsBelow);

        var qualities = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var value = preThreshold[quality];
            qualities[quality] = value is null
                ? (int?)null
                : (int)ClampHelper.Clamp(JsMath.Round(value.Value * multiplier), QualityValueRange.Min, QualityValueRange.Max);
        }

        return new CraftAccepted { Qualities = qualities };
    }
}
