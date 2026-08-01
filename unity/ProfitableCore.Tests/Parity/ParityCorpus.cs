using System.Text.Json.Serialization;

namespace ProfitableCore.Tests.Parity;

// Deserialization shape for unity/parity/ts-parity-results.json, written
// by scripts/parityHarness.ts. Field names use [JsonPropertyName] to
// match the TS-side camelCase JSON exactly rather than relying on
// System.Text.Json's case-insensitive matching -- this file is read-only
// input from another language's toolchain, so being explicit here is
// worth the verbosity.
public class ParityCorpus
{
    [JsonPropertyName("generatedAt")]
    public string GeneratedAt { get; set; } = string.Empty;

    [JsonPropertyName("tierColorCases")]
    public List<TierColorCase> TierColorCases { get; set; } = new();

    [JsonPropertyName("rollQualityCases")]
    public List<RollQualityCase> RollQualityCases { get; set; } = new();

    [JsonPropertyName("refineCases")]
    public List<RefineCase> RefineCases { get; set; } = new();

    [JsonPropertyName("craftCases")]
    public List<CraftCase> CraftCases { get; set; } = new();
}

public class TierColorCase
{
    [JsonPropertyName("value")]
    public double Value { get; set; }

    [JsonPropertyName("expectedTier")]
    public string ExpectedTier { get; set; } = string.Empty;
}

public class RollQualityCase
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedRoll")]
    public Dictionary<string, int?> ExpectedRoll { get; set; } = new();
}

public class SerializedInstance
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();
}

public class RefineCase
{
    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("refinerTier")]
    public string RefinerTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedRefineResult ExpectedResult { get; set; } = new();
}

public class ExpectedRefineResult
{
    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();

    [JsonPropertyName("outputTier")]
    public string OutputTier { get; set; } = string.Empty;

    [JsonPropertyName("refundUnits")]
    public int RefundUnits { get; set; }
}

public class CraftCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("recipeId")]
    public string RecipeId { get; set; } = string.Empty;

    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("schematicTier")]
    public string SchematicTier { get; set; } = string.Empty;

    [JsonPropertyName("crafterTier")]
    public string CrafterTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedCraftResult ExpectedResult { get; set; } = new();
}

public class ExpectedCraftResult
{
    [JsonPropertyName("accepted")]
    public bool Accepted { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?>? Qualities { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}
