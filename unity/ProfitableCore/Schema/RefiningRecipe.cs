namespace Profitable.Core.Schema;

// Ports src/data/types/refiningRecipe.ts. Not one of Agent 1's originally
// -named 6 types, but loadContent()'s RawContentConfig/LoadedContent
// requires a "refining recipe config" shape and nothing else covers it --
// ported here as a hard dependency of ContentLoader, same reasoning
// documented in the TypeScript source's own file header.
public class RefiningRecipeInput
{
    public string ResourceId { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class RefiningRecipe
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<RefiningRecipeInput> Inputs { get; set; } = new();
    public string OutputResourceId { get; set; } = string.Empty;
    public int OutputQuantity { get; set; }
}
