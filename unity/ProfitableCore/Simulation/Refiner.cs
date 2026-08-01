using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/simulation/refine.ts.
public static class Refiner
{
    private static readonly Random SharedRandom = new();
    private static double DefaultRandom() => SharedRandom.NextDouble();

    // Straight average of each quality dimension across inputs, weighted
    // by quantity only (never toward best/worst). A quality is excluded
    // from its own average on any input where it's null, and is null in
    // the result only if it's null on every input -- never treated as 0.
    // Returns fractional values (QualityAverageMap), not the final
    // rounded QualityMap -- see that type's own comment for why this
    // distinction matters.
    public static QualityAverageMap ComputeBaseAverages(IReadOnlyList<ResourceInstance> inputs)
    {
        var averages = new QualityAverageMap();
        foreach (var quality in Qualities.All)
        {
            double weightedSum = 0;
            var totalQuantity = 0;
            foreach (var input in inputs)
            {
                var value = input.Qualities.TryGetValue(quality, out var v) ? v : null;
                if (value is null) continue;
                weightedSum += value.Value * input.Quantity;
                totalQuantity += input.Quantity;
            }
            averages[quality] = totalQuantity > 0 ? weightedSum / totalQuantity : (double?)null;
        }
        return averages;
    }

    public static RefineResult Refine(IReadOnlyList<ResourceInstance> inputs, TierColor refinerTier, RandomFn? random = null)
    {
        random ??= DefaultRandom;
        var baseAverages = ComputeBaseAverages(inputs);
        var variance = TierVarianceLookup.GetTierVariance(refinerTier);

        // One shared roll applied proportionally to every quality
        // dimension -- this refining action came out uniformly a bit
        // lucky or unlucky, rather than each stat rolling independently.
        var varianceRoll = variance.Negative + random() * (variance.Positive - variance.Negative);

        var qualities = new QualityMap();
        foreach (var quality in Qualities.All)
        {
            var baseValue = baseAverages[quality];
            qualities[quality] = baseValue is null
                ? (int?)null
                : (int)ClampHelper.Clamp(JsMath.Round(baseValue.Value * (1 + varianceRoll)), QualityValueRange.Min, QualityValueRange.Max);
        }

        // Refined items display each quality's own tier individually, so
        // there's no single "output tier" to key refund chance off of.
        // This reuses the same straight-average stub, applied here to
        // the 5 final values rather than to display.
        var finalValues = Qualities.All
            .Select(q => qualities[q])
            .Where(v => v is not null)
            .Select(v => (double)v!.Value)
            .ToList();
        var outputAverage = finalValues.Count > 0 ? finalValues.Average() : double.NaN;
        var outputTier = TierColorResolver.GetTierColor(outputAverage);

        var refund = RefundChanceLookup.GetRefundChance(outputTier);
        var totalConsumedUnits = inputs.Sum(i => i.Quantity);
        var refundUnits = 0;
        for (var i = 0; i < totalConsumedUnits; i++)
        {
            if (random() < refund.Chance)
            {
                refundUnits += 1;
                if (refund.SecondaryUnitChance is not null && random() < refund.SecondaryUnitChance.Value)
                {
                    refundUnits += 1;
                }
            }
        }

        return new RefineResult { Qualities = qualities, OutputTier = outputTier, RefundUnits = refundUnits };
    }
}
