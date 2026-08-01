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

    // Matches a TypeScript-side lowercase quality name ("purity", not
    // "Purity") to its enum value. Shared by ContentLoader (parsing real
    // content JSON) and anything else that needs to cross the C#/JSON
    // boundary for a Quality -- extracted here rather than duplicated so
    // there is exactly one place that knows the naming convention.
    public static bool TryParse(string jsonName, out Quality quality)
    {
        foreach (var candidate in All)
        {
            if (ToJsonName(candidate) == jsonName)
            {
                quality = candidate;
                return true;
            }
        }
        quality = default;
        return false;
    }

    public static string ToJsonName(Quality quality)
    {
        var name = quality.ToString();
        return char.ToLowerInvariant(name[0]) + name[1..];
    }
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
