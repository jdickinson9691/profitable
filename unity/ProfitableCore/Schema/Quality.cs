namespace Profitable.Core.Schema;

// Ports src/data/types/quality.ts. C# has no native string-union type, so
// the TypeScript `Quality = "purity" | "density" | "potency" | "durability"
// | "rarity"` becomes a real enum -- an idiomatic shape change, not a
// meaning change (profitable-unity-migration-gdd.md Section 4).
public enum Quality
{
    Purity,
    Density,
    Potency,
    Durability,
    Rarity,
}

public static class Qualities
{
    // Mirrors quality.ts's QUALITIES array -- enumeration order matters
    // wherever a caller iterates "all 5 qualities" (e.g. ApplicableQualities
    // completeness checks).
    public static readonly IReadOnlyList<Quality> All = new[]
    {
        Quality.Purity,
        Quality.Density,
        Quality.Potency,
        Quality.Durability,
        Quality.Rarity,
    };
}

// A single quality's value: 1-100, or null when not applicable to the
// resource -- never 0 (GDD Section 3.1). `int?` mirrors the TypeScript
// `QualityValue = number | null` exactly.
public static class QualityValueRange
{
    public const int Min = 1;
    public const int Max = 100;
}

// Ports quality.ts's QualityMap/QualityRoll (`Record<Quality,
// QualityValue>`) -- one value (or null) per quality. A named type rather
// than a bare Dictionary so Agent 32's rollQuality() port has a concrete
// return type to target, same as the TypeScript source.
public class QualityMap : Dictionary<Quality, int?>
{
}
