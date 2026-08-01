using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Simulation;

// Mirrors tests/fixtures/resources.ts, instances.ts, random.ts, recipes.ts
// -- not authoritative game content, just realistic shapes for exercising
// RollQuality/Refine/Craft, same purpose as the TypeScript fixtures.
public static class TestFixtures
{
    public static Resource IgneousOre { get; } = new()
    {
        Id = "igneous-ore",
        Name = "Igneous Ore",
        Category = "solid",
        ApplicableQualities = new Dictionary<Quality, bool>
        {
            [Quality.Purity] = true,
            [Quality.Density] = true,
            [Quality.Potency] = true,
            [Quality.Durability] = true,
            [Quality.Rarity] = true,
        },
    };

    public static Resource HydrogenGas { get; } = new()
    {
        Id = "hydrogen-gas",
        Name = "Hydrogen Gas",
        Category = "gas",
        ApplicableQualities = new Dictionary<Quality, bool>
        {
            [Quality.Purity] = true,
            [Quality.Density] = true,
            [Quality.Potency] = true,
            [Quality.Durability] = false,
            [Quality.Rarity] = true,
        },
    };

    public static Resource AutuniteCrystal { get; } = new()
    {
        Id = "autunite-crystal",
        Name = "Autunite Crystal",
        Category = "radioactive crystal",
        ApplicableQualities = new Dictionary<Quality, bool>
        {
            [Quality.Purity] = false,
            [Quality.Density] = true,
            [Quality.Potency] = true,
            [Quality.Durability] = true,
            [Quality.Rarity] = true,
        },
    };

    // Refined from 2x Igneous Ore + 1x Autunite Crystal. Igneous Ore
    // covers every dimension, so the refined output has all 5 applicable.
    public static Resource RadiantAlloyBar { get; } = new()
    {
        Id = "radiant-alloy-bar",
        Name = "Radiant Alloy Bar",
        Category = "refined-metal",
        ApplicableQualities = new Dictionary<Quality, bool>
        {
            [Quality.Purity] = true,
            [Quality.Density] = true,
            [Quality.Potency] = true,
            [Quality.Durability] = true,
            [Quality.Rarity] = true,
        },
    };

    // 1x Radiant Alloy Bar (durability 60+ recommended) + 1x Hydrogen Gas
    // -> 1x Ion-Forged Hull Plate. Matched positionally: inputs[0] against
    // this slot 0, inputs[1] against slot 1.
    public static Recipe IonForgedHullPlateRecipe { get; } = new()
    {
        Id = "ion-forged-hull-plate",
        Name = "Ion-Forged Hull Plate",
        Inputs = new List<RecipeInput>
        {
            new() { Category = "refined-metal", Quantity = 1, ThresholdQuality = Quality.Durability, ThresholdValue = 60 },
            new() { Category = "gas", Quantity = 1 },
        },
        OutputResourceId = "ion-forged-hull-plate",
        OutputQuantity = 1,
    };

    // Builds a ResourceInstance fixture, defaulting unspecified qualities
    // to null so tests only need to spell out the dimensions they care
    // about -- mirrors tests/fixtures/instances.ts's makeInstance().
    public static ResourceInstance MakeInstance(Resource resource, int quantity, Dictionary<Quality, int?>? qualities = null)
    {
        var map = new QualityMap
        {
            [Quality.Purity] = null,
            [Quality.Density] = null,
            [Quality.Potency] = null,
            [Quality.Durability] = null,
            [Quality.Rarity] = null,
        };
        if (qualities is not null)
        {
            foreach (var (quality, value) in qualities)
            {
                map[quality] = value;
            }
        }
        return new ResourceInstance { Resource = resource, Quantity = quantity, Qualities = map };
    }

    // Yields the given values in order, then throws if called more times
    // than values provided -- mirrors tests/fixtures/random.ts's
    // queueRandom(), letting tests pin down the exact random() call
    // sequence deterministically instead of asserting statistical ranges.
    public static RandomFn QueueRandom(params double[] values)
    {
        var index = 0;
        return () =>
        {
            if (index >= values.Length)
            {
                throw new InvalidOperationException($"QueueRandom exhausted after {values.Length} calls");
            }
            return values[index++];
        };
    }
}
